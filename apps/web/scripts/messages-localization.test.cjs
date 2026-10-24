const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8"),source=read("src","app","profile","messages","messages-copy.ts");
function load(s){const m={exports:{}};new Function("exports","module",ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);return m.exports}
const {getMessagesCopy}=load(source),ru=getMessagesCopy("ru"),kk=getMessagesCopy("kk"),en=getMessagesCopy("en"),zh=getMessagesCopy("zh-CN");
const shape=x=>Object.fromEntries(Object.keys(x).sort().map(k=>[k,typeof x[k]]));
for(const [locale,copy] of Object.entries({ru,kk,en,"zh-CN":zh})){assert.deepEqual(shape(copy),shape(ru),`${locale} complete messages shape`);if(locale!=="ru")assert.notEqual(copy,ru,`${locale} direct copy`);assert.doesNotMatch(JSON.stringify(copy),/TODO|TBD|\?\?\?|\uFFFD|□/i)}
assert.equal(getMessagesCopy("de"),ru,"unsupported Jolmod locale falls back to Russian");assert.equal(getMessagesCopy("tr"),ru,"Turkish is never Jolmod messages fallback");assert.match(JSON.stringify(zh),/[\u4E00-\u9FFF]/);assert.doesNotMatch(JSON.stringify(zh),/關|體|臺/);
for(const file of [["src","app","listing","[id]","_components","StartConversationButton.tsx"],["src","app","profile","messages","_components","InboxClient.tsx"],["src","app","profile","messages","[conversationId]","_components","ConversationClient.tsx"]]){const component=read(...file);assert.match(component,/getMessagesCopy/);assert.doesNotMatch(component,/dictionary\.messages/)}
console.log("Messages four-language localization tests passed.");
