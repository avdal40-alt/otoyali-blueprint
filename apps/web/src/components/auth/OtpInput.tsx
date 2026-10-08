import { Input } from "@/components/ui/Input";

export function OtpInput({ value, onChange, label, id }: { value: string; onChange: (value: string) => void; label: string; id?: string }) {
  const inputId = id ?? "otp-code";
  return (
    <div>
      {id ? <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor={id}>{label}</label> : <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor="otp-code">{label}</label>}
      <Input id={inputId} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" dir="ltr" />
    </div>
  );
}
