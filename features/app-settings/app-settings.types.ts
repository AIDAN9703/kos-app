import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";

export interface AppSettings {
  /** The card fee new bookings are priced with (bookings keep their own snapshot). */
  serviceFee: ServiceFee;
  updatedAt: Date | null;
}
