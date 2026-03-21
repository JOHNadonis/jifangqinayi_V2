import { IsOptional, IsString, IsNumber, IsUUID, IsIn, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const DeviceStatusValues = ['ONLINE', 'MOVING', 'OFFLINE', 'ARRIVED'] as const;
type DeviceStatus = typeof DeviceStatusValues[number];

export class QueryDeviceDto {
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

  @ApiPropertyOptional({ description: '搜索关键词（设备名称或资产编号）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '设备状态', enum: DeviceStatusValues })
  @IsOptional()
  @IsIn(DeviceStatusValues)
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: '机柜ID' })
  @IsOptional()
  @IsUUID()
  rackId?: string;

  @ApiPropertyOptional({ description: '设备模板ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}
