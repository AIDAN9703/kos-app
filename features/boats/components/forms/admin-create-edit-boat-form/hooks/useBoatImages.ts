import { useCallback, useState } from "react";
import type { FieldPath, UseFormReturn } from "react-hook-form";

export function useBoatImages<TFormValues extends Record<string, unknown>>(
  methods: UseFormReturn<TFormValues>,
  initial: { mainImage?: string | null; galleryImages?: string[] | null } = {}
) {
  const [images, setImages] = useState<string[]>(() => {
    const all: string[] = [];
    if (initial.mainImage) all.push(initial.mainImage);
    if (initial.galleryImages?.length) all.push(...initial.galleryImages);
    return all.filter(Boolean);
  });

  const updateFormImages = useCallback((next: string[]) => {
    const set = methods.setValue.bind(methods);
    if (next.length === 0) {
      set("mainImage" as FieldPath<TFormValues>, "" as never);
      set("galleryImages" as FieldPath<TFormValues>, [] as never);
    } else {
      set("mainImage" as FieldPath<TFormValues>, next[0] as never);
      set("galleryImages" as FieldPath<TFormValues>, next.slice(1) as never);
    }
  }, [methods]);

  const handleUpload = useCallback((url: string) => {
    setImages(prev => {
      const next = prev.includes(url) ? prev : [...prev, url];
      updateFormImages(next);
      return next;
    });
  }, [updateFormImages]);

  // Move one image from oldIndex to newIndex (the drag grid calls this).
  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    setImages(prev => {
      const next = Array.from(prev);
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      updateFormImages(next);
      return next;
    });
  }, [updateFormImages]);

  const handleDelete = useCallback((index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      updateFormImages(next);
      return next;
    });
  }, [updateFormImages]);

  return { 
    images, 
    updateFormImages, 
    handleUpload, 
    handleReorder,
    handleDelete 
  };
}


