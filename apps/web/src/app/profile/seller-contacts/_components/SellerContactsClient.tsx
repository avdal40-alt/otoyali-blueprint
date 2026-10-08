"use client";

import { useCallback, useEffect, useState } from "react";
import { SellerContactVerificationFlow } from "@/components/seller/SellerContactVerificationFlow";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type Contact = { contact_id: string; masked_phone: string; is_active: boolean; is_current_account_phone: boolean };

export function SellerContactsClient() {
  const { locale } = useI18n();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const text = locale === "tr"
    ? { title: "Satıcı iletişim numaraları", slots: (count: number) => `${count} / 3 doğrulanmış numara`, account: "Hesap telefonu", add: "Numara ekle", cancel: "İptal", max: "En fazla üç doğrulanmış numara ekleyebilirsiniz.", error: "İletişim numaraları yüklenemedi.", retry: "Tekrar dene" }
    : { title: "Seller contact numbers", slots: (count: number) => `${count} / 3 verified numbers`, account: "Account phone", add: "Add phone", cancel: "Cancel", max: "You can keep up to three verified numbers.", error: "Could not load contact numbers.", retry: "Try again" };

  const loadContacts = useCallback(async () => {
    if (!hasSupabaseEnv()) { setLoadError(true); setLoading(false); return; }
    setLoading(true); setLoadError(false);
    const supabase = getSupabaseBrowserClient();
    await supabase.rpc("sync_own_verified_account_phone");
    const { data, error } = await supabase.rpc("list_own_verified_seller_contact_phones");
    if (error) { setLoadError(true); setLoading(false); return; }
    setContacts((Array.isArray(data) ? data : []).filter((contact): contact is Contact => Boolean(contact && typeof contact === "object" && (contact as Contact).is_active)));
    setLoading(false);
  }, []);

  useEffect(() => { void loadContacts(); }, [loadContacts]);
  if (loading && !contacts) return <LoadingState />;
  if (loadError) return <ErrorState message={text.error} action={<Button type="button" variant="secondary" onClick={() => void loadContacts()}>{text.retry}</Button>} />;

  const activeContacts = contacts ?? [];
  const hasAvailableSlot = activeContacts.length < 3;
  return <section className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-6">
    <h1 className="text-2xl font-black text-oto-text">{text.title}</h1>
    <p className="mt-2 text-sm font-bold text-oto-muted">{text.slots(activeContacts.length)}</p>
    <div className="mt-4 grid gap-2" aria-live="polite">{activeContacts.map((contact) => <div key={contact.contact_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-text"><span dir="ltr">{contact.masked_phone}</span>{contact.is_current_account_phone ? <span className="text-oto-blue">{text.account}</span> : null}</div>)}</div>
    {showVerification ? <div className="mt-5 grid gap-4"><SellerContactVerificationFlow onVerified={async () => { setShowVerification(false); await loadContacts(); }} onCancel={() => setShowVerification(false)} /><Button type="button" variant="secondary" onClick={() => setShowVerification(false)}>{text.cancel}</Button></div> : hasAvailableSlot ? <Button type="button" className="mt-5" onClick={() => setShowVerification(true)}>{text.add}</Button> : <p className="mt-5 rounded-md bg-oto-surface p-3 text-sm font-semibold text-oto-muted">{text.max}</p>}
  </section>;
}
