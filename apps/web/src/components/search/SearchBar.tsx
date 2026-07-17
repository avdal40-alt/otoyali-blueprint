"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function SearchBar({ placeholder = "Araba, marka veya model ara", defaultValue = "" }: { placeholder?: string; defaultValue?: string }) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const resolvedPlaceholder = placeholder === "Araba, marka veya model ara" && locale === "en" ? "Search car, brand, or model" : placeholder;

  return (
    <form
      className="flex gap-2 rounded-oto border border-oto-border bg-white p-2 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(localizePath(`/search?q=${encodeURIComponent(value)}`, locale));
      }}
    >
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={resolvedPlaceholder} className="border-0 bg-oto-surface focus:ring-0" />
      <Button type="submit" className="shrink-0">
        {String(dictionary.common.search)}
      </Button>
    </form>
  );
}
