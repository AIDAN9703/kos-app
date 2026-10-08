"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ExternalLink, ImagePlus, MoreHorizontal, Send, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { SegmentedPills } from "@/shared/admin/filters";
import { cn } from "@/shared/lib/utils/general-utils";
import { renderCampaignEmail } from "@/features/marketing/lib/campaign-email";
import type { Campaign } from "@/features/marketing/marketing.types";
import {
  cancelScheduledCampaign,
  deleteCampaignDraft,
  saveCampaignDraft,
  sendCampaign,
  sendCampaignTest,
} from "@/features/marketing/marketing.actions";
import { CampaignStatusBadge, effectiveStatus } from "./campaign-status";
import { BackButton } from "@/shared/admin/components/BackButton";

interface Audience {
  value: string;
  label: string;
  size: number;
}

type Fields = Pick<
  Campaign,
  "name" | "subject" | "previewText" | "heading" | "body" | "imageUrl" | "buttonLabel" | "buttonUrl" | "audience"
>;

function fieldsOf(c: Campaign): Fields {
  return {
    name: c.name,
    subject: c.subject,
    previewText: c.previewText,
    heading: c.heading,
    body: c.body,
    imageUrl: c.imageUrl,
    buttonLabel: c.buttonLabel,
    buttonUrl: c.buttonUrl,
    audience: c.audience,
  };
}

/**
 * Write a campaign, see it as recipients will, test it, send or schedule it.
 * Drafts save themselves a moment after each change. Once sent or scheduled
 * it's read-only, with the results a click away in Resend.
 */
