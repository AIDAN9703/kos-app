"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
import { deleteBlogPost } from "@/features/blog/actions/admin-blog-actions";

/** The post's page actions: view it live, and delete it. */
export function BlogPostActions({
  id,
  title,
  slug,
  published,
}: {
  id: string;
  title: string;
  slug: string;
  published: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await deleteBlogPost(id);
    setBusy(false);
    if (result.success) {
      toast({ title: "Post deleted" });
      router.replace("/admin/blog");
    } else {
      setConfirming(false);
      toast({ title: "That didn't work", description: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center gap-2">
      {published && (
        <Button asChild variant="glass" size="sm" className="h-9 gap-1.5 px-4">
          <a href={`/news/${slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            View on site
          </a>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass" size="sm" className="size-9 p-0" aria-label="Post actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setConfirming(true)} className="text-destructive">
            <Trash2 className="size-4" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming} onOpenChange={(open) => !open && !busy && setConfirming(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{title}”?</DialogTitle>
            <DialogDescription>The post is removed for good, including from the news page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={busy}>
              {busy ? "Deleting…" : "Delete post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
