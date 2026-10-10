import Link from "next/link";
import { getVehicleReviews } from "@/lib/queries/reviews";
import { getHomeListings } from "@/lib/queries/listings";

export const dynamic = "force-dynamic";
export default async function ModelReviewsPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const [{ data: reviews, error }, listings] = await Promise.all([getVehicleReviews(modelId), getHomeListings(24)]);
  const currentListings = listings.data.filter((listing) => listing.vehicle_profile_id);
  return <main className="mx-auto max-w-5xl px-4 py-12"><Link href="/reviews" className="text-oto-primary underline">← Барлық пікірлер</Link><h1 className="mt-4 text-3xl font-black">Модель туралы пікірлер</h1>{error ? <p className="mt-6 text-red-600">{error}</p> : <div className="mt-8 space-y-4">{reviews.map((review) => <article className="rounded-2xl border border-oto-border p-5" key={review.id}><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong>{review.body ? <p className="mt-3 whitespace-pre-wrap">{review.body}</p> : null}</article>)}</div>}<h2 className="mt-12 text-2xl font-bold">Қазіргі жарияланған ұсыныстар</h2><div className="mt-4 flex flex-wrap gap-3">{currentListings.slice(0, 8).map((listing) => <Link className="rounded-xl border border-oto-border px-4 py-3 text-oto-primary underline" href={`/listing/${listing.listing_id}`} key={listing.listing_id}>{listing.title || "Жарияланым"}</Link>)}</div></main>;
}
