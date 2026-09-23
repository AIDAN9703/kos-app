/**
 * Email Service
 * Handles all transactional emails for bookings
 */

import { Resend } from 'resend';
import { BookingDetails } from '@/features/bookings/booking.types';
import { formatCentsAsCurrency } from '@/shared/lib/utils/money-utils';
import { format } from 'date-fns';
import { parseDateTimeInBoatTimezone } from '@/shared/lib/utils/date-helpers';
import { formatTime12Hour } from '@/shared/lib/utils/general-utils';
import { getBaseUrl } from '@/shared/lib/utils/base-url';

// Initialize Resend (will fail gracefully if API key not set)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'bookings@kossailing.com';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Kings Of The Sea Yachts';

// Brand colors
const BRAND_NAVY = '#27445c';
const BRAND_GOLD = '#b2a37a';
const BRAND_NAVY_LIGHT = '#3a5a7a';
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#6b7280';
const BORDER_COLOR = '#e5e7eb';
const BG_LIGHT = '#f9fafb';
const BG_WARM = '#fdfcfa';
const BG_SHELL = '#eef4f3';

/** Minimal escaping for HTML email bodies (names, boat titles). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extra styles for the charter proposal email only (paired with baseEmailStyles).
 */
const proposalEmailStyles = `
  <style>
    .proposal-body {
      background-color: ${BG_SHELL};
      padding: 28px 16px 40px;
    }
    .proposal-shell {
      max-width: 560px;
      margin: 0 auto;
      background-color: ${BG_WARM};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(39, 68, 92, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(178, 163, 122, 0.25);
    }
    .proposal-content {
      padding: 36px 32px 40px;
    }
    .proposal-greeting {
      font-size: 17px;
      color: ${TEXT_PRIMARY};
      margin: 0 0 18px;
      font-weight: 600;
    }
    .proposal-lead {
      font-size: 15px;
      color: ${TEXT_SECONDARY};
      line-height: 1.75;
      margin: 0 0 28px;
    }
    .proposal-boat-card {
      background-color: #ffffff;
      border: 1px solid #e8dfd0;
      border-radius: 10px;
      padding: 18px 22px;
      margin-bottom: 28px;
      box-shadow: 0 1px 0 rgba(178, 163, 122, 0.15);
    }
    .proposal-boat-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${TEXT_SECONDARY};
      margin-bottom: 8px;
    }
    .proposal-boat-name {
      font-size: 18px;
      font-weight: 600;
      color: ${BRAND_NAVY};
      margin: 0;
      line-height: 1.35;
    }
    .proposal-cta-wrap {
      text-align: center;
      margin: 8px 0 28px;
    }
    .proposal-next {
      background: linear-gradient(180deg, #f8f6f2 0%, #f3f0ea 100%);
      border-radius: 10px;
      border: 1px solid #e5e0d6;
      padding: 20px 22px;
      margin: 0;
    }
    .proposal-next-title {
      font-size: 13px;
      font-weight: 700;
      color: ${BRAND_NAVY};
      margin: 0 0 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .proposal-next ul {
      margin: 0;
      padding-left: 18px;
      color: ${TEXT_SECONDARY};
      font-size: 14px;
      line-height: 1.65;
    }
    .proposal-next li {
      margin-bottom: 6px;
    }
    .proposal-next li:last-child {
      margin-bottom: 0;
    }
    .proposal-signoff {
      margin-top: 32px;
      font-size: 15px;
      color: ${TEXT_PRIMARY};
      line-height: 1.65;
    }
    .proposal-footer {
      background-color: #f4f1eb;
      padding: 22px 28px;
      text-align: center;
      border-top: 1px solid #e8e4dc;
    }
    .proposal-footer-muted {
      font-size: 13px;
      color: ${TEXT_SECONDARY};
      margin: 0 0 6px;
      line-height: 1.55;
    }
    .proposal-brand {
      font-size: 14px;
      font-weight: 600;
      color: ${BRAND_NAVY};
      margin: 8px 0 0;
      letter-spacing: 0.02em;
    }
    @media only screen and (max-width: 600px) {
      .proposal-content {
        padding: 28px 22px 32px;
      }
    }
  </style>
`;

/**
 * Base email template styles
 */
