const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"src","features","ai","domain","response-language.ts"),"utf8"),m={exports:{}};
new Function("exports","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);
const {inferAiResponseLanguage:detect}=m.exports;
for(const [ui,query,expected] of [["ru","Покажи Toyota в Алматы","ru"],["ru","Алматыдан Toyota көрсетіңіз","kk"],["ru","Show reliable BMW in Almaty","en"],["ru","在阿拉木图找丰田","zh-CN"],["ru","Zeig mir zuverlässige BMW in Almaty","de"],["ru","أرني تويوتا في ألماتي","ar"],["kk","Zeig mir BMW","de"],["zh-CN","أرني سيارة","ar"],["ru","","ru"],["zh-CN","","zh-CN"]])assert.equal(detect(query,ui),expected);
assert.equal(detect("Show me a BMW","ru"),"en");assert.equal(detect("Zeig mir BMW","ru"),"de");
console.log("AI response-language policy tests passed.");
