import type { CaptainStatus, CrewStatus, UserStatus } from "@/database/types";

/** A captain on the admin roster. */
export type CaptainProfileAdminRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  userStatus: UserStatus;
  profileStatus: CaptainStatus;
  uscgLicensed: boolean;
  licenseType: string | null;
  profileUpdatedAt: Date;
};

/** A crew member on the admin roster. */
export type CrewProfileAdminRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  userStatus: UserStatus;
  profileStatus: CrewStatus;
  adminNotes: string | null;
  profileUpdatedAt: Date;
};
