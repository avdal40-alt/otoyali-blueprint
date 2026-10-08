import { SellerEntryGate } from "@/app/sell/_components/SellerEntryGate";
import { SellerContactsClient } from "./_components/SellerContactsClient";
import { AppHeader } from "@/components/layout/AppHeader"; import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter"; import { MobileBottomNav } from "@/components/layout/MobileBottomNav"; import { PageContainer } from "@/components/layout/PageContainer";
export default function SellerContactsPage(){return <><AppHeader/><PageContainer><SellerEntryGate><SellerContactsClient/></SellerEntryGate></PageContainer><MarketplaceFooter/><MobileBottomNav/></>}
