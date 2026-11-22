'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
test('newly linked DEV accounts use canonical own readers while isolated fixtures retain their namespace',()=>{
 const source=fs.readFileSync(p.join(__dirname,'../config/variants/dev/src/session/act-environment.mjs.template'),'utf8').replace(/^import .*;\r?\n/,'').replaceAll('export ','');
 const scope=new Function('dataPrefix',source+';return {actUid,directActUid,memberPrefix};')(uid=>uid==='isolated-fixture'?'coreDevValidation/SYNTHETIC/':'');
 for(const uid of ['new-google-account','isolated-fixture'])a.equal(scope.actUid(uid),true);
 a.equal(scope.directActUid('new-google-account'),true);
 a.equal(scope.memberPrefix('new-google-account'),'');
 a.equal(scope.directActUid('isolated-fixture'),false);
 a.equal(scope.memberPrefix('isolated-fixture'),'coreDevValidation/SYNTHETIC/');
 for(const uid of [null,undefined,'',42,{}])a.equal(scope.actUid(uid),false);
});
