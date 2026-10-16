import { z } from "zod";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const ownerRoleSchema = z.enum(["OWNER", "MANAGER"]);
export const payoutMethodSchema = z.enum(["STRIPE", "ZELLE"]);

/**
 * The email or US phone number someone's Zelle uses, tidied (an email
 * lowercased, a phone as +1XXXXXXXXXX). Empty means none.
 */
export const zelleContactSchema = z
  .string()
  .trim()
  .max(200)
  .transform((v, ctx) => {
    if (!v) return null;
    if (v.includes("@")) {
      if (!z.string().email().safeParse(v).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Check the email" });
        return z.NEVER;
      }
      return v.toLowerCase();
    }
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 10 && !(digits.length === 11 && digits.startsWith("1"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the email or US phone your Zelle uses",
      });
      return z.NEVER;
    }
    return formatPhoneNumberE164(v);
  })
  .nullable()
  .optional();

/** An owner as an admin sets it up or edits it. */
export const ownerAccountSchema = z.object({
  name: z.string().trim().min(2, "Give the owner a name").max(120),
  kind: z.enum(["INDIVIDUAL", "BUSINESS"]),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Check the email")
    .transform((v) => v || null)
    .nullable()
    .optional(),
  contactPhone: optionalText(40),
  zelleContact: zelleContactSchema,
  adminNotes: optionalText(2000),
});
export type OwnerAccountInput = z.input<typeof ownerAccountSchema>;

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter their email"),
  role: ownerRoleSchema,
});
export type InviteInput = z.input<typeof inviteSchema>;

export const moveBoatsSchema = z.object({
  boatIds: z.array(z.string().uuid()).min(1, "Pick at least one boat"),
  /** Bring each boat's past charters along (default when leaving KOS Yachts). */
  moveHistory: z.boolean(),
});
export type MoveBoatsInput = z.input<typeof moveBoatsSchema>;

/** A Zelle payment the team made, recorded against one charter. */
export const zellePayoutSchema = z.object({
  bookingId: z.string().uuid(),
  amountDollars: z.coerce
    .number({ invalid_type_error: "Enter the amount" })
    .positive("Enter the amount")
    .max(1_000_000),
  /** A calendar day (YYYY-MM-DD), kept as midday UTC so it reads as that day across US time zones. */
  paidOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date")
    .transform((v) => new Date(`${v}T12:00:00Z`))
    .refine((d) => !Number.isNaN(d.getTime()), "Pick the date")
    .refine((d) => d.getTime() < Date.now() + 864e5, "That day hasn't happened yet"),
  reference: optionalText(120),
  /** Off when catching up on payments made before KOS tracked them. */
  notifyOwner: z.boolean().default(true),
});
export type ZellePayoutInput = z.input<typeof zellePayoutSchema>;
