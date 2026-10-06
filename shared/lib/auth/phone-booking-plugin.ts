import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { DEFAULT_ROLE } from "./permissions";
import { verifyPhoneBookingProof, verifyPhoneSignUpProof } from "./phone-booking-proof";

/**
 * Sign-in and sign-up by texted code, used in the booking flow. Twilio Verify
 * checks the code once (features/auth/phone-sign-in.data.ts), which then
 * hands these endpoints a short-lived signed proof instead of the code.
 *
 * Server-only: callable as auth.api.* from the server, never over HTTP.
 */
export const phoneBookingPlugin = () =>
  ({
    id: "phone-booking",
    endpoints: {
      /** Sign in the one account that has verified this number. */
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

      /**
       * Create a phone-only account (no password: they sign in with a texted
       * code, or set a password later) for a number that was just verified,
       * then sign it in. Goes through Better Auth's adapter, so the usual
       * sign-up hooks run (lowercased email, names, E.164 phone, username).
       * The email isn't verified yet, so it adopts nothing by email.
       */
      signUpPhoneBooking: createAuthEndpoint.serverOnly(
        {
          method: "POST",
          body: z.object({
            proof: z.string(),
            firstName: z.string().trim().min(1),
            lastName: z.string().trim().min(1),
            email: z.string().trim().toLowerCase().email(),
          }),
        },
        async (ctx) => {
          const verified = verifyPhoneSignUpProof(ctx.body.proof);
          if (!verified) {
            throw new APIError("UNAUTHORIZED", { message: "That code has expired. Request a new one." });
          }
          const { firstName, lastName, email } = ctx.body;
          if (await ctx.context.internalAdapter.findUserByEmail(email)) {
            throw new APIError("BAD_REQUEST", {
              message: "An account with this email already exists. Sign in with email instead.",
            });
          }

          const user = await ctx.context.internalAdapter.createUser(
            {
              email,
              emailVerified: false,
              name: `${firstName} ${lastName}`,
              firstName,
              lastName,
              phoneNumber: verified.phone,
              phoneVerified: true,
              role: DEFAULT_ROLE,
            },
            { method: "phone-booking" }
          );
          if (!user) {
            throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not create your account." });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", { message: "Account created, but sign-in failed." });
          }
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        }
      ),
    },
  }) satisfies BetterAuthPlugin;
