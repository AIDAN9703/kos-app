import Image from "next/image";
import { cn } from "@/shared/lib/utils/general-utils";
import { Container } from "./ui";

/* h evens out logos whose files carry very different padding. */
const BRANDS: { name: string; logo: string; h?: string }[] = [
  { name: "Airbnb", logo: "/images/brands/airbnb.webp" },
  { name: "Ramp", logo: "/images/brands/ramp.png" },
  { name: "Miami Vice", logo: "/images/brands/miamivice.png", h: "h-16" },
  { name: "Happy Dad", logo: "/images/brands/happydad.png" },
  { name: "Overtime", logo: "/images/brands/overtime.png" },
  { name: "Betr", logo: "/images/brands/betr.png", h: "h-8" },
  { name: "Meduza", logo: "/images/brands/meduza.png", h: "h-16" },
  { name: "Louis The Child", logo: "/images/brands/louisthechild.jpg" },
  { name: "Bucketlisters", logo: "/images/brands/bucketlisters.png" },
  { name: "Fashion Week Haus", logo: "/images/brands/fwh.avif" },
  { name: "Lobel's", logo: "/images/brands/lobels.webp" },
  { name: "1001", logo: "/images/brands/1001.png" },
];

/**
 * A gold band of brand logos gliding past. Multiply blending drops the
 * logos' white backgrounds into the gold.
 */
export function BrandBand() {
  return (
    <section className="overflow-hidden bg-gold py-10 sm:py-12">
      <Container className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
        <p className="shrink-0 text-2xl font-black leading-[1.1] tracking-tight text-dark-bg lg:w-60">
          Brands that have sailed with us
        </p>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          {/* The track carries its own gold: it is its own compositing group
              (it moves), so the logos can only blend with what is inside it. */}
          <div className="flex w-max animate-marquee items-center bg-gold">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <div key={`${b.name}-${i}`} className="px-7">
                <div className={cn("relative w-28", b.h ?? "h-12")}>
                  <Image
                    src={b.logo}
                    alt={i < BRANDS.length ? b.name : ""}
                    fill
                    sizes="112px"
                    className="object-contain mix-blend-multiply grayscale contrast-125"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
