import { LegalPage } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";
import { getTrustPageCopy } from "@/i18n/trust-page-copy";

export const metadata = buildSeoMetadata({
  title: "Центр доверия Jolmod",
  description: "Прозрачное описание подхода Jolmod к безопасности и текущих ограничений.",
  path: "/trust"
});

export default async function TrustPage() {
  const locale = await getRequestLocale();
  const copy = getTrustPageCopy(locale);

  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      sections={copy.sections}
      actions={[
        { href: "/listing-rules", label: copy.listingRules },
        { href: "/moderation-policy", label: copy.moderationPolicy }
      ]}
      disclaimer={copy.disclaimer}
    />
  );
}
