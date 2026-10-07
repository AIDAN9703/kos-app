import { cachedFetch } from '@/shared/lib/utils/general-utils';
import { ActionResponse } from '@/shared/lib/types/types';

export interface GoogleReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  profile_photo_url: string;
}

interface TestimonialsData {
  reviews: GoogleReview[];
}

/** New Places API v1 review shape (only the fields we read). */
interface PlacesV1Review {
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  authorAttribution?: { displayName?: string; photoUri?: string };
}

interface PlacesV1Response {
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesV1Review[];
  error?: { code?: number; status?: string; message?: string };
}

/**
 * Live Google reviews via the Places API v1.
 *
 * The key is referer-restricted (it's the browser Maps key), which the LEGACY
 * Place Details API rejects outright from servers. The v1 API honors the
 * restriction instead — so we send our own allowed domain as the Referer.
 */
export async function getTestimonials(): Promise<ActionResponse<TestimonialsData>> {
  "use server";

  return cachedFetch<ActionResponse<TestimonialsData>>(
    'testimonials',
    async () => {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      const placeId = process.env.GOOGLE_PLACE_ID;

      if (!apiKey || !placeId) {
        console.warn('[testimonials] Missing GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID');
        return { success: false, error: 'Missing Google Places API configuration' };
      }

      try {
        const response = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${apiKey}`,
          {
            headers: { Referer: 'https://kosyachts.com/' },
            cache: 'force-cache',
            next: { revalidate: 3600 },
          }
        );

        const data: PlacesV1Response = await response.json();

        if (!response.ok || data.error) {
          console.warn(
            `[testimonials] Places v1 error ${data.error?.code ?? response.status}: ${data.error?.message ?? 'no message'}`
          );
          return { success: false, error: 'Failed to fetch reviews from Google Places API' };
        }

        const reviews: GoogleReview[] = (data.reviews ?? [])
          // Rating-only reviews have no text — nothing to quote.
          .filter((r) => r.text?.text?.trim())
          .map((r) => ({
            author_name: r.authorAttribution?.displayName ?? 'Google user',
            rating: r.rating ?? 5,
            relative_time_description: r.relativePublishTimeDescription ?? '',
            text: r.text!.text!.trim(),
            profile_photo_url: r.authorAttribution?.photoUri ?? '',
          }));

        return { success: true, data: { reviews } };
      } catch (error) {
        console.error('[testimonials] Error fetching testimonials:', error);
        return { success: false, error: 'Failed to fetch testimonials' };
      }
    },
    { revalidate: 3600 }
  );
}
