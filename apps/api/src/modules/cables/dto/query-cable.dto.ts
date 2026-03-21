import { IsOptional, IsEnum, IsUUID, IsInt, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CableType } from './create-cable.dto';

export enum CableStatus {
  RECORDED = 'RECORDED',
  LABELED = 'LABELED',
  DISCONNECTED = 'DISCONNECTED',
  VERIFIED = 'VERIFIED',
}

export class QueryCableDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '搜索关键词（追溯码）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '状态筛选',
    enum: CableStatus
  })
  @IsOptional()
  @IsEnum(CableStatus)
  status?: CableStatus;

  @ApiPropertyOptional({
    description: '连线类型筛选',
    enum: CableType
  })
  @IsOptional()
  @IsEnum(CableType)
  cableType?: CableType;

  @ApiPropertyOptional({ description: '设备ID筛选（源或目标）' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
