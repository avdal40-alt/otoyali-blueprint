const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","i18n","marketplace-seo-copy.ts"),"utf8"),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);const get=mod.exports.getMarketplaceSeoCopy;
for(const locale of["ru","kk","en","zh-CN"]){const copy=get(locale);for(const value of Object.values(copy))assert.match(value,/\S/);}
assert.deepEqual(get("tr"),get("ru"));assert.match(get("zh-CN").safeBody,/[\u4E00-\u9FFF]/);assert.doesNotMatch(source,/TODO|TBD|\?\?\?|\uFFFD|Jolcar|Turkey|T\u00fcrkiye/i);console.log("Marketplace SEO four-language localization tests passed.");
