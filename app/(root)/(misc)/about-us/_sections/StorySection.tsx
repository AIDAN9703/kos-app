import Image from "next/image";

/* Editorial opener: dateline + headline + lede on the left, square photo
   on the right — one tight row — then the two-column body below. */

export default function StorySection() {
  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
        {/* One tight row: dateline, headline, and lede stacked left; square
            photo right. */}
        {/* The whole opener is one centered 1200px unit — text column sized
            so the headline holds its lines, image right beside it, equal
            margins both sides of the row. */}
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
              Kings of the Sea · Est. March 2020 · Miami, Florida
            </p>
            {/* Forced two-line split only where the lines actually fit;
                phones wrap naturally instead of orphaning "room.". */}
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-primary sm:text-5xl">
              Born in a living room.{" "}
              <br className="hidden lg:block" />
              Raised on the water.
            </h1>
            <p className="mt-6 text-lg font-medium leading-relaxed text-primary/90 sm:text-xl">
              Rooted in the heart of South Florida for over a decade, Kings of the Sea originated
              as an idea in a living room and blossomed into reality in March 2020 — starting
              with a modest 24ft boat.
            </p>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-light-main lg:col-span-5">
            <Image
              src="/clients/fishing.jpeg"
              alt="The KOS crew after a day on the water"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 540px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Body columns — centered on the same axis as the opener */}
        <div className="mx-auto mt-12 w-full max-w-[1200px] sm:mt-14">
          <div className="grid grid-cols-1 gap-6 text-[15px] leading-7 text-slate-600 sm:grid-cols-2 sm:gap-10 sm:text-base sm:leading-8">
            <p>
              We&apos;ve steadily expanded since, and today our team is thrilled to continue
              providing the royal experience. At Kosyachts, we&apos;ve elevated the yachting
              experience, garnering love and loyalty from our cherished renters and boat owners
              alike.
            </p>
            <p>
              Our commitment to excellence is reflected in every aspect of our operations, thanks
              to a team of experts spanning diverse fields — from marketplace management to
              mechanical engineering, certified captains to venture capital advising.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
