import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { InboxClient } from "./_components/InboxClient";
export default function MessagesPage() { return <><AppHeader /><PageContainer><InboxClient /></PageContainer><MarketplaceFooter /><MobileBottomNav /></>; }
