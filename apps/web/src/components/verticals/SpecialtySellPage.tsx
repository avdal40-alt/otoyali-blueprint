import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getCities } from "@/lib/queries/cities";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import { SpecialtySellerForm } from "./SpecialtySellerForm";
export async function SpecialtySellPage({ vertical }: { vertical: Extract<MarketplaceVerticalId, "motorcycles" | "marine" | "mobility"> }) { const cities = await getCities(); const options = cities.data.map((city) => ({ id: city.city_id, name: city.city_name ?? city.city_slug ?? city.city_id })); return <><AppHeader /><PageContainer className="max-w-3xl py-6"><h1 className="text-3xl font-black text-oto-text">Новое объявление</h1><p className="mt-2 text-sm text-oto-muted">После отправки объявление проверяется модератором. Jolmod не принимает оплату и не оформляет сделки.</p><SpecialtySellerForm vertical={vertical} cities={options} /></PageContainer><MarketplaceFooter /><MobileBottomNav /></>; }
