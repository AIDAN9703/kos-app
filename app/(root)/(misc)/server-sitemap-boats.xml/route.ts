import { getServerSideSitemap } from 'next-sitemap'
import type { ISitemapField } from 'next-sitemap'
import { getPublicBoatIds } from '@/features/boats/boat.data'

export async function GET() {
  try {
    const boatIds = await getPublicBoatIds()

    // One page per listed boat. The booking-flow pages behind it aren't
    // landing pages, so they stay out of the sitemap.
    const fields: ISitemapField[] = boatIds.map((boatId) => ({
      loc: `https://www.kosyachts.com/boats/${boatId}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8,
    }))

    return getServerSideSitemap(fields)
  } catch (error) {
    console.error('❌ Error generating boat sitemap:', error)

    // Return empty sitemap on error
    return getServerSideSitemap([])
  }
}
