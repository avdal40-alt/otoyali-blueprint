import { SpecialtyListingPage } from "@/components/verticals/SpecialtyListingPage";
export default async function MarineDetailPage({ params }: { params: Promise<{ id: string }> }) { return <SpecialtyListingPage vertical="marine" id={(await params).id} />; }
