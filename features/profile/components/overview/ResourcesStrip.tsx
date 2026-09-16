import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { surfaceInteractive } from "../surface";

export interface ResourcePost {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  imageAlt: string | null;
}

/** Latest published articles as small cards at the foot of the overview. Hidden when there are none. */
export function ResourcesStrip({ posts }: { posts: ResourcePost[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="resources-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="resources-heading" className="text-xl font-semibold tracking-tight text-primary">
          From the blog
        </h2>
        <Link href="/news" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          All articles
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/news/${post.slug}`} className={`group flex h-full flex-col overflow-hidden ${surfaceInteractive}`}>
              <div className="relative aspect-[16/9] bg-muted">
                {post.featuredImage ? (
                  <Image
                    src={post.featuredImage}
                    alt={post.imageAlt ?? ""}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 300px"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-primary">{post.title}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-slate-500 group-hover:text-primary">
                  Read
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
