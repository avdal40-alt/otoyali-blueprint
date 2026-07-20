"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/i18n/types";
import type { AuthPhoneCountry } from "@/lib/auth/phone";
import { DEFAULT_PHONE_COUNTRY, getPhoneCountryOptions } from "@/lib/auth/phone";
import { cn } from "@/lib/cn";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  selectedCountry: AuthPhoneCountry;
  onCountryChange: (country: AuthPhoneCountry) => void;
  locale: Locale;
  label: string;
  countryLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  placeholder: string;
  noResults: string;
  helperText?: string;
  error?: string | null;
};

export function PhoneInput({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  locale,
  label,
  countryLabel,
  searchLabel,
  searchPlaceholder,
  placeholder,
  noResults,
  helperText,
  error
}: PhoneInputProps) {
  const searchId = useId();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useMemo(() => getPhoneCountryOptions(locale), [locale]);
  const activeCountry = countries.find((item) => item.country === selectedCountry) ?? countries.find((item) => item.country === DEFAULT_PHONE_COUNTRY) ?? countries[0];
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US");
  const filteredCountries = normalizedQuery
    ? countries.filter((item) => item.searchText.includes(normalizedQuery))
    : countries;

  function selectCountry(country: AuthPhoneCountry) {
    onCountryChange(country);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="grid gap-2">
      <label className="block text-sm font-bold text-oto-text">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="relative">
          <button
            type="button"
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-md border border-oto-border bg-white px-3 text-left text-sm font-semibold text-oto-text transition duration-base hover:bg-oto-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/15",
              isOpen ? "border-oto-blue ring-2 ring-oto-blue/15" : null
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            onClick={() => setIsOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
          >
            <span className="min-w-0">
              <span className="block truncate">{activeCountry?.name ?? selectedCountry}</span>
              <span className="block text-xs font-bold text-oto-muted">{activeCountry?.callingCode}</span>
            </span>
            <span aria-hidden="true" className="text-oto-muted">
              {isOpen ? "-" : "+"}
            </span>
          </button>
          {isOpen ? (
            <div className="absolute left-0 right-0 top-12 z-30 rounded-oto border border-oto-border bg-white p-2 shadow-oto">
              <label htmlFor={searchId} className="sr-only">
                {searchLabel}
              </label>
              <Input
                id={searchId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                inputMode="search"
                autoComplete="off"
                aria-label={searchLabel}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
              />
              <div
                id={listboxId}
                role="listbox"
                aria-label={countryLabel}
                className="mt-2 max-h-72 overflow-y-auto rounded-md border border-oto-border bg-white"
              >
                {filteredCountries.length ? (
                  filteredCountries.map((item) => (
                    <button
                      key={item.country}
                      type="button"
                      role="option"
                      aria-selected={item.country === selectedCountry}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold transition hover:bg-oto-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/15",
                        item.country === selectedCountry ? "bg-oto-blue/10 text-oto-blue" : "text-oto-text"
                      )}
                      onClick={() => selectCountry(item.country)}
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 text-xs font-black text-oto-muted">{item.callingCode}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm font-semibold text-oto-muted">{noResults}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="tel"
          autoComplete="tel"
          error={error}
          helperText={helperText}
        />
      </div>
    </div>
  );
}
