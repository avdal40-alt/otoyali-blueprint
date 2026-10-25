const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8"),source=read("src","i18n","vertical-page-copy.ts"),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const {getVerticalPageValue}=mod.exports;
for(const locale of ["ru","kk","en","zh-CN"]){for(const key of ["verticals.cars.label","verticals.commercial.description","verticals.status.coming_soon","verticals.attributes.make","verticals.landing.related","futureVerticals.disclaimer"])assert.match(getVerticalPageValue(locale,key),/\S/,`${locale} ${key}`);}
assert.equal(getVerticalPageValue("tr","verticals.cars.label"),getVerticalPageValue("ru","verticals.cars.label"));
assert.match(getVerticalPageValue("zh-CN","verticals.cars.description"),/[\u4E00-\u9FFF]/);
assert.equal(getVerticalPageValue("ru","services.hero.title"),undefined);
assert.doesNotMatch(source,/dictionaries\/(tr|en)|getDictionary|Turkey|Türkiye/i);
console.log("Marketplace vertical four-language localization tests passed.");
