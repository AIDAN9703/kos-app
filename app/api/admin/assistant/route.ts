import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { format } from "date-fns";

import { UserFacingError } from "@/shared/lib/errors";
import { assertCan, type SessionUser } from "@/shared/lib/utils/auth-utils";
import { assistantTools } from "@/features/admin/assistant/tools";

export const maxDuration = 60;

/**
 * KOS Command — the admin desk assistant. Streams a Claude response that can
 * call the admin's own read-only data layer as tools (each tool re-checks
 * access). Admins only; nothing here writes.
 */
export async function POST(req: Request) {
  let admin: SessionUser;
  try {
    admin = await assertCan({ booking: ["view-all", "view-economics"] });
  } catch (error) {
    if (error instanceof UserFacingError) return new Response(error.message, { status: error.status });
    throw error;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured", { status: 503 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const firstName = admin.name?.split(/\s+/)[0] ?? "there";

  const result = streamText({
    model: anthropic("claude-opus-5"),
    system: `You are KOS Command, the desk assistant for Kings Of The Sea Yachts' admin team. You are talking to ${firstName}, an admin.

Today is ${format(new Date(), "EEEE, MMMM d, yyyy")}.

How the business works: a deal is one row that moves through statuses — INQUIRY (lead, unpriced) → PROPOSED (priced; publishedAt says whether the customer has the link) → BOOKED (the trip is theirs: they accepted, an admin marked it booked, or money landed; payment is a separate label — unpaid / deposit paid / paid) → COMPLETED, with CANCELLED off to the side. Multi-boat trips are a "charter party": one booking row per boat sharing a group. Instant Book trips are born BOOKED and paid. GMV = charter value excluding the card fee; revenue = GMV minus all expenses (owner payout, fuel, crew, dockage).

Rules:
- Answer ONLY from tool results. Never invent names, numbers, or dates. If a tool returns nothing, say so plainly.
- All money is already formatted; all trip times are already boat-local. Report them as given — do not recompute or convert.
- Be brief and concrete. Lead with the answer. Use a markdown table when listing 3+ deals or months; otherwise short prose or a tight list.
- When you mention a specific deal, link its customer name to the provided \`link\` path in markdown so the admin can click straight in.
- If the question is ambiguous (which month? which customer?), pick the most likely reading, answer, and note the assumption in one clause.
- You are read-only. If asked to change something (assign, resend, cancel), explain you can't act yet and point to where it's done on the booking page.`,
    messages: await convertToModelMessages(messages),
    tools: assistantTools,
    stopWhen: stepCountIs(6),
    // Cache the stable prefix (tool schemas + system prompt) across turns.
    providerOptions: {
      anthropic: { effort: "medium", cacheControl: { type: "ephemeral" } },
    },
    // Anthropic reserves credit against max_tokens up front; the SDK's default
    // is the model max (128K ≈ $3+ held per call) which trips small balances.
    // Desk answers are short — 4K is generous for a table of 15 deals.
    maxOutputTokens: 4096,
  });

  return result.toUIMessageStreamResponse();
}
