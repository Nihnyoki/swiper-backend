// src/person/schemas/audio.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NoteMedia } from './note-media.schema';
import { MediaBaseSchema } from './media.schema';

@Schema({ _id: false }) // embedded sub-document
export class Note {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, default: 'note' })
  type: string;

  @Prop({ required: true })
  title?: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: '' })
  lat: string;

  @Prop({ default: '' })
  lng: string;

  @Prop({
    required: false,
    type: Boolean,
    default: false,
    set: v => v === true || v === 'true'
  })
  remind?: boolean;

  @Prop({ default: '' })
  audio?: NoteMedia;
  
  @Prop({ default: '' })
  image?: NoteMedia;

    @Prop()
    url?: string;

  @Prop({ default: () => new Date().toISOString() })
  createdAt: string;
}

export type NoteDocument = Note & Document;
export const NoteSchema = SchemaFactory.createForClass(Note);

