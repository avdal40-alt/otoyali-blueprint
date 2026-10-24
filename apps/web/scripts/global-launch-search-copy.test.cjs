const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8");
function load(source,file){const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:file}).outputText;const module={exports:{}};new Function("exports","module","require",out)(module.exports,module,require);return module.exports;}
const source=read("src","i18n","global-launch-search-copy.ts"),{globalLaunchSearchCopy,getGlobalLaunchSearchCopy}=load(source,"search.ts"),{en}=load(read("src","i18n","dictionaries","en.ts"),"en.ts");
function flat(v){return Object.values(v).flatMap(x=>typeof x==="string"?[x]:flat(x));}
for(const locale of ["ru","kk","en","zh-CN"]){const copy=globalLaunchSearchCopy[locale];assert.deepEqual(Object.keys(copy.search).sort(),Object.keys(en.search).sort(),`${locale} search key shape`);assert.strictEqual(getGlobalLaunchSearchCopy(locale),copy);for(const value of flat(copy.search)){assert.ok(value.trim());assert.doesNotMatch(value,/\b(?:todo|tbd|lorem ipsum)\b/i);} }
assert.equal(getGlobalLaunchSearchCopy("tr"),undefined,"Turkish must not resolve as a Jolmod Search fallback");
const zh=flat(globalLaunchSearchCopy["zh-CN"].search).join(" ");assert.match(zh,/[\u4E00-\u9FFF]/);assert.doesNotMatch(zh,/[\uFFFD□]|\?{2,}|關|體|臺|\b(?:todo|tbd)\b/i);
console.log("Global launch Search-copy tests passed.");
