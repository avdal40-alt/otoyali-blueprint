import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getMakes, getModels } from "@/lib/queries/makes";
import { SellWizard } from "./_components/SellWizard";

export default async function SellPage() {
  const [makesResult, modelsResult] = await Promise.all([getMakes(), getModels()]);

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <SectionHeader title="Ilan yayinla" eyebrow="Sat" />
        <SellWizard makes={makesResult.data} models={modelsResult.data} />
      </PageContainer>
    </>
  );
}
