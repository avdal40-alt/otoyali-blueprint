import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getSupabaseHealthReport } from "@/lib/debug/supabase-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupabaseDebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const report = await getSupabaseHealthReport();

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Supabase diagnostics" eyebrow="Development only" />
        <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <h2 className="text-lg font-black text-oto-text">Environment</h2>
          <dl className="mt-3 grid gap-2 text-sm text-oto-muted md:grid-cols-2">
            <div>URL present: {report.env.hasUrl ? "yes" : "no"}</div>
            <div>Anon key present: {report.env.hasAnonKey ? "yes" : "no"}</div>
            <div>Supabase domain: {report.env.urlDomain ?? "missing"}</div>
            <div>Key type: {report.env.keyType}</div>
          </dl>
        </section>

        <section className="mt-5 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <h2 className="text-lg font-black text-oto-text">Public view checks</h2>
          <div className="mt-3 grid gap-3">
            {report.checks.map((check) => (
              <div key={check.queryName} className="rounded-md bg-oto-surface p-3 text-sm">
                <div className="font-bold text-oto-text">{check.queryName}</div>
                <div className="text-oto-muted">success: {check.success ? "yes" : "no"}</div>
                <div className="text-oto-muted">row count: {check.rowCount}</div>
                {check.errorMessage ? <div className="text-oto-danger">error: {check.errorMessage}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <h2 className="text-lg font-black text-oto-text">Sample ff_home_listings rows</h2>
          <pre className="mt-3 overflow-x-auto rounded-md bg-oto-text p-4 text-xs text-white">
            {JSON.stringify(report.sampleHomeListings, null, 2)}
          </pre>
        </section>
      </PageContainer>
    </>
  );
}
