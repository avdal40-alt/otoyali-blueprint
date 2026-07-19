import "server-only";
import type { BookingConfiguration, BookingMode } from "../domain/types";
import { mapBookingDatabaseError, resolveBookingSupabaseClient, type BookingSupabaseClient } from "./supabase";

const BOOKING_CONFIGURATION_COLUMNS = [
  "offering_id",
  "booking_enabled",
  "booking_mode",
  "duration_minutes",
  "preparation_minutes",
  "cleanup_minutes",
  "slot_interval_minutes",
  "minimum_notice_minutes",
  "maximum_advance_days",
  "cancellation_cutoff_minutes",
  "reschedule_cutoff_minutes",
  "requires_vehicle"
].join(",");

type BookingConfigurationRow = {
  offering_id: string;
  booking_enabled: boolean;
  booking_mode: BookingMode;
  duration_minutes: number;
  preparation_minutes: number;
  cleanup_minutes: number;
  slot_interval_minutes: number;
  minimum_notice_minutes: number;
  maximum_advance_days: number;
  cancellation_cutoff_minutes: number | null;
  reschedule_cutoff_minutes: number | null;
  requires_vehicle: boolean;
};

export async function getBookingConfiguration(offeringId: string, client?: BookingSupabaseClient) {
  const supabase = resolveBookingSupabaseClient(client);
  const { data, error } = await supabase
    .schema("booking")
    .from("offering_booking_configurations")
    .select(BOOKING_CONFIGURATION_COLUMNS)
    .eq("offering_id", offeringId)
    .maybeSingle();

  if (error) throw mapBookingDatabaseError(error.message);
  return data ? mapBookingConfiguration(data as unknown as BookingConfigurationRow) : null;
}

function mapBookingConfiguration(row: BookingConfigurationRow): BookingConfiguration {
  return {
    offeringId: row.offering_id,
    bookingEnabled: row.booking_enabled,
    bookingMode: row.booking_mode,
    durationMinutes: row.duration_minutes,
    preparationMinutes: row.preparation_minutes,
    cleanupMinutes: row.cleanup_minutes,
    slotIntervalMinutes: row.slot_interval_minutes,
    minimumNoticeMinutes: row.minimum_notice_minutes,
    maximumAdvanceDays: row.maximum_advance_days,
    cancellationCutoffMinutes: row.cancellation_cutoff_minutes,
    rescheduleCutoffMinutes: row.reschedule_cutoff_minutes,
    requiresVehicle: row.requires_vehicle
  };
}
