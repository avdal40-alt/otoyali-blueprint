import { z } from "zod";

export const partsConditions = ["new", "used", "refurbished"] as const;

export const createPartsListingSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().min(1).max(80),
  partCondition: z.enum(partsConditions),
  brand: z.string().trim().min(1).max(80).nullable().optional(),
  partNumber: z.string().trim().min(1).max(100).nullable().optional(),
  compatibleVehicles: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  priceAmount: z.string().regex(/^[1-9][0-9]{0,18}$/),
  cityId: z.string().uuid(),
  sellerContactPhoneId: z.string().uuid()
});

export type CreatePartsListingInput = z.infer<typeof createPartsListingSchema>;
