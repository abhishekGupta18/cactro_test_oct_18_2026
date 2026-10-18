import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface BookingConfirmationEmailPayload {
  to: string;
  customerName: string;
  bookingId: string;
  eventTitle: string;
  eventLocation: string;
  eventDateTime: Date;
  seatsCount: number;
  totalAmount: number;
}

export interface EventUpdateEmailPayload {
  to: string;
  customerName: string;
  eventTitle: string;
  updateMessage: string;
  newDateTime?: Date;
  newLocation?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';

    if (apiKey && apiKey !== 're_your_api_key_here') {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client successfully initialized');
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured. Real emails will fail or fallback.',
      );
    }
  }

  async sendBookingConfirmation(payload: BookingConfirmationEmailPayload): Promise<{ success: boolean; id?: string }> {
    const {
      to,
      customerName,
      bookingId,
      eventTitle,
      eventLocation,
      eventDateTime,
      seatsCount,
      totalAmount,
    } = payload;

    const formattedDate = new Date(eventDateTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
            .card { background-color: #ffffff; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: 600; padding: 6px 16px; border-radius: 9999px; font-size: 14px; }
            .details { margin: 24px 0; background: #f8fafc; border-radius: 8px; padding: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: 600; color: #0f172a; }
            .footer { text-align: center; font-size: 13px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="badge">Booking Confirmed ✓</span>
              <h2 style="margin: 16px 0 8px 0; color: #0f172a;">You're going to ${eventTitle}!</h2>
              <p style="margin: 0; color: #64748b;">Hi ${customerName}, your tickets are booked.</p>
            </div>
            <div class="details">
              <div class="row">
                <span class="label">Booking ID:</span>
                <span class="value" style="font-family: monospace;">${bookingId}</span>
              </div>
              <div class="row">
                <span class="label">Event:</span>
                <span class="value">${eventTitle}</span>
              </div>
              <div class="row">
                <span class="label">Date & Time:</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="row">
                <span class="label">Location:</span>
                <span class="value">${eventLocation}</span>
              </div>
              <div class="row">
                <span class="label">Tickets:</span>
                <span class="value">${seatsCount} seat(s)</span>
              </div>
              <div class="row" style="border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
                <span class="label" style="font-size: 16px; font-weight: 700;">Total Paid:</span>
                <span class="value" style="font-size: 16px; font-weight: 700; color: #2563eb;">$${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for using Event Booking System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (!this.resend) {
      this.logger.warn(`Simulating email delivery (no RESEND_API_KEY configured) to: ${to}`);
      return { success: true, id: 'simulated-resend-id' };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Booking Confirmation: ${eventTitle} [ID: ${bookingId.slice(0, 8)}]`,
        html: htmlContent,
      });

      if (response.error) {
        this.logger.error(`Failed to send booking confirmation email to ${to}: ${response.error.message}`);
        return { success: false };
      }

      this.logger.log(`Booking confirmation email delivered to ${to} (Message ID: ${response.data?.id})`);
      return { success: true, id: response.data?.id };
    } catch (error) {
      this.logger.error(`Exception while sending email via Resend to ${to}`, error);
      return { success: false };
    }
  }

  async sendEventUpdateNotification(payload: EventUpdateEmailPayload): Promise<{ success: boolean; id?: string }> {
    const { to, customerName, eventTitle, updateMessage, newDateTime, newLocation } = payload;

    const formattedDate = newDateTime
      ? new Date(newDateTime).toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 20px; }
            .card { background-color: #ffffff; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .alert-banner { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="color: #1e293b;">Important Update for "${eventTitle}"</h2>
            <p>Dear ${customerName},</p>
            <p>The organizer has announced an update for your upcoming event:</p>
            <div class="alert-banner">
              <strong>Update Details:</strong>
              <p style="margin: 8px 0 0 0;">${updateMessage}</p>
            </div>
            ${
              formattedDate
                ? `<p><strong>Updated Date/Time:</strong> ${formattedDate}</p>`
                : ''
            }
            ${
              newLocation
                ? `<p><strong>Updated Location:</strong> ${newLocation}</p>`
                : ''
            }
            <p>Your existing tickets remain valid. If you have questions, please contact the event organizer.</p>
            <div class="footer">
              <p>Sent by Event Booking System Notification Service</p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (!this.resend) {
      this.logger.warn(`Simulating event update email (no RESEND_API_KEY) to: ${to}`);
      return { success: true, id: 'simulated-resend-id' };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Update regarding your event: ${eventTitle}`,
        html: htmlContent,
      });

      if (response.error) {
        this.logger.error(`Failed to send event update email to ${to}: ${response.error.message}`);
        return { success: false };
      }

      this.logger.log(`Event update notification email delivered to ${to} (Message ID: ${response.data?.id})`);
      return { success: true, id: response.data?.id };
    } catch (error) {
      this.logger.error(`Exception while sending event update email to ${to}`, error);
      return { success: false };
    }
  }
}
