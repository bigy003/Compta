import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { NotesFraisService } from './notes-frais.service';

class CreateNoteFraisDto {
  date: string;
  montant: number;
  description?: string;
  categorie?: string;
}

@Controller('societes/:societeId/notes-frais')
export class NotesFraisController {
  constructor(private readonly notesFraisService: NotesFraisService) {}

  @Get()
  list(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.notesFraisService.listBySociete(societeId, from, to);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateNoteFraisDto,
  ) {
    return this.notesFraisService.createForSociete(societeId, dto);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateNoteFraisDto>,
  ) {
    return this.notesFraisService.update(societeId, id, dto);
  }

  @Patch(':id/statut')
  updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: { statut: string },
  ) {
    return this.notesFraisService.updateStatut(societeId, id, dto.statut);
  }

  @Delete(':id')
  delete(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.notesFraisService.delete(societeId, id);
  }

  @Post(':id/upload-justificatif')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/justificatifs',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `justificatif-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Type de fichier non autorisé. Formats acceptés: JPEG, PNG, PDF'), false);
        }
      },
    }),
  )
  async uploadJustificatif(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }
    const justificatifUrl = `/uploads/justificatifs/${file.filename}`;
    return this.notesFraisService.updateJustificatif(societeId, id, justificatifUrl);
  }

  @Get('justificatif/:filename')
  async getJustificatif(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return res.sendFile(filename, { root: './uploads/justificatifs' });
  }
}
