"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/shared/lib/utils/action-helpers";
import type { ActionResponse } from "@/shared/lib/types/types";
import * as listingData from "./listing.data";
import type { EditableStep } from "./listing.validation";

function refreshListing(boatId: string) {
  revalidatePath(`/list-your-boat/${boatId}`, "layout");
  revalidatePath("/owner", "layout");
}

export async function startListingAction(input: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const id = await listingData.startListing(input);
    revalidatePath("/owner", "layout");
    return { success: true, data: { id } };
  } catch (error) {
    return actionError(error, "Couldn't start your listing. Please try again.");
  }
}

export async function saveListingStepAction(
  boatId: string,
  step: EditableStep,
  input: unknown
): Promise<ActionResponse<null>> {
  try {
    await listingData.saveListingStep(boatId, step, input);
    refreshListing(boatId);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Couldn't save. Please try again.");
  }
}

export async function submitListingAction(boatId: string): Promise<ActionResponse<null>> {
  try {
    await listingData.submitMyListing(boatId);
    refreshListing(boatId);
    revalidatePath("/admin/boats", "layout");
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Couldn't submit. Please try again.");
  }
}

export async function deleteListingAction(boatId: string): Promise<ActionResponse<null>> {
  try {
    await listingData.deleteMyListing(boatId);
    revalidatePath("/owner", "layout");
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Couldn't delete the listing.");
  }
}

export async function setListingLiveAction(
  boatId: string,
  live: boolean
): Promise<ActionResponse<null>> {
  try {
    await listingData.setMyListingLive(boatId, live);
    refreshListing(boatId);
    revalidatePath(`/boats/${boatId}`);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Couldn't update the listing.");
  }
}

export async function approveListingAction(boatId: string): Promise<ActionResponse<null>> {
  try {
    await listingData.approveListing(boatId);
    refreshListing(boatId);
    revalidatePath("/admin/boats", "layout");
    return { success: true, data: null, message: "Approved. The boat is live." };
  } catch (error) {
    return actionError(error, "Couldn't approve the listing.");
  }
}

export async function sendListingBackAction(
  boatId: string,
  note: string
): Promise<ActionResponse<null>> {
  try {
    await listingData.sendListingBack(boatId, note);
    refreshListing(boatId);
    revalidatePath("/admin/boats", "layout");
    return { success: true, data: null, message: "Sent back to the owner." };
  } catch (error) {
    return actionError(error, "Couldn't send the listing back.");
  }
}
