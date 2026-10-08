/**
 * Builds a campaign's email, HTML and plain text, from what the team typed.
 * Pure and browser-safe: the editor's live preview, the test send and the
 * real broadcast all render through here, so they can't drift apart.
 *
 * Body format: blank lines separate paragraphs; **bold**, [text](https://…)
 * links and {{first_name}} are allowed. Everything else is escaped.
 */

interface CampaignContent {
  previewText: string;
  heading: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
}

type RenderMode =
  /** Sent through Resend: per-contact placeholders stay for Resend to fill. */
  | { kind: "broadcast"; mailingAddress: string }
  /** Preview and test sends: placeholders filled in here. */
  | { kind: "sample"; mailingAddress: string; firstName: string };

const NAVY = "#27445c";
const GOLD = "#b2a37a";
const INK = "#334155";
const MUTED = "#64748b";
const ASSET_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://kosyachts.com";
const LOGO_URL = `${ASSET_BASE}/icons/transparent-logo.png`;

/** Resend fills these per contact when the broadcast goes out. */
const RESEND_FIRST_NAME = "{{{contact.first_name|there}}}";
const RESEND_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only web, email and phone links make it into an email. */
export function safeUrl(url: string | null | undefined): string | null {
  const trimmed = (url ?? "").trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) ? trimmed : null;
}

function firstName(mode: RenderMode): string {
  return mode.kind === "broadcast" ? RESEND_FIRST_NAME : escapeHtml(mode.firstName || "there");
}

function inlineHtml(text: string, mode: RenderMode): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
      const href = safeUrl(url.replace(/&amp;/g, "&"));
      return href
        ? `<a href="${escapeHtml(href)}" style="color:${NAVY};font-weight:600;text-decoration:underline;">${label}</a>`
        : match;
    })
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName(mode))
    .replace(/\n/g, "<br>");
}

function inlineText(text: string, mode: RenderMode): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/\{\{\s*first_name\s*\}\}/gi, mode.kind === "broadcast" ? RESEND_FIRST_NAME : mode.firstName || "there");
}

function paragraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function renderCampaignEmail(content: CampaignContent, mode: RenderMode): { html: string; text: string } {
  const unsubscribe = mode.kind === "broadcast" ? RESEND_UNSUBSCRIBE : "#";
  const image = safeUrl(content.imageUrl);
  const buttonUrl = safeUrl(content.buttonUrl);
  const button = content.buttonLabel?.trim() && buttonUrl ? { label: content.buttonLabel.trim(), url: buttonUrl } : null;
  const address = mode.mailingAddress.trim();

  const bodyHtml = paragraphs(content.body)
    .map((p) => `<p style="margin:0 0 18px;font-size:16px;line-height:26px;color:${INK};">${inlineHtml(p, mode)}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(content.heading || "Kings of the Sea Yachts")}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ea;font-family:Montserrat,'Helvetica Neue',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.previewText)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ea;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="padding:28px 24px 20px;border-bottom:3px solid ${GOLD};">
<img src="${LOGO_URL}" width="64" height="64" alt="Kings of the Sea Yachts" style="display:block;width:64px;height:64px;border-radius:50%;">
</td></tr>
${image ? `<tr><td><img src="${escapeHtml(image)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;"></td></tr>` : ""}
<tr><td style="padding:32px 32px 14px;">
${content.heading.trim() ? `<h1 style="margin:0 0 18px;font-size:26px;line-height:32px;font-weight:800;color:${NAVY};">${inlineHtml(content.heading.trim(), mode)}</h1>` : ""}
${bodyHtml}
${
  button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="border-radius:999px;background-color:${NAVY};">
<a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>
</td></tr></table>`
    : ""
}
</td></tr>
<tr><td style="padding:22px 32px 30px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${MUTED};">You're receiving this because you've chartered with, or been in touch with, Kings of the Sea Yachts.</p>
${address ? `<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${MUTED};">${escapeHtml(address).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:0;font-size:12px;line-height:18px;"><a href="${unsubscribe}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading.trim() ? inlineText(content.heading.trim(), mode) : null,
    ...paragraphs(content.body).map((p) => inlineText(p, mode)),
    button ? `${button.label}: ${button.url}` : null,
    "—",
    "You're receiving this because you've chartered with, or been in touch with, Kings of the Sea Yachts.",
    address || null,
    `Unsubscribe: ${unsubscribe}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}
