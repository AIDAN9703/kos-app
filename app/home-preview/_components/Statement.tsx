import Image from "next/image";
import { Container } from "./ui";

/** A small rounded photo set into the sentence, like a word. */
function Pill({ src }: { src: string }) {
  return (
    <span className="relative mx-[0.12em] inline-block h-[0.78em] w-[1.75em] -translate-y-[0.04em] overflow-hidden rounded-full align-middle ring-1 ring-black/5">
      <Image src={src} alt="" fill sizes="120px" className="object-cover" />
    </span>
  );
}

const FACTS = [
  "Instant Book on select boats",
  "A plan within 24 hours",
  "Boat, crew, ice & water included",
];

/** One big sentence that says what KOS does, with photos where words would go. */
export function Statement() {
  return (
    <section className="bg-white py-20 sm:py-32">
      <Container>
        <p className="text-[1.75rem] font-bold leading-[1.28] tracking-tight text-primary sm:text-5xl sm:leading-[1.2] lg:text-[3.5rem]">
          Private yachts <Pill src="/clients/niceyacht.jpg" />, licensed captains, sandbar
          afternoons <Pill src="/images/experiences/hauloversandbar.jpeg" />, sunsets on the bay{" "}
          <Pill src="/images/experiences/sunset.jpg" /> and whole weeks in the Bahamas{" "}
          <Pill src="/images/locations/bahamas.jpg" />.{" "}
          <span className="text-gold">Tell us the day. We&apos;ll handle the rest.</span>
        </p>

        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 sm:mt-16">
          {FACTS.map((fact) => (
            <li
              key={fact}
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-slate-300" />
              {fact}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
