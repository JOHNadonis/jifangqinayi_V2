import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCableDto } from './create-cable.dto';

export class UpdateCableDto extends PartialType(
  OmitType(CreateCableDto, ['srcDeviceId', 'srcPortIndex', 'dstDeviceId', 'dstPortIndex'] as const)
) {}
