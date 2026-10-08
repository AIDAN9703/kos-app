"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Anchor,
  ArrowUp,
  Check,
  CircleDollarSign,
  Copy,
  Loader2,
  Plus,
  Radar,
  Sparkles,
  Square,
  TrendingUp,
  Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/shared/lib/utils/general-utils";

/* ── Quick prompts — the questions the desk asks every day ─────────── */
const QUICK_PROMPTS = [
  { icon: Radar, label: "What's going on today?", prompt: "What's going on today? Give me the desk briefing: departures, anything urgent, new leads, money owed.", tone: "from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-300 group-hover:from-fuchsia-500/40" },
  { icon: CircleDollarSign, label: "Who still owes money?", prompt: "Which confirmed trips still owe money, how much, and when do they sail?", tone: "from-emerald-500/25 to-emerald-500/5 text-emerald-300 group-hover:from-emerald-500/40" },
  { icon: TrendingUp, label: "How did last month do?", prompt: "How did last month do versus the month before — GMV, revenue, and trip count?", tone: "from-amber-400/25 to-amber-400/5 text-amber-300 group-hover:from-amber-400/40" },
  { icon: Anchor, label: "Trips missing a captain", prompt: "Which trips in the next 14 days are still missing a captain or still owe money?", tone: "from-rose-500/25 to-rose-500/5 text-rose-300 group-hover:from-rose-500/40" },
  { icon: Users, label: "New leads this week", prompt: "Show me the leads that came in this week — who they are, where from, and whether anyone has claimed them.", tone: "from-cyan-400/25 to-cyan-400/5 text-cyan-300 group-hover:from-cyan-400/40" },
  { icon: Sparkles, label: "Top boats this month", prompt: "Which boats are earning the most this month?", tone: "from-violet-500/25 to-violet-500/5 text-violet-300 group-hover:from-violet-500/40" },
] as const;

/* ── Tool-call labels shown as the assistant works ───────────────────── */
const TOOL_LABELS: Record<string, { running: string; done: string; tone: string }> = {
  search_bookings: { running: "Searching bookings", done: "Searched bookings", tone: "bg-cyan-400/15 text-cyan-300" },
  get_booking: { running: "Opening booking", done: "Read booking", tone: "bg-sky-400/15 text-sky-300" },
  revenue_summary: { running: "Pulling revenue", done: "Pulled revenue", tone: "bg-amber-400/15 text-amber-300" },
  upcoming_departures: { running: "Checking departures", done: "Checked departures", tone: "bg-fuchsia-500/15 text-fuchsia-300" },
  action_queue: { running: "Scanning the queue", done: "Scanned the queue", tone: "bg-rose-500/15 text-rose-300" },
  fleet_leaders: { running: "Ranking the fleet", done: "Ranked the fleet", tone: "bg-violet-500/15 text-violet-300" },
};

