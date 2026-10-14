import Link from "next/link";
import { getVehicleReviews } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";
export default async function ModelReviewsPage({ params, searchParams }: { params: Promise<{ modelId: string }>; searchParams: Promise<{ make?: string }> }) {
  const [{ modelId }, { make }] = await Promise.all([params, searchParams]);
  const { data: reviews, error } = await getVehicleReviews(modelId, undefined, 1);
  const generations = [...new Set(reviews.map((review) => review.generation_id))];
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12"><Link href="/reviews" className="text-sm font-bold text-oto-primary underline">← Барлық пікірлер</Link><h1 className="mt-4 text-3xl font-black">Модель туралы пікірлер</h1><p className="mt-2 text-sm text-oto-muted">Ұрпақты таңдап, тек сол көлікке қатысты иелік тәжірибелерін оқыңыз.</p>{error ? <p role="alert" className="mt-6 text-red-600">Пікірлерді жүктеу мүмкін болмады.</p> : null}{generations.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{generations.map((generationId) => <Link key={generationId} className="rounded-oto border border-oto-border bg-white p-4 font-bold text-oto-primary underline" href={`/reviews/model/${modelId}/generation/${generationId}${make ? `?make=${encodeURIComponent(make)}` : ""}`}>Осы ұрпақтың пікірлері</Link>)}</div> : <p className="mt-6 rounded-oto border border-oto-border bg-oto-surface p-4 text-sm text-oto-muted">Бұл модельге мақұлданған пікірлер әлі жоқ.</p>}<Link className="mt-6 inline-block text-sm font-bold text-oto-primary underline" href="/reviews/new">Пікір қалдыру</Link></main>;
}
