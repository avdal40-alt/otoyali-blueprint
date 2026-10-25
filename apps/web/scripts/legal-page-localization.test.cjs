const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","i18n","legal-page-copy.ts"),"utf8"),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const get=mod.exports.getLegalPageCopy;
for(const locale of ["ru","kk","en","zh-CN"]){const copy=get(locale);assert.match(copy.note,/\S/);assert.match(copy.defaultDisclaimer,/\S/);}
assert.equal(get("tr").note,get("ru").note);assert.equal(get(undefined).defaultDisclaimer,get("ru").defaultDisclaimer);assert.match(get("zh-CN").defaultDisclaimer,/[\u4E00-\u9FFF]/);assert.doesNotMatch(source,/TODO|TBD|\?\?\?|\uFFFD|Turkey|T\u00fcrkiye/i);
console.log("Legal page four-language localization tests passed.");
