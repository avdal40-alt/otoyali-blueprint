const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const snapshotPath = path.join(root, "catalog", "bootstrap", "wikidata-camry-generations-2026-10-14.snapshot.json");
const rejectionPath = path.join(root, "catalog", "bootstrap", "wikidata-camry-generations-2026-10-14.rejections.json");
const approvedPackagePath = path.join(root, "catalog", "bootstrap", "approved", "wikidata-camry-generations-2026-10-14.jolcar-catalog-v1.json");
const container = "supabase_db_Otoyali-blueprint";
const remoteDatabaseUrlEnvironmentVariable = "JOLCAR_CATALOG_DATABASE_URL";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}` : JSON.stringify(value);
const snapshotPayload = (snapshot) => { const copy = structuredClone(snapshot); delete copy.contentSha256; return copy; };
const loadSnapshot = () => JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const loadApprovedPackage = () => JSON.parse(fs.readFileSync(approvedPackagePath, "utf8"));
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSnapshot(snapshot) {
  const issues = [];
  const entities = Array.isArray(snapshot.entities) ? snapshot.entities : [];
  const byKey = new Map();
  const canonicalCandidates = new Set();
  if (snapshot.format !== "jolcar-wikidata-snapshot/v1") issues.push("invalid_format");
  if (snapshot.source?.name !== "Wikidata" || snapshot.source?.license !== "CC0-1.0") issues.push("invalid_source");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(snapshot.source?.retrievedAt || "")) issues.push("invalid_retrieval_timestamp");
  if (!Array.isArray(snapshot.source?.requests) || snapshot.source.requests.some((request) => request.method !== "GET" || !String(request.endpoint).startsWith("https://"))) issues.push("invalid_request_definition");
  for (const entity of entities) {
    const compoundKey = `${entity.entityType}:${String(entity.sourceKey || "").trim()}`;
    if (!entity.sourceKey?.trim() || byKey.has(compoundKey)) issues.push(`duplicate_source_key:${compoundKey}`);
    byKey.set(compoundKey, entity);
    if (!entity.name?.trim()) issues.push(`invalid_name:${compoundKey}`);
    if (entity.entityType === "generation" && !slugPattern.test(entity.slug || "")) issues.push(`invalid_slug:${compoundKey}`);
    if ((entity.productionYearStart === undefined) !== (entity.productionYearEnd === undefined) || (entity.productionYearStart !== undefined && (!Number.isInteger(entity.productionYearStart) || !Number.isInteger(entity.productionYearEnd) || entity.productionYearStart < 1886 || entity.productionYearEnd < entity.productionYearStart || entity.productionYearEnd > 2100))) issues.push(`invalid_year_range:${compoundKey}`);
    if (entity.canonicalAnchor) {
      const candidate = `${entity.entityType}:${entity.canonicalAnchor.makeSlug || ""}:${entity.canonicalAnchor.slug || ""}`;
      if (canonicalCandidates.has(candidate)) issues.push(`duplicate_canonical_candidate:${candidate}`);
      canonicalCandidates.add(candidate);
    }
  }
  for (const entity of entities) {
    if (entity.entityType === "model") {
      if (!byKey.has(`make:${entity.parentSourceKey}`)) issues.push(`missing_parent:${entity.sourceKey}`);
      if (entity.relationship?.property !== "P176" || entity.relationship?.targetSourceKey !== entity.parentSourceKey) issues.push(`unsupported_relationship:${entity.sourceKey}`);
    }
    if (entity.entityType === "generation") {
      if (!byKey.has(`model:${entity.parentSourceKey}`)) issues.push(`missing_parent:${entity.sourceKey}`);
      if (entity.relationship?.property !== "P179" || entity.relationship?.targetSourceKey !== entity.parentSourceKey) issues.push(`wrong_model_relationship:${entity.sourceKey}`);
    }
  }
  if (sha256(stable(snapshotPayload(snapshot))) !== snapshot.contentSha256) issues.push("invalid_content_hash");
  return issues;
}

function approvedPackage(snapshot) {
  return {
    format: "jolcar-catalog/v1",
    sourceName: "wikidata",
    sourceVersion: snapshot.source.extractionVersion,
    contentSha256: snapshot.contentSha256,
    records: snapshot.entities.map((entity) => ({ entityType: entity.entityType, sourceKey: entity.sourceKey, ...(entity.parentSourceKey ? { parentSourceKey: entity.parentSourceKey } : {}), name: entity.name, slug: entity.slug || entity.canonicalAnchor.slug, ...(entity.productionYearStart === undefined ? {} : { productionYearStart: entity.productionYearStart, productionYearEnd: entity.productionYearEnd }) })),
  };
}

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const psql = (sql) => execFileSync("docker", ["exec", container, "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-F", "|", "-c", sql], { encoding: "utf8" }).trim();
const counts = () => Object.fromEntries(psql("SELECT 'makes', count(*) FROM vehicle.makes UNION ALL SELECT 'models', count(*) FROM vehicle.models UNION ALL SELECT 'generations', count(*) FROM vehicle.generations UNION ALL SELECT 'variants', count(*) FROM vehicle.variants UNION ALL SELECT 'modifications', count(*) FROM vehicle.modifications ORDER BY 1;").split(/\r?\n/).filter(Boolean).map((row) => { const [key, value] = row.split("|"); return [key, Number(value)]; }));

function importSql(snapshot) {
  const issues = validateSnapshot(snapshot);
  if (issues.length) throw new Error(`Snapshot validation failed: ${issues.join(", ")}`);
  const pkg = loadApprovedPackage();
  if (stable(pkg) !== stable(approvedPackage(snapshot))) throw new Error("Approved import package does not match the validated source snapshot.");
  const generationRecords = pkg.records.filter((record) => record.entityType === "generation");
  const make = snapshot.entities.find((entity) => entity.entityType === "make");
  const model = snapshot.entities.find((entity) => entity.entityType === "model");
  const metadata = JSON.stringify({ snapshotFormat: snapshot.format, retrievedAt: snapshot.source.retrievedAt, extractionVersion: snapshot.source.extractionVersion, sourceEntityIdentifiers: snapshot.entities.map((entity) => entity.sourceKey), requestDefinitions: snapshot.source.requests });
  const rows = generationRecords.map((record) => `(${sqlLiteral(record.sourceKey)}, ${sqlLiteral(record.name)}, ${sqlLiteral(record.slug)}, ${record.productionYearStart ?? "NULL::smallint"}, ${record.productionYearEnd ?? "NULL::smallint"})`).join(",\n");
  const sql = `
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO vehicle.catalog_datasets (source_name, source_version, content_sha256, source_url, license_reference, metadata)
VALUES ('wikidata', ${sqlLiteral(pkg.sourceVersion)}, ${sqlLiteral(pkg.contentSha256)}, 'https://www.wikidata.org/', 'https://www.wikidata.org/wiki/Wikidata:Licensing', ${sqlLiteral(metadata)}::jsonb)
ON CONFLICT (source_name, source_version) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vehicle.catalog_datasets WHERE source_name = 'wikidata' AND source_version = ${sqlLiteral(pkg.sourceVersion)} AND content_sha256 = ${sqlLiteral(pkg.contentSha256)}) THEN
    RAISE EXCEPTION 'catalog dataset identity collision';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle.makes WHERE slug = ${sqlLiteral(make.canonicalAnchor.slug)}) THEN RAISE EXCEPTION 'missing canonical make anchor'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle.models mo JOIN vehicle.makes ma ON ma.id = mo.make_id WHERE mo.slug = ${sqlLiteral(model.canonicalAnchor.slug)} AND ma.slug = ${sqlLiteral(model.canonicalAnchor.makeSlug)}) THEN RAISE EXCEPTION 'missing canonical model anchor'; END IF;
