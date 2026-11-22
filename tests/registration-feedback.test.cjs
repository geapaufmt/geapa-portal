const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('failed preregistration shows one inline message, keeps draft and permits recovery without persistent toast',async()=>{
 const dom=new JSDOM('<button data-member-registration-open>Abrir</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,toasts=[];
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>true};
 w.PortalGeapaUi={escaparHtml:s=>s,mostrarToast:t=>toasts.push(t)};
 w.PortalDesign={openDetailDialog:n=>n.hidden=false,closeDetailDialog:n=>n.hidden=true};
 let calls=0;w.PortalGeapaApi={apiPost:async()=>{calls++;return {ok:false,errorCode:'RECONCILIATION_REQUIRED',message:'O serviço de consulta está temporariamente indisponível.'};}};
 w.eval(fs.readFileSync(require('path').resolve(__dirname,'../src/modules/admin-cadastro-membros.js'),'utf8'));
 w.document.querySelector('button').click();const form=w.document.querySelector('form');
 const values={nomeCompleto:'Pessoa sintética',emailPrincipal:'test@example.invalid',rga:'202610001',telefone:'66999990000',categoriaIngresso:'MEMBRO_INGRESSANTE',referenciaAprovacao:'SYN_APPROVAL'};
 for(const [k,v]of Object.entries(values))form.elements[k].value=v;
 for(let i=0;i<2;i++){form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));a.equal(w.document.querySelectorAll('.member-registration-feedback.is-error').length,1);a(form.textContent.includes('recuperar o mesmo envio'));a(!form.textContent.includes('serviço de consulta'));a.equal(form.elements.nomeCompleto.value,values.nomeCompleto);a.equal(form.querySelector('button[type=submit]').disabled,false);}
 a.equal(calls,2);a.equal(toasts.length,0);w.close();
});
