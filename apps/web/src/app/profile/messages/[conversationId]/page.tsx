import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ConversationClient } from "./_components/ConversationClient";
export default async function ConversationPage({params}:{params:Promise<{conversationId:string}>}){const {conversationId}=await params;return <><AppHeader/><PageContainer><ConversationClient conversationId={conversationId}/></PageContainer><MarketplaceFooter/><MobileBottomNav/></>}
