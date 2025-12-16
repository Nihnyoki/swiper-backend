import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Video, VideoSchema } from './video.schema';
import { Audio, AudioSchema } from './audio.schema';

@Schema({ _id: false })
export class ChildItems {
  @Prop({ required: true })
  key: number;

  @Prop({ required: true })
  val: string;

  @Prop({
    type: [VideoSchema, AudioSchema],
    default: [],
  })
  data: Array<Video | Audio>;
}

export const ChildItemsSchema = SchemaFactory.createForClass(ChildItems);
