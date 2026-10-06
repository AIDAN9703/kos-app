import NextAuth, { User } from "next-auth"
import { compare } from "bcryptjs"
import CredentialsProvider from "next-auth/providers/credentials"
import { users, captainProfiles, crewProfiles, ownerProfiles } from "@/database/schema"
import { eq } from "drizzle-orm"
import { db } from "@/database/db"
import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings"
import Google from "next-auth/providers/google"
import { verifyPhoneBookingProof } from "@/shared/lib/auth/phone-booking-proof"

// Helper function to check if user has captain/owner profiles
async function getUserProfiles(userId: string) {
  const [captainProfile, crewProfile, ownerProfile] = await Promise.all([
    db.select({ userId: captainProfiles.userId, status: captainProfiles.status })
      .from(captainProfiles)
      .where(eq(captainProfiles.userId, userId))
      .limit(1),
    db.select({ userId: crewProfiles.userId, status: crewProfiles.status })
      .from(crewProfiles)
      .where(eq(crewProfiles.userId, userId))
      .limit(1),
    db.select({ userId: ownerProfiles.userId })
      .from(ownerProfiles)
      .where(eq(ownerProfiles.userId, userId))
      .limit(1),
  ]);
  
  return {
    isCaptain: captainProfile.length > 0,
    captainStatus: captainProfile.length > 0 ? captainProfile[0].status : null,
    isCrew: crewProfile.length > 0,
    crewStatus: crewProfile.length > 0 ? crewProfile[0].status : null,
    isOwner: ownerProfile.length > 0,
  };
}

// Debug log for environment

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required for build-time static generation to prevent UntrustedHost errors
  // Vercel automatically sets AUTH_TRUST_HOST=true in production for security
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (1 day)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours (1 day)
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      id: "phone-booking",
      credentials: {
        proof: { type: "text" },
      },
      async authorize(credentials) {
        const proof = credentials?.proof?.toString();
        if (!proof) return null;

        const verified = verifyPhoneBookingProof(proof);
        if (!verified) return null;

        const user = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            isAdmin: users.isAdmin,
            phoneNumber: users.phoneNumber,
            phoneVerified: users.phoneVerified,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(eq(users.id, verified.userId))
          .limit(1);

        if (user.length === 0 || user[0].phoneNumber !== verified.phone || !user[0].phoneVerified) {
          return null;
        }

        const profiles = await getUserProfiles(user[0].id);

        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: `${user[0].firstName} ${user[0].lastName}`.trim(),
          isAdmin: user[0].isAdmin,
          isCaptain: profiles.isCaptain,
          captainStatus: profiles.captainStatus,
          isCrew: profiles.isCrew,
          crewStatus: profiles.crewStatus,
          isOwner: profiles.isOwner,
          phoneNumber: user[0].phoneNumber || "",
          phoneVerified: user[0].phoneVerified || false,
          profileImage: user[0].profileImage || "",
        } as User;
      },
    }),
    CredentialsProvider({
      id: "credentials",
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            isAdmin: users.isAdmin,
            phoneNumber: users.phoneNumber,
            phoneVerified: users.phoneVerified,
            profileImage: users.profileImage,
            password: users.password,
          })
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password.toString(), user[0].password);

        if (!isPasswordValid) {
          return null;
        }

        // No phone verification check here - middleware handles it!
        
        // Check if user has captain/owner profiles
        const profiles = await getUserProfiles(user[0].id);
        
        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].firstName + " " + user[0].lastName,
          isAdmin: user[0].isAdmin,
          isCaptain: profiles.isCaptain,
          captainStatus: profiles.captainStatus,
          isCrew: profiles.isCrew,
          crewStatus: profiles.crewStatus,
          isOwner: profiles.isOwner,
          phoneNumber: user[0].phoneNumber || "",
          phoneVerified: user[0].phoneVerified || false,
          profileImage: user[0].profileImage || "",
        } as User;
      },
    }),

  ],
  pages: {
    signIn: "/sign-in",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.isAdmin = user.isAdmin;
        token.isCaptain = user.isCaptain;
        token.captainStatus = user.captainStatus;
        token.isCrew = user.isCrew;
        token.crewStatus = user.crewStatus;
        token.isOwner = user.isOwner;
        token.phoneNumber = user.phoneNumber;
        token.phoneVerified = user.phoneVerified;
        token.profileImage = user.profileImage;

        // If OAuth login, we need to create/update user in our database
        if (account && account.provider === "google") {
          // Check if user exists in our database
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email!))
            .limit(1);

          if (existingUser.length === 0) {
            // Create a new user with OAuth provider info
            try {
              // Generate a username from email
              const username = user.email!.split('@')[0] + '_' + Math.floor(Math.random() * 10000);

              const [newUser] = await db.insert(users).values({
                email: user.email!,
                // Create a username from the email
                username: username,
                // OAuth users don't have a password in our system
                password: crypto.randomUUID(), // random placeholder
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                profileImage: user.image || '',
                // phoneVerified defaults to false in schema
                emailVerified: true,
                authProvider: "GOOGLE",
                providerAccountId: account.providerAccountId,
              }).returning({ id: users.id });

              if (newUser?.id) {
                token.id = newUser.id.toString();
                // Google verified this email — adopt any guest bookings made
                // with it (fire-and-forget; login must not block on it).
                claimGuestBookingsForUser(newUser.id).catch((err) =>
                  console.error("Guest-booking claim failed:", err)
                );
              }
              // For new users, use the Google image directly
              token.profileImage = user.image || '';
            } catch (error) {
              console.error("Error creating user from OAuth:", error);
            }
          } else {
            // Update token with data from our database
            token.id = existingUser[0].id.toString();
            token.email = existingUser[0].email;
            token.name = existingUser[0].firstName + " " + existingUser[0].lastName;
            token.isAdmin = existingUser[0].isAdmin;
            token.phoneNumber = existingUser[0].phoneNumber;
            token.phoneVerified = existingUser[0].phoneVerified;

            // Use fresh Google image if available, otherwise fall back to database
            token.profileImage = user.image || existingUser[0].profileImage;
            
            // Check if user has captain/owner profiles
            const profiles = await getUserProfiles(existingUser[0].id);
            token.isCaptain = profiles.isCaptain;
            token.captainStatus = profiles.captainStatus;
            token.isCrew = profiles.isCrew;
            token.crewStatus = profiles.crewStatus;
            token.isOwner = profiles.isOwner;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isCaptain = token.isCaptain as boolean;
        session.user.captainStatus = token.captainStatus as string | null;
        session.user.isCrew = (token.isCrew as boolean) ?? false;
        session.user.crewStatus = (token.crewStatus as string | null) ?? null;
        session.user.isOwner = token.isOwner as boolean;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.phoneVerified = token.phoneVerified as boolean;
        session.user.profileImage = token.profileImage as string | undefined;
      }
      return session;
    },
  },
});