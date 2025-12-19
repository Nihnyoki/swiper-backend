// src/person/schemas/audio.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

    @Prop()
    creator?: string;

    @Prop({ default: () => new Date().toISOString() })
    createdAt: string;
}

export const MediaBaseSchema =
    SchemaFactory.createForClass(MediaBase);
