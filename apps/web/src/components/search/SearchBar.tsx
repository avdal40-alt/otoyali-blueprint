"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SearchBar({ placeholder = "Araba, marka veya model ara", defaultValue = "" }: { placeholder?: string; defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="flex gap-2 rounded-oto border border-oto-border bg-white p-2 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/search?q=${encodeURIComponent(value)}`);
      }}
    >
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="border-0 bg-oto-surface focus:ring-0" />
      <Button type="submit" className="shrink-0">
        Ara
      </Button>
    </form>
  );
}
