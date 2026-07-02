import { ButtonLink } from "./Button";

export function EmptyState({
  title,
  body,
  href,
  action
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-oto border border-dashed border-oto-border bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-oto-surface text-oto-blue">
        <span className="text-xl font-bold">O</span>
      </div>
      <h3 className="text-lg font-bold text-oto-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-oto-muted">{body}</p>
      {href && action ? (
        <ButtonLink href={href} className="mt-5">
          {action}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Yukleniyor" }: { label?: string }) {
  return (
    <div className="rounded-oto border border-oto-border bg-white p-8 text-center text-sm font-semibold text-oto-muted">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-oto border border-red-100 bg-red-50 p-5 text-sm text-oto-danger">
      {message}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-oto border border-oto-border bg-white p-3">
      <div className="aspect-[16/10] rounded-md bg-oto-surface" />
      <div className="mt-4 h-4 w-3/4 rounded bg-oto-surface" />
      <div className="mt-3 h-5 w-1/2 rounded bg-oto-surface" />
      <div className="mt-3 h-3 w-full rounded bg-oto-surface" />
    </div>
  );
}
