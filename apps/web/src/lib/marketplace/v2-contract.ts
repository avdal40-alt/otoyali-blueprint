import { z } from "zod";

export const vehicleCategories = ["passenger_car", "truck", "bus", "trailer", "special_machinery"] as const;
export const listingPurposes = ["sale", "rent"] as const;
export const busTypes = ["minibus", "city", "intercity", "tourist", "other"] as const;

export type VehicleCategory = (typeof vehicleCategories)[number];
export type ListingPurpose = (typeof listingPurposes)[number];

const money = z.string().regex(/^(0|[1-9][0-9]{0,18})$/);
const positiveMoney = z.string().regex(/^[1-9][0-9]{0,18}$/);
const nullableMoney = money.nullable().optional();
const nullablePositiveInt = z.number().int().positive().nullable().optional();

export const vehicleMarketplaceV2Schema = z.object({
  vehicleCategory: z.enum(vehicleCategories).default("passenger_car"),
  listingPurpose: z.enum(listingPurposes).default("sale"),
  priceAmount: nullableMoney,
  currency: z.literal("KZT"),
  rentalPricePerDay: nullableMoney,
  rentalPricePerMonth: nullableMoney,
  minimumRentalDays: nullablePositiveInt,
  securityDepositAmount: money.nullable().optional(),
  withDriverOrOperator: z.boolean().nullable().optional(),
  truckBodyType: z.string().trim().min(1).max(80).nullable().optional(),
  busType: z.enum(busTypes).nullable().optional(),
  trailerType: z.string().trim().min(1).max(80).nullable().optional(),
  machineryType: z.string().trim().min(1).max(80).nullable().optional(),
  payloadCapacityKg: nullablePositiveInt,
  grossWeightKg: nullablePositiveInt,
  axleCount: z.number().int().min(1).max(16).nullable().optional(),
  seatCount: z.number().int().min(1).max(200).nullable().optional(),
  operatingHours: z.number().int().min(0).nullable().optional()
}).strict().superRefine((value, context) => {
  if (value.listingPurpose === "sale") {
    if (!value.priceAmount || value.rentalPricePerDay || value.rentalPricePerMonth || value.minimumRentalDays || value.securityDepositAmount || value.withDriverOrOperator !== undefined && value.withDriverOrOperator !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["listingPurpose"], message: "Sale listings use only the sale price." });
    }
  } else {
    if (value.priceAmount || !value.rentalPricePerDay || !positiveMoney.safeParse(value.rentalPricePerDay).success) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["rentalPricePerDay"], message: "Rental listings require a positive daily KZT price and no sale price." });
    }
  }

  if (value.vehicleCategory !== "truck" && value.truckBodyType) context.addIssue({ code: z.ZodIssueCode.custom, path: ["truckBodyType"], message: "Truck body type applies only to trucks." });
  if (value.vehicleCategory !== "bus" && value.busType) context.addIssue({ code: z.ZodIssueCode.custom, path: ["busType"], message: "Bus type applies only to buses." });
  if (value.vehicleCategory !== "trailer" && value.trailerType) context.addIssue({ code: z.ZodIssueCode.custom, path: ["trailerType"], message: "Trailer type applies only to trailers." });
  if (value.vehicleCategory !== "special_machinery" && value.machineryType) context.addIssue({ code: z.ZodIssueCode.custom, path: ["machineryType"], message: "Machinery type applies only to special machinery." });
});

export function isTrailerCategory(category: VehicleCategory) {
  return category === "trailer";
}

export function usesRentalTerms(purpose: ListingPurpose) {
  return purpose === "rent";
}
