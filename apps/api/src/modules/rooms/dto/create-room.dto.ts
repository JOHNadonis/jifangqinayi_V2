import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const RoomTypeValues = ['OLD', 'NEW'] as const;
type RoomType = typeof RoomTypeValues[number];

export class CreateRoomDto {
  @ApiProperty({ description: '机房名称', example: '新机房A' })
  @IsString()
  @IsNotEmpty({ message: '机房名称不能为空' })
  name: string;

  @ApiProperty({ description: '机房位置', example: '北京市朝阳区XX大厦3层' })
  @IsString()
  @IsNotEmpty({ message: '机房位置不能为空' })
  location: string;

  @ApiPropertyOptional({ description: '机房类型', enum: RoomTypeValues, default: 'OLD' })
  @IsOptional()
  @IsIn(RoomTypeValues)
  type?: RoomType;

  @ApiPropertyOptional({ description: '机房描述', example: '主要存放核心网络设备' })
  @IsOptional()
  @IsString()
  description?: string;
}
