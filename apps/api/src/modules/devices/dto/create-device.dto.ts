import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DeviceStatusValues = ['ONLINE', 'MOVING', 'OFFLINE', 'ARRIVED'] as const;
type DeviceStatus = typeof DeviceStatusValues[number];

export class CreateDeviceDto {
  @ApiProperty({ description: '设备名称', example: 'DB-Server-01' })
  @IsString()
  @IsNotEmpty({ message: '设备名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '资产编号', example: 'ASSET-2024-001' })
  @IsOptional()
  @IsString()
  assetTag?: string;

  @ApiProperty({ description: '设备模板ID' })
  @IsUUID()
  @IsNotEmpty({ message: '设备模板ID不能为空' })
  templateId: string;

  @ApiPropertyOptional({ description: '机柜ID' })
  @IsOptional()
  @IsUUID()
  rackId?: string;

  @ApiPropertyOptional({ description: 'U位位置（从下往上，1开始）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  positionU?: number;

  @ApiPropertyOptional({
    description: '设备状态',
    enum: DeviceStatusValues,
    default: 'ONLINE'
  })
  @IsOptional()
  @IsIn(DeviceStatusValues)
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;
}
