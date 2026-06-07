import { Injectable, NotFoundException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Person, PersonDocument } from './schemas/person.schema';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import { StoredMedia } from './interfaces/stored-media.interface';
import { supabase } from './common/supabase';
import { ensureMusicStructure as ensureMusicStructureHelper, migrateAudioFromPersonalDoc as migrateAudioHelper } from './utils/musicHelpers';
import { normalizeContentResponse, contentCategory } from './utils/categoryHelpers';
import type { Multer } from 'multer';


type MediaType = 'video' | 'image' | 'audio' | 'pdf' | 'note';

@Injectable()
export class PersonService {

  constructor(@InjectModel(Person.name) private personModel: Model<PersonDocument>) {}

    private supabase = supabase;


  private readonly mediaFolders: Record<string, string> = {
    video: 'videos',
    image: 'images',
    audio: 'audios',
    pdf: 'pdfs',
    note: 'notes',
  };

  private readonly musicCategory = 'MUSIC';
  private readonly personalCategory = 'PERSONAL';
  private readonly contentCategory = contentCategory;
  private readonly musicChildItem = 'Tracks';

  async findPeople(): Promise<Person[]> {
    const people = await this.personModel.find();
    if (!people) return [];
    return people;
    }
    
  // Find cousins of a person by IDNUM
  async findCousins(IDNUM: string): Promise<Person[]> {
    // 1. Find person by IDNUM
    const person = await this.personModel.findOne({ IDNUM });
    if (!person) return [];

    // 2. Find parents' siblings (aunts/uncles)
    // First find parents' IDNUMs
    const mother = person.MOTHERID ? await this.personModel.findById(person.MOTHERID) : null;
    const father = person.FATHERID ? await this.personModel.findById(person.FATHERID) : null;

    // Parents' siblings = persons with same MOTHERID or FATHERID as person's parents
    // For mother: siblings share mother's parents
    // For father: siblings share father's parents

    // Helper: get siblings of a parent
    const getSiblings = async (parent: Person | null) => {
      if (!parent) return [];
      if (!parent.MOTHERID && !parent.FATHERID) return []; // no grandparents info, no siblings found

      return this.personModel.find({
        $and: [
          { _id: { $ne: parent.IDNUM } }, // exclude the parent itself
          {
            $or: [
              { MOTHERID: parent.MOTHERID || null },
              { FATHERID: parent.FATHERID || null },
            ],
          },
        ],
      });
    };

    const motherSiblings = await getSiblings(mother);
    const fatherSiblings = await getSiblings(father);

    // 3. Find family of these aunts/uncles => cousins
    const auntUncleIds = [...motherSiblings, ...fatherSiblings].map((p) => p._id);

    const cousins = await this.personModel.find({
      $or: [
        { MOTHERID: { $in: auntUncleIds } },
        { FATHERID: { $in: auntUncleIds } },
      ],
    });

    return cousins;
  }

  async getPersonWithFamily(IDNUM: string): Promise<Person> {
    const person = await this.personModel.findOne({ IDNUM }).lean();
    if (!person) {
      throw new NotFoundException("Person not found");
    }
  
    let familyGet: Record<string, any> = {};
  
    if (person.GENDER === "FEMALE") {
      familyGet = { MOTHERID: person.IDNUM };
    } else if (person.GENDER === "MALE") {
      familyGet = { FATHERID: person.IDNUM };
    } else {
      person.FAMILY = [];
      return person;
    }
  
    const family = await this.personModel.find(familyGet).lean();
    person.FAMILY = family || [];
  
    return person;
  }

  async getPersonComplete(): Promise<Person[]> {
    const persons: Person[] = [];
    const personsLists = await this.personModel.find().lean();

    if (!personsLists || personsLists.length === 0) {
      throw new NotFoundException("persons not found");
    }

    for (const person of personsLists) {
      let familyGet: Record<string, any> = {};
      familyGet = {
        $or: [
          { MOTHERID: person.IDNUM },
          { FATHERID: person.IDNUM }
        ]
      };

      const family = await this.personModel.find(familyGet).lean();

      if (person.THINGS) {
        const familyCategory = person.THINGS.find(t => t.val === "FAMILY");
        if (familyCategory) {
          //familyCategory.childItems = family || [];
        }
      }
  }
    return personsLists;
  }

