"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

const reasons = [
  { value: "wrong_information", label: "Yanlış bilgi" },
  { value: "fraud", label: "Dolandırıcılık şüphesi" },
  { value: "duplicate", label: "Tekrarlanan ilan" },
  { value: "inappropriate_content", label: "Uygunsuz içerik" },
  { value: "suspicious_seller", label: "Şüpheli satıcı" },
  { value: "other", label: "Diğer" }
];

export function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0].value);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "login" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseEnv()) {
      setStatus("error");
      setMessage("Supabase ortam değişkenleri eksik.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setStatus("checking");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setStatus("login");
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.schema("marketplace").from("reports").insert({
      reporter_user_id: userData.user.id,
      listing_id: listingId,
      reason,
      description: description.trim() || null
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setDescription("");
    setMessage("Bildiriminiz alındı. OTOYALI ekibi inceleyecek.");
  }

  return (
    <div className="mt-5 rounded-md border border-oto-border bg-oto-surface p-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="text-sm font-black text-oto-blue">
        İlanı bildir
      </button>
      <p className="mt-2 text-sm leading-6 text-oto-muted">
        Bu ilanda hatalı bilgi, şüpheli durum veya uygunsuz içerik olduğunu düşünüyorsanız bize bildirin.
      </p>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-oto-text">
            Sebep
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 rounded-md border border-oto-border bg-white px-3">
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-oto-text">
            Açıklama
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="rounded-md border border-oto-border bg-white p-3" />
          </label>
          {status === "login" ? (
            <Link href={`/login?next=/listing/${listingId}`} className="text-sm font-black text-oto-blue">Bildirim göndermek için giriş yapın.</Link>
          ) : null}
          {message ? <p className={status === "success" ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-oto-danger"}>{message}</p> : null}
          <Button type="submit" disabled={status === "checking" || status === "submitting"}>
            {status === "submitting" ? "Gönderiliyor" : "Bildir"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
