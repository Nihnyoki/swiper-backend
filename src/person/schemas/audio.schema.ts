// src/person/schemas/audio.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false }) // embedded sub-document
export class Audio {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, default: 'audio' })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: '' })
  creator?: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: 0 })
  duration?: number;

  @Prop({ default: '' })
  album?: string;

  @Prop({ default: '' })
  artist?: string;

  @Prop({ default: () => new Date().toISOString() })
  createdAt: string;
}

export type AudioDocument = Audio & Document;
export const AudioSchema = SchemaFactory.createForClass(Audio);