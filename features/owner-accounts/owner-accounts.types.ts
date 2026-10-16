/** Who a boat belongs to and who KOS pays. Shown on screen as an "Owner". */

export type OwnerAccountKind = "INDIVIDUAL" | "BUSINESS";
export type OwnerAccountRole = "OWNER" | "MANAGER";
export type OwnerPayoutMethod = "STRIPE" | "ZELLE";
export type OwnerPayoutStatus = "PENDING" | "PAID" | "FAILED";

/** A person's place in one owner account. */
export interface OwnerMembership {
  accountId: string;
  accountName: string;
  role: OwnerAccountRole;
}

/** For pickers: the house account first, then A to Z. */
export interface OwnerAccountOption {
  id: string;
  name: string;
  isHouse: boolean;
}

/** Not invited yet, invited, or someone has joined. */
export type OwnerAccountStatus = "ACTIVE" | "INVITED" | "NOT_INVITED";

export interface OwnerAccountRow {
  id: string;
  name: string;
  kind: OwnerAccountKind;
  isHouse: boolean;
  boatCount: number;
  memberCount: number;
  status: OwnerAccountStatus;
}

export interface OwnerAccountMember {
  /** The membership row. */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OwnerAccountRole;
  since: Date;
}

export interface OwnerAccountInvite {
  id: string;
  email: string;
  role: OwnerAccountRole;
  sentAt: Date;
  expiresAt: Date;
}

export interface OwnerAccountBoat {
  id: string;
  name: string;
  active: boolean;
  managedBy: "KOS" | "OWNER";
  listingStatus: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
  mainImage: string | null;
}

/** A boat in the "move boats here" picker, with the owner it has now. */
export interface MovableBoat {
  id: string;
  name: string;
  ownerAccountId: string;
  ownerName: string;
}

/** How an owner gets paid: direct deposit through Stripe, or Zelle. */
export interface OwnerPayoutSetup {
  /** What they chose; null until they choose. */
  payoutMethod: OwnerPayoutMethod | null;
  zelleContact: string | null;
  /** They've started direct deposit setup with Stripe. */
  stripeStarted: boolean;
  /** Stripe has everything it needs; KOS can send payouts. */
  stripeReady: boolean;
  stripeBankLast4: string | null;
}

export interface OwnerAccountDetail extends OwnerPayoutSetup {
  id: string;
  name: string;
  kind: OwnerAccountKind;
  isHouse: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  adminNotes: string | null;
  createdAt: Date;
  boats: OwnerAccountBoat[];
  members: OwnerAccountMember[];
  invites: OwnerAccountInvite[];
}

/** The people side of an account, for the owner portal's Team tab. */
export interface OwnerTeam {
  members: OwnerAccountMember[];
  invites: OwnerAccountInvite[];
}

/** What the invite page shows before anyone has signed in. */
export interface OwnerInvitePreview {
  accountName: string;
  invitedBy: string | null;
  role: OwnerAccountRole;
  /** "j•••@gmail.com": enough to know which login to use. */
  maskedEmail: string;
  state: "OPEN" | "ACCEPTED" | "EXPIRED";
}

/** A charter's owner payout: what's owed (its Owner payout lines) and what's been paid. */
export interface PayoutLine {
  bookingId: string;
  boatName: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string | null;
  currency: string;
  owedCents: number;
  paidCents: number;
  /** Stripe payouts still waiting on Stripe. */
  pendingCents: number;
  /** The trip is over, so it can be paid. */
  payable: boolean;
}

export interface PayoutRecord {
  id: string;
  bookingId: string;
  boatName: string;
  tripDate: Date | null;
  amountCents: number;
  currency: string;
  method: OwnerPayoutMethod;
  status: OwnerPayoutStatus;
  reference: string | null;
  failureReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

/** An owner's payouts for its admin page. */
export interface OwnerPayouts {
  /** Trips over, not fully paid. */
  due: PayoutLine[];
  /** Booked trips still ahead, with a payout recorded. */
  upcoming: PayoutLine[];
  history: PayoutRecord[];
}
