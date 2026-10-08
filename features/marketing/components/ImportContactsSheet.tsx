"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { buildImport, parseCsv, sourceFromFileName, type ImportResult } from "@/features/marketing/lib/contact-import";
import { countAlreadyListed, importContacts } from "@/features/marketing/marketing.actions";

interface PendingFile {
  key: string;
  fileName: string;
  list: string;
  result: ImportResult | null;
  alreadyListed: number | null;
}

/**
 * CSV import. Each file becomes a list (named from the file; Google Sheets
 * tabs come out as "Doc - Tab.csv"). Files are read in the browser and shown
 * as counts before anything is saved: typos are fixed; invalid addresses,
 * spam, duplicates and anyone under 18 are left out.
 */
export function ImportContactsSheet() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const added: PendingFile[] = [];
    for (const file of Array.from(list)) {
      const result = buildImport(parseCsv(await file.text()));
      added.push({ key: `${file.name}-${file.size}-${Date.now()}`, fileName: file.name, list: sourceFromFileName(file.name), result, alreadyListed: null });
    }
    setFiles((prev) => [...prev, ...added]);
    for (const f of added) {
      if (!f.result) continue;
      const res = await countAlreadyListed(f.result.contacts.map((c) => c.email));
      if (res.success) setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, alreadyListed: res.data ?? 0 } : p)));
    }
  }

  async function runImport() {
    setBusy(true);
    let added = 0;
    let already = 0;
    for (const f of files) {
      if (!f.result || f.result.contacts.length === 0) continue;
      const res = await importContacts(f.list, f.result.contacts);
      if (!res.success || !res.data) {
        toast({ title: `${f.fileName} didn't import`, description: res.error, variant: "destructive" });
        setBusy(false);
        return;
      }
      added += res.data.added;
      already += res.data.alreadyListed;
    }
    setBusy(false);
    setFiles([]);
    setOpen(false);
    toast({
      title: `${added.toLocaleString()} contacts added`,
      description: already > 0 ? `${already.toLocaleString()} were already on the list. Sync to Resend before sending.` : "Sync to Resend before sending.",
    });
    router.refresh();
  }

  const ready = files.filter((f) => f.result && f.result.contacts.length > 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <SheetTrigger asChild>
        <Button variant="glass" size="sm" className="h-9 gap-1.5 px-4">
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>Import contacts</SheetTitle>
          <SheetDescription>
            One list per file. Addresses already on the list stay where they are.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
            <Upload className="h-5 w-5" />
            Choose CSV files
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {files.map((f) => (
            <div key={f.key} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-xs text-muted-foreground">{f.fileName}</p>
                <button
                  type="button"
                  aria-label={`Remove ${f.fileName}`}
                  onClick={() => setFiles((prev) => prev.filter((p) => p.key !== f.key))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {f.result ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`list-${f.key}`}>
                      List name
                    </label>
                    <Input
                      id={`list-${f.key}`}
                      value={f.list}
                      onChange={(e) => setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, list: e.target.value } : p)))}
                      className="h-9"
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Rows</dt>
                    <dd className="text-right tabular-nums text-foreground">{f.result.rows.toLocaleString()}</dd>
                    <dt className="text-muted-foreground">Valid addresses</dt>
                    <dd className="text-right tabular-nums text-foreground">{f.result.contacts.length.toLocaleString()}</dd>
                    <dt className="text-muted-foreground">Already on the list</dt>
                    <dd className="text-right tabular-nums text-foreground">{f.alreadyListed?.toLocaleString() ?? "…"}</dd>
                    <dt className="text-muted-foreground">Left out</dt>
                    <dd className="text-right tabular-nums text-foreground">
                      {(f.result.skipped.invalid + f.result.skipped.spam + f.result.skipped.minors + f.result.skipped.duplicates).toLocaleString()}
                    </dd>
                  </dl>
                  {f.result.skipped.invalid + f.result.skipped.spam + f.result.skipped.minors + f.result.skipped.duplicates > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        f.result.skipped.invalid && `${f.result.skipped.invalid} invalid`,
                        f.result.skipped.spam && `${f.result.skipped.spam} spam or system addresses`,
                        f.result.skipped.minors && `${f.result.skipped.minors} under 18`,
                        f.result.skipped.duplicates && `${f.result.skipped.duplicates} repeated in the file`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      .
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-destructive">No email column found in this file.</p>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button className="w-full" disabled={busy || ready.length === 0 || ready.some((f) => !f.list.trim())} onClick={() => void runImport()}>
            {busy
              ? "Importing…"
              : ready.length === 0
                ? "Import"
                : `Import ${ready.reduce((n, f) => n + (f.result?.contacts.length ?? 0), 0).toLocaleString()} contacts`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
