"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/utils/general-utils";

const SCENES = [
  {
    src: "/images/herooption22.jpg",
    label: "Golden hour",
    alt: "A motor yacht running past the Miami skyline at golden hour",
    position: "50% 60%",
  },
  {
    src: "/clients/beachday.jpeg",
    label: "Sandbar",
    alt: "Guests playing in the shallows at a sandbar",
    position: "50% 45%",
  },
  {
    src: "/images/experiences/yacht-ppl-swim.jpg",
    label: "Weeks away",
    alt: "Paddleboarders beside a superyacht in a mountain bay",
    position: "50% 50%",
  },
  {
    src: "/images/experiences/night-yacht-event.webp",
    label: "After dark",
    alt: "Two superyachts lit up in a marina at night",
    position: "50% 50%",
  },
];

const SCENE_MS = 6500;

/**
 * Full-screen and cinematic: four scenes cross-fade with a slow push-in,
 * story-style progress bars name each one, and the brand name runs across
 * the bottom edge at full width.
 */
export function Hero() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  // Bumped on every change, so the active bar restarts its fill.
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setActive((i) => (i + 1) % SCENES.length);
      setCycle((c) => c + 1);
    }, SCENE_MS);
    return () => clearTimeout(t);
  }, [active, cycle]);

  function show(i: number) {
    setActive(i);
    setCycle((c) => c + 1);
  }

  return (
    <section
      aria-label="Hero"
      className="relative isolate h-[100svh] min-h-[660px] overflow-hidden bg-dark-bg text-white"
    >
      {SCENES.map((scene, i) => (
        <div
          key={scene.src}
          aria-hidden={i !== active}
          className={cn(
            "absolute inset-0 -z-20 transition-opacity duration-[1400ms] ease-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
        >
          <div
            className={cn(
              "absolute inset-0",
              !reduceMotion &&
                (i === active
                  ? "scale-100 transition-transform duration-[8000ms] ease-out"
                  : "scale-110 transition-transform delay-[1400ms] duration-0")
            )}
          >
            <Image
              src={scene.src}
              alt={scene.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              quality={85}
              className="object-cover"
              style={{ objectPosition: scene.position }}
            />
          </div>
        </div>
      ))}

      {/* Dark at the top for the nav, darker at the bottom for the type. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-dark-bg/60 via-dark-bg/10 to-dark-bg/90"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-dark-bg/50 to-transparent"
      />

      <div className="mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <p className="animate-fade-in-up text-lg font-medium leading-8 text-white/85 sm:text-xl sm:leading-9">
              Crewed yachts for birthdays, sandbar days, sunsets and weeks away. Book a boat in
              minutes, or hand us the whole day.
            </p>
            <div className="animate-fade-in-up mt-7 flex flex-wrap gap-3 [animation-delay:150ms]">
              <Link
                href="/boats/search"
                className="inline-flex h-12 items-center rounded-full bg-gold px-7 text-[15px] font-semibold text-dark-bg transition-colors hover:bg-gold-glow"
              >
                Find your boat
              </Link>
              <Link
                href="#plan"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-7 text-[15px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/20"
              >
                Plan a charter
              </Link>
            </div>
          </div>

          {/* Story bars: one per scene; click to jump. */}
          <div className="grid w-full grid-cols-4 gap-3 lg:w-[460px]">
            {SCENES.map((scene, i) => (
              <button
                key={scene.label}
                type="button"
                onClick={() => show(i)}
                className="group text-left"
                aria-label={`Show ${scene.label}`}
              >
                <span className="block h-[2px] overflow-hidden rounded-full bg-white/25">
                  <motion.span
                    key={i === active ? `on-${cycle}` : i < active ? "done" : "off"}
                    className="block h-full bg-white"
                    initial={{ width: i < active ? "100%" : "0%" }}
                    animate={{ width: i <= active ? "100%" : "0%" }}
                    transition={
                      i === active ? { duration: SCENE_MS / 1000, ease: "linear" } : { duration: 0 }
                    }
                  />
                </span>
                <span
                  className={cn(
                    "mt-2.5 hidden text-xs font-medium transition-colors sm:block",
                    i === active ? "text-white" : "text-white/55 group-hover:text-white/80"
                  )}
                >
                  {scene.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-8 select-none text-[17.5vw] font-black uppercase leading-[0.82] tracking-[-0.045em] text-white sm:mt-10 lg:whitespace-nowrap lg:text-[9.9vw] 2xl:text-[142px]">
          Kings of <br className="lg:hidden" />
          the Sea
        </h1>
      </div>
    </section>
  );
}
