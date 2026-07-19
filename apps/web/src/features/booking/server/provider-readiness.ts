import "server-only";
import { mapBookingDatabaseError, resolveBookingSupabaseClient, type BookingSupabaseClient } from "./supabase";

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

export type ProviderBookingReadiness = {
  providerId: string;
  activeResourceCount: number;
  configuredOfferingCount: number;
  activeEligibilityCount: number;
  activeWorkingHourRuleCount: number;
  ready: boolean;
};

export async function getProviderBookingReadiness(providerId: string, client?: BookingSupabaseClient): Promise<ProviderBookingReadiness> {
  const supabase = resolveBookingSupabaseClient(client);
  const { data: branches, error: branchError } = await supabase
    .schema("service_marketplace")
    .from("branches")
    .select("id")
    .eq("provider_id", providerId);
  if (branchError) throw mapBookingDatabaseError(branchError.message);

  const branchIds = ((branches ?? []) as Array<{ id: string }>).map((branch) => branch.id);
  const { data: offerings, error: offeringError } = branchIds.length
    ? await supabase.schema("service_marketplace").from("offerings").select("id").in("branch_id", branchIds)
    : { data: [], error: null };
  if (offeringError) throw mapBookingDatabaseError(offeringError.message);

  const offeringIds = ((offerings ?? []) as Array<{ id: string }>).map((offering) => offering.id);
  const { data: resourceRows, error: resourceError } = await supabase
    .schema("booking")
    .from("bookable_resources")
    .select("id")
    .eq("provider_id", providerId)
    .eq("active", true)
    .is("archived_at", null);
  if (resourceError) throw mapBookingDatabaseError(resourceError.message);

  const resourceIds = ((resourceRows ?? []) as Array<{ id: string }>).map((resource) => resource.id);
  const [configurations, eligibilities, workingHours] = await Promise.all([
    offeringIds.length
      ? countRows(
        supabase
          .schema("booking")
          .from("offering_booking_configurations")
          .select("offering_id", { count: "exact", head: true })
          .in("offering_id", offeringIds)
          .eq("booking_enabled", true)
      )
      : Promise.resolve(0),
    resourceIds.length
      ? countRows(
        supabase
          .schema("booking")
          .from("offering_resources")
          .select("id", { count: "exact", head: true })
          .in("resource_id", resourceIds)
          .eq("active", true)
          .is("archived_at", null)
      )
      : Promise.resolve(0),
    resourceIds.length
      ? countRows(
        supabase
          .schema("booking")
          .from("recurring_working_hours")
          .select("id", { count: "exact", head: true })
          .in("resource_id", resourceIds)
          .eq("active", true)
          .is("archived_at", null)
      )
      : Promise.resolve(0)
  ]);
  const resources = resourceIds.length;

  return {
    providerId,
    activeResourceCount: resources,
    configuredOfferingCount: configurations,
    activeEligibilityCount: eligibilities,
    activeWorkingHourRuleCount: workingHours,
    ready: resources > 0 && configurations > 0 && eligibilities > 0 && workingHours > 0
  };
}

async function countRows(query: PromiseLike<CountResult>) {
  const result = await query;
  if (result.error) throw mapBookingDatabaseError(result.error.message);
  return result.count ?? 0;
}
