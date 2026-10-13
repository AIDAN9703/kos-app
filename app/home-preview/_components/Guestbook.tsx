import Image from "next/image";
import { Instagram, Star } from "lucide-react";
import type { GoogleReview } from "@/features/_marketing/landing/actions/testimonials";
import { cn } from "@/shared/lib/utils/general-utils";
import { Container, SectionTitle, textLinkClass } from "./ui";

type Tile =
  | { kind: "photo"; src: string; alt: string; aspect: string }
  | { kind: "review"; tone: number };

/* Photos and review cards interleaved; the masonry columns stagger them. */
const LAYOUT: Tile[] = [
  {
    kind: "photo",
    src: "/clients/king.JPG",
    alt: "A guest in a gold crown at sunset",
    aspect: "aspect-[3/4]",
  },
  { kind: "review", tone: 0 },
  {
    kind: "photo",
    src: "/clients/girls.jpg",
    alt: "Friends celebrating on board",
    aspect: "aspect-[4/5]",
  },
  {
    kind: "photo",
    src: "/clients/jetski.jpeg",
    alt: "Two jet skis at sunset",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "photo",
    src: "/clients/beachday.jpeg",
    alt: "Guests on a beach day",
    aspect: "aspect-square",
  },
  { kind: "review", tone: 1 },
  {
    kind: "photo",
    src: "/clients/backflip.JPG",
    alt: "A guest backflipping off the boat",
    aspect: "aspect-[4/5]",
  },
  {
    kind: "photo",
    src: "/clients/koshat.jpeg",
    alt: "A guest in a Kings of the Sea cap",
    aspect: "aspect-[3/4]",
  },
  { kind: "review", tone: 2 },
  {
    kind: "photo",
    src: "/clients/fishing.jpeg",
    alt: "A guest holding up a catch",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "photo",
    src: "/clients/niceyacht.jpg",
    alt: "A yacht's main salon",
    aspect: "aspect-square",
  },
  { kind: "review", tone: 3 },
];

type Rendered =
  | Extract<Tile, { kind: "photo" }>
  | { kind: "review"; tone: number; review: GoogleReview };

const TONES = [
  "bg-primary text-white",
  "bg-gold text-dark-bg",
  "bg-[#f1e9dc] text-primary",
  "bg-dark-bg text-white",
];

const GOOGLE_REVIEWS_URL = "https://www.google.com/search?q=KOS+Yachts+Kings+of+the+Sea+Reviews";

/** Guest photos and Google reviews, mixed on one wall. */
export function Guestbook({ reviews }: { reviews: GoogleReview[] }) {
  let next = 0;
  const tiles = LAYOUT.flatMap((tile): Rendered[] => {
    if (tile.kind === "photo") return [tile];
    const review = reviews[next++];
    return review ? [{ ...tile, review }] : [];
  });

  return (
    <section className="bg-white py-20 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionTitle className="mt-0 text-4xl font-black sm:text-6xl">
              Real people, real days on the water.
            </SectionTitle>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com/kosyachts"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(textLinkClass, "inline-flex items-center gap-2")}
            >
              <Instagram className="size-4" />
              @kosyachts
            </a>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={textLinkClass}
            >
              Google reviews
            </a>
          </div>
        </div>

        <div className="mt-12 columns-2 gap-3 sm:columns-3 lg:columns-4 lg:gap-4">
          {tiles.map((tile, i) =>
            tile.kind === "photo" ? (
              <div
                key={tile.src}
                className={cn(
                  "relative mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-slate-100 lg:mb-4",
                  tile.aspect
                )}
              >
                <Image
                  src={tile.src}
                  alt={tile.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 290px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            ) : (
              <figure
                key={`review-${i}`}
                className={cn(
                  "mb-3 break-inside-avoid rounded-2xl p-5 sm:p-6 lg:mb-4",
                  TONES[tile.tone]
                )}
              >
                <div className="flex gap-0.5" aria-label={`${tile.review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star
                      key={s}
                      className={cn(
                        "size-3.5",
                        s < tile.review.rating ? "fill-current" : "opacity-30"
                      )}
                    />
                  ))}
                </div>
                <blockquote className="mt-4 line-clamp-[8] text-[15px] font-medium leading-7">
                  &ldquo;{tile.review.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-bold">{tile.review.author_name}</span>
                  <span className="opacity-60"> · {tile.review.relative_time_description}</span>
                </figcaption>
              </figure>
            )
          )}
        </div>
      </Container>
    </section>
  );
}
