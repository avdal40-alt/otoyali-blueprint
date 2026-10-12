import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

type FieldStateProps = {
  label?: ReactNode;
  error?: string | null;
  helperText?: string | null;
  isLoading?: boolean;
};

const controlBase =
  "w-full rounded-md border bg-white text-sm text-oto-text outline-none transition duration-base placeholder:text-oto-muted disabled:cursor-not-allowed disabled:bg-oto-surface disabled:text-oto-muted disabled:opacity-disabled";

const controlState = (error?: string | null) =>
  error
    ? "border-oto-danger focus:border-oto-danger focus:ring-2 focus:ring-oto-danger/15"
    : "border-oto-border focus:border-oto-accent focus:ring-2 focus:ring-oto-accent/15";

export function Input({
  className,
  error,
  helperText,
  isLoading,
  label,
  id: providedId,
  ["aria-describedby"]: ariaDescribedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldStateProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = `${id}-message`;
  const describedBy = mergeDescribedBy(ariaDescribedBy, error || helperText ? messageId : undefined);

  return (
    <FieldFrame id={id} label={label} error={error} helperText={helperText} isLoading={isLoading} messageId={messageId}>
      <input
        id={id}
        className={cn(controlBase, "h-11 px-3", controlState(error), className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldFrame>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement> & FieldStateProps) {
  return <Input type="search" inputMode="search" {...props} />;
}

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement> & FieldStateProps) {
  return <Input type="tel" inputMode="tel" autoComplete="tel" {...props} />;
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement> & FieldStateProps) {
  return <Input type="text" inputMode="numeric" {...props} />;
}

export function Textarea({
  className,
  error,
  helperText,
  isLoading,
  label,
  id: providedId,
  ["aria-describedby"]: ariaDescribedBy,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldStateProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = `${id}-message`;
  const describedBy = mergeDescribedBy(ariaDescribedBy, error || helperText ? messageId : undefined);

  return (
    <FieldFrame id={id} label={label} error={error} helperText={helperText} isLoading={isLoading} messageId={messageId}>
      <textarea
        id={id}
        className={cn(controlBase, "min-h-28 px-3 py-3", controlState(error), className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldFrame>
  );
}

export function Select({
  className,
  error,
  helperText,
  isLoading,
  label,
  id: providedId,
  ["aria-describedby"]: ariaDescribedBy,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldStateProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = `${id}-message`;
  const describedBy = mergeDescribedBy(ariaDescribedBy, error || helperText ? messageId : undefined);

  return (
    <FieldFrame id={id} label={label} error={error} helperText={helperText} isLoading={isLoading} messageId={messageId}>
      <select
        id={id}
        className={cn(controlBase, "h-11 px-3", controlState(error), className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldFrame>
  );
}

export function Checkbox({
  label,
  helperText,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldStateProps & { label?: ReactNode }) {
  return (
    <label className={cn("flex min-h-11 items-start gap-2 text-base font-semibold text-oto-muted", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-oto-border text-oto-accent focus:ring-2 focus:ring-oto-accent/15"
        {...props}
      />
      <span className="grid gap-1">
        {label ? <span>{label}</span> : null}
        <FieldMessage error={error} helperText={helperText} />
      </span>
    </label>
  );
}

export function Radio({
  label,
  helperText,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldStateProps & { label?: ReactNode }) {
  return (
    <label className={cn("flex min-h-11 items-start gap-2 text-base font-semibold text-oto-muted", className)}>
      <input
        type="radio"
        className="mt-0.5 h-4 w-4 border-oto-border text-oto-accent focus:ring-2 focus:ring-oto-accent/15"
        {...props}
      />
      <span className="grid gap-1">
        {label ? <span>{label}</span> : null}
        <FieldMessage error={error} helperText={helperText} />
      </span>
    </label>
  );
}

export function Toggle({
  checked,
  label,
  helperText,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldStateProps & { label?: ReactNode }) {
  return (
    <label className={cn("flex min-h-11 items-center gap-3 text-base font-semibold text-oto-text", className)}>
      <input type="checkbox" className="sr-only" checked={checked} aria-invalid={Boolean(error) || undefined} {...props} />
      <span className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-oto-accent" : "bg-oto-border")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition", checked ? "left-5" : "left-0.5")} />
      </span>
      <span className="grid gap-1">
        {label ? <span>{label}</span> : null}
        <FieldMessage error={error} helperText={helperText} />
      </span>
    </label>
  );
}

function FieldFrame({
  children,
  id,
  label,
  error,
  helperText,
  isLoading,
  messageId
}: {
  children: ReactNode;
  id: string;
  label?: ReactNode;
  error?: string | null;
  helperText?: string | null;
  isLoading?: boolean;
  messageId: string;
}) {
  return (
    <div className="relative grid gap-1">
      {label ? <label htmlFor={id} className="text-label text-oto-text">{label}</label> : null}
      {children}
      {isLoading ? <span className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-oto-muted border-r-transparent" /> : null}
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </div>
  );
}

function FieldMessage({ error, helperText, id }: { error?: string | null; helperText?: string | null; id?: string }) {
  if (error) return <span id={id} className="text-error text-oto-danger" role="alert">{error}</span>;
  if (helperText) return <span id={id} className="text-helper text-oto-muted">{helperText}</span>;
  return null;
}

function mergeDescribedBy(existing: string | undefined, messageId: string | undefined) {
  return [existing, messageId].filter(Boolean).join(" ") || undefined;
}
