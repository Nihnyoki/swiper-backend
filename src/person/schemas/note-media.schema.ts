import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class NoteMedia {
    @Prop({ required: true })
    type: string;

    @Prop()
    url?: string;
}

export const NoteMediaSchema = SchemaFactory.createForClass(NoteMedia);
