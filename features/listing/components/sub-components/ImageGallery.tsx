"use client";

import { useState, useCallback } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Image as IKImage } from "@imagekit/next";
import { getImageKitProps } from "@/shared/lib/utils/imagekit";
import { AspectRatio } from "@/shared/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/shared/components/ui/carousel";
import ImageGalleryViewAll from "./ImageGalleryViewAll";

interface ImageGalleryProps {
  mainImage: string;
  galleryImages: string[];
  alt: string;
}

export function ImageGallery({
  mainImage,
  galleryImages = [],
  alt,
}: ImageGalleryProps) {
  const allImages = [mainImage, ...(galleryImages || [])].filter(
    Boolean
  ) as string[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();

  // Navigation handlers - memoized for performance
  const prevSlide = useCallback(() => {
    if (api) api.scrollPrev();
  }, [api]);

  const nextSlide = useCallback(() => {
    if (api) api.scrollNext();
  }, [api]);

  // Handle opening the view all gallery - memoized for performance
  const openViewAll = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setViewAllOpen(true);
  }, []);

  // Check if a URL already has transformations (legacy leftover removed)

  if (allImages.length === 0) {
    return (
      <div className="bg-gray-100 rounded-none sm:rounded-xl overflow-hidden w-full aspect-video sm:aspect-[3/1.75] md:aspect-[3/1.5] lg:aspect-[3/1.25]">
        <div className="h-full flex items-center justify-center text-gray-400">
          No images available
        </div>
      </div>
    );
  }

  // Button animation variants for consistent hover effects
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <>
      <div className="relative">
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {allImages.map((image, idx) => (
              <CarouselItem key={idx} className="md:basis-[60%] basis-full">
                <AspectRatio
                  ratio={16 / 9}
                  className="bg-slate-50 rounded-none sm:rounded-lg overflow-hidden group cursor-pointer"
                  onClick={() => openViewAll(idx)}
                >
                  {(() => {
                    const props = getImageKitProps(image, "gallery", {
                      eager: idx === 0,
                    });
                    return (
                      <IKImage
                        src={props.src}
                        alt={`${alt} ${idx + 1}`}
                        loading={props.loading}
                        fetchPriority={props.fetchPriority}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
                        width={props.width}
                        height={props.height}
                        sizes={props.sizes}
                        transformation={props.transformation}
                      />
                    );
                  })()}
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Enhanced navigation buttons matching home page style */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 sm:left-4">
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={prevSlide}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-xs hover:bg-white shadow-xs hover:shadow-md transition-all duration-300 border border-gray-200/50"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </motion.button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-4">
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={nextSlide}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-xs hover:bg-white shadow-xs hover:shadow-md transition-all duration-300 border border-gray-200/50"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </motion.button>
        </div>
      </div>

      {/* View All Gallery Popup */}
      <ImageGalleryViewAll
        images={allImages}
        alt={alt}
        isOpen={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        initialIndex={currentIndex}
      />
    </>
  );
}
