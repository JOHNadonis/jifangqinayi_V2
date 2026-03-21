import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CableType {
  FIBER = 'FIBER',
  CAT6 = 'CAT6',
  CAT5E = 'CAT5E',
  POWER = 'POWER',
  OTHER = 'OTHER',
}

export class CreateCableDto {
  @ApiProperty({ description: '源设备ID' })
  @IsUUID()
  @IsNotEmpty({ message: '源设备ID不能为空' })
  srcDeviceId: string;

  @ApiProperty({ description: '源端口索引', example: '1-1' })
  @IsString()
  @IsNotEmpty({ message: '源端口索引不能为空' })
  srcPortIndex: string;

  @ApiProperty({ description: '目标设备ID' })
  @IsUUID()
  @IsNotEmpty({ message: '目标设备ID不能为空' })
  dstDeviceId: string;

  @ApiProperty({ description: '目标端口索引', example: '2-5' })
  @IsString()
  @IsNotEmpty({ message: '目标端口索引不能为空' })
  dstPortIndex: string;

  @ApiProperty({
    description: '连线类型',
    enum: CableType,
    example: CableType.FIBER
  })
  @IsEnum(CableType, { message: '连线类型不合法' })
  @IsNotEmpty({ message: '连线类型不能为空' })
  cableType: CableType;

  @ApiPropertyOptional({ description: '颜色', example: '蓝色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '长度(米)', example: 15.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ description: '用途', example: '数据传输' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: '照片URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
