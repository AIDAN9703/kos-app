"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Image as IKImage } from "@imagekit/next";
import { getImageKitProps } from "@/shared/lib/services/imagekit.service";
import { GripVertical } from "lucide-react";

interface SortableImageProps {
  id: string;
  image: string;
  index: number;
  onDelete: (index: number) => void;
}

function SortableImage({ id, image, index, onDelete }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const props = getImageKitProps(image, "thumb");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group select-none ${isDragging ? "scale-105 rotate-2" : ""}`}
      {...attributes}
    >
      <div className="relative w-24 h-24 border border-border rounded-xl overflow-hidden bg-muted hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing">
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
          className="w-full h-full object-cover select-none"
          draggable={false}
        />

        {/* Drag handle */}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center"
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Delete button */}
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
      </div>
    </div>
  );
}

interface DragDropImageGridProps {
  images: string[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDelete: (index: number) => void;
}

export default function DragDropImageGrid({
  images,
  onReorder,
  onDelete,
}: DragDropImageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(
        (image) => `image-${image}` === active.id
      );
      const newIndex = images.findIndex(
        (image) => `image-${image}` === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  }

  const imageIds = images.map((image) => `image-${image}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={imageIds} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-3 justify-start">
          {images.map((image, index) => (
            <SortableImage
              key={`image-${image}`}
              id={`image-${image}`}
              image={image}
              index={index}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
