"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { saveListingStepAction } from "../../listing.actions";
import { MIN_PHOTOS, listingStepHref } from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { StepFooter } from "../StepFooter";
import { usePreviewPatch } from "../preview/ListingPreview";

const TIPS = [
  "Shoot in daylight, landscape, with the whole boat in frame",
  "Every side, the deck, the cabin and the helm",
  "One underway and one with guests aboard, if you have them",
];

async function upload(file: File, boatId: string, boatName: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("type", "boat");
  form.append("entityId", boatId);
  form.append("entityName", boatName);
  const response = await fetch("/api/upload", { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Upload failed");
  return body.url as string;
}

/**
 * Photos save as soon as they upload, are removed or move, so nothing is
 * lost if the owner leaves. The first photo is the cover.
 */
export function PhotosForm({ draft, advance }: { draft: ListingDraft; advance: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(draft.images);
  const [uploading, setUploading] = useState(0);
  const [saving, startSaving] = useTransition();

  function persist(next: string[]) {
    setImages(next);
    startSaving(async () => {
      const result = await saveListingStepAction(draft.id, "photos", { images: next });
      if (!result.success)
        toast({ title: "Couldn't save photos", description: result.error, variant: "destructive" });
    });
  }

  const patch = usePreviewPatch();
  useEffect(() => patch({ image: images[0] ?? null }), [images, patch]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setUploading(list.length);
    let next = images;
    for (const file of list) {
      try {
        const url = await upload(file, draft.id, draft.name);
        next = [...next, url];
        setImages(next);
      } catch (error) {
        toast({
          title: `Couldn't upload ${file.name}`,
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
    persist(next);
  }

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persist(next);
  };

  const left = Math.max(0, MIN_PHOTOS - images.length);

  return (
    <div>
      <ul className="mb-6 space-y-1 text-sm text-slate-600">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden className="text-slate-300">
              —
            </span>
            {tip}
          </li>
        ))}
      </ul>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {images.map((url, i) => (
          <figure
            key={url}
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100",
              i === 0 && "col-span-2 row-span-2 aspect-auto sm:col-span-2"
            )}
          >
            <Image
              src={url}
              alt={i === 0 ? "Cover photo" : `Photo ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 300px"
            />
            {i === 0 ? (
              <span className="absolute top-2.5 left-2.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-primary shadow-sm">
                Cover
              </span>
            ) : null}
            <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              {i > 0 ? (
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  aria-label="Move earlier"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-primary shadow-sm hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}
              {i < images.length - 1 ? (
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  aria-label="Move later"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-primary shadow-sm hover:bg-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              {i > 0 ? (
                <button
                  type="button"
                  onClick={() => move(i, 0)}
                  className="h-8 rounded-full bg-white/95 px-3 text-xs font-semibold text-primary shadow-sm hover:bg-white"
                >
                  Make cover
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => persist(images.filter((_, j) => j !== i))}
                aria-label="Remove photo"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:bg-white hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </figure>
        ))}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading > 0}
          className={cn(
            "flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary",
            images.length === 0 && "col-span-2 aspect-[16/7] sm:col-span-3"
          )}
        >
          {uploading > 0 ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Uploading {uploading}…
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" aria-hidden />
              {images.length === 0 ? "Add photos, or drop them here" : "Add more"}
            </>
          )}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      <p className="mt-4 text-sm text-slate-500" aria-live="polite">
        {images.length} photo{images.length === 1 ? "" : "s"}
        {left > 0 ? ` · add ${left} more to submit` : " · ready"}
        {saving ? " · saving…" : ""}
      </p>

      <StepFooter
        backHref={listingStepHref(draft.id, "location")}
        type="button"
        label={advance ? "Continue" : "Done"}
        pending={saving || uploading > 0}
        onClick={() => router.push(listingStepHref(draft.id, advance ? "details" : "photos"))}
      />
    </div>
  );
}
