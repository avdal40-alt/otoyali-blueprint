const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),file=path.join(root,"src","lib","saved-search","saved-search-copy.ts"),source=fs.readFileSync(file,"utf8");
assert.equal(source.includes("�"),false); for(const name of ["ru","kk","en","zhCN"])assert.match(source,new RegExp(`const ${name}:SavedSearchCopy=\\{`));
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,loaded={exports:{}};
new Function("exports","module","require",output)(loaded.exports,loaded,(request)=>{if(request==="@/i18n/config")return{normalizeLocale:(locale)=>locale?.toLowerCase().startsWith("en")?"en":"tr"};throw new Error(request);});
const {getSavedSearchCopy}=loaded.exports,tr=getSavedSearchCopy("tr"),keys=["title","hint","loading","unavailable","actionFailed","retry","loginTitle","loginBody","loginAction","emptyTitle","emptyBody","legacy","alertsEnabled","alertsDisabled","alertsUnavailable","alertToggle","deleting","delete","save","saving","saved","saveFailed","configurationUnavailable"];
for(const locale of ["ru","kk","en","zh-CN"]){const copy=getSavedSearchCopy(locale);assert.notEqual(copy,tr);for(const key of keys)assert.equal(typeof copy[key],"string");assert.doesNotMatch(JSON.stringify(copy),/TODO|\?\?\?/i);}
const zh=JSON.stringify(getSavedSearchCopy("zh-CN"));assert.match(zh,/[\u4e00-\u9fff]/);assert.doesNotMatch(zh,/[�□]|\?\?\?|TODO/i);
assert.equal(getSavedSearchCopy("unsupported").title,getSavedSearchCopy("ru").title,"Russian must be the Jolmod fallback");
for(const client of [path.join(root,"src","app","profile","saved-searches","_components","SavedSearchesClient.tsx"),path.join(root,"src","components","search","SavedSearchButton.tsx")])assert.match(fs.readFileSync(client,"utf8"),/getSavedSearchCopy\(locale\)/);
console.log("Saved-search four-language localization tests passed.");
