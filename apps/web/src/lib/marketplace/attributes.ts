import type { MarketplaceAttributeDefinition, MarketplaceVerticalId } from "./types";

export const MARKETPLACE_ATTRIBUTE_DEFINITIONS: Record<MarketplaceVerticalId, MarketplaceAttributeDefinition[]> = {
  cars: [
    attr("make", "verticals.attributes.make", "select", true, true, true),
    attr("model", "verticals.attributes.model", "select", true, true, true),
    attr("year", "verticals.attributes.year", "number", true, true, true),
    attr("mileage", "verticals.attributes.mileage", "number", true, true, true),
    attr("fuel", "verticals.attributes.fuel", "select", true, true, true),
    attr("transmission", "verticals.attributes.transmission", "select", true, true, true)
  ],
  commercial: [
    attr("vehicle_subtype", "verticals.attributes.vehicleSubtype", "select", true, true, true),
    attr("payload_capacity", "verticals.attributes.payloadCapacity", "number", false, true, true),
    attr("axle_count", "verticals.attributes.axleCount", "number", false, true, true),
    attr("gross_weight", "verticals.attributes.grossWeight", "number", false, true, true),
    attr("cabin_type", "verticals.attributes.cabinType", "select", false, true, false)
  ],
  marine: [
    attr("vessel_type", "verticals.attributes.vesselType", "select", true, true, true),
    attr("length", "verticals.attributes.length", "number", false, true, true),
    attr("engine_type", "verticals.attributes.engineType", "select", false, true, true),
    attr("hull_material", "verticals.attributes.hullMaterial", "select", false, true, false),
    attr("year", "verticals.attributes.year", "number", false, true, true)
  ],
  parts: [
    attr("category", "verticals.attributes.category", "select", true, true, true),
    attr("condition", "verticals.attributes.condition", "select", true, true, true),
    attr("brand", "verticals.attributes.brand", "text", false, true, true),
    attr("part_origin", "verticals.attributes.partOrigin", "select", false, true, false),
    attr("part_number", "verticals.attributes.partNumber", "text", false, true, false),
    attr("compatible_vehicles", "verticals.attributes.compatibleVehicles", "multi_select", false, true, false)
  ],
  services: [
    attr("service_category", "verticals.attributes.serviceCategory", "select", true, true, true),
    attr("city", "verticals.attributes.city", "select", true, true, true),
    attr("mobile_service", "verticals.attributes.mobileService", "boolean", false, true, false),
    attr("appointment_support", "verticals.attributes.appointmentSupport", "boolean", false, true, false)
  ],
  insurance: [
    attr("insurance_type", "verticals.attributes.insuranceType", "select", true, true, true),
    attr("coverage_scope", "verticals.attributes.coverageScope", "select", false, true, false),
    attr("city", "verticals.attributes.city", "select", false, true, false)
  ],
  motorcycles: [
    attr("make", "verticals.attributes.make", "select", true, true, true),
    attr("model", "verticals.attributes.model", "select", true, true, true),
    attr("engine_volume", "verticals.attributes.engineVolume", "number", false, true, true)
  ],
  machinery: [
    attr("machine_type", "verticals.attributes.machineType", "select", true, true, true),
    attr("working_hours", "verticals.attributes.workingHours", "number", false, true, true),
    attr("gross_weight", "verticals.attributes.grossWeight", "number", false, true, true)
  ],
  mobility: [
    attr("product_type", "verticals.attributes.productType", "select", true, true, true),
    attr("range", "verticals.attributes.range", "number", false, true, true),
    attr("condition", "verticals.attributes.condition", "select", false, true, true)
  ]
};

function attr(
  id: string,
  labelKey: string,
  valueType: MarketplaceAttributeDefinition["valueType"],
  requiredForPublish: boolean,
  filterable: boolean,
  comparable: boolean
): MarketplaceAttributeDefinition {
  return {
    id,
    labelKey,
    valueType,
    requiredForPublish,
    filterable,
    comparable
  };
}
