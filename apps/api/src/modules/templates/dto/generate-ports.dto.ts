import { IsInt, Min, Max, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PortGeneratePosition {
  FRONT = 'front',
  REAR = 'rear',
  BOTH = 'both',
}

export enum PortGenerateType {
  RJ45 = 'RJ45',
  SFP = 'SFP',
  SFP_PLUS = 'SFP+',
  QSFP = 'QSFP',
  POWER = 'Power',
  USB = 'USB',
  SERIAL = 'Serial',
}

export class GeneratePortsDto {
  @ApiProperty({ description: '端口数量', example: 24, minimum: 1, maximum: 128 })
  @IsInt()
  @Min(1, { message: '端口数量至少为1' })
  @Max(128, { message: '端口数量不能超过128' })
  count: number;

  @ApiProperty({ description: '端口类型', enum: PortGenerateType, example: PortGenerateType.RJ45 })
  @IsEnum(PortGenerateType, { message: '端口类型无效' })
  portType: PortGenerateType;

  @ApiPropertyOptional({ description: '生成位置', enum: PortGeneratePosition, default: PortGeneratePosition.FRONT })
  @IsOptional()
  @IsEnum(PortGeneratePosition)
  position?: PortGeneratePosition;

  @ApiPropertyOptional({ description: '端口前缀', example: 'eth', default: 'port' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ description: '起始编号', example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startIndex?: number;

  @ApiPropertyOptional({ description: '每行端口数', example: 8, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32)
  portsPerRow?: number;

  @ApiPropertyOptional({ description: '端口间距（像素）', example: 40, default: 40 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  spacing?: number;

  @ApiPropertyOptional({ description: '起始X坐标', example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startX?: number;

  @ApiPropertyOptional({ description: '起始Y坐标', example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startY?: number;

  @ApiPropertyOptional({ description: '行间距（像素）', example: 50, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  rowSpacing?: number;
}
