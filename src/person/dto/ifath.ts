// src/person/dto/address.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class Ifath {
  @ApiProperty()
  name: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  tyte: string;

  @ApiProperty()
  data: string;
}

