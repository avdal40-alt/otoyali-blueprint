import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ExcelImportError, EXCEL_IMPORT_LIMITS, parseBoundedXlsx } from "@/lib/marketplace/excel-import-server";
import { releaseHeaders } from "@/lib/release/compatibility";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > EXCEL_IMPORT_LIMITS.maxUploadBytes) return NextResponse.json({ error: "Превышен допустимый размер файла." }, { status: 413 });
  const filename = request.headers.get("x-yolmod-filename") ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(); const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Импорт недоступен." }, { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { ...releaseHeaders(), Authorization: authorization } } });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Сеанс не подтверждён." }, { status: 401 });
  try {
    const parsed = await parseBoundedXlsx(Buffer.from(await request.arrayBuffer()), filename);
    const { data, error } = await supabase.rpc("apply_own_verified_galeri_excel_import", { p_source_sha256: parsed.sourceSha256, p_rows: parsed.rows });
    if (error) return NextResponse.json({ error: error.code === "OT403" ? "Требуется подтверждённый дилерский аккаунт." : "Не удалось завершить импорт." }, { status: error.code === "OT403" ? 403 : 422 });
    return NextResponse.json({ data: (data ?? []).map((row: { row_number: number; status: string; external_listing_id: string | null; error_code: string | null }) => ({ rowNumber: row.row_number, status: row.status, externalListingId: row.external_listing_id, errorCode: row.error_code })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ExcelImportError ? "Недопустимый файл Excel." : "Не удалось завершить импорт." }, { status: 422 });
  }
}
