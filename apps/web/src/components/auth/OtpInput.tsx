import { Input } from "@/components/ui/Input";

export function OtpInput({ value, onChange, label, id = "otp-code" }: { value: string; onChange: (value: string) => void; label: string; id?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor={id}>{label}</label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" dir="ltr" />
    </div>
  );
}
