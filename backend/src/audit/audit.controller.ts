import { Controller, Get, Param, Res } from '@nestjs/common';
import { AuditService } from './audit.service';
import type { Response } from 'express';

@Controller('societes/:societeId/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('rapport-pdf')
  async getRapportPdf(
    @Param('societeId') societeId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.auditService.generateRapportPdfBuffer(societeId);
    const filename = `rapport-audit-${societeId}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('controles')
  async executerControles(@Param('societeId') societeId: string) {
    return this.auditService.executerControles(societeId);
  }

  @Get('resume')
  async getResume(@Param('societeId') societeId: string) {
    return this.auditService.getResumeControles(societeId);
  }
}
