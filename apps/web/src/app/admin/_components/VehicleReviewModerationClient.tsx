"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Review = { id: string; moderation_status: "pending" | "approved" | "rejected"; rating: number; body: string | null; created_at: string };
type Decision = "approve" | "reject" | "hide" | "restore";

export function VehicleReviewModerationClient() {
  const { locale } = useI18n();
  const copy = getVehicleReviewModerationCopy(locale);
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;
    return fetch(path, { ...init, headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await request("/api/admin/reviews");
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(typeof payload?.error === "string" ? payload.error : copy.loadFailed);
    } else {
      setError(null);
      setRows(payload.data ?? []);
    }
    setLoading(false);
  }, [copy.loadFailed, request]);

  useEffect(() => { void load(); }, [load]);

  async function moderate(review: Review, decision: Decision) {
    const reason = decision === "reject" || decision === "hide" ? window.prompt(copy.reasonPrompt)?.trim() : null;
    if ((decision === "reject" || decision === "hide") && !reason) return;
    setBusy(review.id);
    setError(null);
    try {
      const response = await request(`/api/admin/reviews/${review.id}/moderation`, { method: "POST", body: JSON.stringify({ decision, reason }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : copy.moderateFailed);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8"><LoadingState label={copy.loading} /></main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolmod Admin</p>
        <h1 className="mt-1 text-2xl font-black text-oto-text">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-oto-muted">{copy.subtitle}</p>
      </header>
      {error ? <div className="mt-4"><ErrorState message={error} action={<Button type="button" variant="secondary" onClick={() => void load()}>{copy.retry}</Button>} /></div> : null}
      {!error && rows.length === 0 ? <div className="mt-6"><EmptyState title={copy.emptyTitle} body={copy.emptyBody} tone="admin" /></div> : null}
      <div className="mt-6 space-y-3">
        {rows.map((review) => (
          <article key={review.id} className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-oto-text">{copy.status[review.moderation_status]} · {review.rating}/5</p>
            {review.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-oto-text">{review.body}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {review.moderation_status === "pending" ? <><Button type="button" disabled={busy === review.id} onClick={() => void moderate(review, "approve")}>{copy.approve}</Button><Button type="button" variant="secondary" disabled={busy === review.id} onClick={() => void moderate(review, "reject")}>{copy.reject}</Button></> : null}
              {review.moderation_status === "approved" ? <Button type="button" variant="secondary" disabled={busy === review.id} onClick={() => void moderate(review, "hide")}>{copy.hide}</Button> : null}
              {review.moderation_status === "rejected" ? <Button type="button" disabled={busy === review.id} onClick={() => void moderate(review, "restore")}>{copy.restore}</Button> : null}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function getVehicleReviewModerationCopy(locale: string) {
  const copy = {
    ru: { loading: "Загрузка отзывов", title: "Модерация отзывов об автомобилях", subtitle: "Только уполномоченные модераторы могут просматривать и изменять эту закрытую очередь.", loadFailed: "Не удалось загрузить отзывы.", moderateFailed: "Не удалось выполнить модерацию.", reasonPrompt: "Причина модерации", retry: "Повторить", approve: "Одобрить", reject: "Отклонить", hide: "Скрыть", restore: "Восстановить", emptyTitle: "Нет отзывов для модерации", emptyBody: "Когда появятся отзывы, ожидающие проверки, они будут показаны здесь.", status: { pending: "Ожидает проверки", approved: "Одобрено", rejected: "Отклонено" } },
    kk: { loading: "Пікірлер жүктелуде", title: "Көлік пікірлерін модерациялау", subtitle: "Тек уәкілетті модераторлар ғана осы жеке кезекті көре және өзгерте алады.", loadFailed: "Пікірлерді жүктеу мүмкін болмады.", moderateFailed: "Модерация орындалмады.", reasonPrompt: "Модерация себебі", retry: "Қайталау", approve: "Мақұлдау", reject: "Қабылдамау", hide: "Жасыру", restore: "Қалпына келтіру", emptyTitle: "Модерациялауға пікірлер жоқ", emptyBody: "Тексеруді күтетін пікірлер пайда болғанда, олар осында көрсетіледі.", status: { pending: "Тексеруді күтуде", approved: "Мақұлданды", rejected: "Қабылданбады" } },
    en: { loading: "Loading reviews", title: "Vehicle review moderation", subtitle: "Only authorized moderators can view and change this private queue.", loadFailed: "Reviews could not be loaded.", moderateFailed: "Moderation could not be completed.", reasonPrompt: "Moderation reason", retry: "Try again", approve: "Approve", reject: "Reject", hide: "Hide", restore: "Restore", emptyTitle: "No reviews to moderate", emptyBody: "Reviews awaiting review will appear here.", status: { pending: "Pending review", approved: "Approved", rejected: "Rejected" } },
    "zh-CN": { loading: "正在加载评价", title: "车辆评价审核", subtitle: "只有获得授权的审核人员才能查看和修改此私有队列。", loadFailed: "无法加载评价。", moderateFailed: "无法完成审核。", reasonPrompt: "审核原因", retry: "重试", approve: "通过", reject: "拒绝", hide: "隐藏", restore: "恢复", emptyTitle: "没有需要审核的评价", emptyBody: "等待审核的评价会显示在这里。", status: { pending: "等待审核", approved: "已通过", rejected: "已拒绝" } }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copy[locale] : copy.ru;
}
