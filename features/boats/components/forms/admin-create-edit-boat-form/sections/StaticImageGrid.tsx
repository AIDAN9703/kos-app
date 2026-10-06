"use client";

import React from "react";
import { Image as IKImage } from "@imagekit/next";
import { getImageKitProps } from "@/shared/lib/utils/imagekit";

interface StaticImageGridProps {
  images: string[];
  onDelete?: (index: number) => void;
  showDeleteButton?: boolean;
}

export default function StaticImageGrid({
  images,
  onDelete,
  showDeleteButton = false,
}: StaticImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center text-muted-foreground">
          <div className="text-lg mb-2">📷</div>
          <div className="text-sm">No images uploaded yet</div>
          <div className="text-xs text-muted-foreground/80">
            Upload your first image below
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 justify-start">
      {images.map((image, index) => {
        const props = getImageKitProps(image, "thumb");

        return (
          <div key={`static-${image}-${index}`} className="relative group">
            <div className="relative w-24 h-24 border border-border rounded-xl overflow-hidden bg-muted hover:shadow-md transition-all duration-200">
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-md z-10 shadow-sm font-medium">
                  Main
                </div>
              )}
              <IKImage
                src={props.src}
                alt={`${index === 0 ? "Main" : "Gallery"} image ${index + 1}`}
                width={props.width}
                height={props.height}
                sizes={props.sizes}
                loading={props.loading}
                fetchPriority={props.fetchPriority}
                transformation={props.transformation}
                className="w-full h-full object-cover"
              />

              {/* Delete button (optional) */}
              {showDeleteButton && onDelete && (
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold z-20 shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(index);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
