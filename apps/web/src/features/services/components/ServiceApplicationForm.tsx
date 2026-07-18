"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Textarea } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { SERVICE_CATEGORIES } from "../domain/categories";
import { validateServiceProviderApplication } from "../domain/validation";
import type { ServiceProviderApplicationInput, ServiceValidationField } from "../domain/types";

type AuthState = "loading" | "ready" | "login" | "error";

const initialInput: ServiceProviderApplicationInput = {
  businessName: "",
  contactPersonName: "",
  contactPhone: "",
  city: "İstanbul",
  district: "",
  categoryKeys: ["periodic_maintenance"],
  supportedVerticals: ["cars"],
  websiteUrl: "",
  notes: "",
  consentAccuracy: false
};

const visibleCategoryIds = [
  "periodic_maintenance",
  "diagnostics",
  "inspection",
  "tires",
  "brakes",
  "body_repair",
  "ev_service",
  "towing",
  "detailing",
  "other"
];

const applicationVerticalOptions: MarketplaceVerticalId[] = ["cars", "commercial", "motorcycles", "marine"];

export function ServiceApplicationForm() {
  const { locale } = useI18n();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [input, setInput] = useState<ServiceProviderApplicationInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceValidationField, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (!hasSupabaseEnv()) {
        setAuthState("error");
        setSubmitError(t(locale, "errors.missingSupabaseEnv"));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setAuthState("error");
        setSubmitError(error.message);
        return;
      }

      setAuthState(data.user ? "ready" : "login");
    }

    void checkSession();
  }, [locale]);

  const categories = useMemo(
    () => SERVICE_CATEGORIES.filter((category) => visibleCategoryIds.includes(category.id)),
    []
  );

  function update<K extends keyof ServiceProviderApplicationInput>(key: K, value: ServiceProviderApplicationInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    update(
      "categoryKeys",
      checked
        ? Array.from(new Set([...input.categoryKeys, categoryId]))
        : input.categoryKeys.filter((item) => item !== categoryId)
    );
  }

  function toggleVertical(verticalId: MarketplaceVerticalId, checked: boolean) {
    update(
      "supportedVerticals",
      checked
        ? Array.from(new Set([...input.supportedVerticals, verticalId]))
        : input.supportedVerticals.filter((item) => item !== verticalId)
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const validation = validateServiceProviderApplication(input);
    setFieldErrors(validation.fieldErrors);
    if (!validation.ok) return;

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.schema("service_marketplace").from("provider_applications").insert(validation.data);
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitted(true);
  }

  if (authState === "loading") return <LoadingState />;

  if (authState === "login") {
    const next = localizePath("/servisler/basvuru", locale);
    return (
      <Card padding="lg">
        <Badge>{t(locale, "services.apply.progressiveAuthBadge")}</Badge>
        <h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "services.apply.loginTitle")}</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.apply.loginBody")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={`${localizePath("/login", locale)}?next=${encodeURIComponent(next)}`} variant="orange">
            {t(locale, "services.apply.loginCta")}
          </ButtonLink>
          <Link href={localizePath("/servisler", locale)} className="inline-flex h-11 items-center rounded-button border border-oto-border px-4 text-sm font-black text-oto-text">
            {t(locale, "services.apply.backToServices")}
          </Link>
        </div>
      </Card>
    );
  }

  if (authState === "error") {
    return <ErrorState message={submitError ?? t(locale, "errors.generic")} />;
  }

  if (submitted) {
    return (
      <Card padding="lg">
        <Badge variant="active">{t(locale, "services.apply.pendingBadge")}</Badge>
        <h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "services.apply.successTitle")}</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.apply.successBody")}</p>
        <ButtonLink href={localizePath("/servisler", locale)} variant="secondary" className="mt-5">
          {t(locale, "services.apply.backToServices")}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <Card padding="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t(locale, "services.apply.fields.businessName")}>
            <Input
              value={input.businessName}
              onChange={(event) => update("businessName", event.target.value)}
              error={errorFor("businessName", fieldErrors, locale)}
              autoComplete="organization"
            />
          </Field>
          <Field label={t(locale, "services.apply.fields.contactPersonName")}>
            <Input
              value={input.contactPersonName}
              onChange={(event) => update("contactPersonName", event.target.value)}
              error={errorFor("contactPersonName", fieldErrors, locale)}
              autoComplete="name"
            />
          </Field>
          <Field label={t(locale, "services.apply.fields.contactPhone")}>
            <Input
              value={input.contactPhone}
              onChange={(event) => update("contactPhone", event.target.value)}
              error={errorFor("contactPhone", fieldErrors, locale)}
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
          <Field label={t(locale, "services.apply.fields.city")}>
            <Input
              value={input.city}
              onChange={(event) => update("city", event.target.value)}
              error={errorFor("city", fieldErrors, locale)}
              autoComplete="address-level1"
            />
          </Field>
          <Field label={t(locale, "services.apply.fields.district")}>
            <Input
              value={input.district}
              onChange={(event) => update("district", event.target.value)}
              error={errorFor("district", fieldErrors, locale)}
              autoComplete="address-level2"
            />
          </Field>
          <Field label={t(locale, "services.apply.fields.websiteUrl")}>
            <Input
              value={input.websiteUrl}
              onChange={(event) => update("websiteUrl", event.target.value)}
              error={errorFor("websiteUrl", fieldErrors, locale)}
              placeholder="https://"
              inputMode="url"
            />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-black text-oto-text">{t(locale, "services.apply.fields.categories")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.apply.categoryHelper")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Checkbox
              key={category.id}
              label={t(locale, category.labelKey)}
              checked={input.categoryKeys.includes(category.id)}
              onChange={(event) => toggleCategory(category.id, event.target.checked)}
            />
          ))}
        </div>
        {fieldErrors.categoryKeys ? <p className="mt-3 text-sm font-bold text-oto-danger">{t(locale, fieldErrors.categoryKeys)}</p> : null}
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-black text-oto-text">{t(locale, "services.apply.fields.supportedVerticals")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.apply.verticalHelper")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {applicationVerticalOptions.map((vertical) => (
            <Checkbox
              key={vertical}
              label={t(locale, `services.apply.verticals.${vertical}`)}
              checked={input.supportedVerticals.includes(vertical)}
              onChange={(event) => toggleVertical(vertical, event.target.checked)}
            />
          ))}
        </div>
        {fieldErrors.supportedVerticals ? <p className="mt-3 text-sm font-bold text-oto-danger">{t(locale, fieldErrors.supportedVerticals)}</p> : null}
      </Card>

      <Card padding="lg">
        <Field label={t(locale, "services.apply.fields.notes")}>
          <Textarea
            value={input.notes}
            onChange={(event) => update("notes", event.target.value)}
            error={errorFor("notes", fieldErrors, locale)}
            helperText={t(locale, "services.apply.notesHelper")}
          />
        </Field>
        <Checkbox
          className="mt-5"
          label={t(locale, "services.apply.fields.consentAccuracy")}
          checked={input.consentAccuracy}
          onChange={(event) => update("consentAccuracy", event.target.checked)}
          error={errorFor("consentAccuracy", fieldErrors, locale)}
        />
      </Card>

      {submitError ? <ErrorState message={submitError} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="orange" isLoading={submitting}>
          {t(locale, "services.apply.submit")}
        </Button>
        <p className="text-sm font-semibold text-oto-muted">{t(locale, "services.apply.reviewNote")}</p>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-oto-text">
      <span>{label}</span>
      {children}
    </label>
  );
}

function errorFor(field: ServiceValidationField, errors: Partial<Record<ServiceValidationField, string>>, locale: "tr" | "en") {
  const key = errors[field];
  return key ? t(locale, key) : null;
}
