import { getJolmodLegalDocument, type JolmodLegalDocumentKey } from "@/i18n/jolmod-legal-documents";
import { getRequestLocale } from "@/i18n/server";
import { LegalPage } from "./LegalPage";

export async function JolmodLegalDocumentPage({ documentKey }: { documentKey: JolmodLegalDocumentKey }) {
  const locale = await getRequestLocale();
  const document = getJolmodLegalDocument(documentKey, locale);
  return <LegalPage title={document.title} description={document.description} sections={[...document.sections]} actions={document.actions ? [...document.actions] : []} />;
}
