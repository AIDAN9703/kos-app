import "server-only";

import { db } from "@/database/db";
import { bookings } from "@/database/schema";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { sendAdminAlertEmail } from "@/shared/lib/services/email.service";
import { revalidateDeal } from "@/features/bookings/lib/revalidate-deal";

type MarketplaceSourceValue = "BOATSETTER" | "GETMYBOAT";

/** Marketplace sources this service knows how to ingest. */
export type MarketplaceSource = MarketplaceSourceValue;

export const MARKETPLACE_SENDER_DOMAINS: Record<string, MarketplaceSource> = {
  "boatsetter.com": "BOATSETTER",
  "getmyboat.com": "GETMYBOAT",
};

const SOURCE_DISPLAY: Record<MarketplaceSource, string> = {
  BOATSETTER: "Boatsetter",
  GETMYBOAT: "GetMyBoat",
};

export interface InboundEmailContent {
  source: MarketplaceSource;
  fromAddress: string;
  subject: string;
  text: string;
}

interface ExtractedLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Plain calendar date "yyyy-MM-dd" when a requested date is stated. */
  preferredDate: string | null;
  guests: number | null;
  boatName: string | null;
  message: string | null;
  threadUrl: string | null;
}

export type ParseMethod = "PARSED" | "FALLBACK_LLM" | "FAILED";

/** Very light HTML → text for emails that arrive without a text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

/**
 * Template pass — cheap regexes against the notification formats both
 * marketplaces use today. Anything it can't fill stays null for the LLM pass.
 */
