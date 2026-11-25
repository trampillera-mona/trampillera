import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const pages=["app/public/city/workspace/index.html","app/public/control/index.html"];
for(const path of pages)test("inline scripts parse in "+path,()=>{const html=readFileSync(new URL("../"+path,import.meta.url),"utf8");const scripts=[...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());assert.ok(scripts.length>0,"expected inline scripts");for(let i=0;i<scripts.length;i++)assert.doesNotThrow(()=>new vm.Script(scripts[i],{filename:path+"#script-"+i}))});
