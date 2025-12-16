// src/person/schemas/address.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Ifath } from '../dto/ifath';

export type AddressDocument = Ifath & Document;

@Schema()
export class Ifageth {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  dste: string;

  @Prop({ required: false })
  tyte: string;

  @Prop({ required: true })
  data: string;
}

export const IfathSchema = SchemaFactory.createForClass(Ifath);

