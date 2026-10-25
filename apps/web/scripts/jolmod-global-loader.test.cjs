const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8");
function load(source,file,deps={}){const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:file}).outputText;const module={exports:{}};new Function("exports","module","require",out)(module.exports,module,(id)=>deps[id]??require(id));return module.exports;}
const config=load(read("src","i18n","config.ts"),"config.ts");
const shared=load(read("src","i18n","global-launch-shared-copy.ts"),"shared.ts");
const home=load(read("src","i18n","global-launch-home-copy.ts"),"home.ts");
const search=load(read("src","i18n","global-launch-search-copy.ts"),"search.ts");
const dealer=load(read("src","i18n","dealer-page-copy.ts"),"dealer.ts");
const services=load(read("src","i18n","service-page-copy.ts"),"services.ts");
const verticals=load(read("src","i18n","vertical-page-copy.ts"),"verticals.ts");
const moderation=load(read("src","i18n","moderation-runtime-copy.ts"),"moderation.ts");
const en=load(read("src","i18n","dictionaries","en.ts"),"en.ts").en,tr=load(read("src","i18n","dictionaries","tr.ts"),"tr.ts").tr;
const loader=load(read("src","i18n","get-dictionary.ts"),"loader.ts",{"./config":config,"./global-launch-shared-copy":shared,"./global-launch-home-copy":home,"./global-launch-search-copy":search,"./dealer-page-copy":dealer,"./service-page-copy":services,"./vertical-page-copy":verticals,"./moderation-runtime-copy":moderation,"./dictionaries/en":{en},"./dictionaries/tr":{tr}});
assert.equal(loader.JOLMOD_DEFAULT_LOCALE,"ru");
for(const locale of ["ru","kk","en","zh-CN"]){const d=loader.getJolmodGlobalDictionary(locale);for(const section of ["common","navigation","footer","home","search"])assert.ok(d[section],`${locale}.${section}`);}
assert.deepEqual(loader.getJolmodGlobalDictionary("unsupported"),loader.getJolmodGlobalDictionary("ru"));
assert.notDeepEqual(loader.getJolmodGlobalDictionary("unsupported").home,tr.home,"Jolmod must not fall back to Turkish");
for(const locale of ["ru","kk","en","zh-CN","unsupported"]){const client=loader.getClientDictionary(locale);const expected=loader.getJolmodGlobalDictionary(locale);for(const section of ["common","navigation","footer","home","search"])assert.deepEqual(client[section],expected[section],`Client ${locale}.${section} must use the Jolmod launch contract`);}
assert.equal(loader.getClientDictionary("unsupported").common.appName,"Jolmod");
console.log("Jolmod global loader tests passed.");
