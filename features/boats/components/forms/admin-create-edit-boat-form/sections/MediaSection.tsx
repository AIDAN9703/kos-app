"use client";

import React, { useState, Suspense, lazy } from "react";
import { Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ImageUpload } from "@/shared/components/ui/image-upload";
import { Button } from "@/shared/components/ui/button";
import StaticImageGrid from "./StaticImageGrid";

// Lazy load the drag & drop functionality
const DragDropImageGrid = lazy(() => import("./DragDropImageGrid"));

export function MediaSection({
  images,
  onUpload,
  onReorder,
  onDelete,
  boatId,
  boatName,
}: {
  images: string[];
  onUpload: (url: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDelete: (index: number) => void;
  boatId?: string;
  boatName?: string;
}) {
  const [enableDragDrop, setEnableDragDrop] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-4 w-4" />
              Boat Images
            </CardTitle>
            <CardDescription>
              Upload and arrange images. The first image will be used as the
              main image.
            </CardDescription>
          </div>

          {images.length > 1 && (
            <Button
              type="button"
              variant={enableDragDrop ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableDragDrop(!enableDragDrop)}
            >
              {enableDragDrop ? "✅ Drag & Drop" : "🔄 Enable Reordering"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-6 rounded-lg border-2 border-dashed border-border min-h-[200px]">
          {enableDragDrop && images.length > 0 ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">
                    Loading drag & drop...
                  </div>
                </div>
              }
            >
              <DragDropImageGrid
                images={images}
                onReorder={onReorder}
                onDelete={onDelete}
              />
            </Suspense>
          ) : (
            <StaticImageGrid
              images={images}
              onDelete={onDelete}
              showDeleteButton={true}
            />
          )}
        </div>

        <ImageUpload
          type="boat"
          entityId={boatId || "new"}
          entityName={boatName || "boat"}
          onUploadComplete={onUpload}
          buttonText={
            images.length === 0 ? "Upload First Image" : "Add More Images"
          }
          variant="outline"
          multiple
        />

        {images.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {images.length} image{images.length !== 1 ? "s" : ""} uploaded
            </span>
            {enableDragDrop && images.length > 1 && (
              <span className="text-primary">Drag any image to reorder</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
