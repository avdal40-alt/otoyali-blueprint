import "server-only";
import type { BookingTransitionRequest, BookingTransitionResult, BookingStatus } from "../domain/types";
import { mapBookingDatabaseError, resolveBookingSupabaseClient, type BookingSupabaseClient } from "./supabase";

type BookingTransitionRow = {
  booking_id: string;
  from_status: BookingStatus;
  to_status: BookingStatus;
  event_id: string;
  transitioned_at: string;
};

export async function transitionBookingStatus(
  request: BookingTransitionRequest,
  client?: BookingSupabaseClient
): Promise<BookingTransitionResult> {
  const supabase = resolveBookingSupabaseClient(client);
  const { data, error } = await supabase.schema("booking").rpc("transition_booking_status", {
    p_booking_id: request.bookingId,
    p_to_status: request.toStatus,
    p_reason: request.reason ?? null,
    p_metadata: request.metadata ?? {}
  });

  if (error) throw mapBookingDatabaseError(error.message);
  const row = Array.isArray(data)
    ? (data[0] as unknown as BookingTransitionRow | undefined)
    : (data as unknown as BookingTransitionRow | null);
  if (!row) throw mapBookingDatabaseError("Booking transition did not return a result.");
  return {
    bookingId: row.booking_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    eventId: row.event_id,
    transitionedAt: row.transitioned_at
  };
}
