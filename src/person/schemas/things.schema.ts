// src/person/schemas/business.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ChildItems, ChildItemsSchema } from './child-items.schema';

@Schema({ _id: false })
export class Things {
  @Prop({ required: true })
  key: number; 

  @Prop({ required: true })
  val: string; 

  @Prop({ required: true, type: [ChildItemsSchema], default: [] })
  childItems: ChildItems[];
}

export type ThingsDocument = Things & Document;
export const ThingsSchema = SchemaFactory.createForClass(Things);