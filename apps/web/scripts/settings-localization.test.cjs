const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8"),source=read("src","app","settings","_components","settings-copy.ts"),m={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);
const {getSettingsCopy}=m.exports,ru=getSettingsCopy("ru"),kk=getSettingsCopy("kk"),en=getSettingsCopy("en"),zh=getSettingsCopy("zh-CN");
for(const [locale,copy] of Object.entries({ru,kk,en,"zh-CN":zh})){assert.deepEqual(Object.keys(copy).sort(),Object.keys(ru).sort(),`${locale} settings key shape`);if(locale!=="ru")assert.notEqual(copy,ru,`${locale} direct settings copy`);assert.doesNotMatch(JSON.stringify(copy),/TODO|TBD|\?\?\?|\uFFFD|□/i)}
assert.equal(getSettingsCopy("de"),ru);assert.equal(getSettingsCopy("tr"),ru);assert.match(JSON.stringify(zh),/[\u4E00-\u9FFF]/);assert.doesNotMatch(JSON.stringify(zh),/關|體|臺/);
for(const file of [["src","app","settings","_components","SettingsClient.tsx"],["src","app","settings","page.tsx"]])assert.doesNotMatch(read(...file),/dictionary\.(profile|auth|errors|navigation)/,`${file.join("/")} must not use historical global client copy`);
console.log("Settings four-language localization tests passed.");
