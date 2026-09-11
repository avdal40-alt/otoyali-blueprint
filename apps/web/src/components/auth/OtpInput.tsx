import { Input } from "@/components/ui/Input";

export function OtpInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor="otp-code">{label}</label>
      <Input id="otp-code" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" dir="ltr" />
    </div>
  );
}
