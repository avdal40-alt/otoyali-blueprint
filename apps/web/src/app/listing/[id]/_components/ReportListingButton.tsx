"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { getListingActionsCopy } from "./listing-actions-copy";

const reasonValues = [
  "wrong_information",
  "fraud",
  "duplicate",
  "inappropriate_content",
  "suspicious_seller",
  "other"
] as const;

export function ReportListingButton({ listingId }: { listingId: string }) {
  const { locale } = useI18n();
  const copy = getListingActionsCopy(locale);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasonValues)[number]>(reasonValues[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "login" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const loginHref = useMemo(() => {
    const next = localizePath(`/listing/${listingId}`, locale);
    return `${localizePath("/login", locale)}?next=${encodeURIComponent(next)}`;
  }, [listingId, locale]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseEnv()) {
      setStatus("error");
      setMessage(copy.environmentUnavailable);
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
      setMessage(copy.failure);
      return;
    }

    setStatus("success");
    setDescription("");
    setMessage(copy.success);
  }

  return (
    <div className="mt-5 rounded-md border border-oto-border bg-oto-surface p-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="text-sm font-black text-oto-blue">
        {copy.reportListing}
      </button>
      <p className="mt-2 text-sm leading-6 text-oto-muted">
        {copy.reportHelp}
      </p>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-oto-text">
            {copy.reason}
            <select value={reason} onChange={(event) => setReason(event.target.value as (typeof reasonValues)[number])} className="h-11 rounded-md border border-oto-border bg-white px-3">
              {reasonValues.map((item) => (
                <option key={item} value={item}>{copy[item === "wrong_information" ? "wrongInformation" : item === "suspicious_seller" ? "suspiciousSeller" : item === "inappropriate_content" ? "inappropriateContent" : item]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-oto-text">
            {copy.description}
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="rounded-md border border-oto-border bg-white p-3" />
          </label>
          {status === "login" ? (
            <Link href={loginHref} className="text-sm font-black text-oto-blue">
              {copy.login}
            </Link>
          ) : null}
          {message ? <p className={status === "success" ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-oto-danger"}>{message}</p> : null}
          <Button type="submit" disabled={status === "checking" || status === "submitting"}>
            {status === "submitting" ? copy.submitting : copy.submit}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
