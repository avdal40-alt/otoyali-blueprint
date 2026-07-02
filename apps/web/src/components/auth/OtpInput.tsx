import { Input } from "@/components/ui/Input";

export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-oto-text">Dogrulama kodu</label>
      <Input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
    </div>
  );
}
