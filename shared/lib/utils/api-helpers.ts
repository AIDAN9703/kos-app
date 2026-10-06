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
 * Success response with data and metadata (uses SuperJSON)
 * Usage: return apiSuccessWithMeta(users, { pagination: {...} })
 */
export function apiSuccessWithMeta<T>(
  data: T,
  meta: Record<string, unknown>,
  status: number = 200
) {
  return NextResponse.json(
    superjson.serialize({
      success: true,
      data,
      meta,
    }),
    { status }
  );
}

/**
 * Paginated response helper (uses SuperJSON)
 * Usage: return apiPaginated(users, { page: 1, limit: 10, totalCount: 100, totalPages: 10 })
 */
export function apiPaginated<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  },
  status: number = 200
) {
  return NextResponse.json(
    superjson.serialize({
      success: true,
      data,
      meta: { pagination },
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

/**
 * Success response without data (for DELETE, etc.)
 * Usage: return apiSuccessNoData("User deleted")
 */
export function apiSuccessNoData(message: string = "Success", status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
    },
    { status }
  );
}

