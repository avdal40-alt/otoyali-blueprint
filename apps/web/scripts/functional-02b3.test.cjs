const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.resolve(__dirname,'../../../supabase/migrations/20260912153002_functional_02b3_private_vin_foundation.sql'),'utf8');
for(const s of ['CREATE TABLE vehicle.private_vins','normalized_vin CHAR(17)','vin_fingerprint BYTEA','ENABLE ROW LEVEL SECURITY','submit_own_vin','review_required','regexp_replace','^[A-HJ-NPR-Z0-9]{17}$','REVOKE ALL ON FUNCTION','GRANT EXECUTE ON FUNCTION'])assert.ok(sql.includes(s),s);
assert.doesNotMatch(sql,/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
console.log('FUNCTIONAL-02B3 VIN foundation contract passed');
