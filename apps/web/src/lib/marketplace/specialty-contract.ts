import { z } from "zod";

export const specialtyVerticals = ["motorcycles", "marine", "mobility"] as const;

export const createSpecialtyListingSchema = z.object({
  vertical: z.enum(specialtyVerticals),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().min(1).max(80),
  brand: z.string().trim().min(1).max(80).nullable().optional(),
  model: z.string().trim().min(1).max(80).nullable().optional(),
  condition: z.enum(["new", "used"]),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),
  engineVolumeCc: z.coerce.number().int().positive().nullable().optional(),
  lengthCm: z.coerce.number().int().positive().nullable().optional(),
  rangeKm: z.coerce.number().int().positive().nullable().optional(),
  priceAmount: z.string().regex(/^[1-9][0-9]{0,18}$/),
  cityId: z.string().uuid(),
  sellerContactPhoneId: z.string().uuid()
}).superRefine((value, ctx) => {
  if (value.vertical === "motorcycles" && (!value.brand || !value.model)) ctx.addIssue({ code: "custom", message: "Motorcycle brand and model are required." });
  if (value.vertical === "mobility" && value.engineVolumeCc !== null && value.engineVolumeCc !== undefined) ctx.addIssue({ code: "custom", message: "Mobility listings do not use engine volume." });
});

export type CreateSpecialtyListingInput = z.infer<typeof createSpecialtyListingSchema>;