export function AssistantView({
  firstName,
  configured,
}: {
  firstName: string | null;
  configured: boolean;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/admin/assistant" }),
    []
  );
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to the max-h the class sets.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);
  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  // Full bleed over the page area's padding (AdminShell), so the transcript
  // scrolls at the page's edge.
  return (
    <div className="relative -mx-4 -my-4 flex min-h-0 flex-1 flex-col md:-mx-6 md:-my-6 xl:-mx-12">
      {/* Top bar: New chat once a conversation exists */}
      <div className="relative z-10 flex min-h-12 items-center justify-end px-5 py-3">
        <div className="flex items-center gap-2">
          {!configured ? (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
              ANTHROPIC_API_KEY not set
            </span>
          ) : null}
          {!empty ? (
            <button
              type="button"
              onClick={() => {
                stop();
                setMessages([]);
                setInput("");
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </button>
          ) : null}
        </div>
      </div>

      {/* Transcript / hero */}
      <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        {empty ? (
          <Hero firstName={firstName} onPick={send} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {status === "submitted" ? <ThinkingRow /> : null}
            {error ? (
              <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {error.message}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-10 px-5 pb-5 pt-2 sm:px-8">
        <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
          <div
            className={cn(
              "group relative rounded-2xl p-px transition-shadow",
              "bg-linear-to-r from-fuchsia-500/50 via-violet-500/40 to-cyan-400/50",
              "focus-within:shadow-[0_0_0_1px_rgb(167_139_250),0_0_44px_-8px_rgb(167_139_250)]"
            )}
          >
            <div className="flex items-end gap-2 rounded-[15px] bg-background/90 px-3 py-2 backdrop-blur">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={busy ? "Working…" : "Ask the desk anything…"}
                disabled={busy}
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_20px_-6px_rgb(217_70_239)] transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground/60">
            Enter to send · Shift + Enter for a new line · read-only, answers come from live data
          </p>

          {/* Quick prompts live under the composer once a chat has started */}
          {!empty ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={busy}
                  onClick={() => send(q.prompt)}
                  className="shrink-0 rounded-full bg-foreground/[0.06] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-violet-500/20 hover:text-violet-200 disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>
          ) : null}
        </form>
      </div>

    </div>
  );
}

/* ── Empty state: the orb + the six questions ───────────────────────── */
function Hero({ firstName, onPick }: { firstName: string | null; onPick: (p: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-8 flex h-28 w-28 items-center justify-center"
      >
        {/* Spinning conic ring */}
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgb(244_114_182)_0%,rgb(167_139_250)_25%,rgb(34_211_238)_50%,rgb(251_191_36)_75%,rgb(244_114_182)_100%)] opacity-90 [mask:radial-gradient(farthest-side,transparent_calc(100%-2.5px),#000_calc(100%-2.5px))]" />
        {/* Glow core */}
        <div className="absolute inset-2 rounded-full bg-linear-to-br from-fuchsia-500/40 via-violet-500/30 to-cyan-400/40 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500 via-violet-500 to-cyan-400 shadow-[0_0_70px_-8px_rgb(167_139_250)]">
          <Sparkles className="h-7 w-7 text-white" strokeWidth={2.25} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="bg-linear-to-r from-fuchsia-300 via-violet-200 to-cyan-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
      >
        {firstName ? `Evening, ${firstName}.` : "KOS Command"}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base"
      >
        Ask anything about the desk — bookings, money, who&apos;s sailing, who&apos;s waiting.
        Answers come straight from today&apos;s data.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-10 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {QUICK_PROMPTS.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.button
              key={q.label}
              type="button"
              onClick={() => onPick(q.prompt)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-left text-sm backdrop-blur transition-all hover:-translate-y-px hover:border-violet-400/50 hover:bg-violet-500/10 hover:shadow-[0_10px_30px_-14px_rgb(167_139_250)]"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br transition-colors",
                  q.tone
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium text-foreground">{q.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ── Message rendering ──────────────────────────────────────────────── */
function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-linear-to-br from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm text-white shadow-[0_10px_30px_-12px_rgb(217_70_239)]">
          {text}
        </div>
      </motion.div>
    );
  }

  const fullText = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3"
    >
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500/30 via-violet-500/30 to-cyan-400/30 text-violet-200 ring-1 ring-violet-400/30">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <Markdown key={i} text={part.text} />;
          }
          if (isToolUIPart(part)) {
            return <ToolChip key={i} part={part} />;
          }
          return null;
        })}
        {fullText ? <CopyButton text={fullText} /> : null}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ToolChip({ part }: { part: { type: string; state: string } }) {
  const name = part.type.replace(/^tool-/, "");
  const labels =
    TOOL_LABELS[name] ?? { running: `Running ${name}`, done: `Ran ${name}`, tone: "bg-violet-500/15 text-violet-300" };
  const done = part.state === "output-available";
  const failed = part.state === "output-error";
  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          failed
            ? "bg-destructive-soft text-destructive"
            : done
              ? "bg-foreground/[0.06] text-muted-foreground"
              : labels.tone
        )}
      >
        {failed ? null : done ? (
          <Check className="h-3 w-3" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        {failed ? `${labels.running} failed` : done ? labels.done : `${labels.running}…`}
      </motion.span>
    </AnimatePresence>
  );
}

function ThinkingRow() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500/30 via-violet-500/30 to-cyan-400/30 text-violet-200 ring-1 ring-violet-400/30">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={cn("h-1.5 w-1.5 rounded-full", ["bg-fuchsia-400", "bg-violet-400", "bg-cyan-400"][i])}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed text-foreground",
        "[&_p]:my-1.5 [&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-semibold",
        "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-muted-foreground",
        "[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_a]:text-cyan-300 [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
        "[&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]",
        "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
        "[&_th]:border-b [&_th]:border-border/60 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground",
        "[&_td]:border-b [&_td]:border-border/30 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:tabular-nums",
        "[&_hr]:my-3 [&_hr]:border-border/50"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