export function CampaignEditor({
  campaign,
  audiences,
  pending,
  mailingAddress,
  from,
  myEmail,
  myFirstName,
}: {
  campaign: Campaign;
  audiences: Audience[];
  pending: number;
  mailingAddress: string | null;
  from: string;
  myEmail: string;
  myFirstName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editable = campaign.status === "DRAFT";
  const [fields, setFields] = useState<Fields>(() => fieldsOf(campaign));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [uploading, setUploading] = useState(false);
  const [testTo, setTestTo] = useState(myEmail);
  const [testing, setTesting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [sending, setSending] = useState(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (!dirty.current) return true;
    dirty.current = false;
    setSaveState("saving");
    const result = await saveCampaignDraft(campaign.id, {
      ...fields,
      imageUrl: fields.imageUrl ?? "",
      buttonLabel: fields.buttonLabel ?? "",
      buttonUrl: fields.buttonUrl ?? "",
    });
    setSaveState(result.success ? "saved" : "error");
    if (!result.success) toast({ title: "Draft not saved", description: result.error, variant: "destructive" });
    return result.success;
  }, [campaign.id, fields, toast]);

  // Save a moment after the last change.
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fields, save]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    dirty.current = true;
    setFields((f) => ({ ...f, [key]: value }));
  }

  const preview = useMemo(
    () =>
      renderCampaignEmail(
        {
          previewText: fields.previewText,
          heading: fields.heading,
          body: fields.body,
          imageUrl: fields.imageUrl,
          buttonLabel: fields.buttonLabel,
          buttonUrl: fields.buttonUrl,
        },
        { kind: "sample", mailingAddress: mailingAddress ?? "", firstName: myFirstName }
      ).html,
    [fields, mailingAddress, myFirstName]
  );

  const audience = audiences.find((a) => a.value === fields.audience) ?? audiences[0];
  const recipients = editable ? (audience?.size ?? 0) : (campaign.recipientCount ?? 0);
  const blockers = [
    !mailingAddress && "Add the company's mailing address on the Campaigns page.",
    pending > 0 && `${pending.toLocaleString()} contact changes are waiting to sync. Sync on the Contacts page first.`,
    !fields.subject.trim() && "Add a subject line.",
    !fields.body.trim() && !fields.heading.trim() && "Write the email.",
    recipients === 0 && "Nobody on that list is subscribed.",
  ].filter(Boolean) as string[];

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "marketing");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const { url } = (await res.json()) as { url: string };
      set("imageUrl", url);
    } catch {
      toast({ title: "Upload failed", description: "Try another image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function runTest() {
    setTesting(true);
    if (!(await save())) return setTesting(false);
    const result = await sendCampaignTest(campaign.id, testTo);
    setTesting(false);
    toast(result.success ? { title: result.message ?? "Test sent" } : { title: "Test not sent", description: result.error, variant: "destructive" });
  }

  async function runSend() {
    setSending(true);
    if (!(await save())) return setSending(false);
    const at = when === "later" && scheduleAt ? new Date(scheduleAt).toISOString() : null;
    const result = await sendCampaign(campaign.id, at);
    setSending(false);
    if (result.success) {
      setSendOpen(false);
      toast({ title: result.message ?? "Sent" });
      router.refresh();
    } else {
      toast({ title: "Not sent", description: result.error, variant: "destructive" });
    }
  }

  const status = effectiveStatus(campaign);
  const audienceLabel = (value: string) => audiences.find((a) => a.value === value)?.label ?? value;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3">
        <BackButton href="/admin/marketing" />
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              aria-label="Campaign name"
              className="w-full truncate bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Campaign name"
            />
          ) : (
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{campaign.name}</h1>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <CampaignStatusBadge campaign={campaign} />
            {editable && <span>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}</span>}
          </div>
        </div>

        {editable ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="glass" size="sm" className="h-9 px-4">
                  Send test
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-3">
                <Label htmlFor="test-to" className="text-xs text-muted-foreground">
                  Send a test copy to
                </Label>
                <Input id="test-to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="h-9" />
                <Button size="sm" className="w-full rounded-full" disabled={testing || !testTo.trim()} onClick={() => void runTest()}>
                  {testing ? "Sending…" : "Send test"}
                </Button>
              </PopoverContent>
            </Popover>
            <Button size="sm" className="h-9 gap-1.5 rounded-full px-4 font-semibold" onClick={() => setSendOpen(true)}>
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="size-9 p-0" aria-label="Campaign actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={async () => {
                    if (!window.confirm(`Delete "${fields.name}"?`)) return;
                    const result = await deleteCampaignDraft(campaign.id);
                    if (result.success) router.replace("/admin/marketing");
                    else toast({ title: "That didn't work", description: result.error, variant: "destructive" });
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          campaign.resendBroadcastId && (
            <Button asChild variant="glass" size="sm" className="h-9 gap-1.5 px-4">
              <a href={`https://resend.com/broadcasts/${campaign.resendBroadcastId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Results in Resend
              </a>
            </Button>
          )
        )}
      </header>

      {!editable && (
        <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
          <p className="text-foreground">
            {status === "SCHEDULED" && campaign.scheduledAt
              ? `Scheduled for ${format(campaign.scheduledAt, "EEE MMM d, h:mm a")}`
              : `Sent ${format(campaign.sentAt ?? campaign.scheduledAt ?? campaign.updatedAt, "EEE MMM d, h:mm a")}`}
            {` to ${recipients.toLocaleString()} people · ${audienceLabel(campaign.audience)}`}
          </p>
          {status === "SCHEDULED" && (
            <Button
              variant="glass"
              size="sm"
              className="h-9 px-4"
              onClick={async () => {
                const result = await cancelScheduledCampaign(campaign.id);
                toast(result.success ? { title: result.message ?? "Cancelled" } : { title: "That didn't work", description: result.error, variant: "destructive" });
                router.refresh();
              }}
            >
              Cancel schedule
            </Button>
          )}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Form */}
        <fieldset disabled={!editable} className="glass-panel space-y-5 p-5 disabled:opacity-90">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={fields.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Summer on the water starts now" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preview">Preview text</Label>
            <Input
              id="preview"
              value={fields.previewText}
              onChange={(e) => set("previewText", e.target.value)}
              placeholder="Shown after the subject in the inbox"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Send to</Label>
            <Select value={fields.audience} onValueChange={(v) => set("audience", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audiences.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label} · {a.size.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Image</Label>
            {fields.imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- any uploaded URL, previewed as the email shows it */}
                <img src={fields.imageUrl} alt="" className="max-h-56 w-full object-cover" />
                {editable && (
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => set("imageUrl", null)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <label
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground",
                  editable && "cursor-pointer hover:border-primary/60 hover:text-foreground"
                )}
              >
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Uploading…" : "Add an image"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={!editable || uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heading">Heading</Label>
            <Input id="heading" value={fields.heading} onChange={(e) => set("heading", e.target.value)} placeholder="Your summer charter is waiting" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              rows={11}
              value={fields.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder={"Hi {{first_name}},\n\nWrite your message here."}
              className="resize-y leading-6"
            />
            <p className="text-xs text-muted-foreground">
              Blank line for a new paragraph · **bold** · [link text](https://…) · {"{{first_name}}"} for their name
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="button-label">Button</Label>
              <Input id="button-label" value={fields.buttonLabel ?? ""} onChange={(e) => set("buttonLabel", e.target.value)} placeholder="Book your trip" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="button-url">Button link</Label>
              <Input id="button-url" value={fields.buttonUrl ?? ""} onChange={(e) => set("buttonUrl", e.target.value)} placeholder="https://www.kosyachts.com/boats/search" />
            </div>
          </div>
        </fieldset>

        {/* Preview */}
        <div className="glass-panel flex flex-col overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100svh-8rem)]">
          <div className="flex items-center justify-between gap-3 border-b border-glass-border px-5 py-3">
            <div className="min-w-0 text-xs">
              <p className="truncate text-muted-foreground">{from}</p>
              <p className="truncate font-semibold text-foreground">{fields.subject || "No subject yet"}</p>
            </div>
            <SegmentedPills
              label="Preview size"
              size="sm"
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobile" },
              ]}
            />
          </div>
          <div className="flex min-h-[620px] flex-1 justify-center overflow-hidden bg-[#f4f1ea]">
            <iframe
              title="Email preview"
              srcDoc={preview}
              sandbox=""
              className={cn("h-full min-h-[620px] border-0 bg-white transition-[width]", device === "mobile" ? "w-[390px]" : "w-full")}
            />
          </div>
        </div>
      </div>

      <Dialog open={sendOpen} onOpenChange={(o) => !sending && setSendOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send “{fields.subject || fields.name}”</DialogTitle>
            <DialogDescription>
              To {audience?.label ?? "Everyone"} · {recipients.toLocaleString()} people. People who unsubscribed are skipped.
            </DialogDescription>
          </DialogHeader>

          {blockers.length > 0 ? (
            <ul className="space-y-1.5 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
              <li className="pt-1">
                <Link href={pending > 0 ? "/admin/marketing/contacts" : "/admin/marketing"} className="font-medium underline">
                  Go there
                </Link>
              </li>
            </ul>
          ) : (
            <div className="space-y-3">
              <SegmentedPills
                label="When"
                value={when}
                onChange={setWhen}
                options={[
                  { value: "now", label: "Send now" },
                  { value: "later", label: "Schedule" },
                ]}
              />
              {when === "later" && (
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} aria-label="Send at" />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setSendOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              className="rounded-full px-5"
              disabled={sending || blockers.length > 0 || (when === "later" && !scheduleAt)}
              onClick={() => void runSend()}
            >
              {sending ? "Sending…" : when === "later" ? "Schedule" : `Send to ${recipients.toLocaleString()} people`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
