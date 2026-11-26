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
test('preregistration submits a draft without approval lookup and blocks duplicate in-flight submissions',async()=>{
 const dom=new JSDOM('<button data-member-registration-open>Abrir</button>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,calls=[];let finish;
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>true};w.PortalGeapaUi={escaparHtml:s=>s,mostrarToast:()=>{}};w.PortalDesign={openDetailDialog:n=>n.hidden=false};
 w.PortalGeapaApi={apiGet:()=>{throw Error('Approval lookup must not be required');},apiPost:(route,body)=>{calls.push({route,body});return new Promise(resolve=>finish=resolve);}};
 w.eval(fs.readFileSync(require('path').resolve(__dirname,'../src/modules/admin-cadastro-membros.js'),'utf8'));
 w.document.querySelector('button').click();const form=w.document.querySelector('form');a(!form.elements.referenciaAprovacao);a(!form.elements.categoriaIngresso);a(!form.querySelector('button[type=submit]').disabled);
 const input={nomeCompleto:'Pessoa sintética',emailPrincipal:'syn@example.invalid',rga:'202610001',telefone:'66999990000'};for(const [k,v]of Object.entries(input))form.elements[k].value=v;
 for(let n=0;n<2;n++)form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));a.equal(calls.length,1);a.deepEqual(JSON.parse(calls[0].body.payload),input);a.equal(calls[0].route,'/admin/ingressos-membros/cadastrar');
 finish({ok:true,data:{idIngresso:'SYN_DRAFT'}});await new Promise(r=>setImmediate(r));a(w.document.body.textContent.includes('Pré-cadastro registrado'));a(w.document.body.textContent.includes('ainda não gera presenças'));w.close();
});
test('session without registration authorization cannot submit a draft',()=>{
 const dom=new JSDOM('<button data-member-registration-open>Abrir</button>',{runScripts:'outside-only'}),w=dom.window;let writes=0;
 w.PortalGeapaConfig={ENABLE_MEMBER_REGISTRATION:true};w.PortalGeapaAuth={hasPermissao:()=>false};w.PortalGeapaUi={mostrarToast:()=>{}};w.PortalGeapaApi={apiPost:()=>writes++};
 w.eval(fs.readFileSync(require('path').resolve(__dirname,'../src/modules/admin-cadastro-membros.js'),'utf8'));w.document.querySelector('button').click();a.equal(w.document.querySelector('form'),null);a.equal(writes,0);w.close();
});
