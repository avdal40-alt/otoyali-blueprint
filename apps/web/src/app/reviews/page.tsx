import Link from "next/link";
import { getVehicleReviews, reviewGenerationPath } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { data: reviews, error } = await getVehicleReviews();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12"><h1 className="text-3xl font-black">Автокөлік иелерінің пікірлері</h1><p className="mt-2 text-oto-muted">Тексерілген және мақұлданған иелік тәжірибелері.</p><Link className="mt-4 inline-block font-bold text-oto-primary underline" href="/reviews/new">Пікір қалдыру</Link>{error ? <p role="alert" className="mt-8 text-red-600">Пікірлерді жүктеу мүмкін болмады.</p> : reviews.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{reviews.map((review) => <article className="rounded-2xl border border-oto-border bg-white p-5" key={review.id}><div className="flex justify-between"><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong><span className="text-sm text-oto-muted">{review.ownership_status === "current_owner" ? "Қазіргі иесі" : "Бұрынғы иесі"}</span></div>{review.body ? <p className="mt-4 whitespace-pre-wrap">{review.body}</p> : null}<div className="mt-4 text-sm"><Link className="text-oto-primary underline" href={reviewGenerationPath({ makeId: review.make_id, modelId: review.model_id, generationId: review.generation_id })}>Осы ұрпақтың пікірлері</Link></div></article>)}</div> : <p className="mt-8 rounded-oto border border-oto-border bg-oto-surface p-4 text-sm text-oto-muted">Мақұлданған пікірлер әлі жоқ.</p>}</main>;
}
