import { z } from "zod";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/i18n/types";

export const vehicleCategories = ["passenger_car", "truck", "bus", "trailer", "special_machinery"] as const;
export const listingPurposes = ["sale", "rent"] as const;
export const busTypes = ["minibus", "city", "intercity", "tourist", "other"] as const;

export type VehicleCategory = (typeof vehicleCategories)[number];
export type ListingPurpose = (typeof listingPurposes)[number];

type LaunchLocale = "ru" | "kk" | "en" | "zh-CN";

function launchLocale(locale: Locale): LaunchLocale {
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? locale : "ru";
}

const v2Copy = {
  category: {
    passenger_car: { ru: "Легковой автомобиль", kk: "Жеңіл автомобиль", en: "Passenger car", "zh-CN": "乘用车" },
    truck: { ru: "Грузовик", kk: "Жүк көлігі", en: "Truck", "zh-CN": "卡车" },
    bus: { ru: "Автобус", kk: "Автобус", en: "Bus", "zh-CN": "公交车" },
    trailer: { ru: "Прицеп", kk: "Тіркеме", en: "Trailer", "zh-CN": "拖车" },
    special_machinery: { ru: "Спецтехника", kk: "Арнайы техника", en: "Special machinery", "zh-CN": "特种机械" }
  },
  purpose: {
    sale: { ru: "Продажа", kk: "Сату", en: "Sale", "zh-CN": "出售" },
    rent: { ru: "Аренда", kk: "Жалға беру", en: "Rent", "zh-CN": "租赁" }
  },
  day: { ru: "день", kk: "күн", en: "day", "zh-CN": "天" },
  month: { ru: "месяц", kk: "ай", en: "month", "zh-CN": "月" },
  vehicleCategory: { ru: "Категория транспорта", kk: "Көлік санаты", en: "Vehicle category", "zh-CN": "车辆类别" },
  listingPurpose: { ru: "Цель объявления", kk: "Хабарландыру мақсаты", en: "Listing purpose", "zh-CN": "刊登目的" },
  dailyPriceFrom: { ru: "Цена в день, от", kk: "Күндік баға, бастап", en: "Daily price, from", "zh-CN": "每日价格，起" },
  dailyPriceTo: { ru: "Цена в день, до", kk: "Күндік баға, дейін", en: "Daily price, to", "zh-CN": "每日价格，至" },
  minimumRentalDays: { ru: "Минимум дней аренды", kk: "Ең аз жалға алу күні", en: "Minimum rental days", "zh-CN": "最短租期（天）" },
  withDriver: { ru: "С водителем / оператором", kk: "Жүргізушімен / оператормен", en: "With driver / operator", "zh-CN": "含司机/操作员" },
  truckBodyType: { ru: "Тип кузова", kk: "Шанақ түрі", en: "Body type", "zh-CN": "车身类型" },
  busType: { ru: "Тип автобуса", kk: "Автобус түрі", en: "Bus type", "zh-CN": "巴士类型" },
  trailerType: { ru: "Тип прицепа", kk: "Тіркеме түрі", en: "Trailer type", "zh-CN": "拖车类型" },
  machineryType: { ru: "Тип спецтехники", kk: "Арнайы техника түрі", en: "Machinery type", "zh-CN": "机械类型" },
  payloadCapacity: { ru: "Грузоподъёмность", kk: "Жүк көтергіштігі", en: "Payload capacity", "zh-CN": "载重量" },
  grossWeight: { ru: "Полная масса", kk: "Толық массасы", en: "Gross weight", "zh-CN": "总重量" },
  axleCount: { ru: "Количество осей", kk: "Ось саны", en: "Axle count", "zh-CN": "轴数" },
  seatCount: { ru: "Количество мест", kk: "Орын саны", en: "Seat count", "zh-CN": "座位数" },
  operatingHours: { ru: "Моточасы", kk: "Мото-сағат", en: "Operating hours", "zh-CN": "工作小时数" },
  kilograms: { ru: "кг", kk: "кг", en: "kg", "zh-CN": "千克" },
  hours: { ru: "ч", kk: "сағ", en: "h", "zh-CN": "小时" },
  allCategories: { ru: "Все категории", kk: "Барлық санаттар", en: "All categories", "zh-CN": "所有类别" },
  allPurposes: { ru: "Продажа и аренда", kk: "Сату және жалға беру", en: "Sale and rent", "zh-CN": "出售和租赁" }
} as const;

export function vehicleMarketplaceV2Copy(key: keyof Omit<typeof v2Copy, "category" | "purpose" | "day" | "month">, locale: Locale) {
  return v2Copy[key][launchLocale(locale)];
}

export function listingPurposeLabel(purpose: string | null | undefined, locale: Locale) {
  return (v2Copy.purpose[purpose as ListingPurpose] ?? v2Copy.purpose.sale)[launchLocale(locale)];
}

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

/** Presentation-only V2 price label. It never reuses a sale price for rent. */
export function formatListingPurposePrice(
  listing: { listing_purpose?: string | null; price_amount?: number | null; rental_price_per_day?: number | null; currency?: string | null },
  locale: Locale
) {
  if (listing.listing_purpose !== "rent") return formatPrice(listing.price_amount, listing.currency, locale);
  return `${formatPrice(listing.rental_price_per_day, listing.currency, locale)} / ${v2Copy.day[launchLocale(locale)]}`;
}

export function vehicleCategoryLabel(category: string | null | undefined, locale: Locale) {
  return (v2Copy.category[category as VehicleCategory] ?? v2Copy.category.passenger_car)[launchLocale(locale)];
}
