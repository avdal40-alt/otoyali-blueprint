const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8");
function load(...parts){const m={exports:{}};const output=ts.transpileModule(read(...parts),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function("exports","module",output)(m.exports,m);return m.exports}
const contracts=[
  {name:"assistant",file:["src","features","ai","components","assistant-ui-copy.ts"],getter:"getAssistantUiCopy"},
  {name:"sell assistant",file:["src","app","sell","_components","sell-assistant-copy.ts"],getter:"getSellAssistantCopy"},
  {name:"description assistant",file:["src","app","sell","_components","listing-description-assistant-copy.ts"],getter:"getListingDescriptionAssistantCopy"},
  {name:"trust status",file:["src","components","vehicle","trust-status-copy.ts"],getter:"getTrustStatusCopy"},
  {name:"price intelligence",file:["src","components","vehicle","price-intelligence-copy.ts"],getter:"getPriceIntelligenceCopy"}
];
for(const contract of contracts){const get=load(...contract.file)[contract.getter],ru=get("ru"),kk=get("kk"),en=get("en"),zh=get("zh-CN");for(const [locale,copy] of Object.entries({ru,kk,en,"zh-CN":zh})){assert.deepEqual(Object.keys(copy).sort(),Object.keys(ru).sort(),`${contract.name}: ${locale} key shape`);if(locale!=="ru")assert.notEqual(copy,ru,`${contract.name}: ${locale} direct copy`);assert.doesNotMatch(JSON.stringify(copy),/TODO|TBD|\?\?\?|\uFFFD|□/i,`${contract.name}: ${locale} placeholders`)}assert.equal(get("de"),ru,`${contract.name}: unsupported locale falls back to Russian`);assert.equal(get("tr"),ru,`${contract.name}: Turkish is never Jolmod fallback`);assert.match(JSON.stringify(zh),/[\u4E00-\u9FFF]/,`${contract.name}: Simplified Chinese`);assert.doesNotMatch(JSON.stringify(zh),/關|體|臺/,`${contract.name}: no Traditional Chinese placeholder`)}
for(const file of [["src","features","ai","components","AssistantRoot.tsx"],["src","features","ai","components","AssistantPanel.tsx"],["src","app","sell","_components","SellAssistant.tsx"],["src","app","sell","_components","ListingDescriptionAssistant.tsx"],["src","components","vehicle","TrustStatusCard.tsx"],["src","components","vehicle","PriceIntelligenceCard.tsx"]]){const source=read(...file);assert.doesNotMatch(source,/dictionary\.ai/,`${file.join("/")} must not read historical global AI copy`)}
console.log("Active AI client four-language localization tests passed.");
