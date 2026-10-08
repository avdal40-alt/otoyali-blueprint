import { Suspense } from "react";
import { AuthOtpStartClient } from "@/components/auth/AuthOtpStartClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/States";
export default function ForgotPasswordPage() { return <><AppHeader /><PageContainer><Suspense fallback={<LoadingState />}><AuthOtpStartClient purpose="recovery" /></Suspense></PageContainer><MarketplaceFooter /><MobileBottomNav /></>; }