function templateParse(content: InboundEmailContent): ExtractedLead {
  const { subject, text } = content;
  const haystack = `${subject}\n${text}`;

  // "New inquiry from Jane Doe" / "Jane Doe wants to book" / "Booking request from Jane"
  const name =
    haystack.match(
      /(?:inquiry|request|message|booking)\s+from\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)/i
    )?.[1] ??
    haystack.match(/^([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s+(?:wants to book|sent you)/im)?.[1] ??
    null;

  // "for 6 guests" / "6 passengers" / "Guests: 6"
  const guestsRaw =
    haystack.match(/(?:for\s+)?(\d{1,3})\s+(?:guests?|passengers?|people)/i)?.[1] ??
    haystack.match(/guests?\s*[:\-]\s*(\d{1,3})/i)?.[1] ??
    null;
  const guests = guestsRaw ? parseInt(guestsRaw, 10) : null;

  // ISO-ish or US-style dates: "2026-08-15", "08/15/2026", "Aug 15, 2026"
  let preferredDate: string | null = haystack.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? null;
  if (!preferredDate) {
    const us = haystack.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (us) {
      preferredDate = `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
    }
  }
  if (!preferredDate) {
    const monthName = haystack.match(
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i
    );
    if (monthName) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const m = months.indexOf(monthName[1].slice(0, 3).toLowerCase()) + 1;
      preferredDate = `${monthName[3]}-${String(m).padStart(2, "0")}-${monthName[2].padStart(2, "0")}`;
    }
  }

  // Reply/relay address in the body beats the notification sender.
  const email =
    text.match(/[\w.+-]+@(?:reply|relay|inquiry)[\w.-]*\.[a-z]{2,}/i)?.[0] ?? null;

  const threadUrl =
    text.match(/https?:\/\/(?:www\.)?(?:boatsetter|getmyboat)\.com\/[^\s")>\]]+/i)?.[0] ?? null;

  return {
    name,
    email,
    phone: null,
    preferredDate,
    guests,
    boatName: null,
    message: null,
    threadUrl,
  };
}

const LLM_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    name: { type: ["string", "null"], description: "Guest/customer full name, or null" },
    email: {
      type: ["string", "null"],
      description: "Guest's contact or relay email address found in the body, or null",
    },
    phone: { type: ["string", "null"], description: "Guest phone number, or null" },
    preferredDate: {
      type: ["string", "null"],
      description: "Requested trip date as yyyy-MM-dd, or null if not stated",
    },
    guests: { type: ["integer", "null"], description: "Party size, or null" },
    boatName: { type: ["string", "null"], description: "Boat/listing name, or null" },
    message: {
      type: ["string", "null"],
      description: "The guest's own message text verbatim, or null",
    },
    threadUrl: {
      type: ["string", "null"],
      description: "Link to view/reply to the inquiry on the marketplace, or null",
    },
  },
  required: ["name", "email", "phone", "preferredDate", "guests", "boatName", "message", "threadUrl"],
  additionalProperties: false,
} as const;

/**
 * LLM fallback — one cheap Claude Haiku call that maps the email onto our lead
 * shape. Raw fetch (no SDK dependency); returns null on any failure so the
 * caller can degrade to a needs-review lead.
 */
async function llmExtract(content: InboundEmailContent): Promise<ExtractedLead | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        output_config: { format: { type: "json_schema", schema: LLM_EXTRACTION_SCHEMA } },
        messages: [
          {
            role: "user",
            content:
              `This is a ${SOURCE_DISPLAY[content.source]} boat-charter inquiry notification email. ` +
              `Extract the lead fields. Use null for anything not present.\n\n` +
              `Subject: ${content.subject}\n\n${content.text.slice(0, 8000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Inbound-lead LLM extraction HTTP error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (data.stop_reason === "refusal" || !Array.isArray(data.content)) return null;
    const textBlock = data.content.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) return null;
    return JSON.parse(textBlock.text) as ExtractedLead;
  } catch (error) {
    console.error("Inbound-lead LLM extraction failed:", error);
    return null;
  }
}

function isUsable(lead: ExtractedLead): boolean {
  // A lead is worth creating from the parse alone if we at least got a name.
  return Boolean(lead.name && lead.name.trim().length >= 2);
}

/**
 * Turn a marketplace notification email into an inquiry. Never throws and
 * never drops a lead: total parse failure still creates a needs-review row.
 */
export async function processMarketplaceEmail(
  content: InboundEmailContent
): Promise<{ dealId: string; method: ParseMethod }> {
  let method: ParseMethod = "PARSED";
  let lead = templateParse(content);

  if (!isUsable(lead)) {
    const llm = await llmExtract(content);
    if (llm && isUsable(llm)) {
      lead = { ...llm };
      method = "FALLBACK_LLM";
    } else {
      method = "FAILED";
    }
  }

  const label = SOURCE_DISPLAY[content.source];
  const name = lead.name?.trim() || `${label} lead — needs review`;

  const messageParts = [
    lead.boatName ? `Boat: ${lead.boatName}` : null,
    lead.message?.trim() || null,
    lead.threadUrl ? `Marketplace thread: ${lead.threadUrl}` : null,
  ].filter(Boolean);
  if (method === "FAILED") {
    messageParts.push(
      `--- Could not parse automatically. Email excerpt ---\n${content.subject}\n${content.text.slice(0, 1500)}`
    );
  }

  const [created] = await db
    .insert(bookings)
    .values({
      bookingType: "MARKETPLACE",
      bookingStatus: "INQUIRY",
      source: content.source,
      customerName: name,
      customerEmail: lead.email?.trim() || content.fromAddress,
      customerPhone: lead.phone?.trim() || null,
      customerMessage: messageParts.join("\n\n") || null,
      numberOfPassengers: lead.guests && lead.guests > 0 ? lead.guests : null,
      preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(lead.preferredDate ?? "")
        ? lead.preferredDate
        : null,
      termsAccepted: false,
      smsConsent: false,
    })
    .returning({ id: bookings.id });

  await bookingEventsService.logEvent({
    bookingId: created.id,
    eventType: "lead.created",
    actorType: "system",
    channel: "email",
    displayMessage: "Inquiry received",
    metadata: { ingestedFrom: content.source, parseMethod: method },
  });

  // Team alert — marketplace leads used to be invisible until someone opened
  // the board. Awaited (serverless) and non-fatal.
  await sendAdminAlertEmail({
    subject: `New ${label} inquiry — ${name}`,
    heading: `New inquiry from ${label}`,
    bookingId: created.id,
    lines: [
      { label: "Customer", value: name },
      { label: "Email", value: lead.email?.trim() || content.fromAddress },
      { label: "Phone", value: lead.phone ?? "" },
      { label: "Date", value: lead.preferredDate ?? "" },
      { label: "Guests", value: lead.guests ? String(lead.guests) : "" },
      { label: "Boat", value: lead.boatName ?? "" },
      {
        label: "Parsed by",
        value:
          method === "PARSED" ? "template" : method === "FALLBACK_LLM" ? "AI fallback" : "FAILED",
      },
    ],
    note:
      method === "FAILED"
        ? "We couldn't read this email automatically — open the deal and fix the contact details."
        : undefined,
  }).catch((e) => console.error("Team alert (marketplace lead) failed:", e));

  revalidateDeal();

  return { dealId: created.id, method };
}
