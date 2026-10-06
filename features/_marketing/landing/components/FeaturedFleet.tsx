"use client";

import { useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BoatListingCard from "@/features/boats/components/BoatListingCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/shared/components/ui/carousel";
import type { BoatCard } from "@/features/boats/boat.types";

interface FeaturedFleetProps {
  boats: BoatCard[];
}

export default function FeaturedFleet({ boats }: FeaturedFleetProps) {
  const prefersReducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  return (
    <section className="py-10 sm:py-16">
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-2"
        >
          <div>
            <h2 className="text-2xl sm:text-4xl font-bold text-primary leading-tight">
              The Featured Fleet
            </h2>
            <p className="text-foreground text-sm sm:text-base font-light max-w-md">
              Handpicked yachts for your next adventure
            </p>
          </div>

          {boats.length > 2 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={scrollPrev}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-light-main transition-colors hover:bg-slate-200"
                aria-label="Previous boats"
              >
                <ChevronLeft className="h-4 w-4 text-primary" />
              </button>
              <button
                onClick={scrollNext}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-light-main transition-colors hover:bg-slate-200"
                aria-label="Next boats"
              >
                <ChevronRight className="h-4 w-4 text-primary" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Carousel */}
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="w-full"
          aria-label="Featured fleet"
        >
          <CarouselContent className="-ml-3 sm:-ml-4 py-2">
            {boats.map((boat, idx) => (
              <CarouselItem
                key={boat.id}
                className="pl-3 sm:pl-4 basis-4/5 sm:basis-1/2 lg:basis-1/3"
              >
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: Math.min(idx * 0.08, 0.4),
                    duration: 0.5,
                  }}
                >
                  <BoatListingCard boat={boat} index={idx} size="lg" />
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
