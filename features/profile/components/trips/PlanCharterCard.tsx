import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { surface } from "../surface";

interface PlanCharterCardProps {
  title: string;
  body: string;
}

/**
 * Photo-led "book your next trip" card. The overview always shows it; the trips
 * page uses it as the empty state. Title and body change with the context.
 */
export function PlanCharterCard({ title, body }: PlanCharterCardProps) {
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
        <h3 className="text-xl font-semibold tracking-tight text-primary">{title}</h3>
        <p className="mt-2 max-w-md text-[15px] leading-7 text-slate-600">{body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="/boats/search">Browse boats</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-11 px-5 bg-gray-100 text-primary hover:bg-gray-200">
            <Link href="/experiences">Explore experiences</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
