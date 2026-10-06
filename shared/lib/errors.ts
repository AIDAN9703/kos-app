/**
 * Failures whose message is safe to show the person. The data layer throws
 * them; server actions turn them into { success: false, error } (actionError)
 * and API routes into a status code (apiErrorFrom). Anything else thrown is a
 * bug: it stays in the server log and the person sees a generic message.
 */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 409 = 400
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Not signed in (401), not allowed (403), or not theirs or not there (404). */
export class AccessDenied extends UserFacingError {
  constructor(message = "You don't have access to that.", status: 401 | 403 | 404 = 403) {
    super(message, status);
    this.name = "AccessDenied";
  }
}

/** Input that failed validation, with messages per field for inline forms. */
export class InvalidFields extends UserFacingError {
  constructor(
    readonly fieldErrors: Record<string, string[]>,
    message = "Please check the highlighted fields."
  ) {
    super(message, 400);
    this.name = "InvalidFields";
  }
}

/**
 * The Postgres error code behind a failed query ("23503" = a row still
 * referenced elsewhere). Drizzle wraps the driver's error in `cause`.
 */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
