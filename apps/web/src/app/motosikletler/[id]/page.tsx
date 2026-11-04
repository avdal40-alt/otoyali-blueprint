import { SpecialtyListingPage } from "@/components/verticals/SpecialtyListingPage";
export default async function MotorcyclesDetailPage({ params }: { params: Promise<{ id: string }> }) { return <SpecialtyListingPage vertical="motorcycles" id={(await params).id} />; }
