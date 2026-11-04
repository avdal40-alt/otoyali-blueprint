import { SpecialtyListingPage } from "@/components/verticals/SpecialtyListingPage";
export default async function MobilityDetailPage({ params }: { params: Promise<{ id: string }> }) { return <SpecialtyListingPage vertical="mobility" id={(await params).id} />; }
