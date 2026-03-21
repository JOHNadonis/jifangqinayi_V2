import { IsString, IsNotEmpty, IsIn, IsInt, Min, Max, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DeviceTypeValues = ['SERVER', 'SWITCH', 'ROUTER', 'FIREWALL', 'STORAGE', 'PDU', 'OTHER'] as const;
type DeviceType = typeof DeviceTypeValues[number];

export interface PortDefinition {
  index: string;
  type: string;
  label?: string;
  positionX?: number;
  positionY?: number;
}

export interface PortLayoutData {
  front?: PortDefinition[];
  rear?: PortDefinition[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: '品牌', example: 'Dell' })
  @IsString()
  @IsNotEmpty({ message: '品牌不能为空' })
  brand: string;

  @ApiProperty({ description: '型号', example: 'PowerEdge R740' })
  @IsString()
  @IsNotEmpty({ message: '型号不能为空' })
  model: string;

  @ApiProperty({ description: '设备高度（U）', example: 2, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1, { message: '设备高度至少为1U' })
  @Max(50, { message: '设备高度不能超过50U' })
  sizeU: number;

  @ApiProperty({ description: '设备类型', enum: DeviceTypeValues, example: 'SERVER' })
  @IsIn(DeviceTypeValues, { message: '设备类型无效' })
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: '前面板图片URL', example: 'https://example.com/front.png' })
  @IsOptional()
  @IsString()
  frontImage?: string;

  @ApiPropertyOptional({ description: '后面板图片URL', example: 'https://example.com/rear.png' })
  @IsOptional()
  @IsString()
  rearImage?: string;

  @ApiPropertyOptional({
    description: '端口布局（JSONB格式）',
    example: {
      front: [
        { index: 'eth0', type: 'RJ45', label: 'Management', positionX: 10, positionY: 20 },
        { index: 'eth1', type: 'RJ45', label: 'Data1', positionX: 50, positionY: 20 },
      ],
      rear: [
        { index: 'pwr1', type: 'Power', label: 'PSU1', positionX: 10, positionY: 30 },
        { index: 'pwr2', type: 'Power', label: 'PSU2', positionX: 60, positionY: 30 },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  portLayout?: PortLayoutData;

  @ApiPropertyOptional({ description: '是否公开模板', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
