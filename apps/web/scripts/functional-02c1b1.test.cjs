const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const s=fs.readFileSync(path.resolve(__dirname,'../../../supabase/migrations/20260912153003_functional_02c1b1_listing_search_projection_schema.sql'),'utf8');
for(const x of ['CREATE TABLE marketplace.listing_search_documents','ENABLE ROW LEVEL SECURITY','GRANT SELECT ON marketplace.listing_search_documents TO anon, authenticated','listing_search_documents_newest_idx'])assert.ok(s.includes(x));
for(const x of ['phone','email','vin','fingerprint','seller_id','moderation_note','rejection_reason'])assert.ok(!s.toLowerCase().includes(x));
console.log('FUNCTIONAL-02C1B1 projection schema contract passed');
