import { IsUUID, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveDeviceDto {
  @ApiProperty({ description: '目标机柜ID' })
  @IsUUID()
  @IsNotEmpty({ message: '目标机柜ID不能为空' })
  targetRackId: string;

  @ApiProperty({ description: '目标U位位置（从下往上，1开始）' })
  @IsNumber()
  @IsNotEmpty({ message: '目标U位位置不能为空' })
  @Min(1)
  @Max(52)
  targetPositionU: number;
}
