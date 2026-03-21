import {
  Controller,
  Post,
  Get,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// File type for multer uploaded files
interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('数据导入')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // ========== 下载模板 ==========

  @Get('template/racks')
  @ApiOperation({ summary: '下载机柜导入模板' })
  async downloadRacksTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateRacksTemplate();
    this.sendExcel(res, buffer, '机柜导入模板.xlsx');
  }

  @Get('template/templates')
  @ApiOperation({ summary: '下载设备模板导入模板' })
  async downloadTemplatesTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateTemplatesTemplate();
    this.sendExcel(res, buffer, '设备模板导入模板.xlsx');
  }

  @Get('template/devices')
  @ApiOperation({ summary: '下载设备导入模板' })
  async downloadDevicesTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateDevicesTemplate();
    this.sendExcel(res, buffer, '设备导入模板.xlsx');
  }

  // ========== 导入数据 ==========

  @Post('racks')
  @ApiOperation({ summary: '导入机柜数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importRacks(@UploadedFile() file: UploadedFileType) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.importService.importRacks(file.buffer);
  }

  @Post('templates')
  @ApiOperation({ summary: '导入设备模板数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importTemplates(@UploadedFile() file: UploadedFileType) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.importService.importTemplates(file.buffer);
  }

  @Post('devices')
  @ApiOperation({ summary: '导入设备数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importDevices(@UploadedFile() file: UploadedFileType) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.importService.importDevices(file.buffer);
  }

  private sendExcel(res: Response, buffer: Buffer, filename: string) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(buffer);
  }
}
