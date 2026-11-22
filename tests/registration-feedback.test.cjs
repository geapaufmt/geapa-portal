const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('failed preregistration shows one inline message, keeps draft and permits recovery without persistent toast',async()=>{
 const dom=new JSDOM('<button data-member-registration-open>Abrir</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,toasts=[];
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>true};
 w.PortalGeapaUi={escaparHtml:s=>s,mostrarToast:t=>toasts.push(t)};
 w.PortalDesign={openDetailDialog:n=>n.hidden=false,closeDetailDialog:n=>n.hidden=true};
 let calls=0;w.PortalGeapaApi={apiGet:async()=>({ok:true,data:{status:'APPROVED',active:true,membershipType:'MEMBRO_INGRESSANTE',approvedOn:'2026-01-01'}}),apiPost:async()=>{calls++;return {ok:false,errorCode:'RECONCILIATION_REQUIRED',message:'O serviço de consulta está temporariamente indisponível.'};}};
 w.eval(fs.readFileSync(require('path').resolve(__dirname,'../src/modules/admin-cadastro-membros.js'),'utf8'));
 w.document.querySelector('button').click();const form=w.document.querySelector('form');
 const values={nomeCompleto:'Pessoa sintética',emailPrincipal:'test@example.invalid',rga:'202610001',telefone:'66999990000'};
 for(const [k,v]of Object.entries(values))form.elements[k].value=v;
 for(let i=0;i<2;i++){form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));a.equal(w.document.querySelectorAll('.member-registration-feedback.is-error').length,1);a(form.textContent.includes('recuperar o mesmo envio'));a(!form.textContent.includes('serviço de consulta'));a.equal(form.elements.nomeCompleto.value,values.nomeCompleto);a.equal(form.querySelector('button[type=submit]').disabled,false);}
 a.equal(calls,2);a.equal(toasts.length,0);w.close();
});
test('approval follows exact pair, ignores late answers, shows authoritative category and has no manual reference',async()=>{
 const dom=new JSDOM('<button data-member-registration-open>Abrir</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,pending=[],calls=[];
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>true};w.PortalGeapaUi={escaparHtml:s=>s};w.PortalDesign={openDetailDialog:n=>n.hidden=false};
 w.PortalGeapaApi={apiGet:(route,pair)=>new Promise(resolve=>{calls.push({route,pair});pending.push(resolve);}),apiPost:async()=>{throw Error('unexpected write');}};
 w.eval(fs.readFileSync(require('path').resolve(__dirname,'../src/modules/admin-cadastro-membros.js'),'utf8').replace('})(window);','global.lookupApprovalForTest=lookupApproval;})(window);'));
 w.document.querySelector('button').click();const form=w.document.querySelector('form'),button=form.querySelector('button[type=submit]');a(!form.elements.referenciaAprovacao);a(!form.elements.categoriaIngresso);
 form.elements.emailPrincipal.value='SYN@example.invalid';form.elements.rga.value='2026-10001';const first=w.lookupApprovalForTest(form);form.elements.rga.value='202610002';const second=w.lookupApprovalForTest(form);
 pending[0]({ok:true,data:{status:'APPROVED',active:true,membershipType:'MEMBRO_EFETIVO',approvedOn:'2026-01-01'}});a.equal(await first,false);a.equal(button.disabled,true);
 pending[1]({ok:false,errorCode:'ADMISSION_APPROVAL_REQUIRED'});a.equal(await second,false);a(form.textContent.includes('Não foi localizada'));a.equal(button.disabled,true);
 const third=w.lookupApprovalForTest(form);pending[2]({ok:true,data:{status:'APPROVED',active:true,membershipType:'MEMBRO_INGRESSANTE',approvedOn:'2026-02-03'}});a.equal(await third,true);a(form.textContent.includes('Membro ingressante'));a(form.textContent.includes('03/02/2026'));a.equal(button.disabled,false);a.equal(calls[0].pair.email,'syn@example.invalid');a.equal(calls[0].pair.rga,'202610001');w.close();
});
