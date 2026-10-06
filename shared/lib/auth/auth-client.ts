"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  customSessionClient,
  inferAdditionalFields,
  lastLoginMethodClient,
} from "better-auth/client/plugins";

import type { auth } from "./auth";
import { ac, roles } from "./permissions";

/**
 * Browser side of auth: sign in/up/out, Google, linking sign-in methods,
 * password reset, and useSession(). Talks to /api/auth on this site.
 */
export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
    customSessionClient<typeof auth>(),
    lastLoginMethodClient(),
  ],
});

export const { useSession } = authClient;

/** Sign out, then reload on the home page so server-rendered UI resets too. */
export async function signOutAndGoHome(): Promise<void> {
  await authClient.signOut();
  window.location.assign("/");
}
