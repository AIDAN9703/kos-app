"use server";

import { revalidatePath } from "next/cache";
import * as data from "@/features/marketing/marketing.data";
import type { ImportedContact } from "@/features/marketing/lib/contact-import";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** Marketing actions (admins). Thin wrappers over marketing.data.ts. */

function revalidateMarketing() {
  revalidatePath("/admin/marketing", "layout");
}

export async function countAlreadyListed(emails: string[]): Promise<ActionResponse<number>> {
  try {
    return { success: true, data: await data.countAlreadyListed(emails) };
  } catch (error) {
    return actionError(error, "Couldn't check the list");
  }
}

export async function importContacts(
  source: string,
  contacts: ImportedContact[]
): Promise<ActionResponse<{ added: number; alreadyListed: number }>> {
  try {
    const result = await data.importContacts(source, contacts);
    revalidateMarketing();
    return { success: true, data: result };
  } catch (error) {
    return actionError(error, "Import failed");
  }
}

export async function syncContacts(): Promise<ActionResponse<{ pushed: number; remaining: number; error: string | null }>> {
  try {
    const result = await data.syncContacts();
    revalidateMarketing();
    return { success: true, data: result };
  } catch (error) {
    return actionError(error, "Sync failed");
  }
}

export async function unsubscribeContact(id: string): Promise<ActionResponse<null>> {
  try {
    await data.unsubscribeContact(id);
    revalidateMarketing();
    return { success: true, data: null, message: "Unsubscribed" };
  } catch (error) {
    return actionError(error, "Couldn't unsubscribe them");
  }
}

export async function updateMailingAddress(address: string): Promise<ActionResponse<null>> {
  try {
    await data.updateMailingAddress(address);
    revalidateMarketing();
    return { success: true, data: null, message: "Address saved" };
  } catch (error) {
    return actionError(error, "Couldn't save the address");
  }
}

export async function createCampaign(): Promise<ActionResponse<{ id: string }>> {
  try {
    const id = await data.createCampaign();
    revalidateMarketing();
    return { success: true, data: { id } };
  } catch (error) {
    return actionError(error, "Couldn't start a campaign");
  }
}

export async function saveCampaignDraft(id: string, input: data.CampaignDraftInput): Promise<ActionResponse<null>> {
  try {
    await data.saveCampaignDraft(id, input);
    revalidateMarketing();
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Couldn't save the draft");
  }
}

export async function deleteCampaignDraft(id: string): Promise<ActionResponse<null>> {
  try {
    await data.deleteCampaignDraft(id);
    revalidateMarketing();
    return { success: true, data: null, message: "Draft deleted" };
  } catch (error) {
    return actionError(error, "Couldn't delete the draft");
  }
}

export async function sendCampaignTest(id: string, to: string): Promise<ActionResponse<null>> {
  try {
    await data.sendCampaignTest(id, to);
    return { success: true, data: null, message: `Test sent to ${to}` };
  } catch (error) {
    return actionError(error, "Couldn't send the test");
  }
}

export async function sendCampaign(id: string, scheduledAt: string | null): Promise<ActionResponse<null>> {
  try {
    await data.sendCampaign(id, scheduledAt ? new Date(scheduledAt) : null);
    revalidateMarketing();
    return { success: true, data: null, message: scheduledAt ? "Campaign scheduled" : "Campaign sent" };
  } catch (error) {
    return actionError(error, "Couldn't send the campaign");
  }
}

export async function cancelScheduledCampaign(id: string): Promise<ActionResponse<null>> {
  try {
    await data.cancelScheduledCampaign(id);
    revalidateMarketing();
    return { success: true, data: null, message: "Schedule cancelled; it's a draft again" };
  } catch (error) {
    return actionError(error, "Couldn't cancel it");
  }
}
