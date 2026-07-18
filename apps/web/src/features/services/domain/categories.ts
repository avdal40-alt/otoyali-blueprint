import type {
  ServiceCategoryDefinition,
  ServiceCategoryId,
  ServiceSpecializationDefinition
} from "./types";

export const SERVICE_CATEGORIES = [
  category("periodic_maintenance", "periyodik-bakim", "service", ["cars", "commercial", "motorcycles"], 10),
  category("diagnostics", "ariza-tespit", "service", ["cars", "commercial", "motorcycles"], 20),
  category("engine_repair", "motor-onarimi", "service", ["cars", "commercial", "motorcycles", "marine"], 30),
  category("transmission", "sanziman", "service", ["cars", "commercial"], 40),
  category("brakes", "fren", "service", ["cars", "commercial", "motorcycles"], 50),
  category("suspension", "suspansiyon", "service", ["cars", "commercial", "motorcycles"], 60),
  category("electrical", "elektrik", "service", ["cars", "commercial", "motorcycles", "marine"], 70),
  category("air_conditioning", "klima", "service", ["cars", "commercial"], 80),
  category("tires", "lastik", "parts", ["cars", "commercial", "motorcycles"], 90),
  category("battery", "aku", "service", ["cars", "commercial", "motorcycles", "marine"], 100),
  category("oil_change", "yag-degisimi", "service", ["cars", "commercial", "motorcycles", "marine"], 110),
  category("body_repair", "kaporta", "service", ["cars", "commercial", "motorcycles"], 120),
  category("paint", "boya", "service", ["cars", "commercial", "motorcycles", "marine"], 130),
  category("glass", "cam", "service", ["cars", "commercial"], 140),
  category("detailing", "detailing", "service", ["cars", "commercial", "marine", "motorcycles"], 150),
  category("car_wash", "oto-yikama", "service", ["cars", "commercial", "motorcycles"], 160),
  category("inspection", "ekspertiz", "shield", ["cars", "commercial", "motorcycles"], 170),
  category("towing", "cekici", "truck", ["cars", "commercial", "motorcycles"], 180, true),
  category("ev_service", "elektrikli-arac-servisi", "service", ["cars", "commercial"], 190),
  category("marine_service", "deniz-araci-servisi", "ship", ["marine"], 200),
  category("commercial_vehicle_service", "ticari-arac-servisi", "truck", ["commercial"], 210),
  category("motorcycle_service", "motosiklet-servisi", "motorcycle", ["motorcycles"], 220),
  category("other", "diger-servisler", "service", ["cars", "commercial", "marine", "motorcycles"], 990)
] as const satisfies readonly ServiceCategoryDefinition[];

export const SERVICE_CATEGORY_IDS = SERVICE_CATEGORIES.map((categoryDefinition) => categoryDefinition.id);

export const SERVICE_SPECIALIZATIONS = [
  specialization("passenger_cars", ["cars"], ["periodic_maintenance", "diagnostics", "inspection"]),
  specialization("commercial_vehicles", ["commercial"], ["commercial_vehicle_service", "periodic_maintenance", "towing"]),
  specialization("motorcycles", ["motorcycles"], ["motorcycle_service", "tires", "brakes"]),
  specialization("marine", ["marine"], ["marine_service", "engine_repair", "detailing"]),
  specialization("electric_vehicles", ["cars", "commercial"], ["ev_service", "electrical", "battery"]),
  specialization("hybrid_vehicles", ["cars"], ["diagnostics", "electrical", "periodic_maintenance"]),
  specialization("body_repair", ["cars", "commercial"], ["body_repair", "paint", "glass"]),
  specialization("tires", ["cars", "commercial", "motorcycles"], ["tires"]),
  specialization("detailing", ["cars", "commercial", "marine", "motorcycles"], ["detailing", "car_wash"]),
  specialization("roadside_towing", ["cars", "commercial", "motorcycles"], ["towing"])
] as const satisfies readonly ServiceSpecializationDefinition[];

export function getServiceCategory(id?: string | null) {
  return SERVICE_CATEGORIES.find((categoryDefinition) => categoryDefinition.id === id) ?? null;
}

export function isServiceCategoryId(value?: string | null): value is ServiceCategoryId {
  return SERVICE_CATEGORIES.some((categoryDefinition) => categoryDefinition.id === value);
}

export function getServiceCategoriesForVertical(vertical?: string | null) {
  if (!vertical) return SERVICE_CATEGORIES;
  return SERVICE_CATEGORIES.filter((categoryDefinition) => categoryDefinition.supportedVerticals.includes(vertical as never));
}

function category(
  id: ServiceCategoryId,
  seoSlug: string,
  iconName: ServiceCategoryDefinition["iconName"],
  supportedVerticals: ServiceCategoryDefinition["supportedVerticals"],
  sortOrder: number,
  emergencyRelevant = false
): ServiceCategoryDefinition {
  return {
    id,
    labelKey: `services.categories.${id}.label`,
    descriptionKey: `services.categories.${id}.description`,
    seoSlug,
    iconName,
    supportedVerticals,
    availability: "preview",
    bookingReadiness: "planned",
    emergencyRelevant,
    sortOrder
  };
}

function specialization(
  id: ServiceSpecializationDefinition["id"],
  verticals: ServiceSpecializationDefinition["verticals"],
  categoryIds: ServiceCategoryId[]
): ServiceSpecializationDefinition {
  return {
    id,
    labelKey: `services.specializations.${id}.label`,
    descriptionKey: `services.specializations.${id}.description`,
    verticals,
    categoryIds
  };
}