  async handleMediaUpload(
    personId: string,
    mediaType: 'video' | 'image' | 'audio' | 'pdf' | 'note',
    files: Express.Multer.File[],
  ) {
    const folder = this.mediaFolders[mediaType];
    if (!folder) {
      throw new BadRequestException(
        `Unsupported media type: ${mediaType}`,
      );
    }

    const person = await this.personModel.findById(personId).lean();
    if (!person) {
      throw new NotFoundException('Person not found');
    }

    // sanitize person name for filesystem use
    const safePersonName = person.NAME.replace(/[^a-zA-Z0-9_-]/g, '_');

    const basePath = join(
      process.cwd(),
      'public',
      folder,
      safePersonName,
    );

    console.log(`Called: ${basePath}`);

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }

    const storedFiles: StoredMedia[] = [];

    for (const file of files) {
      const targetPath = join(basePath, file.filename);

      console.log(`file.path : ${file.path}`);

      // move file from tmp → final folder
      renameSync(file.path, targetPath);

      storedFiles.push({
        mediaType,
        filename: file.filename,
        path: `/public/${folder}/${safePersonName}/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      });
    }

    /**
     * OPTIONAL:
     * Persist references in THINGS or a Media collection later
     */

    return {
      personId,
      personName: person.NAME,
      mediaType,
      files: storedFiles,
    };
  }


async uploadMultipleMediaForPerson(
  personId: string,
  category: string,
  mediaType: MediaType,
  body: any,
  files?: Express.Multer.File[] | undefined,
) {
  if (!mediaType) {
    throw new HttpException('x-mediatype header is required', HttpStatus.BAD_REQUEST);
  }

  if (!category) {
    throw new HttpException('x-category header is required', HttpStatus.BAD_REQUEST);
  }

  const effectiveCategory = mediaType === 'audio' ? this.musicCategory : category;
  const childCategory = effectiveCategory === this.musicCategory ? this.musicChildItem : 'Things';

  const person = await this.personModel.findById(personId);
  if (!person) throw new NotFoundException('Person not found');

  const createMediaItem = (): any => {
    const base = {
      id: `${mediaType}-${uuidv4()}`,
      type: mediaType,
      title: body.title || '',
      description: body.description || '',
      category: effectiveCategory,
      url: body.url || undefined,
      tags: body.tags ? body.tags.split(',').map((t: string) => t.trim()) : [],
      creator: body.creator || '',
      createdAt: new Date().toISOString(),
    };

    if (mediaType === 'note') {
      return {
        ...base,
        text: body.text || '',
        image: body.image || undefined,
        audio: body.audio || undefined,
        url: body.url || undefined,
      };
    }

    return {
      ...base,
      url: body.url || undefined,
      duration: body.duration ?? 0,
    };
  };

  if (!person.THINGS) person.THINGS = [];

  let thing = person.THINGS.find(t => t.val === effectiveCategory);
  if (!thing) {
    thing = { key: person.THINGS.length, val: effectiveCategory, childItems: [] };
    person.THINGS.push(thing);
  }

  let child = thing.childItems.find(c => c.val === childCategory);
  if (!child) {
    child = { key: thing.childItems.length, val: childCategory, data: [] };
    thing.childItems.push(child);
  }

  const createdItem = createMediaItem();
  child.data.push(createdItem);

  person.markModified('THINGS');
  await person.save();

  return {
    success: true,
    item: createdItem,
  };
}

  
async getPersonsWithSignedMedia(): Promise<Person[]> {
  const persons = await this.personModel.find().lean();

  for (const person of persons) {
    this.normalizeMusicCategoryResponse(person);
    normalizeContentResponse(person);
    await this.attachSignedUrls(person);
  }

  return persons;
}

async getRandomPeopleWithSignedMedia(limit = 10): Promise<Person[]> {
  const size = Math.max(1, Math.min(100, limit || 10));
  const people = await this.personModel.aggregate([{ $sample: { size } }]);

  // run non-destructive normalization and attach signed urls
  for (const person of people) {
    this.normalizeMusicCategoryResponse(person);
    normalizeContentResponse(person);
    await this.attachSignedUrls(person);
  }

  return people as Person[];
}

async updatePerson(personId: string, payload: any): Promise<Person> {
  const person = await this.personModel.findById(personId);
  if (!person) {
    throw new NotFoundException('Person not found');
  }

  Object.assign(person, payload);
  person.markModified('THINGS');
  return await person.save();
}

async getPaginatedPeopleWithSignedMedia(
  page: number,
  limit: number
): Promise<{ data: Person[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const total = await this.personModel.countDocuments();

  const pagePeople = await this.personModel.find().skip(skip).limit(limit);
  await Promise.all(pagePeople.map(person => this.migrateAudioFromPersonalDoc(person)));

  const people = await this.personModel.aggregate([
    { $skip: skip },
    { $limit: limit },
    {
      $addFields: {
        THINGS: {
          $map: {
            input: { $ifNull: ['$THINGS', []] },
            as: 'thing',
            in: {
              $mergeObjects: [
                '$$thing',
                { childItems: { $slice: ['$$thing.childItems', 3] } },
              ],
            },
          },
        },
      },
    },
  ]);

  for (const person of people) {
    this.normalizeMusicCategoryResponse(person);
    await this.attachSignedUrls(person);
  }

  return { data: people as Person[], total, page, limit };
}

  private normalizeMusicCategoryResponse(person: any): void {
    // Ensure MUSIC category and childItems exist (non-destructive)
    ensureMusicStructureHelper(person);

    // For display purposes, collect and move audio items from PERSONAL into MUSIC
    migrateAudioHelper(person);
  }

  private async migrateAudioFromPersonalDoc(person: any): Promise<boolean> {
    const res = migrateAudioHelper(person);
    if (!res.migrated) return false;
    try {
      person.markModified?.('THINGS');
      await person.save();
      return true;
    } catch (e) {
      return false;
    }
  }


private async attachSignedUrls(person: any) {
  if (!person?.THINGS?.length) return;

  for (const thing of person.THINGS) {
    for (const child of thing.childItems || []) {
      for (const item of child.data || []) {
        await this.processItemMedia(item);
      }
    }
  }
}

private async processItemMedia(item: any) {
  // Direct media
  if (item.type === 'audio') {
    item.url = await this.signIfExists(item.url, "audio");
  }

  if (item.type === 'video') {
    item.url = await this.signIfExists(item.url,"video");
  }

  // Notes with embedded media
  if (item.image?.url) {
    item.image.url = await this.signIfExists(item.image.url, "image");
  }

  if (item.audio?.url) {
    item.audio.url = await this.signIfExists(item.audio.url, "audio");
  }
}

private async signIfExists(path?: string, media?: string): Promise<string | null> {
  if (!path) return null;

  // Already signed or external
  if (path.startsWith('http')) return path;

  const bucket = 'media'; // single unified bucket

  const { data, error } = await this.supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24); // 24h

  if (error) {
    console.error(`Supabase ${media} signing error:`, error.message);
    return null;
  }

  return data.signedUrl;
}

  async testDBConnection() {
    const person = await this.personModel.findOne().lean();
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    console.log(`Person found: : ${JSON.stringify(person)}`);
    }

    async deleteMedia(personId: string, mediaName: string): Promise<void> {
      const person = await this.personModel.findById(personId);
      if (!person) {
        throw new NotFoundException('Person not found');
      }

      const mediaPath = join('./public', mediaName);
      if (!existsSync(mediaPath)) {
        throw new NotFoundException('Media not found');
      }

      try {
        unlinkSync(mediaPath);
      } catch (error) {
        throw new HttpException('Failed to delete media', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    async lazyLoadChildren(categoryId: string, offset = 0, limit = 10): Promise<any> {
      const sliceSize = limit;
      const start = Math.max(offset, 0);

      if (categoryId === this.musicCategory) {
        const personalPerson = await this.personModel.findOne({
          $and: [
            { 'THINGS.childItems.data.type': 'audio' },
            { $or: [{ 'THINGS.val': this.personalCategory }, { 'THINGS.val': this.contentCategory }] },
          ],
        });

        if (personalPerson) {
          await this.migrateAudioFromPersonalDoc(personalPerson);
        }
      }

      const results = await this.personModel.aggregate([
        { $match: { 'THINGS.val': categoryId } },
        {
          $project: {
            THINGS: {
              $filter: {
                input: { $ifNull: ['$THINGS', []] },
                as: 'thing',
                cond: { $eq: ['$$thing.val', categoryId] },
              },
            },
          },
        },
        {
          $project: {
            THINGS: {
              $map: {
                input: '$THINGS',
                as: 'thing',
                in: {
                  $mergeObjects: [
                    '$$thing',
                    {
                      childItems: {
                        $slice: ['$$thing.childItems', start, sliceSize],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]);

      const result = results[0];
      if (!result || !result.THINGS?.length) {
        throw new NotFoundException('Category not found');
      }

      const thing = result.THINGS[0];
      return { categoryId, offset: start, limit: sliceSize, data: thing.childItems || [] };
    }
}
