import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const DeviceTypeValues = ['SERVER', 'SWITCH', 'ROUTER', 'FIREWALL', 'STORAGE', 'PDU', 'OTHER'] as const;
type DeviceType = typeof DeviceTypeValues[number];

export class QueryTemplateDto {
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

  @ApiPropertyOptional({ description: '搜索关键词（品牌或型号）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '品牌筛选' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '型号筛选' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '设备类型筛选', enum: DeviceTypeValues })
  @IsOptional()
  @IsIn(DeviceTypeValues)
  deviceType?: DeviceType;
}
