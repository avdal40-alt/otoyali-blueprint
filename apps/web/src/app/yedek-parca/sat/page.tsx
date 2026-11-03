import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getCities } from "@/lib/queries/cities";
import { PartsSellerForm } from "./parts-seller-form";

export default async function SellPartsPage() {
  const cities = await getCities();
  return <><AppHeader /><PageContainer className="max-w-3xl py-6"><h1 className="text-3xl font-black text-oto-text">Разместить запчасть</h1><p className="mt-2 text-sm text-oto-muted">Сохраните черновик, затем отправьте его на модерацию. Jolmod не принимает оплату и не бронирует товар.</p><PartsSellerForm cities={cities.data.map((city) => ({ id: city.city_id, name: city.city_name ?? "" })).filter((city) => city.name)} /></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
