import type { BookingStatus } from "./types";

export const BOOKING_TERMINAL_STATUSES = ["completed", "cancelled", "rejected", "no_show"] as const satisfies readonly BookingStatus[];

export const BOOKING_STATUS_TRANSITIONS = {
  requested: ["pending_confirmation", "confirmed", "rejected", "cancelled"],
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: []
} as const satisfies Record<BookingStatus, readonly BookingStatus[]>;

export function isTerminalBookingStatus(status: BookingStatus) {
  return BOOKING_TERMINAL_STATUSES.includes(status as (typeof BOOKING_TERMINAL_STATUSES)[number]);
}

export function canTransitionBookingStatus(fromStatus: BookingStatus, toStatus: BookingStatus) {
  return (BOOKING_STATUS_TRANSITIONS[fromStatus] as readonly BookingStatus[]).includes(toStatus);
}
