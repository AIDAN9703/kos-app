import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Calendar, User, ArrowLeft, Clock, Tag, Eye } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  getBlogPostBySlug,
  incrementViewCount,
  getPublishedBlogPosts,
} from "@/features/blog/actions/admin-blog-actions";
import { formatDate } from "@/shared/lib/utils/general-utils";
import SocialShare from "@/shared/components/ui/social-share";

// Category display names mapping
const categoryLabels = {
  FLEET_NEWS: "Fleet News",
  CONSERVATION: "Conservation",
  TIPS_ADVICE: "Tips & Advice",
  CASE_STUDY: "Case Study",
  COMPANY_NEWS: "Company News",
  SAFETY: "Safety",
  EVENTS: "Events",
} as const;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | KOS Yachts",
      description: "The requested blog post could not be found.",
    };
  }

  return {
    title: post.metaTitle || `${post.title} | KOS Yachts`,
    description: post.metaDescription || post.excerpt,
    alternates: {
      canonical: `https://www.kosyachts.com/news/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  // Fetch the blog post
  const post = await getBlogPostBySlug(slug);

  // Handle 404
  if (!post) {
    notFound();
  }

  // Increment view count (non-blocking)
  incrementViewCount(post.id).catch(console.error);

  // Fetch related posts (same category, excluding current post)
  const relatedPostsData = await getPublishedBlogPosts({
    category: post.category,
    limit: 3,
  });
  const relatedPosts = relatedPostsData
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  // Estimate reading time (rough calculation: 200 words per minute)
  const wordCount = post.content.split(" ").length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="w-full">
      {/* Back to News */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href="/news"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to News
        </Link>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-6 mb-8 text-gray-600">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="font-medium">{post.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{readingTime} min read</span>
          </div>
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            <span>{post.viewCount} views</span>
          </div>
          <div className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
            <Tag className="h-4 w-4 mr-2" />
            <span>{categoryLabels[post.category]}</span>
          </div>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-8">
            <div className="relative h-64 md:h-96 lg:h-[500px] rounded-xl overflow-hidden">
              <Image
                src={post.featuredImage}
                alt={post.imageAlt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1024px"
                priority
              />
            </div>
          </div>
        )}

        {/* Excerpt */}
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border-l-4 border-primary">
          <p className="text-lg text-gray-700 font-light leading-relaxed italic">
            {post.excerpt}
          </p>
        </div>

        {/* Content — plain text from the admin textarea; render newlines via
            CSS instead of injecting HTML (closes the stored-XSS surface). */}
        <div className="prose prose-lg max-w-none mb-12">
          <div
            className="text-gray-800 leading-relaxed whitespace-pre-line"
            style={{
              lineHeight: "1.8",
              fontSize: "1.125rem",
            }}
          >
            {post.content}
          </div>
        </div>

        {/* Social Sharing */}
        <SocialShare title={post.title} />
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-primary mb-8">
              Related Posts
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/news/${relatedPost.slug}`}
                  className="group"
                >
                  <article className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {/* Image */}
                    <div className="relative h-48">
                      <Image
                        src={
                          relatedPost.featuredImage ||
                          "/images/experiences/yachtparty.jpg"
                        }
                        alt={relatedPost.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 backdrop-blur-sm text-primary"
                        >
                          {categoryLabels[relatedPost.category]}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {formatDate(
                              relatedPost.publishedAt || relatedPost.createdAt,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{relatedPost.author}</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-medium text-primary mb-3 leading-tight group-hover:text-primary/80 transition-colors">
                        {relatedPost.title}
                      </h3>

                      <p className="text-gray-600 font-light leading-relaxed line-clamp-3">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
