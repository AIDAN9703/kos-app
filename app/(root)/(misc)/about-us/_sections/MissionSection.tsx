import Image from "next/image";

export default function MissionSection() {
  return (
    /* The page's one navy moment — same full-bleed band grammar as the
       landing page. The white crest sits as a quiet watermark, off-center
       right, running off the bottom edge. */
    <section className="relative w-full overflow-hidden bg-primary py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-[16%] h-60 w-60 select-none opacity-[0.07] sm:-bottom-20 sm:h-[22rem] sm:w-[22rem]"
      >
        <Image
          src="/icons/transparent-white-logo.webp"
          alt=""
          fill
          className="object-contain"
          draggable={false}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold-glow">
            What drives us
          </p>
          <blockquote className="mt-6 text-2xl font-semibold leading-snug text-white sm:text-3xl md:text-4xl">
            &ldquo;Crafting extraordinary yacht experiences that inspire, connect, and transform
            lives.&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}
