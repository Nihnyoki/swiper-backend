// src/person/schemas/business.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false }) // embedded, no separate collection
export class ThingsChildsCat {
  @Prop({ required: true })
  key: number; // nume key for Swiper

  @Prop({ required: true })
  val: string; // name of the child-item

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;
}

export type ThingsChildsCatDocument = ThingsChildsCat & Document;
export const ThingsChildsSchema = SchemaFactory.createForClass(ThingsChildsCat);