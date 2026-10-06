import "server-only";

import { ZodError } from "zod";

import { UserFacingError } from "@/shared/lib/errors";
import type { ActionResponse } from "@/shared/lib/types/types";

/**
 * The failure a server action returns. Access and rule errors from the data
 * layer, and invalid input, keep their message; anything else is logged and
 * replaced by `fallback` so database errors never reach the browser.
 */
export function actionError(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof UserFacingError) return { success: false, error: error.message };
  if (error instanceof ZodError) {
    return { success: false, error: error.issues[0]?.message ?? "Invalid input" };
  }
  console.error(fallback, error);
  return { success: false, error: fallback };
}
