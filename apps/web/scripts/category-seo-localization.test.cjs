const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","i18n","category-seo-copy.ts"),"utf8"),mod={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const get=mod.exports.getCategorySeoCopy,kinds=["used","new","electric","automatic","suv"];
for(const locale of["ru","kk","en","zh-CN"]){const copy=get(locale);for(const kind of kinds)for(const value of Object.values(copy[kind]))assert.match(value,/\S/);}
assert.deepEqual(get("tr"),get("ru"));assert.match(get("zh-CN").used.description,/[\u4E00-\u9FFF]/);assert.match(get("ru").used.description,/Казахстан/);assert.match(get("kk").used.description,/Қазақстан/);assert.match(get("en").used.description,/Kazakhstan/);assert.match(get("zh-CN").used.description,/哈萨克斯坦/);assert.doesNotMatch(source,/TODO|TBD|\?\?\?|\uFFFD|Jolcar|Turkey|T\u00fcrkiye/i);console.log("Category SEO four-language localization tests passed.");
