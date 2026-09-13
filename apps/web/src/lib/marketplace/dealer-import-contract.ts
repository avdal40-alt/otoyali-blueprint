export const DEALER_IMPORT_SOURCES = ["excel"] as const;
export const DEALER_IMPORT_OPERATIONS = ["upsert", "archive"] as const;
export const DEALER_IMPORT_ROW_STATUSES = ["pending", "valid", "invalid", "applied", "archived"] as const;

export type DealerImportSource = typeof DEALER_IMPORT_SOURCES[number];
export type DealerImportOperation = typeof DEALER_IMPORT_OPERATIONS[number];
export type DealerImportRowStatus = typeof DEALER_IMPORT_ROW_STATUSES[number];

export type DealerImportIssue = {
  fieldKey?: string | null;
  errorCode: string;
};

export type DealerImportRowReport = {
  rowNumber: number;
  operation: DealerImportOperation;
  externalListingId?: string | null;
  status: DealerImportRowStatus;
  issues: DealerImportIssue[];
};

// Spreadsheet bytes and raw cell values are intentionally excluded from the
// application contract. A future server-only importer owns parsing and writes.
export function normalizeDealerExternalListingId(value: string) {
  return value.trim();
}
