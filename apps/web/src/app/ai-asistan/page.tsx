import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getAiAssistantPageCopy } from "@/i18n/ai-assistant-page-copy";
import { getRequestLocale } from "@/i18n/server";

export const metadata = buildSeoMetadata({
  title: "AI-ассистент Jolmod",
  description: "Помощь с поиском автомобиля, сравнением объявлений, оценкой цены и подготовкой описания появится скоро.",
  path: "/ai-asistan"
});

export default async function AiAssistantPage() {
  const copy = getAiAssistantPageCopy(await getRequestLocale());
  return (
    <FutureVerticalPage
      title={copy.title}
      description={copy.description}
      ctaLabel={copy.ctaLabel}
      sections={copy.sections}
    />
  );
}
