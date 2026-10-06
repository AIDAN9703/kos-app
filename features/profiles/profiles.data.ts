import "server-only";

import { captainProfileService } from "@/features/profiles/captain-profile.service";
import { crewProfileService } from "@/features/profiles/crew-profile.service";
import { promoteCaptainFormSchema } from "@/features/profiles/promote-captain.validation";
import { promoteCrewFormSchema } from "@/features/profiles/promote-crew.validation";
import type { CaptainStatus, CrewStatus } from "@/database/types";
import { UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Crew data layer (admins): the captain and crew rosters, and making someone
 * a captain or crew member (which grants the role, so it needs
 * user:set-role). Assigning crew to a trip lives in deal.data.ts.
 */

export async function listCaptains(filters: { search?: string; status?: CaptainStatus }) {
  await assertCan({ user: ["list"] });
  return captainProfileService.listForAdmin(filters);
}

export async function listCrew(filters: { search?: string; status?: CrewStatus }) {
  await assertCan({ user: ["list"] });
  return crewProfileService.listForAdmin(filters);
}

export async function promoteToCaptain(userId: string, raw: unknown): Promise<void> {
  await assertCan({ user: ["set-role"] });
  if (!isUuid(userId)) throw new UserFacingError("User not found", 404);
  await captainProfileService.promoteFromAdmin(userId, promoteCaptainFormSchema.parse(raw));
}

export async function promoteToCrew(userId: string, raw: unknown): Promise<void> {
  await assertCan({ user: ["set-role"] });
  if (!isUuid(userId)) throw new UserFacingError("User not found", 404);
  await crewProfileService.promoteFromAdmin(userId, promoteCrewFormSchema.parse(raw));
}
