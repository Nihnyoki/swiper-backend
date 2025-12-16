// src/person/dto/business.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
//import { ThingsChildDto } from './thingschild';

export class ThingsDto {
  @ApiProperty()
  key: number;

  @ApiProperty()
  val: string;

  @ApiProperty()
  childItems: Object[];

}