import "server-only";

import type { ComparableBoat } from "./estimate";
import * as estimateService from "./estimate.service";

/** Public: what the estimate compares against (no sign-in; only public prices). */
export async function getComparableBoats(): Promise<ComparableBoat[]> {
  return estimateService.getComparableBoats();
}
