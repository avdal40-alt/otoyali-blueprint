import { Suspense } from "react";
import { PasswordEnrollmentClient } from "@/components/auth/PasswordEnrollmentClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/States";
export default function CreatePasswordPage() { return <><AppHeader /><PageContainer><Suspense fallback={<LoadingState />}><PasswordEnrollmentClient /></Suspense></PageContainer><MarketplaceFooter /><MobileBottomNav /></>; }
