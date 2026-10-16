const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { importSql, loadSnapshot, remoteOptions } = require("./jlc-wikidata-catalog-bootstrap.cjs");

const script = path.join(__dirname, "jlc-wikidata-catalog-bootstrap.cjs");
const ref = "dmjifqbvbjewyigdsuco";
const secret = "catalog-test-secret-must-not-appear";
const { JOLCAR_CATALOG_DATABASE_URL: ignoredCatalogDatabaseUrl, ...testEnvironment } = process.env;
const run = (args, environment = {}) => {
  try {
    execFileSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...testEnvironment, ...environment } });
    return "";
  } catch (error) {
    return `${error.stdout || ""}${error.stderr || ""}`;
  }
};

assert.throws(() => remoteOptions([], {}), /requires --import-remote/);
assert.throws(() => remoteOptions(["--import-remote"], {}), /expected-project-ref/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], {}), /JOLCAR_CATALOG_DATABASE_URL/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres:${secret}@db.otherprojectref00000.supabase.co/postgres?sslmode=require` }), /does not match/);

const poolerHost = "aws-1-ap-south-1.pooler.supabase.com";
const poolerUrl = `postgresql://postgres.${ref}:${secret}@${poolerHost}:5432/postgres?sslmode=verify-full`;
assert.deepEqual(remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: poolerUrl }).targetMode, "session_pooler");
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.uivazzvxelptjmbbfvir:${secret}@${poolerHost}:5432/postgres?sslmode=verify-full` }), /pooler username/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", "uivazzvxelptjmbbfvir"], { JOLCAR_CATALOG_DATABASE_URL: poolerUrl }), /pooler username/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.${ref}:${secret}@pooler.supabase.com.attacker.invalid:5432/postgres?sslmode=verify-full` }), /does not match/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.${ref}:${secret}@${poolerHost}:6543/postgres?sslmode=verify-full` }), /session port 5432/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.${ref}:${secret}@${poolerHost}:5432/not-postgres?sslmode=verify-full` }), /postgres database/);
assert.throws(() => remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.${ref}:${secret}@${poolerHost}:5432/postgres?sslmode=disable` }), /certificate-verifying TLS/);
assert.equal(remoteOptions(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co/postgres?sslmode=require` }).targetMode, "direct");

const missingCredentialOutput = run(["--import-remote", "--expected-project-ref", ref]);
assert.match(missingCredentialOutput, /JOLCAR_CATALOG_DATABASE_URL/);
assert.doesNotMatch(missingCredentialOutput, new RegExp(secret));
const mismatchOutput = run(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres:${secret}@db.otherprojectref00000.supabase.co/postgres?sslmode=require` });
assert.match(mismatchOutput, /does not match/);
assert.doesNotMatch(mismatchOutput, new RegExp(secret));
const poolerFailureOutput = run(["--import-remote", "--expected-project-ref", ref], { JOLCAR_CATALOG_DATABASE_URL: `postgresql://postgres.wrongprojectref000:${secret}@${poolerHost}:5432/postgres?sslmode=verify-full` });
assert.match(poolerFailureOutput, /pooler username/);
assert.doesNotMatch(poolerFailureOutput, new RegExp(secret));
assert.doesNotMatch(poolerFailureOutput, new RegExp(poolerHost));

const snapshot = loadSnapshot();
assert.equal(importSql(snapshot).sql, importSql(snapshot).sql, "canonical SQL generation must be deterministic");
assert.match(importSql(snapshot).sql, /BEGIN;/);
assert.match(importSql(snapshot).sql, /ON CONFLICT \(catalog_dataset_id, catalog_source_key\).*DO NOTHING/s);
assert.match(importSql(snapshot).sql, /COMMIT;/);
console.log("Jolcar Wikidata catalog remote bootstrap safety boundary passed");
