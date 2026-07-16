import { ButtonLink } from "./Button";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  href,
  action,
  className,
  tone = "default"
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
  className?: string;
  tone?: "default" | "search" | "favorites" | "profile" | "listings" | "video" | "admin";
}) {
  const iconLabel = tone === "video" ? "▶" : tone === "admin" ? "A" : "O";

  return (
    <div className={cn("rounded-card border border-dashed border-oto-border bg-white p-8 text-center shadow-soft", className)}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-avatar bg-oto-blue/10 text-oto-blue">
        <span className="text-xl font-black">{iconLabel}</span>
      </div>
      <h3 className="text-title text-oto-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-oto-muted">{body}</p>
      {href && action ? (
        <ButtonLink href={href} className="mt-5">
          {action}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="rounded-card border border-oto-border bg-white p-8 text-center text-body text-oto-muted shadow-soft" aria-live="polite">
      <Spinner className="mx-auto mb-3" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-oto-danger/15 bg-oto-danger/10 p-5 text-error text-oto-danger" role="alert">
      {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-5 w-5 animate-spin rounded-full border-2 border-oto-muted border-r-transparent", className)} />;
}

export function PageLoader({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card border border-oto-border bg-white text-body text-oto-muted">
      <Spinner className="mb-3" />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-oto-skeleton", className)} />;
}

export function ImagePlaceholder({ label = "Görsel hazırlanıyor", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex aspect-[4/3] items-center justify-center rounded-md bg-oto-surface text-caption text-oto-muted", className)}>
      {label}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-card border border-oto-border bg-white p-3 shadow-soft", className)}>
      <div className="aspect-[4/3] rounded-md bg-oto-skeleton" />
      <div className="mt-4 h-4 w-3/4 rounded bg-oto-skeleton" />
      <div className="mt-3 h-5 w-1/2 rounded bg-oto-skeleton" />
      <div className="mt-3 h-3 w-full rounded bg-oto-skeleton" />
    </div>
  );
}
