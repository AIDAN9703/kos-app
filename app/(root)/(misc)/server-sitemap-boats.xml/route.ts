import { getServerSideSitemap } from 'next-sitemap'
import { getAllBoatIds } from '@/features/boats/actions/boat-actions'
import type { ISitemapField } from 'next-sitemap'

export async function GET() {
  try {
    // Get all active boat IDs
    const boatIds = await getAllBoatIds()
    
    // Generate sitemap fields for each boat
    const fields: ISitemapField[] = []
    
    for (const boatId of boatIds) {
      // Main boat page
      fields.push({
        loc: `https://www.kosyachts.com/boats/${boatId}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly' as const,
        priority: 0.8,
      })
      
      // Boat inquiry page
      fields.push({
        loc: `https://www.kosyachts.com/boats/${boatId}/inquiry`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly' as const, 
        priority: 0.6,
      })
    }
    
    console.log(`✅ Generated server-side sitemap with ${fields.length} boat URLs`)
    
    return getServerSideSitemap(fields)
  } catch (error) {
    console.error('❌ Error generating boat sitemap:', error)
    
    // Return empty sitemap on error
    return getServerSideSitemap([])
  }
}
