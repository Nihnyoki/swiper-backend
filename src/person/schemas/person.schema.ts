// src/person/schemas/person.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address, AddressSchema } from './address.schema';
import { DocumentItem, DocumentItemSchema } from './document-item.schema';
import { Things, ThingsSchema } from './things.schema';
import { Ifath } from '../dto/ifath';

export type PersonDocument = Person & Document;

@Schema()
export class Person {

  @Prop({ required: true })
  NAME: string;
  
  @Prop({ required: false })
  GENDER: "MALE" | "FEMALE";

  @Prop({ required: true })
  TYPETH: string;

  @Prop({ required: true })
  AGETH: string;

  @Prop({ required: true })
  EMOJIMETH: string;

  @Prop({ required: true })
  IFATH: Ifath;

  @Prop({ required: true, index: true })
  IDNUM: string;

  @Prop({ required: false })
  PASSPORTETHNUM?: string;

  @Prop({ type: [String], default: [] })
  interests?: string[];

  @Prop({ index: true })
  MOTHERID?: string;

  @Prop({ index: true })
  FATHERID?: string;

  @Prop({ index: false })
  FAMILY?: Person[];

  @Prop({ type: AddressSchema, required: false })
  ADDRESS?: Address;

  @Prop({ required: false, type: [ThingsSchema], default: [] })
  THINGS?: Things[];
}

export const PersonSchema = SchemaFactory.createForClass(Person);


