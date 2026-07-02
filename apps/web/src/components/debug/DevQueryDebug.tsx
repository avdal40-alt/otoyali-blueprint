import type { QueryResult } from "@/lib/queries/listings";

type DebugItem = Pick<QueryResult<unknown>, "queryName" | "count" | "error">;

export function DevQueryDebug({ items }: { items: DebugItem[] }) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <details className="mt-4 rounded-oto border border-dashed border-oto-border bg-oto-surface p-4 text-xs text-oto-muted">
      <summary className="cursor-pointer font-bold text-oto-text">Supabase debug</summary>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.queryName} className="rounded-md bg-white p-3">
            <div className="font-bold text-oto-text">{item.queryName}</div>
            <div>row count: {item.count}</div>
            {item.error ? <div className="text-oto-danger">error: {item.error}</div> : <div>error: none</div>}
          </div>
        ))}
      </div>
    </details>
  );
}
