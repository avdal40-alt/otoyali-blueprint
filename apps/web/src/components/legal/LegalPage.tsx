import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";

export type LegalSection = {
  title: string;
  body?: string;
  items?: string[];
};

export type LegalAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "orange" | "ghost" | "danger";
};

const DEFAULT_DISCLAIMER =
  "Bu sayfa MVP aşaması için hazırlanmış genel bilgilendirme metnidir. Yayın öncesinde profesyonel hukuk danışmanlığı ile güncellenmelidir.";

export function LegalPage({
  eyebrow = "OTOYALI",
  title,
  description,
  sections,
  actions = [],
  disclaimer = DEFAULT_DISCLAIMER
}: {
  eyebrow?: string;
  title: string;
  description: string;
  sections: LegalSection[];
  actions?: LegalAction[];
  disclaimer?: string;
}) {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-5xl">
        <div className="py-6 md:py-10">
          <p className="text-xs font-bold uppercase tracking-wide text-oto-blue">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-oto-text md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-oto-muted md:text-lg">{description}</p>
          {actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {actions.map((action) => (
                <ButtonLink key={action.href} href={action.href} variant={action.variant ?? "secondary"}>
                  {action.label}
                </ButtonLink>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
              <h2 className="text-lg font-black text-oto-text">{section.title}</h2>
              {section.body ? <p className="mt-3 text-sm leading-7 text-oto-muted">{section.body}</p> : null}
              {section.items ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-oto-muted">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-oto-blue" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-oto border border-oto-border bg-oto-surface p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-oto-text">Not</h2>
          <p className="mt-2 text-sm leading-7 text-oto-muted">{disclaimer}</p>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
