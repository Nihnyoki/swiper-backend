import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Person, PersonDocument } from './schemas/person.schema';

type MediaType = 'video' | 'image' | 'audio' | 'pdf';

@Injectable()
export class PersonService {

  constructor(@InjectModel(Person.name) private personModel: Model<PersonDocument>) {}

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

async uploadMediaForPerson(
  personId: string,
  file: Express.Multer.File,
  category: string,
  mediaType: MediaType,
  body: any,
) {
  if (!file) {
    throw new HttpException(
      'Media file is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!category) {
    throw new HttpException(
      'x-category header is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!mediaType) {
    throw new HttpException(
      'x-mediaType header is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  const baseUrl = 'http://localhost:3000';

  /**
   * 🔑 Media-specific object factory
   */
  const mediaFactories: Record<MediaType, any> = {
    video: {
      id: `vid-${uuidv4()}`,
      type: 'video',
      title: body.title || file.originalname,
      description: body.description || '',
      category,
      tags: body.tags
        ? body.tags.split(',').map((t: string) => t.trim())
        : [],
      creator: body.creator || '',
      url: `${baseUrl}/videos/${file.filename}`,
      thumbnailUrl: '',
      duration: 0,
      createdAt: new Date().toISOString(),
    },

    image: {
      id: `img-${uuidv4()}`,
      type: 'image',
      title: body.title || file.originalname,
      description: body.description || '',
      category,
      tags: body.tags
        ? body.tags.split(',').map((t: string) => t.trim())
        : [],
      creator: body.creator || '',
      url: `${baseUrl}/images/${file.filename}`,
      width: 0,
      height: 0,
      createdAt: new Date().toISOString(),
    },

    audio: {
      id: `aud-${uuidv4()}`,
      type: 'audio',
      title: body.title || file.originalname,
      description: body.description || '',
      category,
      tags: body.tags
        ? body.tags.split(',').map((t: string) => t.trim())
        : [],
      creator: body.creator || '',
      url: `${baseUrl}/audios/${file.filename}`,
      duration: 0,
      createdAt: new Date().toISOString(),
    },

    pdf: {
      id: `pdf-${uuidv4()}`,
      type: 'pdf',
      title: body.title || file.originalname,
      description: body.description || '',
      category,
      tags: body.tags
        ? body.tags.split(',').map((t: string) => t.trim())
        : [],
      creator: body.creator || '',
      url: `${baseUrl}/pdfs/${file.filename}`,
      pageCount: 0,
      createdAt: new Date().toISOString(),
    },
  };

  const mediaItem = mediaFactories[mediaType];

  if (!mediaItem) {
    throw new HttpException(
      `Unsupported media type: ${mediaType}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const person = await this.personModel.findById(personId);
  if (!person) {
    throw new HttpException('Person not found', HttpStatus.NOT_FOUND);
  }

  if (!person.THINGS) {
    person.THINGS = [];
  }

  let thing = person.THINGS.find((t) => t.val === category);
  if (!thing) {
    thing = {
      key: person.THINGS.length,
      val: category,
      childItems: [],
    };
    person.THINGS.push(thing);
  }

  let thingsChild = thing.childItems.find((c) => c.val === 'Things');
  if (!thingsChild) {
    thingsChild = {
      key: thing.childItems.length,
      val: 'Things',
      data: [],
    };
    thing.childItems.push(thingsChild);
  }

  thingsChild.data.push(mediaItem);

  // 🔥 IMPORTANT: deep mutation
  person.markModified('THINGS');
  await person.save();

  return {
    success: true,
    [mediaType]: mediaItem, // 👈 dynamic response key
  };
}


}
