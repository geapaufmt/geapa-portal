const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),{pathToFileURL}=require('node:url'),path=require('node:path'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture(allowed=true){
 const dom=new JSDOM('<button data-member-invitations-open>Convites</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,calls=[];let finish;
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{}];};
 w.eval(fs.readFileSync('dist/dev/assets/act-ui/design-system.mjs','utf8').replace(/^export /gm,''));
 w.PortalMemberDesign=await import(pathToFileURL(path.resolve('dist/dev/assets/act-ui/admin-panels.mjs')));
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>true};w.PortalGeapaUi={escaparHtml:String};
 w.PortalGeapaApi={apiGet:async()=>({ok:true,data:{items:[{enrollmentId:'SYN',name:'Pessoa sintética',status:'PRE_REGISTERED',revision:3,canConfirmAdmission:allowed}]}}),apiPost:(route,body)=>{calls.push({route,payload:JSON.parse(body.payload)});return new Promise(r=>finish=r);}};
 w.eval(fs.readFileSync('src/modules/admin-cadastro-membros.js','utf8'));w.document.querySelector('button').click();await tick();
 return {w,d:w.document,calls,finish:r=>finish(r)};
}
test('RH confirmation requires a deliberate category, date and acknowledgement, keeps failed decision and blocks duplicates',async()=>{
 const f=await fixture(),b=f.d.querySelector('[data-invitation-action="CONFIRM_ADMISSION"]');b.click();a.equal(f.calls.length,0);a(b.closest('[data-admission-decision]'));a.equal(b.closest('details'),null);b.click();a.equal(f.calls.length,0);
 f.d.querySelector('[data-admission-category]').value='MEMBRO_INGRESSANTE';f.d.querySelector('[data-admission-date]').value='2026-11-26';f.d.querySelector('[data-admission-reason]').value='Decisão exclusivamente sintética';b.click();a.equal(f.calls.length,0);
 f.d.querySelector('[data-admission-confirmed]').checked=true;b.click();b.click();a.equal(f.calls.length,1);
 a.deepEqual(f.calls[0],{route:'/admin/ingressos-membros/convite',payload:{enrollmentId:'SYN',revision:3,action:'CONFIRM_ADMISSION',reason:'Decisão exclusivamente sintética',membershipType:'MEMBRO_INGRESSANTE',approvedOn:'2026-11-26',confirmed:true}});
 f.finish({ok:false,message:'Resultado temporariamente indisponível'});await tick();a.equal(f.d.querySelector('[data-admission-category]').value,'MEMBRO_INGRESSANTE');a.equal(b.disabled,false);b.click();a.equal(f.calls.length,2);a.deepEqual(f.calls[1],f.calls[0]);f.finish({ok:true});await tick();f.w.close();
});
test('absent canonical confirmation flag rejects a forged button and revocation discards the decision form',async()=>{
 const f=await fixture(false);a.equal(f.d.querySelector('[data-invitation-action="CONFIRM_ADMISSION"]'),null);const card=f.d.querySelector('[data-enrollment-id]');card.insertAdjacentHTML('beforeend','<button data-invitation-action="CONFIRM_ADMISSION">Forjado</button>');card.querySelector('button').click();a.equal(f.d.querySelector('[data-admission-decision]'),null);a.equal(f.calls.length,0);f.w.close();
 const g=await fixture();g.d.querySelector('[data-invitation-action="CONFIRM_ADMISSION"]').click();g.d.dispatchEvent(new g.w.Event('portal:act-session-cleared'));a.equal(g.d.querySelector('[data-admission-decision]'),null);a.equal(g.d.querySelector('.modal-backdrop').hidden,true);g.w.close();
});
