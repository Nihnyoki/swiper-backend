// src/person/dto/business.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class ThingsChildDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  val: string;

  @ApiProperty()
  data: Record<string, any>;
}