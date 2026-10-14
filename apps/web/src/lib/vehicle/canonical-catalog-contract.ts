export const CANONICAL_CATALOG_IMPORT_FORMAT = "jolcar-catalog/v1" as const;

export const CANONICAL_CATALOG_ENTITY_TYPES = [
  "make",
  "model",
  "generation",
  "variant",
  "modification",
  "specification",
] as const;

export type CanonicalCatalogEntityType = (typeof CANONICAL_CATALOG_ENTITY_TYPES)[number];

export type CanonicalCatalogImportRecord = {
  entityType: CanonicalCatalogEntityType;
  sourceKey: string;
  parentSourceKey?: string;
  name: string;
  slug: string;
  productionYearStart?: number;
  productionYearEnd?: number;
};

export type CanonicalCatalogImportDataset = {
  format: typeof CANONICAL_CATALOG_IMPORT_FORMAT;
  sourceName: string;
  sourceVersion: string;
  contentSha256: string;
  records: readonly CanonicalCatalogImportRecord[];
};

export type CanonicalCatalogImportIssue = {
  recordIndex: number;
  code: "duplicate_source_key" | "invalid_hash" | "invalid_name" | "invalid_slug" | "invalid_year_range" | "missing_parent";
  message: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^[a-f0-9]{64}$/i;

export function catalogImportIdentity(dataset: Pick<CanonicalCatalogImportDataset, "sourceName" | "sourceVersion" | "contentSha256">) {
  return `${dataset.sourceName.trim()}@${dataset.sourceVersion.trim()}#${dataset.contentSha256.toLowerCase()}`;
}

export function validateCanonicalCatalogImport(dataset: CanonicalCatalogImportDataset): CanonicalCatalogImportIssue[] {
  const issues: CanonicalCatalogImportIssue[] = [];
  const seen = new Set<string>();

  if (!sha256Pattern.test(dataset.contentSha256)) {
    issues.push({ recordIndex: -1, code: "invalid_hash", message: "contentSha256 must be a SHA-256 hex digest." });
  }

  dataset.records.forEach((record, recordIndex) => {
    const key = `${record.entityType}:${record.sourceKey.trim()}`;
    if (!record.sourceKey.trim() || seen.has(key)) {
      issues.push({ recordIndex, code: "duplicate_source_key", message: "Each entity type/source key pair must be unique within a dataset." });
    }
    seen.add(key);
    if (!record.name.trim()) issues.push({ recordIndex, code: "invalid_name", message: "Catalog names must not be empty." });
    if (!slugPattern.test(record.slug)) issues.push({ recordIndex, code: "invalid_slug", message: "Catalog slugs must be canonical lowercase slugs." });
    if ((record.productionYearStart === undefined) !== (record.productionYearEnd === undefined) || (record.productionYearStart !== undefined && (record.productionYearStart < 1886 || record.productionYearEnd! < record.productionYearStart))) {
      issues.push({ recordIndex, code: "invalid_year_range", message: "Production years must be complete and ordered from 1886 onward." });
    }
    if (["model", "generation", "variant", "modification", "specification"].includes(record.entityType) && !record.parentSourceKey?.trim()) {
      issues.push({ recordIndex, code: "missing_parent", message: "Non-root catalog records require a parent source key." });
    }
  });

  return issues;
}
