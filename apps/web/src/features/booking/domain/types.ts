export type BookingStatus =
  | "requested"
  | "pending_confirmation"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "no_show";

export type BookingMode = "request" | "instant_confirmation" | "provider_created";
export type BookingActorType = "customer" | "provider" | "admin" | "system";
export type AvailabilityExceptionType = "unavailable" | "available_override" | "capacity_override";
export type BookableResourceType = string;

export type BookingConfiguration = {
  offeringId: string;
  bookingEnabled: boolean;
  bookingMode: BookingMode;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  slotIntervalMinutes: number;
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  cancellationCutoffMinutes?: number | null;
  rescheduleCutoffMinutes?: number | null;
  requiresVehicle: boolean;
};

export type BookingTimeRange = {
  startAt: string;
  endAt: string;
};

export type AvailabilitySlot = {
  offeringId: string;
  branchId: string;
  slotStartAt: string;
  slotEndAt: string;
  timezone: string;
  bookingMode: BookingMode;
  availableResourceCount: number;
};

export type BookingTimelineEvent = {
  id: string;
  bookingId: string;
  eventType: "booking_created" | "status_changed" | "reservation_released";
  fromStatus?: BookingStatus | null;
  toStatus?: BookingStatus | null;
  actorType: BookingActorType;
  actorUserId?: string | null;
  eventAt: string;
  reason?: string | null;
  metadata: Record<string, unknown>;
};

export type BookingTransitionRequest = {
  bookingId: string;
  toStatus: BookingStatus;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type BookingTransitionResult = {
  bookingId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  eventId: string;
  transitionedAt: string;
};

export type BookingCreationRequest = {
  offeringId: string;
  requestedStartAt: string;
  bookingMode?: BookingMode;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vehicleId?: string | null;
  customerNotes?: string | null;
  idempotencyKey?: string | null;
};

export type BookingCreationResult = {
  bookingId: string;
  publicReference: string;
  bookingStatus: BookingStatus;
  requestedStartAt: string;
  requestedEndAt: string;
};

export type BookingDomainErrorCode =
  | "missing_supabase_env"
  | "invalid_input"
  | "not_available"
  | "not_authorized"
  | "not_found"
  | "database_error";

export class BookingDomainError extends Error {
  constructor(
    public readonly code: BookingDomainErrorCode,
    message: string
  ) {
    super(message);
    this.name = "BookingDomainError";
  }
}
