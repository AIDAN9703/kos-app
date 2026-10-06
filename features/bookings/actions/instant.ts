"use server";

import { db } from "@/database/db";
import { boats, boatPricingTiers } from "@/database/schema";
import { bookingRequestSchema, BookingRequest } from "@/features/_validation/validations";
import { z } from "zod";
import { calculateEndDateTime } from "@/shared/lib/utils/date-helpers";
import { and, eq } from "drizzle-orm";
import { calculateBookingPriceCents } from "@/shared/lib/utils/pricing-utils";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import { addOnService } from "@/features/add-ons/add-on.service";
import { availabilityService } from "@/features/availability/services/availability.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { getStripe } from "@/shared/lib/services/stripe.service";
import { getSession } from "@/shared/lib/utils/auth-utils";

/**
 * Creates a Stripe Checkout session for instant booking using pricing tiers
 * The actual booking will be created after payment success via webhook
 */
export async function createInstantBooking(data: BookingRequest & { boatId: string }) {
  // Check for authentication
  const session = await getSession();
  if (!session?.user) {
    return { 
      success: false, 
      error: "You must be signed in to book", 
      errorType: "AUTH"
    };
  }

  try {
    // Validate the booking data
    const validatedData = bookingRequestSchema.parse(data);
    
    // The tier sets the price, so it must be one of THIS boat's active tiers —
    // otherwise a cheaper tier from another boat could be sent in its place.
    const pricingTierResults = await db
      .select()
      .from(boatPricingTiers)
      .where(
        and(
          eq(boatPricingTiers.id, validatedData.pricingTierId),
          eq(boatPricingTiers.boatId, data.boatId),
          eq(boatPricingTiers.isActive, true)
        )
      );
    
    if (pricingTierResults.length === 0) {
      return { 
        success: false, 
        error: "Invalid pricing tier selected" 
      };
    }
    
    const pricingTier = pricingTierResults[0];
    
    // Get boat details
    const boatResults = await db
      .select({
        id: boats.id,
        name: boats.name,
        cleaningFee: boats.cleaningFee, 
        depositAmount: boats.depositAmount,
        ownerId: boats.ownerId,
        instantBook: boats.instantBook,
        active: boats.active,
        mainImage: boats.mainImage,
        crewRequired: boats.crewRequired,
        currency: boats.currency,
      })
      .from(boats)
      .where(eq(boats.id, data.boatId));
    
    if (boatResults.length === 0) {
      return { 
        success: false, 
        error: "Boat not found" 
      };
    }
    
    const boat = boatResults[0];
    
    // Verify boat is listed and allows instant booking
    if (!boat.active || !boat.instantBook) {
      return {
        success: false,
        error: "This boat does not support instant booking"
      };
    }
    
    // Convert ISO string to Date object and calculate end datetime
    const startDateTime = new Date(validatedData.startDateTime);
    const endDateTime = calculateEndDateTime(startDateTime, pricingTier.hours);

    // Never let a customer pay for a slot that's already taken — check
    // availability before creating the checkout session. (The webhook
    // re-checks after payment to narrow the race window.)
    const availability = await availabilityService.checkTimeSlotAvailability(
      data.boatId,
      startDateTime,
      endDateTime
    );
    if (!availability.isAvailable) {
      return {
        success: false,
        error: "This time slot is no longer available. Please choose a different time.",
      };
    }

    // Resolve add-on selection server-side (prices come from the boat, not the client).
    const { snapshot: addOnSnapshot, addOnsCents } = await addOnService.resolveSelectionForBoat(
      data.boatId,
      validatedData.addOns ?? []
    );

    // Calculate all fees (cents) including add-ons
    const { serviceFee } = await getAppSettings();
    const breakdown = calculateBookingPriceCents(
      dollarsToCents(pricingTier.price),
      dollarsToCents(boat.cleaningFee || 0),
      0, // Captain service is included in base price
      addOnsCents,
      serviceFee
    );

    const boatCurrency = (boat.currency ?? "USD").toUpperCase();

    // Base line carries everything except the raw add-on amounts (so add-ons can
    // show as their own checkout line items). Sum still equals the grand total.
    const baseLineCents = breakdown.totalPriceCents - addOnsCents;
    const addOnLineItems = addOnSnapshot
      .filter((a) => !a.isComplimentary && a.total > 0)
      .map((a) => ({
        price_data: {
          currency: boatCurrency.toLowerCase(),
          product_data: {
            name: a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name,
            description: a.description ?? boat.name,
          },
          unit_amount: dollarsToCents(a.total),
        },
        quantity: 1,
      }));

    // Create a Stripe Checkout Session
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: boatCurrency.toLowerCase(),
            product_data: {
              name: `${boat.name} - ${pricingTier.name || `${pricingTier.hours}hr Charter`}`,
              images: [boat.mainImage || "https://via.placeholder.com/800x600.png?text=Boat+Image"],
              description: `${validatedData.needsCaptain || boat.crewRequired ? "With Captain" : "Self-Drive"} - ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString()}`
            },
            unit_amount: baseLineCents,
          },
          quantity: 1,
        },
        ...addOnLineItems,
      ],
      metadata: {
        // Store all booking data needed to create a booking record after payment
        bookingType: "INSTANT_BOOK",
        boatId: boat.id,
        userId: session.user.id,
        customerName: session.user.name || "",
        customerEmail: session.user.email || "",
        customerPhone: session.user.phoneNumber || "",
        isMultiDay: "false",
        needsCaptain: (validatedData.needsCaptain || boat.crewRequired).toString(),
        startDateTime: validatedData.startDateTime,
        endDateTime: endDateTime.toISOString(),
        pricingTierId: validatedData.pricingTierId,
        numberOfPassengers: validatedData.numberOfPassengers.toString(),
        // Exact cents + the fee snapshot, so the webhook stores what was paid.
        basePriceCents: String(breakdown.basePriceCents),
        captainFeeCents: String(breakdown.captainFeeCents),
        cleaningFeeCents: String(breakdown.cleaningFeeCents),
        serviceFeeCents: String(breakdown.serviceFeeCents),
        totalAmountCents: String(breakdown.totalPriceCents),
        depositAmountCents: String(dollarsToCents(boat.depositAmount || 0)),
        serviceFeeBps: String(serviceFee.bps),
        serviceFeeFixedCents: String(serviceFee.fixedCents),
        // Priced add-on snapshot so the webhook can persist it post-payment.
        addOns: addOnSnapshot.length > 0 ? JSON.stringify(addOnSnapshot) : "",
        currency: boatCurrency,
        createdAt: new Date().toISOString(),
      },
      mode: 'payment',
      allow_promotion_codes: true, // ✨ Enable Stripe's built-in coupon input
      success_url: `${getBaseUrl()}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl()}/boats/${boat.id}?canceled=true`,
    });
    
    // No pending booking creation - webhook handles everything
    return { 
      success: true,
      paymentUrl: checkoutSession.url,
      message: "Redirecting to payment page."
    };
  } catch (error) {
    console.error("Instant booking error:", error);
    
    if (error instanceof z.ZodError) {
      // Handle validation errors
      return { 
        success: false, 
        error: "Invalid booking data", 
        fieldErrors: error.flatten().fieldErrors 
      };
    }
    
    return { 
      success: false, 
      error: "Failed to create booking. Please try again." 
    };
  }
}