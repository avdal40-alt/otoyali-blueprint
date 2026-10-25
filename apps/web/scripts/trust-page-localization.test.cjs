const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","i18n","trust-page-copy.ts"),"utf8").replace(/import[^;]+;\r?\n/,""),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const get=mod.exports.getTrustPageCopy;
for(const locale of ["ru","kk","en","zh-CN"]){const copy=get(locale);assert.match(copy.title,/\S/);assert.equal(copy.sections.length,7);for(const section of copy.sections){assert.match(section.title,/\S/);assert.match(section.body,/\S/);}}
assert.deepEqual(get("tr"),get("ru"));assert.match(get("zh-CN").description,/[\u4E00-\u9FFF]/);assert.doesNotMatch(source,/TODO|TBD|\?\?\?|\uFFFD|Jolcar|Turkey|T\u00fcrkiye|TRAMER/i);console.log("Trust page four-language localization tests passed.");