const baseEmailStyles = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${TEXT_PRIMARY};
      background-color: ${BG_LIGHT};
      padding: 20px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background-color: ${BRAND_NAVY};
      padding: 32px 24px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .email-content {
      padding: 40px 32px;
    }
    .greeting {
      font-size: 16px;
      color: ${TEXT_PRIMARY};
      margin-bottom: 24px;
      font-weight: 500;
    }
    .message {
      font-size: 15px;
      color: ${TEXT_SECONDARY};
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .booking-details {
      background-color: ${BG_LIGHT};
      border: 1px solid ${BORDER_COLOR};
      border-radius: 8px;
      padding: 24px;
      margin: 32px 0;
    }
    .booking-details-title {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND_NAVY};
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${BRAND_GOLD};
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid ${BORDER_COLOR};
    }
    .detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      font-size: 14px;
      color: ${TEXT_SECONDARY};
      font-weight: 500;
      flex: 0 0 40%;
    }
    .detail-value {
      font-size: 14px;
      color: ${TEXT_PRIMARY};
      font-weight: 600;
      text-align: right;
      flex: 1;
    }
    .detail-value.total {
      font-size: 18px;
      color: ${BRAND_NAVY};
    }
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_NAVY} !important;
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      margin: 24px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: ${BRAND_NAVY_LIGHT} !important;
      color: #ffffff !important;
    }
    a.cta-button {
      color: #ffffff !important;
      text-decoration: none !important;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .info-box {
      background-color: ${BG_LIGHT};
      border-left: 4px solid ${BRAND_GOLD};
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-box-title {
      font-size: 14px;
      font-weight: 600;
      color: ${TEXT_PRIMARY};
      margin-bottom: 8px;
    }
    .info-box-text {
      font-size: 14px;
      color: ${TEXT_SECONDARY};
      line-height: 1.6;
    }
    .email-footer {
      background-color: ${BG_LIGHT};
      padding: 24px 32px;
      border-top: 1px solid ${BORDER_COLOR};
      text-align: center;
    }
    .email-footer-text {
      font-size: 13px;
      color: ${TEXT_SECONDARY};
      margin-bottom: 8px;
    }
    .company-name {
      font-size: 15px;
      font-weight: 600;
      color: ${BRAND_NAVY};
      margin-top: 16px;
    }
    .signature {
      margin-top: 32px;
      font-size: 15px;
      color: ${TEXT_PRIMARY};
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-error {
      background-color: #fee2e2;
      color: #991b1b;
    }
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 24px 20px;
      }
      .detail-item {
        flex-direction: column;
        gap: 4px;
      }
      .detail-value {
        text-align: left;
      }
    }
  </style>
`;

/**
 * Send the charter proposal email with the link to view and accept
 * Called automatically when admin creates a booking/group
 */
export async function sendProposalEmail(params: {
  customerName: string;
  customerEmail: string;
  proposalLink: string;
  boatName?: string;
  isGroup?: boolean;
  /** Re-send after edits: same link, "updated" subject + lead copy. */
  isUpdate?: boolean;
}): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured. Proposal email not sent.');
    return false;
  }

  const { customerName, customerEmail, proposalLink, boatName, isGroup, isUpdate } = params;
  if (!customerEmail) {
    console.error('No email address for proposal email');
    return false;
  }

  const subject = isUpdate
    ? `Your charter proposal has been updated${boatName && !isGroup ? ` - ${boatName}` : ''}`
    : isGroup
      ? `Your yacht charter proposal from Kings Of The Sea`
      : `Your yacht charter proposal - ${boatName || 'KOS Yachts'}`;

  const safeName = escapeHtml((customerName || 'there').trim() || 'there');
  const safeBoat = boatName ? escapeHtml(boatName.trim()) : '';

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject,
      html: buildBrandEmailHtml({
        previewText: isUpdate
          ? "Your charter proposal has been updated — same link, latest details."
          : "Your charter proposal is ready — open to review pricing and accept when you're ready.",
        contentHtml: `
              <p class="proposal-greeting">Hi ${safeName},</p>

              <p class="proposal-lead">
                ${
                  isUpdate
                    ? `We've updated your charter proposal${
                        safeBoat ? ` for <strong>${safeBoat}</strong>` : ''
                      } — the link below always shows the latest details.`
                    : `We've prepared a personalized proposal for your upcoming experience on the water${
                        safeBoat ? `. Take a look at what's lined up for <strong>${safeBoat}</strong>.` : '.'
                      }${isGroup ? ' This proposal may include multiple vessels.' : ''}`
                }
              </p>

              ${
                safeBoat
                  ? `
              <div class="proposal-boat-card">
                <div class="proposal-boat-label">Yacht</div>
                <p class="proposal-boat-name">${safeBoat}</p>
              </div>`
                  : ''
              }

              <div class="proposal-cta-wrap">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="border-radius:10px;background:${BRAND_NAVY};box-shadow:0 4px 16px rgba(39,68,92,0.28);">
                      <a href="${proposalLink}" target="_blank" rel="noopener noreferrer"
                        style="display:inline-block;padding:16px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;border-radius:10px;">
                        View full proposal
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <div class="proposal-next">
                <p class="proposal-next-title">What happens next</p>
                <ul>
                  <li>Open your proposal to see the full breakdown and add-ons.</li>
                  <li>Accept when you're ready — you can complete payment online if enabled.</li>
                  <li>Questions? Reply to this email and our team will help.</li>
                </ul>
              </div>

              <p class="proposal-signoff">
                Warm regards,<br>
                <span class="company-name" style="display:inline-block;margin-top:8px;">Kings Of The Sea Yachts</span>
              </p>`,
      }),
    });

    if (error) {
      console.error('Failed to send proposal email:', error);
      return false;
    }
    console.log('Proposal email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending proposal email:', error);
    return false;
  }
}

