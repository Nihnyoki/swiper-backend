// src/person/schemas/video.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false }) // embedded sub-document
export class Video {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, default: 'video' })
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

  @Prop({ default: '' })
  thumbnailUrl?: string;

  @Prop({ default: 0 })
  duration?: number;

  @Prop({ default: () => new Date().toISOString() })
  createdAt: string;
}

export type VideoDocument = Video & Document;
export const VideoSchema = SchemaFactory.createForClass(Video);
