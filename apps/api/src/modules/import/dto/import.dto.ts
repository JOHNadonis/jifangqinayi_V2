import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ImportType {
  RACKS = 'racks',
  TEMPLATES = 'templates',
  DEVICES = 'devices',
}

export class ImportResultDto {
  @ApiProperty({ description: '成功数量' })
  success: number;

  @ApiProperty({ description: '失败数量' })
  failed: number;

  @ApiProperty({ description: '错误信息列表' })
  errors: string[];
}
