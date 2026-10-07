import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, customSession, haveIBeenPwned, lastLoginMethod } from "better-auth/plugins";
import { compare, hash } from "bcryptjs";
import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/database/db";
import { users, sessions, accounts, authVerifications, rateLimits } from "@/database/schema";
import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings.service";
import { sendAccountEmail } from "@/shared/lib/services/email.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";
import { ac, roles, DEFAULT_ROLE } from "./permissions";
import { phoneBookingPlugin } from "./phone-booking-plugin";
import { displayName, toSessionUser } from "./session-user";

/**
 * The one authentication setup for the whole app: email + password, Google,
 * texted codes in the booking flow, roles, and the signed-in session.
 *
 * Server code reads the session through shared/lib/utils/auth-utils.ts;
 * browser code through shared/lib/auth/auth-client.ts.
 */

const baseURL = getBaseUrl();

/** Same scheme the old sign-up used, so usernames stay recognisable. */
function makeUsername(email: string): string {
  return `${email.split("@")[0]}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * Google's id token carries the person's photo. Save it to their KOS profile
 * when they have none, so it shows however they sign in afterwards.
 */
async function fillMissingPhotoFromGoogle(account: {
  providerId: string;
  userId: string;
  idToken?: string | null;
}) {
  if (account.providerId !== "google" || !account.idToken) return;
  try {
    const claims = JSON.parse(Buffer.from(account.idToken.split(".")[1], "base64url").toString("utf8"));
    if (typeof claims.picture !== "string") return;
    await db
      .update(users)
      .set({ profileImage: claims.picture })
      .where(and(eq(users.id, account.userId), or(isNull(users.profileImage), eq(users.profileImage, ""))));
  } catch (error) {
    console.error("Saving the Google photo failed:", error);
  }
}

/** Local development only: print account links so they can be opened without an inbox (never in production). */
function logLinkInDevelopment(kind: string, email: string, url: string) {
  if (process.env.NODE_ENV === "development") console.info(`[auth] ${kind} link for ${email}: ${url}`);
}

const options = {
  appName: "Kings Of The Sea Yachts",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  trustedOrigins: [baseURL, "https://kosyachts.com", "https://www.kosyachts.com"],
  // Profile edits go through our own actions (features/profile/actions), which
  // reset a changed email's or phone's verified flag. Better Auth's generic
  // update endpoint wouldn't, so it's off.
  disabledPaths: ["/update-user"],

  database: drizzleAdapter(db, {
    provider: "pg",
    // Keyed by Better Auth model name. No `transaction` option: the neon-http
    // driver can't run transactions, and the adapter writes sequentially
    // without one.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: authVerifications,
      rateLimit: rateLimits,
    },
  }),

  advanced: {
    database: { generateId: "uuid" },
    ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
  },

  user: {
    fields: { image: "profileImage" },
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      phoneNumber: { type: "string", required: false },
      phoneVerified: { type: "boolean", required: false, defaultValue: false, input: false },
      username: { type: "string", required: false, input: false, returned: false },
    },
    // The new address is confirmed by email before it replaces the old one;
    // a verified account approves from its current address first.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        logLinkInDevelopment("email change approval", user.email, url);
        void sendAccountEmail({
          to: user.email,
          name: (user as { firstName?: string | null }).firstName ?? user.name,
          subject: "Approve your new email — Kings Of The Sea",
          previewText: `Approve changing your sign-in email to ${newEmail}.`,
          lead: `Someone asked to change the email on your Kings Of The Sea account to ${newEmail}. If that was you, approve it below and we'll send a confirmation to the new address.`,
          buttonLabel: "Approve the change",
          url,
          footnote: "Didn't ask for this? Ignore this email and change your password; your email stays the same.",
        });
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // a week, refreshed daily while in use
    updateAge: 60 * 60 * 24,
    // No cookie cache: every request reads the session row, so sign-outs,
    // bans and role changes apply immediately.
  },

  account: {
    accountLinking: {
      enabled: true,
      // Google proves the email, so signing in with Google links to an
      // existing account with that email, but only once that account's own
      // email is verified. Otherwise anyone could pre-register someone's
      // email with a password and wait for them to arrive through Google.
      // Unverified accounts sign in with their password and connect Google
      // from Account settings.
      trustedProviders: ["google"],
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // Passwords carried over from before Better Auth are bcrypt hashes, so
    // bcrypt stays the format for new ones too.
    password: {
      hash: (password) => hash(password, 10),
      verify: ({ hash: stored, password }) => compare(password, stored),
    },
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      logLinkInDevelopment("password reset", user.email, url);
      void sendAccountEmail({
        to: user.email,
        name: (user as { firstName?: string | null }).firstName ?? user.name,
        subject: "Reset your password — Kings Of The Sea",
        previewText: "Use this link to choose a new password.",
        lead: "We received a request to reset the password on your Kings Of The Sea account. The link below works for one hour.",
        buttonLabel: "Choose a new password",
        url,
        footnote: "Didn't ask for this? You can ignore this email; your password stays the same.",
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      logLinkInDevelopment("email verification", user.email, url);
      void sendAccountEmail({
        to: user.email,
        name: (user as { firstName?: string | null }).firstName ?? user.name,
        subject: "Confirm your email — Kings Of The Sea",
        previewText: "One click to confirm your email address.",
        lead: "Please confirm this is your email address. It's where we send proposals, receipts and trip details.",
        buttonLabel: "Confirm my email",
        url,
        footnote: "Didn't create an account with us? You can ignore this email.",
      });
    },
    // A newly proven email can adopt guest bookings made with it.
    afterEmailVerification: async (user) => {
      await claimGuestBookingsForUser(user.id).catch((err) =>
        console.error("Guest-booking claim failed:", err)
      );
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name ?? null,
        lastName: profile.family_name ?? null,
      }),
    },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      // Read on every page load; counting it would mean a write per page.
      "/get-session": false,
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/request-password-reset": { window: 10 * 60, max: 3 },
      "/send-verification-email": { window: 10 * 60, max: 3 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const record = user as typeof user & {
            firstName?: string | null;
            lastName?: string | null;
            phoneNumber?: string | null;
          };
          const [first, ...rest] = (record.name ?? "").trim().split(/\s+/);
          const firstName = record.firstName?.trim() || first || null;
          const lastName = record.lastName?.trim() || rest.join(" ") || null;
          return {
            data: {
              ...record,
              email: record.email.toLowerCase(),
              firstName,
              lastName,
              name: displayName(firstName, lastName, record.email),
              phoneNumber: record.phoneNumber ? formatPhoneNumberE164(record.phoneNumber) : null,
              username: makeUsername(record.email),
            },
          };
        },
        after: async (user) => {
          // Google-verified sign-ups adopt guest bookings made with their email.
          if (user.emailVerified) {
            await claimGuestBookingsForUser(user.id).catch((err) =>
              console.error("Guest-booking claim failed:", err)
            );
          }
        },
      },
    },
    account: {
      // Update runs on every Google sign-in too (Better Auth refreshes the tokens).
      create: { after: fillMissingPhotoFromGoogle },
      update: { after: fillMissingPhotoFromGoogle },
    },
  },

  plugins: [
    admin({ ac, roles, defaultRole: DEFAULT_ROLE, adminRoles: ["admin"] }),
    phoneBookingPlugin(),
    haveIBeenPwned({
      customPasswordCompromisedMessage:
        "That password has appeared in a data breach. Please choose a different one.",
    }),
    lastLoginMethod(),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...options.plugins,
    customSession(async ({ user, session }) => ({ user: toSessionUser(user), session }), options),
    // Must stay last: lets server actions set the session cookie.
    nextCookies(),
  ],
});
