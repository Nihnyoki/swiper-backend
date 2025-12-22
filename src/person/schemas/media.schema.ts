import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NoteMedia } from './note-media.schema';

// media.schema.ts
@Schema({ _id: false, discriminatorKey: 'type' })
export class MediaBase {
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    type: string;

    @Prop()
    title?: string;

    @Prop()
    description?: string;

    @Prop()
    category?: string;

    @Prop({ type: [String], default: [] })
    tags?: string[];

    @Prop({ required: false })
    url: string;

    @Prop()
    creator?: string;

      @Prop({ default: '' })
      lat?: string;
    
      @Prop({ default: '' })
      lng?: string;
    
    @Prop({
        required: false,
        type: Boolean,
        default: false,
        set: v => v === true || v === 'true'
    })
    remind?: boolean;
    
    @Prop({ type: Object, default: undefined })
    audio?: NoteMedia;

    @Prop({ type: Object, default: undefined })
    image?: NoteMedia;


    @Prop({ default: () => new Date().toISOString() })
    createdAt: string;
}

export const MediaBaseSchema =
    SchemaFactory.createForClass(MediaBase);
