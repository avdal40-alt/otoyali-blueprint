const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","i18n","about-page-copy.ts"),"utf8"),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const get=mod.exports.getAboutPageCopy;
for(const locale of ["ru","kk","en","zh-CN"]){const copy=get(locale);assert.equal(copy.eyebrow,"Jolmod");assert.match(copy.title,/\S/);assert.match(copy.description,/\S/);assert.equal(copy.pillars.length,3);for(const pillar of copy.pillars){assert.match(pillar.title,/\S/);assert.match(pillar.body,/\S/);}}
assert.deepEqual(get("tr"),get("ru"));assert.match(get("zh-CN").description,/[\u4E00-\u9FFF]/);assert.doesNotMatch(source,/TODO|TBD|\?\?\?|\uFFFD|Jolcar|Turkey|T\u00fcrkiye/i);console.log("About page four-language localization tests passed.");
