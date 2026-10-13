import Image from "next/image";
import Link from "next/link";
import { Container } from "./ui";

/* Same searches as the current landing page's destination cards. */
const DESTINATIONS = [
  {
    name: "Miami",
    region: "Biscayne Bay",
    lat: "25.76° N",
    lng: "80.19° W",
    image: "/images/locations/miami.jpg",
    tilt: -4,
    drop: 0,
    href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=25.85578602396197&ne_lng=-80.13217904641093&sw_lat=25.7090419531335&sw_lng=-80.31860792381018&zoom_level=13",
  },
  {
    name: "The Bahamas",
    region: "Caribbean",
    lat: "25.04° N",
    lng: "77.35° W",
    image: "/images/locations/bahamas.jpg",
    tilt: 3,
    drop: 26,
    href: "/boats/search?near=The+Bahamas&ne_lat=26.590274469914576&ne_lng=-76.65761869261429&sw_lat=22.560024925745196&sw_lng=-79.35476224730179&zoom_level=8&center_lat=24.591364629076335&center_lng=-78.00619046995804&page=1",
  },
  {
    name: "Fort Lauderdale",
    region: "Florida",
    lat: "26.12° N",
    lng: "80.14° W",
    image: "/images/locations/fort-lauderdale.png",
    tilt: -2,
    drop: 6,
    href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=26.342075651857815&ne_lng=-79.94274801289657&sw_lat=25.85493658661458&sw_lng=-80.27851766621689&zoom_level=13&page=1",
  },
  {
    name: "Naples",
    region: "Gulf Coast",
    lat: "26.14° N",
    lng: "81.79° W",
    image: "/images/locations/naples.jpg",
    tilt: 5,
    drop: 30,
    href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=26.78162320580448&ne_lng=-81.53055713088251&sw_lat=25.80900322954124&sw_lng=-82.20209643752314&zoom_level=13&page=1",
  },
  {
    name: "West Palm Beach",
    region: "Florida",
    lat: "26.72° N",
    lng: "80.05° W",
    image: "/images/locations/west-palm.jpg",
    tilt: -3,
    drop: 18,
    href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=27.20361325071068&ne_lng=-79.67871662569503&sw_lat=26.234574624628717&sw_lng=-80.35025593233566&zoom_level=13&page=1",
  },
  {
    name: "Dominican Republic",
    region: "Caribbean",
    lat: "18.49° N",
    lng: "69.93° W",
    image: "/images/locations/dominican-republic.jpg",
    tilt: 2,
    drop: 0,
    href: "/boats/search?near=Dominican+Republic&ne_lat=27.00077435235987&ne_lng=-65.31237564053237&sw_lat=10.272085808139986&sw_lng=-76.10094985928237&zoom_level=6&center_lat=18.844302328127366&center_lng=-70.70666274990737&page=1",
  },
  {
    name: "Connecticut",
    region: "Long Island Sound",
    lat: "41.31° N",
    lng: "72.92° W",
    image: "/images/locations/conneticut.jpg",
    tilt: -5,
    drop: 24,
    href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=42.52785484619885&ne_lng=-71.37854485044119&sw_lat=39.24828154025446&sw_lng=-74.06470207700369&zoom_level=13&page=1",
  },
];

/**
 * Where we sail, as a spread of postcards on sand. Each card is tilted a
 * little; pointing at one straightens and lifts it.
 */
export function Postcards() {
  return (
    <section className="overflow-hidden bg-[#f1e9dc] py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-deep">
            Where we sail
          </p>
          <h2 className="mt-3 text-balance text-4xl font-black tracking-tight text-primary sm:text-6xl">
            Where to next?
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
            A few of our most popular spots, with plenty more beyond them. Take a look around, and
            if you have somewhere else in mind, just ask.
          </p>
        </div>
      </Container>

      <div className="mx-auto mt-14 flex max-w-[1240px] snap-x gap-5 overflow-x-auto scroll-px-6 px-6 pb-10 pt-4 hide-scrollbar sm:mt-16 lg:flex-wrap lg:justify-center lg:gap-x-0 lg:gap-y-6 lg:overflow-visible lg:px-8 lg:pb-4">
        {DESTINATIONS.map((d) => (
          <Link
            key={d.name}
            href={d.href}
            style={{ "--tilt": `${d.tilt}deg`, "--drop": `${d.drop}px` } as React.CSSProperties}
            className="group relative w-[250px] shrink-0 snap-start rotate-[var(--tilt)] lg:mt-[var(--drop)] rounded-md bg-white p-3 pb-4 shadow-[0_22px_40px_-22px_rgba(14,27,39,0.55)] transition duration-300 ease-out hover:z-10 hover:-translate-y-3 hover:rotate-0 hover:shadow-[0_30px_60px_-24px_rgba(14,27,39,0.6)] sm:w-[270px] lg:-mx-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-slate-100">
              <Image src={d.image} alt="" fill sizes="270px" className="object-cover" />
              <span className="absolute right-2 top-2 rounded-sm bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                {d.lat} · {d.lng}
              </span>
            </div>
            <p className="pt-3.5 text-lg font-black leading-tight text-primary">{d.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{d.region}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
