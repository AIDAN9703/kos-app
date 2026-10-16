"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2, Plus, Search } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { moveBoatsToOwnerAction } from "../../owner-accounts.actions";
import type { MovableBoat, OwnerAccountBoat, OwnerAccountOption } from "../../owner-accounts.types";
import { OwnerAccountPicker } from "../OwnerAccountPicker";

const FALLBACK = "/images/boats/aerial6.jpg";

function statusLabel(b: OwnerAccountBoat): string {
  if (b.managedBy === "OWNER" && b.listingStatus !== "APPROVED") {
    return { DRAFT: "Draft", IN_REVIEW: "In review", CHANGES_REQUESTED: "Changes requested" }[
      b.listingStatus
    ];
  }
  return b.active ? "Live" : "Hidden";
}

/**
 * The owner's boats, with "Move boats here" (from any other owner) and
 * "Move to…" per boat. Past charters move along by default when a boat
 * leaves KOS Yachts, which was only holding it.
 */
export function OwnerBoatsPanel({
  accountId,
  isHouse,
  boats,
  movable,
  owners,
}: {
  accountId: string;
  isHouse: boolean;
  boats: OwnerAccountBoat[];
  movable: MovableBoat[];
  owners: OwnerAccountOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const houseId = owners.find((o) => o.isHouse)?.id;

  // "Move boats here"
  const [pickOpen, setPickOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [historyIn, setHistoryIn] = useState(true);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movable
      .filter((b) => b.ownerAccountId !== accountId)
      .filter(
        (b) => !q || b.name.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q)
      );
  }, [movable, accountId, query]);

  // "Move to…" one boat
  const [moving, setMoving] = useState<OwnerAccountBoat | null>(null);
  const [target, setTarget] = useState("");
  const [historyOut, setHistoryOut] = useState(false);

  function move(toAccountId: string, boatIds: string[], moveHistory: boolean, done: () => void) {
    startTransition(async () => {
      const result = await moveBoatsToOwnerAction(toAccountId, { boatIds, moveHistory });
      if (!result.success) {
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: result.message ?? "Moved" });
      done();
      router.refresh();
    });
  }

  return (
    <GlassPanel
      title={`Boats (${boats.length})`}
      aside={
        isHouse ? null : (
          <Button
            variant="glass"
            className="h-9 gap-1.5 border-0 px-4"
            onClick={() => {
              setPicked(new Set());
              setQuery("");
              setHistoryIn(true);
              setPickOpen(true);
            }}
          >
            <Plus className="size-4" />
            Move boats here
          </Button>
        )
      }
    >
      {boats.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No boats yet. Move their boats here from KOS Yachts.
        </p>
      ) : (
        <ul className="-mx-5 -mb-5 divide-y divide-glass-border border-t border-glass-border">
          {boats.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={b.mainImage || FALLBACK}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <Link
                href={`/admin/boats/${b.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline"
              >
                {b.name}
              </Link>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {statusLabel(b)}
              </span>
              <Button
                variant="glass"
                className="h-8 gap-1.5 border-0 px-3 text-xs"
                onClick={() => {
                  setMoving(b);
                  setTarget("");
                  setHistoryOut(false);
                }}
              >
                <ArrowRightLeft className="size-3.5" />
                Move to…
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Move boats here</DialogTitle>
            <DialogDescription>Pick the boats that belong to this owner.</DialogDescription>
          </DialogHeader>
          <label className="flex h-10 items-center gap-2 rounded-full bg-glass-inset px-4 ring-1 ring-glass-border ring-inset">
            <Search aria-hidden className="size-4 text-muted-foreground" />
            <input
              id="move-boats-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search boats or owners…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <ul className="max-h-80 divide-y divide-glass-border overflow-y-auto rounded-xl ring-1 ring-glass-border">
            {candidates.slice(0, 200).map((b) => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-glass-inset">
                  <input
                    type="checkbox"
                    checked={picked.has(b.id)}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(b.id);
                      else next.delete(b.id);
                      setPicked(next);
                    }}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{b.name}</span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      b.ownerAccountId === houseId ? "text-muted-foreground" : "text-warning"
                    )}
                  >
                    {b.ownerName}
                  </span>
                </label>
              </li>
            ))}
            {candidates.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No boat matches.
              </li>
            ) : null}
          </ul>
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={historyIn}
              onChange={(e) => setHistoryIn(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              Bring their past charters too
              <span className="block text-xs text-muted-foreground">
                Right when the boats were only being held by KOS Yachts.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button
              variant="glass"
              className="border-0"
              onClick={() => setPickOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={pending || picked.size === 0}
              onClick={() => move(accountId, [...picked], historyIn, () => setPickOpen(false))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {picked.size === 0
                ? "Move boats"
                : `Move ${picked.size} ${picked.size === 1 ? "boat" : "boats"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moving !== null} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {moving?.name} to…</DialogTitle>
            <DialogDescription>
              The boat belongs to the owner you pick from now on.
            </DialogDescription>
          </DialogHeader>
          <OwnerAccountPicker
            owners={owners.filter((o) => o.id !== accountId)}
            value={target}
            onChange={setTarget}
            className="h-10"
          />
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={historyOut}
              onChange={(e) => setHistoryOut(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              Move its past charters too
              <span className="block text-xs text-muted-foreground">
                Leave this off when the boat changed hands: past charters stay with this owner.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button
              variant="glass"
              className="border-0"
              onClick={() => setMoving(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={pending || !target || !moving}
              onClick={() => moving && move(target, [moving.id], historyOut, () => setMoving(null))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Move boat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassPanel>
  );
}
