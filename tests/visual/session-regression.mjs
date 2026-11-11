import {mountMinutes} from '/assets/act-ui/institutional-minutes.mjs';
import {suspendProtectedDialogs} from '/assets/act-ui/design-system.mjs';
const view={revision:1,canCreateMinute:true,documentFilesEnabled:true,boards:[{id:'SYN',name:'Gestão sintética'}],records:[],history:[],normativeVersions:[]};
const host=document.querySelector('#host'),results=document.querySelector('#results');
let dispose=()=>{},result={ok:true,data:{state:'PENDING'}},reloads=0;
window.PortalDevContext={identityScope:'LOCAL:A:1'};
window.PortalGeapaApi={apiPost:async()=>result};
const tick=()=>new Promise(r=>setTimeout(r,20));
const check=(condition,message)=>{if(!condition)throw Error(message);};
const open=()=>{document.querySelector('[data-minute-new]').click();};
const input=(text)=>{const el=document.querySelector('[name=fullText]');el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));};
const text=()=>document.querySelector('[name=fullText]')?.value;
const mount=()=>{dispose();host.replaceChildren();dispose=mountMinutes(host,structuredClone(view),async()=>{reloads++;});};
async function run(name,work){const li=document.createElement('li');try{await work();li.textContent='PASS — '+name;}catch(error){li.textContent='FAIL — '+name+' — '+error.message;}results.append(li);}
document.querySelector('#run').onclick=async()=>{
 results.replaceChildren();result={ok:true,data:{state:"PENDING"}};reloads=0;
 await run('Renovação e App Check indisponível preservam texto e bloqueiam envio',async()=>{mount();open();input('rascunho sintético protegido');document.dispatchEvent(new Event('portal:act-session-suspended'));check(text()==='rascunho sintético protegido','texto alterado');check(document.querySelector('[data-minute-form] button[type=submit]').disabled,'envio não bloqueado');suspendProtectedDialogs(false);check(!document.querySelector('[data-minute-form] button[type=submit]').disabled,'envio não recuperado');});
 await run('Contexto ACT renovado não libera prova institucional vencida',async()=>{document.dispatchEvent(new Event('portal:act-session-suspended'));document.dispatchEvent(new Event('portal:act-context-ready'));check(document.querySelector('[data-minute-form] button[type=submit]').disabled,'prova específica dispensada');suspendProtectedDialogs(false);});
 await run('Atualização de outra ata renova listagem sem fechar o editor',async()=>{document.dispatchEvent(new CustomEvent('portal:institutional-view-renewed',{detail:{governance:{...structuredClone(view),revision:2}}}));check(text()==='rascunho sintético protegido','texto perdido após mudança do acervo');});
 await run('Competência removida bloqueia edição e preserva texto para conferência',async()=>{document.dispatchEvent(new CustomEvent('portal:institutional-view-renewed',{detail:{governance:{...structuredClone(view),canCreateMinute:false}}}));check(document.querySelector('[data-minute-form] button[type=submit]').disabled,'remoção não bloqueou envio');check(text()==='rascunho sintético protegido','texto perdido');document.dispatchEvent(new CustomEvent('portal:institutional-view-renewed',{detail:{governance:structuredClone(view)}}));suspendProtectedDialogs(false);});
 await run('Desmontagem e remontagem recuperam a cópia em memória',async()=>{mount();open();check(text()==='rascunho sintético protegido','rascunho não recuperado');});
 await run('Resultado PENDING não fecha o formulário',async()=>{document.querySelector('[data-minute-recover]').click();await tick();check(!!document.querySelector('[data-minute-form]'),'editor fechado');check(text()==='rascunho sintético protegido','texto perdido');});
 await run('Conflito de revisão preserva texto local',async()=>{result={ok:false,message:'STALE_REVISION: conflito na versão'};document.querySelector('[data-minute-recover]').click();await tick();check(text()==='rascunho sintético protegido','texto perdido');check(document.querySelector('[data-minute-feedback]').textContent.includes('STALE_REVISION'),'conflito não apresentado');});
 await run('Logout / troca de conta eliminam conteúdo da identidade anterior',async()=>{window.PortalDevContext.identityScope=null;document.dispatchEvent(new Event('portal:act-session-cleared'));dispose();window.PortalDevContext.identityScope='LOCAL:B:2';mount();open();check(text()==='','conteúdo exposto a outra identidade');});
 await run('Descarte explícito elimina a cópia recuperável',async()=>{input('descartar sintético');document.querySelector('[data-admin-modal-close]').click();check(!!document.querySelector('[data-discard-prompt]'),'sem confirmação de descarte');document.querySelector('[data-discard-draft]').click();open();check(text()==='','rascunho descartado reapareceu');});
 await run('COMPLETED fecha somente após confirmação e atualiza a lista',async()=>{input('salvamento sintético');result={ok:true,data:{state:'COMPLETED',operationId:'a'.repeat(32)}};document.querySelector('[data-minute-recover]').click();await tick();check(!document.querySelector('[data-minute-form]'),'editor permanece aberto');check(reloads===1,'lista não atualizada');check(host.textContent.includes('Recibo:'),'recibo não apresentado');open();check(text()==='','rascunho confirmado reapareceu');});
 dispose();host.replaceChildren();document.body.dataset.result=results.textContent.includes('FAIL')?'FAIL':'PASS';
};
