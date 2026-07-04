import { Input } from "@/components/ui/Input";

export function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-oto-text">Telefon numarası</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="+90 555 123 45 67" inputMode="tel" autoComplete="tel" />
    </div>
  );
}