END $$;
WITH dataset AS (SELECT id FROM vehicle.catalog_datasets WHERE source_name = 'wikidata' AND source_version = ${sqlLiteral(pkg.sourceVersion)}), model AS (SELECT mo.id FROM vehicle.models mo JOIN vehicle.makes ma ON ma.id = mo.make_id WHERE mo.slug = ${sqlLiteral(model.canonicalAnchor.slug)} AND ma.slug = ${sqlLiteral(model.canonicalAnchor.makeSlug)}), records(source_key, name, slug, production_year_start, production_year_end) AS (VALUES ${rows})
INSERT INTO vehicle.generations (model_id, name, slug, production_year_start, production_year_end, catalog_origin, catalog_dataset_id, catalog_source_key)
SELECT model.id, records.name, records.slug, records.production_year_start, records.production_year_end, 'imported', dataset.id, records.source_key FROM records CROSS JOIN model CROSS JOIN dataset
ON CONFLICT (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL DO NOTHING;
DO $$ BEGIN
  IF (SELECT count(*) FROM vehicle.generations g JOIN vehicle.catalog_datasets d ON d.id = g.catalog_dataset_id WHERE d.source_name = 'wikidata' AND d.source_version = ${sqlLiteral(pkg.sourceVersion)}) <> ${generationRecords.length} THEN
    RAISE EXCEPTION 'imported generation count does not match approved package';
  END IF;
END $$;
COMMIT;`;
  return { pkg, sql };
}

function importLocal(snapshot) {
  const { pkg, sql } = importSql(snapshot);
  psql(sql);
  return { package: pkg, counts: counts() };
}

function remoteOptions(args, environment = process.env) {
  const remoteFlag = args.includes("--import-remote");
  const expectedIndex = args.indexOf("--expected-project-ref");
  const expectedProjectRef = expectedIndex === -1 ? undefined : args[expectedIndex + 1];
  if (!remoteFlag) throw new Error("Remote catalog import requires --import-remote.");
  if (!/^[a-z0-9]{20}$/i.test(expectedProjectRef || "")) throw new Error("Remote catalog import requires a valid --expected-project-ref.");
  const databaseUrl = environment[remoteDatabaseUrlEnvironmentVariable];
  if (!databaseUrl) throw new Error(`Remote catalog import requires ${remoteDatabaseUrlEnvironmentVariable} in the environment.`);
  let target;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error(`Remote catalog import requires a valid ${remoteDatabaseUrlEnvironmentVariable} value.`);
  }
  if (!/^postgres(?:ql)?:$/.test(target.protocol) || !target.username || !target.password) throw new Error(`Remote catalog import requires a credentialed PostgreSQL URL in ${remoteDatabaseUrlEnvironmentVariable}.`);
  const expectedHost = `db.${expectedProjectRef}.supabase.co`;
  if (target.hostname.toLowerCase() !== expectedHost.toLowerCase()) throw new Error("Remote catalog import target does not match --expected-project-ref.");
  if (target.searchParams.get("sslmode") !== "require") throw new Error("Remote catalog import requires sslmode=require.");
  return { connectionString: databaseUrl, expectedProjectRef, expectedHost };
}

async function remoteCounts(client) {
  const result = await client.query("SELECT 'makes' AS key, count(*)::int AS value FROM vehicle.makes UNION ALL SELECT 'models', count(*)::int FROM vehicle.models UNION ALL SELECT 'generations', count(*)::int FROM vehicle.generations UNION ALL SELECT 'variants', count(*)::int FROM vehicle.variants UNION ALL SELECT 'modifications', count(*)::int FROM vehicle.modifications ORDER BY 1;");
  return Object.fromEntries(result.rows.map((row) => [row.key, Number(row.value)]));
}

async function importRemote(snapshot, args = process.argv.slice(2), environment = process.env) {
  const options = remoteOptions(args, environment);
  let Client;
  try {
    ({ Client } = require("pg"));
  } catch {
    throw new Error("Remote catalog import requires the repository development dependency pg.");
  }
  const client = new Client({ connectionString: options.connectionString, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    // A successful read-only connection to the exact direct project host is the
    // final target check before the transactional import is allowed to write.
    await client.query("SELECT current_database()");
    const { pkg, sql } = importSql(snapshot);
    await client.query(sql);
    return { package: pkg, counts: await remoteCounts(client), target: options.expectedProjectRef };
  } catch {
    try { await client.query("ROLLBACK"); } catch { /* no transaction to roll back */ }
    throw new Error("Remote catalog import did not complete successfully.");
  } finally {
    await client.end().catch(() => undefined);
  }
}

function report(snapshot) {
  const rejected = JSON.parse(fs.readFileSync(rejectionPath, "utf8"));
  const pkg = approvedPackage(snapshot);
  const generationRecords = pkg.records.filter((record) => record.entityType === "generation");
  return { snapshotVersion: snapshot.source.extractionVersion, snapshotDate: snapshot.source.retrievedAt, sourceRecordsConsidered: rejected.sourceCandidatesConsidered, accepted: { makes: 1, models: 1, generations: generationRecords.length }, rejectedOrAmbiguous: rejected.rejections.length, rejectionCategories: Object.fromEntries(rejected.rejections.map((item) => [item.category, 0]).map(([key]) => [key, rejected.rejections.filter((item) => item.category === key).length])), coverageByMake: { Toyota: generationRecords.length }, modelsWithZeroAcceptedGenerations: [], finalLocalCounts: counts() };
}

if (require.main === module) {
  const snapshot = loadSnapshot();
  if (process.argv.includes("--validate")) console.log(JSON.stringify({ issues: validateSnapshot(snapshot), package: approvedPackage(snapshot) }, null, 2));
  else if (process.argv.includes("--import-local")) console.log(JSON.stringify(importLocal(snapshot), null, 2));
  else if (process.argv.includes("--import-remote")) importRemote(snapshot).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
  else if (process.argv.includes("--report")) console.log(JSON.stringify(report(snapshot), null, 2));
  else throw new Error("Use --validate, --import-local, --import-remote --expected-project-ref <ref>, or --report.");
}

module.exports = { approvedPackage, counts, importLocal, importRemote, importSql, loadApprovedPackage, loadSnapshot, remoteOptions, report, snapshotPayload, stable, validateSnapshot };
