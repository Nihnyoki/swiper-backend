import { Injectable, NotFoundException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Person, PersonDocument } from './schemas/person.schema';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { StoredMedia } from './interfaces/stored-media.interface';

type MediaType = 'video' | 'image' | 'audio' | 'pdf' | 'note';

@Injectable()
export class PersonService {

  constructor(@InjectModel(Person.name) private personModel: Model<PersonDocument>) {}

  private readonly mediaFolders: Record<string, string> = {
    video: 'videos',
    image: 'images',
    audio: 'audios',
    pdf: 'pdfs',
    note: 'notes',
  };

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
    files: Express.Multer.File[] | undefined,
    category: string,
    mediaType: MediaType, 
    body: any,
  ) {
    if (!mediaType) {
      throw new HttpException(
        'x-mediatype header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const filesRequired = !['note'].includes(mediaType);

    if (filesRequired && (!files || files.length === 0)) {
      throw new HttpException(
        'At least one media file is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!category) {
      throw new HttpException(
        'x-category header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    //const baseUrl = 'http://localhost:3000';
    const person = await this.personModel.findById(personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    const safePersonName = person.NAME.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = this.mediaFolders[mediaType];
    const baseUrl = new URL(
      `${folder}/${safePersonName}`,
      'http://localhost:3000',
    ).toString();


    console.log(`Called baseUrl: ${baseUrl}`);



    const normalizeFiles = (
      files?: Express.Multer.File[] | Express.Multer.File,
    ): Express.Multer.File[] => {
      if (!files) return [];
      return Array.isArray(files) ? files : [files];
    };

    const isAudio = (file: Express.Multer.File) =>
      file.mimetype.startsWith('audio/');

    const isImage = (file: Express.Multer.File) =>
      file.mimetype.startsWith('image/');

    const createMediaItem = (
      type: MediaType,
      files?: Express.Multer.File[] | Express.Multer.File,
    ) => {
      const normalizedFiles = normalizeFiles(files);

      const base = {
        id: `${type}-${uuidv4()}`,
        type,
        title: body.title || normalizedFiles[0]?.originalname || 'Note',
        description: body.description || '',
        category,
        tags: body.tags
          ? body.tags.split(',').map((t: string) => t.trim())
          : [],
        creator: body.creator || '',
        createdAt: new Date().toISOString(),
      };

      if (type === 'note') {
        let audio: { type: string; url: string } | undefined;
        let image: { type: string; url: string } | undefined;

        for (const file of normalizedFiles) {
          if (!audio && isAudio(file)) {
            audio = {
              type: 'audio',
              url: `${baseUrl}/${file.filename}`,
            };
          }

          if (!image && isImage(file)) {
            image = {
              type: 'image',
              url: `${baseUrl}/${file.filename}`,
            };
          }
        }

        return {
          ...base,
          id: `note-${uuidv4()}`,
          type: 'note',
          text: body.text || '',
          lat: body.lat ? String(body.lat) : '',
          lng: body.lng ? String(body.lng) : '',
          remind: body.remind === 'true',
          audio,
          image,
          // schema-required but unused
          url: body.url || undefined,
        };
      }

      // 👇 Non-note media (1 file per item)
      const file = normalizedFiles[0];

      console.log(`before switch on type: ${type}`);

      switch (type) {
        case 'video':
          console.log(`after switch on type: ${type}`);
          return {
            ...base,
            id: `vid-${uuidv4()}`,
            type: 'video',
            url: `${baseUrl}/${file.filename}`,
            duration: 0,
          };

        case 'image':
          return {
            ...base,
            id: `img-${uuidv4()}`,
            type: 'image',
            url: `${baseUrl}/${file.filename}`,
          };

        case 'audio':
          return {
            ...base,
            id: `aud-${uuidv4()}`,
            type: 'audio',
            url: `${baseUrl}/${file.filename}`,
            duration: 0,
          };

        case 'pdf':
          return {
            ...base,
            id: `pdf-${uuidv4()}`,
            type: 'pdf',
            url: `${baseUrl}/${file.filename}`,
            pageCount: 0,
          };

        default:
          throw new HttpException(
            `Unsupported media type: ${type}`,
            HttpStatus.BAD_REQUEST,
          );
      }
    };

    if (!person) {
      throw new HttpException('Person not found', HttpStatus.NOT_FOUND);
    }

    if (!person.THINGS) person.THINGS = [];

    let thing = person.THINGS.find(t => t.val === category);
    if (!thing) {
      thing = {
        key: person.THINGS.length,
        val: category,
        childItems: [],
      };
      person.THINGS.push(thing);
    }

    let child = thing.childItems.find(c => c.val === 'Things');
    if (!child) {
      child = {
        key: thing.childItems.length,
        val: 'Things',
        data: [],
      };
      thing.childItems.push(child);
    }

    const createdItems =
      mediaType === 'note'
        ? [createMediaItem('note', files)]
        : normalizeFiles(files).map(file =>
          createMediaItem(mediaType, file),
        );

    console.log(`createdItems : ${JSON.stringify(createdItems)}`);

    child.data.push(...createdItems);

    person.markModified('THINGS');
    await person.save();

    return {
      success: true,
      count: createdItems.length,
      [mediaType]: createdItems,
    };
  }
  
}
