import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRackDto {
  @ApiProperty({ description: '机柜名称', example: 'A01' })
  @IsString()
  @IsNotEmpty({ message: '机柜名称不能为空' })
  name: string;

  @ApiProperty({ description: '所属机房ID' })
  @IsUUID()
  @IsNotEmpty({ message: '机房ID不能为空' })
  roomId: string;

  @ApiPropertyOptional({ description: 'U位数量', default: 42 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  totalU?: number;

  @ApiPropertyOptional({ description: '行号' })
  @IsOptional()
  @IsNumber()
  row?: number;

  @ApiPropertyOptional({ description: '列号' })
  @IsOptional()
  @IsNumber()
  column?: number;

  @ApiPropertyOptional({ description: '位置描述' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '描述信息' })
  @IsOptional()
  @IsString()
  description?: string;
}
