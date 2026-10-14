import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";
export default function NewReviewPage() {
  return <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12"><h1 className="text-3xl font-black">Көлік туралы пікір қалдыру</h1><p className="mt-2 text-sm leading-6 text-oto-muted">Пікір иелік тәжірибесі туралы болады және жарияланар алдында тексеріледі.</p><ReviewForm /></main>;
}
