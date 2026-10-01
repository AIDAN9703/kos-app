import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { surface } from "../surface";

/** My trips when the customer has none yet: a photo and a nudge toward the fleet. */
export function EmptyTripsCard() {
  return (
    <div className={`overflow-hidden sm:flex ${surface}`}>
      <div className="relative aspect-[16/9] sm:aspect-auto sm:w-[45%]">
        <Image
          src="/images/boats/aerial6.jpg"
          alt="Yacht anchored in clear water"
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 440px"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10">
        <h2 className="text-xl font-semibold tracking-tight text-primary">No trips yet</h2>
        <p className="mt-2 max-w-md text-[15px] leading-7 text-slate-600">
          Once you book a charter — or we send you a proposal — it shows up here with every detail
          in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="/boats/search">Browse boats</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-11 bg-slate-100 px-5 text-primary hover:bg-slate-200"
          >
            <Link href="/experiences">Explore experiences</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
