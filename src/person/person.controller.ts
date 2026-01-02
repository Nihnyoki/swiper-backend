// src/person/person.controller.ts
// src/person/person.controller.ts
import { Controller, Post, Body, Get, Param, Headers, UploadedFile, UploadedFiles, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { Express } from "express";
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from './schemas/person.schema';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { PersonDto } from './dto/person';
import { PersonService } from './person.service';
import { v4 as uuidv4 } from 'uuid'; // for unique video IDs
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { StoredMedia } from './interfaces/stored-media.interface';
import { signMediaUrl } from './utils/signMediaUrl';
import type { Multer } from 'multer';



@ApiTags('Persons')
@Controller('api/persons')
export class PersonController {
  constructor(@InjectModel(Person.name) private readonly personModel: Model<PersonDocument>, private readonly personService: PersonService) {}

  // person.controller.ts
  @Post('media/:personId')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './public/tmp', // temporary, service will move files
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `MEDIA-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )

  @ApiOperation({ summary: 'Upload multiple media files for a person' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'personId', required: true })
  async uploadMedia(
    @Param('personId') personId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Headers('x-category') category: string,
    @Headers('x-mediatype')
    mediaType:
      | 'video'
      | 'image'
      | 'audio'
      | 'pdf'
      | 'note',
    @Body() body: any,
  ) {
    await this.personService.handleMediaUpload(
      personId,
      mediaType,
      files,
    );
    return this.personService.uploadMultipleMediaForPerson(
      personId,
      files,
      category,
      mediaType,
      body,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('IMAGE', {
      storage: diskStorage({
        destination: './public/IFATHS', 
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 30 * 1024 * 1024 }, // 10MB limit
    }),
  )
  @ApiOperation({ summary: 'Add a new person with image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Person created successfully.' })
  @ApiResponse({ status: 500, description: 'Failed to add person' })
  async addPerson(
    @Body() personDto: any, // contains all other fields like NAME, IDNUM, ACTIVITIES
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Person> {
    try {

      const parsed = {
        ...personDto,
        ACTIVITIES: personDto.ACTIVITIES ? JSON.parse(personDto.ACTIVITIES) : [],
        IFATH: personDto.IFATH ? JSON.parse(personDto.IFATH) : null,
        THINGS: personDto.THINGS ? JSON.parse(personDto.THINGS) : [],
        imagePath: personDto?.filename ?? null,
      };
      
      console.log('Body received:', personDto);
      console.log('File received:', parsed.imagePath);
      
      if (!image) throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);

      // Add IFATH object with metadata
      parsed.IFATH = {
        name: image.filename,
        tyte: image.mimetype,
        date: new Date().toISOString(),
        path: image.path, // store path to access later
      };

      const createdPerson = new this.personModel(parsed);
      return await createdPerson.save();
    } catch (e) {
      console.error('Add person error:', e);
      throw new HttpException('Failed to add person', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

@Get()
@ApiOperation({ summary: 'Get all persons' })
@ApiResponse({ status: 200, description: 'List of persons' })
@ApiResponse({ status: 500, description: 'Failed to fetch persons' })
async getPersons(): Promise<Person[]> {
  return this.personService.getPersonsWithSignedMedia();
}

  @Get('children/:parentId')
  @ApiOperation({ summary: 'Get children by parent ID' })
  @ApiParam({ name: 'parentId', required: true, description: "The parent's ID" })
  @ApiResponse({ status: 200, description: 'List of children' })
  @ApiResponse({ status: 500, description: 'Failed to fetch children' })
  async getChildren(@Param('parentId') parentId: string): Promise<Person[]> {
    try {
      return await this.personModel.find({
        $or: [{ mother_id: parentId }, { father_id: parentId }],
      });
    } catch {
      throw new HttpException('Failed to fetch children', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get people' })
  @ApiResponse({ status: 200, description: 'List of people' })
  @ApiResponse({ status: 404, description: 'People not found' })
  @ApiResponse({ status: 500, description: 'Failed to fetch people' })
  @Get('people/')
  async getPeople(): Promise<Person[]> {
    return this.personService.findPeople();
  }

  @Get('cousins/:id_num')
  @ApiOperation({ summary: 'Get cousins by person id_number' })
  @ApiParam({ name: 'id_num', required: true, description: 'The id_number of the person' })
  @ApiResponse({ status: 200, description: 'List of cousins' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  @ApiResponse({ status: 500, description: 'Failed to fetch cousins' })
  @Get('cousins/:id_num')
  async getCousins(@Param('id_num') id_num: string): Promise<Person[]> {
    return this.personService.findCousins(id_num);
  }

  @Get("/complete")
  @ApiOperation({ summary: 'Get all persons with details' })
  @ApiResponse({ status: 200, description: 'List of persons' })
  @ApiResponse({ status: 500, description: 'Failed to fetch persons' })
  async getPersonsComplete(): Promise<Person[]> {
    try {
        //return this.personService.getPersonComplete();
        return this.personService.getPersonsWithSignedMedia();
    } catch {
      throw new HttpException('Failed to fetch persons', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(":id/with-children")
  @ApiOperation({ summary: "Get a person and their children" })
  @ApiParam({
    name: "id",
    required: true,
    description: "The MongoDB ObjectId of the person",
  })
  @ApiResponse({
    status: 200,
    description: "Person with their children",
    schema: {
      example: {
        person: {
          _id: "64fabc1234567890abcdef12",
          name: "Alice",
          gender: "female",
          id_number: "369777888653339",
        },
        children: [
          {
            _id: "64fabc1234567890abcdef34",
            name: "Bob",
            gender: "male",
            id_number: "847263847263847",
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: "Person not found" })
  @ApiResponse({ status: 500, description: "Failed to fetch person with children" })
  @Get(":id/with-children")
  async getPersonWithChildren(@Param("id") id: string) {
    console.log(`GAKHIGIMONETH: ${id}`);
    return this.personService.getPersonWithFamily(id);
  }
}