/**
 * Inquiry acknowledgment — the instant "we got it" email for public lead
 * forms (replaces the old GoHighLevel automation email). Logo-first header,
 * white background, one photo — quiet and branded.
 */

/** Absolute asset URLs — email clients can't load relative paths. */
const EMAIL_ASSET_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://kosyachts.com';
const EMAIL_LOGO_URL = `${EMAIL_ASSET_BASE}/icons/transparent-logo.png`;
const EMAIL_BG_URL = `${EMAIL_ASSET_BASE}/images/koshero.jpg`;
const EMAIL_CONTACT = 'contact@kosyachts.com';

/**
 * Shared shell for all customer-facing emails: logo-first white header with a
 * gold rule, photo backdrop (white fallback), contact footer. No headline, no
 * subhead — the approved house style. Content goes straight below the logo.
 */
function buildBrandEmailHtml(params: { previewText: string; contentHtml: string }): string {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          ${baseEmailStyles}
          ${proposalEmailStyles}
          <style>
            .ack-body {
              background-color: #ffffff;
              background-image: url('${EMAIL_BG_URL}');
              background-size: cover;
              background-position: center;
              padding: 40px 16px 56px;
            }
            .ack-header {
              background-color: #ffffff;
              padding: 30px 28px 22px;
              text-align: center;
              border-bottom: 3px solid ${BRAND_GOLD};
            }
          </style>
        </head>
        <body class="proposal-body ack-body">
          <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
            ${params.previewText}
          </div>

          <div class="proposal-shell">
            <div class="ack-header">
              <img src="${EMAIL_LOGO_URL}" alt="Kings Of The Sea Yachts" width="72" height="72"
                style="display:inline-block;width:72px;height:72px;border-radius:50%;" />
            </div>

            <div class="proposal-content">
${params.contentHtml}
            </div>

            <div class="proposal-footer">
              <p class="proposal-footer-muted">
                Questions? Reply directly to this message or write to<br>
                <a href="mailto:${EMAIL_CONTACT}" style="color:${BRAND_NAVY};font-weight:600;text-decoration:none;">${EMAIL_CONTACT}</a>
              </p>
              <p class="proposal-brand">Kings Of The Sea Yachts</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

interface InquiryAckEmailParams {
  customerName: string;
  customerEmail: string;
  /** "Term charter" reads differently than a day charter in the copy. */
  inquiryType?: 'CHARTER' | 'TERM_CHARTER';
  /** Optional "what you told us" rows, e.g. [{ label: 'Date', value: 'Aug 20' }]. */
  details?: { label: string; value: string }[];
}

function buildInquiryAcknowledgmentHtml(params: InquiryAckEmailParams): string {
  const { customerName, inquiryType = 'CHARTER', details = [] } = params;
  const isTerm = inquiryType === 'TERM_CHARTER';
  const safeName = escapeHtml((customerName || 'there').trim() || 'there');
  const safeDetails = details
    .filter((d) => d.value?.trim())
    .map((d) => ({ label: escapeHtml(d.label), value: escapeHtml(d.value) }));

  const detailsBlock =
    safeDetails.length > 0
      ? `
              <div class="proposal-boat-card">
                <div class="proposal-boat-label">Your request</div>
                ${safeDetails
                  .map(
                    (d) => `
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">${d.label}:</span>
                  <strong style="font-weight:600;">&nbsp;${d.value}</strong>
                </p>`
                  )
                  .join('')}
              </div>`
      : '';

  return buildBrandEmailHtml({
    previewText: 'Your inquiry is with our team — a charter specialist will reach out shortly.',
    contentHtml: `
              <p class="proposal-greeting">Hi ${safeName},</p>

              <p class="proposal-lead">
                Thanks for reaching out to Kings Of The Sea. A charter specialist is reviewing
                your request and will get back to you with ${isTerm ? 'itinerary options' : 'boat options'}
                and pricing.
              </p>
              ${detailsBlock}

              <div class="proposal-next">
                <p class="proposal-next-title">What happens next</p>
                <ul>
                  <li>A charter specialist reviews your request.</li>
                  <li>We reply within 24 hours with options and pricing.</li>
                  <li>Need us sooner? Call or text <strong>(305) 521-8877</strong>.</li>
                </ul>
              </div>

              <p class="proposal-signoff">
                Warm regards,<br>
                <span class="company-name" style="display:inline-block;margin-top:8px;">Kings Of The Sea Yachts</span>
              </p>`,
  });
}

export async function sendInquiryAcknowledgmentEmail(
  params: InquiryAckEmailParams
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured. Inquiry acknowledgment not sent.');
    return false;
  }
  if (!params.customerEmail) {
    console.error('No email address for inquiry acknowledgment');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.customerEmail,
      subject:
        params.inquiryType === 'TERM_CHARTER'
          ? 'We received your term charter inquiry — Kings Of The Sea'
          : 'We received your charter inquiry — Kings Of The Sea',
      html: buildInquiryAcknowledgmentHtml(params),
    });

    if (error) {
      console.error('Failed to send inquiry acknowledgment email:', error);
      return false;
    }
    console.log('Inquiry acknowledgment email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending inquiry acknowledgment email:', error);
    return false;
  }
}

