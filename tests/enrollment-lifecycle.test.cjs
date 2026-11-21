'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const basic={status:'INVITED',revision:1,enrollmentId:'synthetic',membershipType:'MEMBRO_INGRESSANTE',registration:{fullName:'Pessoa Sintética',email:'pessoa@example.invalid',rga:'202610001',phone:'+5566999990000'},entrySemester:{year:2026,semester:1},expiresAt:Date.now()+100000};
const full={...basic,status:'ACCEPTED',revision:2,profile:{courseId:'AGRO'},courseConfirmed:true,missing:['cpf'],courses:[{id:'AGRO',name:'Agronomia',institution:'UFMT',campus:'Sinop'}],norms:[{id:'REG',version:'V1',label:'Regimento vigente',pdfUrl:'https://example.invalid/reg'}],normTermVersion:'TERM',acknowledgement:'Tomei ciência',imageTerm:{version:'IMG',text:'Imagem, voz e nome',purpose:'Teste'}};
test('verified invite opens with basic data, exposes RH category and needs no private profile',async()=>{
 const {enrollmentHtml}=await import('../src/session/enrollment.mjs');
 const doc=new JSDOM(enrollmentHtml(basic)).window.document;
 assert.match(doc.body.textContent,/Membro ingressante/);assert.match(doc.body.textContent,/2026\/1/);
 assert(!doc.querySelector('[name=cpf],[name=birthDate],[name=rga],[name=membershipType]'));
 assert(doc.querySelector('[data-enrollment-action=ACCEPT]'));assert(doc.querySelector('[data-enrollment-decline]'));
 const direct=new JSDOM(enrollmentHtml({...basic,membershipType:'MEMBRO_EFETIVO'})).window.document;
 assert.match(direct.body.textContent,/Membro efetivo/);
});
test('candidate saves fields, reads current version, declines optional image and enters with existing session',async t=>{
 const {createEnrollmentView}=await import('../src/session/enrollment.mjs');
 const dom=new JSDOM('<main></main>'),target=dom.window.document.querySelector('main'),actions=[];
 const current={...full,profile:{...full.profile}},calls=[];
 const original=global.FormData;global.FormData=dom.window.FormData;t.after(()=>{global.FormData=original;dom.window.close();});
 const client={open:async()=>({ok:true,data:basic}),read:async()=>({ok:true,data:current}),submit:async(rev,action,payload)=>{
  actions.push(action);calls.push({rev,payload});if(action==='SAVE')Object.assign(current.profile,payload.profile);
  return {receipt:{state:'COMPLETED'}};
 }};
 let activated=0;const view=createEnrollmentView({target,client,auth:{capture:()=>1,assert:()=>{}},onActivated:async()=>{activated++;}});
 await view.open();
 async function click(selector){target.querySelector(selector).click();await new Promise(setImmediate);}
 await click('[data-enrollment-action=ACCEPT]');
 assert.equal(target.querySelector('a').href,full.norms[0].pdfUrl);
 assert.match(target.textContent,/Agronomia · UFMT · Sinop/);assert(!target.querySelector('[name=courseId]'));
 const city=target.querySelector('[name=city]');city.value='Sinop';city.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 target.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(setImmediate);
 assert.equal(current.profile.city,'Sinop');assert(!Object.hasOwn(calls[1].payload.profile,'rga'));
 await click('[data-norm-ack]');await click('[data-enrollment-action=ACKNOWLEDGE]');
 await click('[data-image-choice=DECLINED]');await click('[data-enrollment-action=COMPLETE]');
 assert.deepEqual(actions,['ACCEPT','SAVE','ACKNOWLEDGE','IMAGE','COMPLETE']);assert.equal(activated,1);
});
