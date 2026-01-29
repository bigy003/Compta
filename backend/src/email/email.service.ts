import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuration SMTP depuis les variables d'environnement
    // Par défaut, utilise un transport de test (pour développement)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour autres ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendInvoiceEmail(
    to: string,
    subject: string,
    pdfBuffer: Buffer,
    factureNumero: string,
    societeNom: string,
  ): Promise<void> {
    if (!to || !to.includes('@')) {
      throw new Error('Adresse email du destinataire invalide');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Facture ${factureNumero}</h2>
          <p>Bonjour,</p>
          <p>Vous trouverez ci-joint la facture <strong>${factureNumero}</strong> de <strong>${societeNom}</strong>.</p>
          <p>Cordialement,<br>${societeNom}</p>
        </div>
      `,
      attachments: [
        {
          filename: `facture-${factureNumero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur envoi email:', error);
      throw new Error(`Impossible d'envoyer l'email: ${error.message}`);
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
      to,
      subject: 'Test email - Système de facturation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Test de configuration email</h2>
          <p>Si vous recevez cet email, la configuration SMTP est correcte.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur envoi email test:', error);
      throw new Error(`Impossible d'envoyer l'email de test: ${error.message}`);
    }
  }
}