/**
 * Send booking confirmation email (after payment)
 */
export async function sendBookingConfirmationEmail(
  booking: BookingDetails
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured. Email not sent.');
    return false;
  }

  const customerEmail = booking.customerEmail || booking.userEmail;
  if (!customerEmail) {
    console.error('No email address found for booking:', booking.id);
    return false;
  }

  // Boat-local: the customer must read the hour the captain expects them.
  const { date: startDate, time: startTime } = parseDateTimeInBoatTimezone(
    booking.startDateTime,
    { timezone: booking.boatTimezone }
  );
  
  const formattedDate = startDate && startTime
    ? `${format(startDate, 'MMMM d, yyyy')} at ${formatTime12Hour(startTime)}`
    : 'Date TBD';

  const customerName = booking.userFirstName && booking.userLastName
    ? `${booking.userFirstName} ${booking.userLastName}`
    : booking.customerName || 'Guest';

  // Say exactly what was paid. A deposit payer must never read "Total" as
  // "what you paid" — that line scared a real guest.
  const totalCents = booking.serviceFeeWaived
    ? (booking.totalAmountCents ?? 0) - (booking.serviceFeeCents ?? 0)
    : (booking.totalAmountCents ?? 0);
  const paidCents = booking.totalPaidCents ?? 0;
  const remainingCents = Math.max(0, totalCents - paidCents);
  const isDeposit = paidCents > 0 && remainingCents > 0;
  const moneyRow = (label: string, value: string, strong = false) => `
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">${label}:</span>
                  <strong style="font-weight:${strong ? 700 : 600};">&nbsp;${value}</strong>
                </p>`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: isDeposit
        ? `Deposit received — ${booking.boatName || 'your yacht charter'} is booked`
        : `Booking confirmed — ${booking.boatName || 'your yacht charter'}`,
      html: buildBrandEmailHtml({
        previewText: isDeposit
          ? `Deposit received — your date is locked in. ${formatCentsAsCurrency(remainingCents)} is due before the trip.`
          : 'Payment received — your charter is locked in. See you on the water.',
        contentHtml: `
              <p class="proposal-greeting">Hi ${escapeHtml(customerName)},</p>

              <p class="proposal-lead">
                ${
                  isDeposit
                    ? `Your <strong>${formatCentsAsCurrency(paidCents)}</strong> deposit went through and your date is locked in. The remaining <strong>${formatCentsAsCurrency(remainingCents)}</strong> is due before your trip — we'll send a payment link when it's time.`
                    : `Your payment went through and your charter is confirmed.`
                } We can't wait to
                welcome you aboard <strong>${escapeHtml(booking.boatName || 'your yacht')}</strong>.
              </p>

              <div class="proposal-boat-card">
                <div class="proposal-boat-label">Your booking</div>
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">Booking ref:</span>
                  <strong style="font-weight:600;">&nbsp;#${booking.id.substring(0, 6).toUpperCase()}</strong>
                </p>
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">Yacht:</span>
                  <strong style="font-weight:600;">&nbsp;${escapeHtml(booking.boatName || '—')}</strong>
                </p>
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">Date &amp; time:</span>
                  <strong style="font-weight:600;">&nbsp;${formattedDate}</strong>
                </p>
                ${
                  booking.numberOfPassengers
                    ? `
                <p style="margin:6px 0 0;font-size:14px;color:${BRAND_NAVY};">
                  <span style="color:#6b7b8b;">Guests:</span>
                  <strong style="font-weight:600;">&nbsp;${booking.numberOfPassengers}</strong>
                </p>`
                    : ''
                }
                ${moneyRow('Charter total', formatCentsAsCurrency(totalCents))}
                ${paidCents > 0 ? moneyRow(isDeposit ? 'Deposit paid' : 'Paid', formatCentsAsCurrency(paidCents), true) : ''}
                ${remainingCents > 0 ? moneyRow('Remaining balance', formatCentsAsCurrency(remainingCents)) : ''}
              </div>

              <div class="proposal-next">
                <p class="proposal-next-title">What happens next</p>
                <ul>
                  <li>We'll follow up before your trip with arrival instructions and your captain's details.</li>
                  <li>Questions or special requests? Reply to this email.</li>
                  <li>Need us sooner? Call or text <strong>(305) 521-8877</strong>.</li>
                </ul>
              </div>

              <p class="proposal-signoff">
                See you on the water,<br>
                <span class="company-name" style="display:inline-block;margin-top:8px;">Kings Of The Sea Yachts</span>
              </p>`,
      }),
    });

    if (error) {
      console.error('Failed to send confirmation email:', error);
      return false;
    }

    console.log('Confirmation email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}

// ============================================================================
// TEAM ALERTS — internal "something happened" emails to the admin inbox
// ============================================================================

/** Comma-separated ADMIN_ALERT_EMAIL; falls back to the public contact inbox. */
const ADMIN_ALERT_RECIPIENTS = (process.env.ADMIN_ALERT_EMAIL || EMAIL_CONTACT)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export interface AdminAlertEmailParams {
  subject: string;
  heading: string;
  /** Label/value rows; empty values are skipped. */
  lines: { label: string; value: string | null | undefined }[];
  /** Deep-links the button to /admin/bookings/[id] (else the board). */
  bookingId?: string | null;
  /** Optional callout under the rows — why this needs a human. */
  note?: string;
}

/**
 * Plain internal alert to the team (replaces the old GoHighLevel admin
 * notifications). Deliberately unbranded and dense: it's for staff, not
 * customers. Never throws — an alert must never break the flow that fired it.
 */
export async function sendAdminAlertEmail(params: AdminAlertEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured. Admin alert not sent:', params.subject);
    return false;
  }
  try {
    const rows = params.lines
      .filter((l) => l.value != null && String(l.value).trim() !== '')
      .map(
        (l) => `
              <tr>
                <td style="padding:6px 14px 6px 0;color:${TEXT_SECONDARY};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(l.label)}</td>
                <td style="padding:6px 0;color:${TEXT_PRIMARY};font-size:14px;font-weight:500;line-height:1.45;">${escapeHtml(String(l.value)).replace(/\n/g, '<br>')}</td>
              </tr>`
      )
      .join('');
    const base = getBaseUrl();
    const link = params.bookingId ? `${base}/admin/bookings/${params.bookingId}` : `${base}/admin/bookings`;
    const note = params.note
      ? `<p style="margin:16px 0 0;padding:12px 14px;background:${BG_WARM};border-left:3px solid ${BRAND_GOLD};color:${TEXT_PRIMARY};font-size:13px;line-height:1.5;">${escapeHtml(params.note)}</p>`
      : '';
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:24px 16px;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:12px;padding:28px 28px 24px;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND_GOLD};font-weight:600;">KOS admin</p>
            <h1 style="margin:0 0 16px;font-size:20px;color:${BRAND_NAVY};">${escapeHtml(params.heading)}</h1>
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${rows}</table>
            ${note}
            <p style="margin:24px 0 0;">
              <a href="${link}" style="display:inline-block;background:${BRAND_NAVY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px;">Open in admin</a>
            </p>
          </div>
        </body>
        </html>`;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: ADMIN_ALERT_RECIPIENTS,
      subject: params.subject,
      html,
    });
    if (error) {
      console.error('Admin alert email failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Admin alert email error:', error);
    return false;
  }
}
