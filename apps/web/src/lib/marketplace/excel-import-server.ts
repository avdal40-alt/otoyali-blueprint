import "server-only";

import { createHash } from "node:crypto";
import { Open, type File } from "unzipper-esm";
import { readSheet } from "read-excel-file/node";

export const EXCEL_IMPORT_LIMITS = {
  maxUploadBytes: 5 * 1024 * 1024,
  maxZipEntries: 200,
  maxExpandedBytes: 25 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxWorksheets: 10,
  maxRows: 500,
  maxColumns: 16,
  maxCellCharacters: 8_000
} as const;

export type ExcelImportRow = Record<string, string> & { operation: "upsert" | "archive"; external_listing_id: string };

const allowedHeaders = new Set(["operation", "external_listing_id", "make_slug", "model_slug", "year", "mileage_km", "fuel_type", "transmission", "title", "description", "price_amount", "city"]);
const requiredUpsertHeaders = ["external_listing_id", "make_slug", "model_slug", "year", "mileage_km", "fuel_type", "transmission", "title", "price_amount", "city"];

export async function parseBoundedXlsx(bytes: Buffer, filename: string): Promise<{ sourceSha256: string; rows: ExcelImportRow[] }> {
  if (!/\.xlsx$/i.test(filename) || /\.(?:xls|xlsm)$/i.test(filename) || bytes.byteLength === 0 || bytes.byteLength > EXCEL_IMPORT_LIMITS.maxUploadBytes) throw new ExcelImportError("unsupported_file");
  let directory;
  try { directory = await Open.buffer(bytes); } catch { throw new ExcelImportError("malformed_workbook"); }
  const files = directory.files.filter((file) => file.type === "File");
  if (files.length === 0 || files.length > EXCEL_IMPORT_LIMITS.maxZipEntries) throw new ExcelImportError("archive_entry_limit");
  let expanded = 0;
  for (const file of files) validateArchiveEntry(file, () => { expanded += file.uncompressedSize; return expanded; });
  const names = new Set(files.map((file) => file.path));
  if (names.has("xl/vbaProject.bin") || !names.has("[Content_Types].xml") || !names.has("xl/workbook.xml")) throw new ExcelImportError("unsupported_workbook");
  const worksheets = files.filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(file.path));
  if (worksheets.length === 0 || worksheets.length > EXCEL_IMPORT_LIMITS.maxWorksheets) throw new ExcelImportError("worksheet_limit");
  let sheet: unknown[][];
  try { sheet = await readSheet(bytes, 1) as unknown[][]; } catch { throw new ExcelImportError("malformed_workbook"); }
  if (sheet.length < 2 || sheet.length - 1 > EXCEL_IMPORT_LIMITS.maxRows) throw new ExcelImportError("row_limit");
  const headers = normalizeHeaders(sheet[0]);
  const rows = sheet.slice(1).map((values) => normalizeRow(values, headers));
  return { sourceSha256: createHash("sha256").update(bytes).digest("hex"), rows };
}

function validateArchiveEntry(file: File, total: () => number) {
  if (!file.path || file.path.includes("\\") || file.path.startsWith("/") || file.path.split("/").includes("..") || (file.flags & 1) !== 0) throw new ExcelImportError("unsafe_archive");
  if (!Number.isSafeInteger(file.uncompressedSize) || !Number.isSafeInteger(file.compressedSize) || file.uncompressedSize < 0 || file.compressedSize < 0 || total() > EXCEL_IMPORT_LIMITS.maxExpandedBytes) throw new ExcelImportError("expanded_size_limit");
  if (file.uncompressedSize > 0 && (file.compressedSize === 0 || file.uncompressedSize / file.compressedSize > EXCEL_IMPORT_LIMITS.maxCompressionRatio)) throw new ExcelImportError("compression_ratio_limit");
}

function normalizeHeaders(row: unknown[]) {
  if (row.length > EXCEL_IMPORT_LIMITS.maxColumns) throw new ExcelImportError("column_limit");
  const headers = row.map((value) => typeof value === "string" ? value.trim().toLowerCase() : "");
  if (headers.length === 0 || new Set(headers).size !== headers.length || headers.some((header) => !allowedHeaders.has(header))) throw new ExcelImportError("invalid_headers");
  return headers;
}

function normalizeRow(values: unknown[], headers: string[]): ExcelImportRow {
  if (values.length > EXCEL_IMPORT_LIMITS.maxColumns) throw new ExcelImportError("column_limit");
  const row: Record<string, string> = {};
  values.forEach((value, index) => {
    if (index >= headers.length || value === null || value === undefined) return;
    if (typeof value !== "string" && typeof value !== "number") throw new ExcelImportError("invalid_cell_value");
    const normalized = String(value).trim();
    if (normalized.length > EXCEL_IMPORT_LIMITS.maxCellCharacters) throw new ExcelImportError("cell_length_limit");
    row[headers[index]] = normalized;
  });
  const operation = (row.operation || "upsert").toLowerCase();
  if (operation !== "upsert" && operation !== "archive") throw new ExcelImportError("invalid_operation");
  if (!row.external_listing_id || row.external_listing_id.length > 128 || (operation === "upsert" && requiredUpsertHeaders.some((header) => !row[header]))) throw new ExcelImportError("missing_required_field");
  return { ...row, operation, external_listing_id: row.external_listing_id } as ExcelImportRow;
}

export class ExcelImportError extends Error { constructor(public readonly code: string) { super(code); } }
