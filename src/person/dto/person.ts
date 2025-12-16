// src/person/dto/person.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressDto } from './address';
import { DocumentItemDto } from './document-item';
import { ThingsDto } from './things';
import { Ifath } from './ifath';

export class PersonDto {

  @ApiProperty()
  name: string;

  @ApiProperty()
  gender: "male" | "female";

  @ApiProperty()
  type: string;

  @ApiProperty()
  age: string;

  @ApiProperty()
  emoji: string;

  @ApiProperty()
  Ifath: Ifath;

  @ApiProperty()
  id_number: string;

  @ApiProperty()
  passport_number?: string;

  @ApiProperty({ type: [String] })
  interests: string[];

  @ApiPropertyOptional()
  mother_id?: string;

  @ApiPropertyOptional()
  father_id?: string;

  @ApiPropertyOptional()
  children?: PersonDto[]

  @ApiPropertyOptional({ type: AddressDto })
  address?: AddressDto;

  @ApiPropertyOptional({ type: [ThingsDto], description: 'Optional list of THINGS' })
  THINGS?: ThingsDto[];

}