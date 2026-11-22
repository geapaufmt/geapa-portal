const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('effectivation preserves date and reference during proof renewal, prevents duplicate submit and clears on revocation',async()=>{
 const dom=new JSDOM('<div class="modal-backdrop" hidden><section role="dialog"><header class="modal-topbar"></header><div id="content"></div></section></div>',{runScripts:'outside-only',url:'https://test.invalid'}),w=dom.window,d=w.document,modal=d.querySelector('.modal-backdrop'),content=d.querySelector('#content');
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{}];};w.eval(fs.readFileSync('dist/dev/assets/act-ui/design-system.mjs','utf8').replace(/^export /gm,''));
 let calls=0,release,refreshes=0;w.PortalGeapaAuth={getUsuarioAtual:()=>({idPessoa:'SYN_ADMIN'}),hasPermissao:()=>true};w.api={apiPost:()=>{calls++;return new Promise(r=>release=r);}};w.global=w;
 const src=fs.readFileSync('src/modules/admin-membros.js','utf8');w.eval(src.slice(src.indexOf('  function effectivation('),src.indexOf('  function openPersonDetail(')));
 w.PortalDesign.openDetailDialog(modal,()=>content.replaceChildren());w.effectivation(content,'SYN_PERSON','MEMBRO_INGRESSANTE',()=>refreshes++);
 const form=content.querySelector('form'),button=form.querySelector('button');form.elements.reference.value='TESTE_EFETIVACAO_DEV';form.elements.reference.dispatchEvent(new w.Event('input',{bubbles:true}));
 d.dispatchEvent(new w.Event('portal:act-session-suspended'));a.equal(modal.hidden,false);a.equal(button.disabled,true);a.equal(form.elements.reference.value,'TESTE_EFETIVACAO_DEV');
 d.dispatchEvent(new w.Event('portal:act-context-ready'));a.equal(button.disabled,false);const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));submit();submit();a.equal(calls,1);a.equal(modal.getAttribute('aria-busy'),'true');w.PortalDesign.closeDetailDialog(modal);a.equal(modal.hidden,false);
 d.dispatchEvent(new w.Event('portal:act-session-cleared'));release({ok:true});await new Promise(r=>setImmediate(r));a.equal(modal.hidden,true);a.equal(content.childElementCount,0);a.equal(refreshes,0);w.close();
});
