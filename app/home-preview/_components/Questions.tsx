import Link from "next/link";
import { Plus } from "lucide-react";
import { Container, SectionTitle, textLinkClass } from "./ui";

/* Shortened from the answers on /faq. */
const QUESTIONS = [
  {
    q: "What's included?",
    a: "Every charter includes the boat, the crew, ice and water. A price is either all-in, or plus gratuity paid to the crew directly. Each boat's page says which.",
  },
  {
    q: "Is a captain included?",
    a: "Yes. Every charter is crewed, and all our captains are licensed, experienced professionals. We share the crew for your charter before you board.",
  },
  {
    q: "Can we bring more than 13 people?",
    a: "The Coast Guard limits most charters to 13 guests. For a bigger group, book one larger boat (a catamaran, pontoon or large yacht), or two boats that tie up together once safely anchored.",
  },
  {
    q: "What if the weather turns?",
    a: "If our captain or the Coast Guard calls conditions unsafe, such as high winds or lightning, we'll reschedule or refund. Clouds and light rain usually don't stop a charter.",
  },
  {
    q: "How far ahead should we book?",
    a: "Two to three weeks ahead for holidays and summer. Last-minute charters are often possible, depending on availability.",
  },
];

export function Questions() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <SectionTitle className="mt-0">Questions, answered.</SectionTitle>
            <Link href="/faq" className={`${textLinkClass} mt-6 inline-block`}>
              Read all FAQs
            </Link>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-8">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-semibold text-primary sm:text-lg [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus className="size-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-7 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
