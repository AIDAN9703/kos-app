import "server-only";

import { revalidatePath } from "next/cache";

/** Refresh every page that shows this deal: admin board, dashboard and broker portal. */
export function revalidateDeal(bookingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/brokers");
  if (bookingId) {
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath(`/brokers/deals/${bookingId}`);
  }
}
