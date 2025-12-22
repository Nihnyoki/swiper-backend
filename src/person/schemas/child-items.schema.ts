import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Video } from './video.schema';
import { Audio } from './audio.schema';
import { Note } from './note.schema';
import { MediaBase, MediaBaseSchema } from './media.schema';

@Schema({ _id: false })
export class ChildItems {
  @Prop({ required: true })
  key: number;

  @Prop({ required: true })
  val: string;

  @Prop({
    type: [MediaBaseSchema],
    default: [],
  })
  data: Array<Video | Audio | Note >;
}

export const ChildItemsSchema = SchemaFactory.createForClass(ChildItems);
