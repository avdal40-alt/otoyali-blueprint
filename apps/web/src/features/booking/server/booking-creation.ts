import "server-only";
import type { BookingCreationRequest, BookingCreationResult, BookingStatus } from "../domain/types";
import { BookingDomainError } from "../domain/types";
import { mapBookingDatabaseError, resolveBookingSupabaseClient, type BookingSupabaseClient } from "./supabase";

type BookingCreationRow = {
  booking_id: string;
  public_reference: string;
  booking_status: BookingStatus;
  requested_start_at: string;
  requested_end_at: string;
};

export async function createBookingInternal(request: BookingCreationRequest, client?: BookingSupabaseClient): Promise<BookingCreationResult> {
  assertIsoDate(request.requestedStartAt, "requestedStartAt");

  const supabase = resolveBookingSupabaseClient(client);
  const { data, error } = await supabase.schema("booking").rpc("create_booking", {
    p_offering_id: request.offeringId,
    p_requested_start_at: request.requestedStartAt,
    p_booking_mode: request.bookingMode ?? "request",
    p_customer_name: request.customerName ?? null,
    p_customer_phone: request.customerPhone ?? null,
    p_customer_email: request.customerEmail ?? null,
    p_vehicle_id: request.vehicleId ?? null,
    p_customer_notes: request.customerNotes ?? null,
    p_idempotency_key: request.idempotencyKey ?? null
  });

  if (error) throw mapBookingDatabaseError(error.message);
  const row = Array.isArray(data)
    ? (data[0] as unknown as BookingCreationRow | undefined)
    : (data as unknown as BookingCreationRow | null);
  if (!row) throw new BookingDomainError("database_error", "Booking creation did not return a booking.");
  return mapBookingCreationResult(row);
}

function mapBookingCreationResult(row: BookingCreationRow): BookingCreationResult {
  return {
    bookingId: row.booking_id,
    publicReference: row.public_reference,
    bookingStatus: row.booking_status,
    requestedStartAt: row.requested_start_at,
    requestedEndAt: row.requested_end_at
  };
}

function assertIsoDate(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!value || Number.isNaN(parsed)) {
    throw new BookingDomainError("invalid_input", `${field} must be an ISO-8601 timestamp.`);
  }
}
