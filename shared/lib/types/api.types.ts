/**
 * Standardized API Response Types
 * Used for type-safe API client functions
 */

/**
 * Standard API response structure
 * All API routes should return this format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

