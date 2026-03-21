import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const RoomTypeValues = ['OLD', 'NEW'] as const;
type RoomType = typeof RoomTypeValues[number];

export class QueryRoomDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '机房类型', enum: RoomTypeValues })
  @IsOptional()
  @IsIn(RoomTypeValues)
  type?: RoomType;
}
