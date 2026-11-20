const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),component=()=>import(pathToFileURL(root+'/dist/prod/assets/act-ui/theme-extraordinary.mjs'));
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
test('authorization contains one reason, separate confirmation and no approval control',async()=>{
 const m=await component(),d=new JSDOM(m.authorizationForm('APU_SYN',false,escape)),form=d.window.document.querySelector('form');
 a.equal(form.querySelectorAll('textarea').length,1);a.equal(form.querySelector('textarea').name,'motivo');a(form.textContent.includes('Não aprova o tema'));
 form.querySelector('textarea').value='Falha operacional';const out=m.authorizationPayload(new d.window.FormData(form));a.equal(out.action,'autorizar');a.equal(out.payload.confirmed,true);
 a.equal(new JSDOM(m.authorizationForm('APU_SYN',true,escape)).window.document.querySelectorAll('textarea').length,0);
});
test('post-realization registration is explicit and administrative evidence is required',async()=>{
 const m=await component(),dom=new JSDOM('<form>'+m.registrationFields('registrar',true)+'</form>'),f=dom.window.document.querySelector('form');
 a(f.textContent.includes('O tema aprovado e a realização serão preservados'));a.throws(()=>m.institutionalEvidence(new dom.window.FormData(f)));
 f.evidenceReference;f.querySelector('[name=evidenceReference]').value='Protocolo sintético';f.querySelector('[name=evidenceReceivedAt]').value='2026-01-01T10:00';f.querySelector('[name=evidenceConfirmed]').checked=true;
 const p=m.institutionalEvidence(new dom.window.FormData(f));a.equal(p.confirmed,true);a.equal(p.institutionalEvidence.reference,'Protocolo sintético');
 f.querySelector('[name=evidenceReceivedAt]').value='2099-01-01T10:00';a.throws(()=>m.institutionalEvidence(new dom.window.FormData(f)));
});
for(const env of ['dev','prod'])test(env+': only Core supplied actions show regularization and documentary records escape content',async()=>{
 const ds=await import(pathToFileURL(root+'/dist/'+env+'/assets/act-ui/design-system.mjs')),source=fs.readFileSync(root+'/dist/'+env+'/assets/act-ui/portal-v2-readonly.js','utf8');
 const window={PortalDesign:ds,PortalGeapaUi:{escaparHtml:ds.esc},PortalGeapaApi:{}},document={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(source.replace('})(window);','global.test={montarAcoesMinhasApresentacoes,montarPendenciasApresentacoes,obterAcoesMembro,obterAcoesGestao};})(window);'),{window,document,console,Date,Intl,setTimeout,clearTimeout});
 const render=window.test.montarAcoesMinhasApresentacoes;
 a(!render({},'APU_SYN',{}).includes('Regularizar'));
 a(render({},'APU_SYN',{podeRegularizarTituloEixo:true}).includes('regularizar-titulo-eixo'));
 const item={idApresentacao:'APU_SYN',statusTituloEixo:'PENDENTE',acoesMembro:{podeRegularizarTituloEixo:true},acoesGestao:{podeAutorizarRegularizacaoTema:true}};
 a(render(item,item.idApresentacao,window.test.obterAcoesMembro(item)).includes('regularizar-titulo-eixo'));
 a(window.test.montarPendenciasApresentacoes([item]).includes('autorizar-tema'));
 a(!window.test.montarPendenciasApresentacoes([{...item,acoesGestao:{}}]).includes('autorizar-tema'));
 const granted={...item,acoesGestao:{podeRevogarRegularizacaoTema:true,podeRegistrarRegularizacaoTema:true}};
 const card=window.test.montarPendenciasApresentacoes([granted]);a(card.includes('revogar-tema'));a(card.includes('registrar-tema'));a(!card.includes('autorizar-tema'));
 const html=render({registroPosteriorTema:{title:'<script>bad</script>',summary:'Texto',recordedAt:'2026-11-20T12:00:00Z'}},'APU_SYN',{});a(!html.includes('<script>'));a(html.includes('sem aprovação temática'));
});
test('all regularization routes retain the canonical executor and command contracts in both environments',async()=>{
 for(const env of ['dev','prod']){
 const {actFlowContracts}=await import(pathToFileURL(root+'/dist/'+env+'/assets/act-command/act-flow-contracts.mjs'));
 const {input}=await import(pathToFileURL(root+'/dist/'+env+'/assets/act-command/command-contract.mjs'));
 const routes=JSON.parse(fs.readFileSync(root+'/dist/'+env+'/assets/act-command/act-flow-executor-routes.json')).routes;for(const action of ['autorizar','revogar','regularizar','registrar']){const r='/v2/apresentacoes/titulo-eixo/'+action;a(routes.includes(r));a(actFlowContracts.routes.includes(r));}
 for(const cmd of ['THEME_EXTRAORDINARY_AUTHORIZE','THEME_EXTRAORDINARY_REVOKE','THEME_REGULARIZE','THEME_REGULARIZE_ADMIN']){
 a(actFlowContracts.types.includes('ACT.'+cmd));
 const request={schemaVersion:'geapa-act-command-v13',operationId:'a'.repeat(32),commandType:'ACT.'+cmd,target:{scope:{},expected:[],authorization:{kind:'ROLE',sourceId:'SYN_POLICY',functionId:'SYN_FUNCTION',actorScope:'ADMINISTRACAO'}},payload:{},evidenceRefs:[],decisionRef:null};
 a.equal(input(request).commandType,request.commandType);
 a.throws(()=>input({...request,commandType:'ACT.UNKNOWN'}));
 }
 }
});
