import "server-only";

import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/database/db";
import { addOns, boatAddOns } from "@/database/schema";
import { centsToDollars } from "@/shared/lib/utils/money-utils";
import { resolveAdminListPagination } from "@/shared/admin/list-pagination";
import type { BookingAddOn } from "@/features/bookings/booking.types";
import type {
  AddOnFilterInput,
  CreateAddOnInput,
  UpdateAddOnInput,
} from "@/features/add-ons/add-on.validation";
import type {
  AddOn,
  AddOnListItem,
  PaginatedAddOnsResponse,
} from "@/features/add-ons/add-on.types";

function normalizeImageUrl(url?: string | null): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

export const addOnService = {
  async getAllAddOns(filters?: AddOnFilterInput): Promise<PaginatedAddOnsResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);

    const where = [];
    if (filters?.search) {
      where.push(
        or(
          ilike(addOns.name, `%${filters.search}%`),
          ilike(addOns.description ?? "", `%${filters.search}%`)
        )
      );
    }
    if (filters?.category) where.push(eq(addOns.category, filters.category));
    if (filters?.active !== undefined) where.push(eq(addOns.isActive, filters.active));
    const whereClause = where.length > 0 ? and(...where) : undefined;

    const [rows, [{ value: totalCount }]] = await Promise.all([
      db
        .select({
          id: addOns.id,
          name: addOns.name,
          description: addOns.description,
          category: addOns.category,
          defaultPriceCents: addOns.defaultPriceCents,
          isActive: addOns.isActive,
          sortOrder: addOns.sortOrder,
          imageUrl: addOns.imageUrl,
        })
        .from(addOns)
        .where(whereClause)
        .orderBy(asc(addOns.sortOrder), asc(addOns.name))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(addOns).where(whereClause),
    ]);

    return {
      addOns: rows as AddOnListItem[],
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  },

  /** All active catalog add-ons, for the per-boat editor and checkout. */
  async getActiveAddOns(): Promise<AddOnListItem[]> {
    const rows = await db
      .select({
        id: addOns.id,
        name: addOns.name,
        description: addOns.description,
        category: addOns.category,
        defaultPriceCents: addOns.defaultPriceCents,
        isActive: addOns.isActive,
        sortOrder: addOns.sortOrder,
        imageUrl: addOns.imageUrl,
      })
      .from(addOns)
      .where(eq(addOns.isActive, true))
      .orderBy(asc(addOns.sortOrder), asc(addOns.name));
    return rows as AddOnListItem[];
  },

  async createAddOn(input: CreateAddOnInput): Promise<AddOn> {
    const [row] = await db
      .insert(addOns)
      .values({
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        defaultPriceCents: input.defaultPriceCents ?? null,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        imageUrl: normalizeImageUrl(input.imageUrl),
      })
      .returning();
    return row;
  },

  async updateAddOn(id: string, input: UpdateAddOnInput): Promise<AddOn> {
    const [row] = await db
      .update(addOns)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.defaultPriceCents !== undefined
          ? { defaultPriceCents: input.defaultPriceCents ?? null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: normalizeImageUrl(input.imageUrl) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(addOns.id, id))
      .returning();
    return row;
  },

  async deleteAddOn(id: string): Promise<void> {
    await db.delete(addOns).where(eq(addOns.id, id));
  },

  /**
   * Resolve a customer's add-on selection for a boat into a priced snapshot —
   * the SOURCE OF TRUTH for charges. Prices come from boat_add_on (+catalog),
   * never the client. Complimentary add-ons the boat offers are auto-included
   * (qty 1) so they always show as "Included"; selected paid add-ons use the
   * effective per-boat price × quantity. Ignores ids the boat doesn't offer.
   *
   * Returns the JSON snapshot (dollars, matching bookings.add_ons) and the
   * total chargeable add-ons amount in cents.
   */
  async resolveSelectionForBoat(
    boatId: string,
    selections: { addOnId: string; quantity: number }[]
  ): Promise<{ snapshot: BookingAddOn[]; addOnsCents: number }> {
    const qtyByAddOn = new Map<string, number>();
    for (const s of selections ?? []) {
      if (s.quantity > 0) qtyByAddOn.set(s.addOnId, Math.floor(s.quantity));
    }

    const selectedIds = [...qtyByAddOn.keys()];

    // Boat's active offerings: all complimentary (auto) + any explicitly selected.
    const rows = await db
      .select({
        addOnId: boatAddOns.addOnId,
        name: addOns.name,
        description: addOns.description,
        overridePriceCents: boatAddOns.priceCents,
        defaultPriceCents: addOns.defaultPriceCents,
        isComplimentary: boatAddOns.isComplimentary,
      })
      .from(boatAddOns)
      .innerJoin(addOns, eq(boatAddOns.addOnId, addOns.id))
      .where(
        and(
          eq(boatAddOns.boatId, boatId),
          eq(boatAddOns.isActive, true),
          selectedIds.length > 0
            ? or(eq(boatAddOns.isComplimentary, true), inArray(boatAddOns.addOnId, selectedIds))
            : eq(boatAddOns.isComplimentary, true)
        )
      );

    const snapshot: BookingAddOn[] = [];
    let addOnsCents = 0;

    for (const r of rows) {
      const complimentary = r.isComplimentary;
      const quantity = complimentary ? 1 : qtyByAddOn.get(r.addOnId) ?? 0;
      if (quantity <= 0) continue; // selected paid item not actually chosen

      const unitCents = complimentary ? 0 : r.overridePriceCents ?? r.defaultPriceCents ?? 0;
      const lineCents = unitCents * quantity;
      addOnsCents += lineCents;

      snapshot.push({
        name: r.name,
        description: r.description,
        unitPrice: centsToDollars(unitCents),
        quantity,
        total: centsToDollars(lineCents),
        isComplimentary: complimentary,
        catalogAddOnId: r.addOnId,
      });
    }

    return { snapshot, addOnsCents };
  },
};
