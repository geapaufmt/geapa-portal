const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const dom=new JSDOM('<button data-member-invitations-open>Convites</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window;
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{}];};
 w.eval(fs.readFileSync('dist/dev/assets/act-ui/design-system.mjs','utf8').replace(/^export /gm,''));
 let allowed=true,posts=0,resolve;
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>allowed};w.PortalGeapaUi={escaparHtml:String};
 w.PortalMemberDesign={invitationLabels:{PRE_REGISTERED:'Aguardando envio'},invitationCard:()=>'<article data-enrollment-id="SYN"><button data-invitation-action="SEND">Enviar convite</button></article>'};
 w.PortalGeapaApi={apiGet:async()=>({ok:true,data:{items:[{enrollmentId:'SYN',revision:1}]}}),apiPost:()=>{posts++;return new Promise(r=>resolve=r);}};
 w.eval(fs.readFileSync('src/modules/admin-cadastro-membros.js','utf8'));
 return {w,d:w.document,posts:()=>posts,suspend(){allowed=false;w.document.dispatchEvent(new w.Event('portal:act-session-suspended'));},resume(){allowed=true;w.document.dispatchEvent(new w.Event('portal:act-context-ready'));w.document.dispatchEvent(new w.Event('portal:members-session-ready'));},resolve:r=>resolve(r)};
}
test('invitation stays open through proof renewal, suspends actions and retains one in-flight command',async()=>{
 const f=fixture();f.d.querySelector('button').click();await tick();const modal=f.d.querySelector('.modal-backdrop'),send=modal.querySelector('[data-invitation-action]');
 f.suspend();a.equal(modal.hidden,false);a.equal(send.disabled,true);send.click();a.equal(f.posts(),0);
 f.resume();a.equal(send.disabled,false);send.click();a.equal(f.posts(),1);
 f.suspend();f.resolve({ok:true});await tick();a.equal(modal.hidden,false);f.resume();await tick();
 a.equal(modal.hidden,false);a.equal(modal.getAttribute('aria-busy'),null);a.equal(f.posts(),1);a(modal.querySelector('[data-invitation-action]'));f.w.close();
});
test('hard revocation closes invitation and discards a late response without restoring data',async()=>{
 const f=fixture();f.d.querySelector('button').click();await tick();const modal=f.d.querySelector('.modal-backdrop');modal.querySelector('[data-invitation-action]').click();
 f.d.dispatchEvent(new f.w.Event('portal:act-session-cleared'));f.resolve({ok:true});await tick();f.resume();await tick();
 a.equal(modal.hidden,true);a.equal(modal.querySelector('[data-member-registration-content]').childElementCount,0);a.equal(f.posts(),1);f.w.close();
});
