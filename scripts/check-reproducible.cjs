'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),a=require('node:assert/strict'),p=require('node:path'),root=p.resolve(__dirname,'..');
const before=['dev','prod'].map(e=>fs.readFileSync(root+'/build/'+e+'-manifest.json','utf8'));cp.execFileSync(process.execPath,[__dirname+'/build.cjs'],{cwd:root,stdio:'inherit'});for(const [i,e]of ['dev','prod'].entries())a.equal(fs.readFileSync(root+'/build/'+e+'-manifest.json','utf8'),before[i],e);console.log('REPRODUCIBLE_BUILD_PASS');
