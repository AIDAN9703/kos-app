import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { verifyPhoneBookingProof } from "./phone-booking-proof";

/**
 * Sign-in by texted code, used in the booking flow. Twilio Verify checks the
 * code in features/auth/actions/booking-phone-auth.ts, which then hands this
 * endpoint a short-lived signed proof naming the one account that has
 * verified that number.
 *
 * Server-only: callable as auth.api.signInPhoneBooking from server actions,
 * never exposed over HTTP.
 */
export const phoneBookingPlugin = () =>
  ({
    id: "phone-booking",
    endpoints: {
      signInPhoneBooking: createAuthEndpoint.serverOnly(
        { method: "POST", body: z.object({ proof: z.string() }) },
        async (ctx) => {
          const verified = verifyPhoneBookingProof(ctx.body.proof);
          if (!verified) {
            throw new APIError("UNAUTHORIZED", { message: "That code has expired. Request a new one." });
          }

          const user = await ctx.context.internalAdapter.findUserById(verified.userId);
          const phone = user as { phoneNumber?: string | null; phoneVerified?: boolean | null } | null;
          if (!user || phone?.phoneNumber !== verified.phone || !phone?.phoneVerified) {
            throw new APIError("UNAUTHORIZED", { message: "Could not sign you in. Try email instead." });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not sign you in." });
          }
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        }
      ),
    },
  }) satisfies BetterAuthPlugin;
