'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),{pathToFileURL}=require('node:url'),p=require('node:path');
const load=()=>import(pathToFileURL(p.resolve(__dirname,'../src/session/bootstrap-state.mjs')));
const error=code=>Object.assign(Error(code),{code});
test('a transient context attestation error retries once and requires a new successful read',async()=>{
 const {recoverContextRead}=await load();let calls=0,waits=0;
 const result=await recoverContextRead({read:async()=>{if(++calls===1)throw error('appCheck/recaptcha-error');return {board:false};},isCurrent:()=>true,visible:()=>true,online:()=>true,wait:async()=>{waits++;}});
 a.equal(calls,2);a.equal(waits,1);a.deepEqual(result,{board:false});
});
test('persistent attestation failure stops after two reads and preserves the original error',async()=>{
 const {recoverContextRead,readErrorCode}=await load();let calls=0;const failure=error('appCheck/recaptcha-error');
 await a.rejects(recoverContextRead({read:async()=>{calls++;throw failure;},isCurrent:()=>true,visible:()=>true,online:()=>true,wait:async()=>{}}),e=>e===failure);
 a.equal(calls,2);a.equal(readErrorCode(failure),'APP_CHECK_UNAVAILABLE');
});
for(const code of ['appCheck/throttled','appCheck/initial-throttle','appCheck/fetch-status-error','FORBIDDEN','ACCESS_REVOKED','AUTH_REQUIRED','REQUEST_TIMEOUT','CONTRACT_NOT_AVAILABLE'])test('never retries denial, throttle or another failed request: '+code,async()=>{
 const {recoverContextRead}=await load();let calls=0;
 await a.rejects(recoverContextRead({read:async()=>{calls++;throw error(code);},isCurrent:()=>true,visible:()=>true,online:()=>true,wait:async()=>a.fail('must not wait')}),e=>e.code===code);a.equal(calls,1);
});
for(const unavailable of ['current','visible','online'])test('no retry when '+unavailable+' becomes false during the wait',async()=>{
 const {recoverContextRead}=await load();let calls=0,state={current:true,visible:true,online:true};
 await a.rejects(recoverContextRead({read:async()=>{calls++;throw error('appCheck/recaptcha-error');},isCurrent:()=>state.current,visible:()=>state.visible,online:()=>state.online,wait:async()=>{state[unavailable]=false;}}));a.equal(calls,1);
});
test('successful feature-disabled response is not turned into an authorization grant',async()=>{
 const {recoverContextRead}=await load();let calls=0;a.equal(await recoverContextRead({read:async()=>{calls++;return false;},isCurrent:()=>true,visible:()=>true,online:()=>true}),false);a.equal(calls,1);
});
