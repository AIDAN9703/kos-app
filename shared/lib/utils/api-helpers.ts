/**
 * API Route Response Utilities
 * For use in app/api routes (not server actions)
 * 
 * Server actions should use ActionResponse from @/shared/types/types
 */

import { NextResponse } from 'next/server';
import superjson from 'superjson';
import { UserFacingError } from '@/shared/lib/errors';

/**
 * Success response with data (uses SuperJSON for Date serialization)
 * Usage: return apiSuccess(user)
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(
    superjson.serialize({
      success: true,
      data,
    }),
    { status }
  );
}

/**
 * Error response
 * Usage: return apiError("User not found", 404)
 */
export function apiError(error: string, status: number = 500) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Error response for whatever the data layer threw: access and rule errors
 * keep their message and status; anything else is logged as a 500.
 * Usage: catch (error) { return apiErrorFrom(error, "Failed to fetch boat") }
 */
export function apiErrorFrom(error: unknown, fallback: string) {
  if (error instanceof UserFacingError) return apiError(error.message, error.status);
  console.error(fallback, error);
  return apiError(fallback);
}

