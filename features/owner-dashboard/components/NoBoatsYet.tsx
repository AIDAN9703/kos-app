import Image from "next/image";
import Link from "next/link";

/** Owner account with no boats yet: what will be here, and the one next step. */
export function NoBoatsYet() {
  return (
    <section className="glass-panel relative isolate overflow-hidden p-0">
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-full md:w-[60%]">
        <Image
          src="/images/services/charter-management2.jpg"
          alt=""
          fill
          sizes="60vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/70 to-transparent" />
      </div>
      <div className="absolute inset-0 -z-20 bg-background" />
      <div className="max-w-xl p-8 md:p-12">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">No boats yet</h2>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          List your boat in about 15 minutes. Once the KOS team approves it, its charters, calendar
          and earnings show up here.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/list-your-boat/start"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-[filter] hover:brightness-110"
          >
            List your boat
          </Link>
          <Link
            href="/services/charter-management"
            className="rounded-full border border-glass-border bg-glass-strong px-6 py-3 text-sm font-semibold text-foreground transition-[filter] hover:brightness-125"
          >
            Have KOS manage it instead
          </Link>
        </div>
      </div>
    </section>
  );
}
