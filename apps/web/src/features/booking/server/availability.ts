import "server-only";
import type { AvailabilitySlot, BookingMode, BookingTimeRange } from "../domain/types";
import { BookingDomainError } from "../domain/types";
import { mapBookingDatabaseError, resolveBookingSupabaseClient, type BookingSupabaseClient } from "./supabase";

export type BookingAvailabilityQuery = {
  offeringId: string;
  range: BookingTimeRange;
  limit?: number;
};

type AvailabilitySlotRow = {
  offering_id: string;
  branch_id: string;
  slot_start_at: string;
  slot_end_at: string;
  timezone: string;
  booking_mode: BookingMode;
  available_resource_count: number;
};

export async function getBookingAvailability(query: BookingAvailabilityQuery, client?: BookingSupabaseClient) {
  assertIsoDate(query.range.startAt, "range.startAt");
  assertIsoDate(query.range.endAt, "range.endAt");

  const supabase = resolveBookingSupabaseClient(client);
  const { data, error } = await supabase.schema("booking").rpc("get_public_availability", {
    p_offering_id: query.offeringId,
    p_range_start: query.range.startAt,
    p_range_end: query.range.endAt,
    p_slot_limit: query.limit ?? 100
  });

  if (error) throw mapBookingDatabaseError(error.message);
  return ((data ?? []) as unknown as AvailabilitySlotRow[]).map(mapAvailabilitySlot);
}

function mapAvailabilitySlot(row: AvailabilitySlotRow): AvailabilitySlot {
  return {
    offeringId: row.offering_id,
    branchId: row.branch_id,
    slotStartAt: row.slot_start_at,
    slotEndAt: row.slot_end_at,
    timezone: row.timezone,
    bookingMode: row.booking_mode,
    availableResourceCount: row.available_resource_count
  };
}

function assertIsoDate(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!value || Number.isNaN(parsed)) {
    throw new BookingDomainError("invalid_input", `${field} must be an ISO-8601 timestamp.`);
  }
}
