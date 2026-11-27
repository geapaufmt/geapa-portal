const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),component=()=>import(pathToFileURL(root+'/dist/prod/assets/act-ui/theme-extraordinary.mjs'));
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
test('partial complement preserves populated controls across section changes',async()=>{
 const m=await component(),d=new JSDOM(m.administrativeForm('APU_SYN','Pessoa',{tema:true,material:true,foto:true},{tema:'Aprovado',material:'Pendente',foto:'Pendente'},'<input name="tituloApresentacao" value="Título aprovado"><textarea name="observacoes"></textarea><select name="eixoTematicoPrincipal"><option value="SYN_AXIS" selected>Eixo</option></select>',true,escape));
 const f=d.window.document.querySelector('form');m.protectExistingTheme(f,{tema:'Título aprovado',eixoTematicoPrincipal:'SYN_AXIS'});
 for(const value of ['tema','material','tema']){f.elements.section.value=value;m.selectSection(f);}
 f.elements.observacoes.value='Resumo complementado';const data=new d.window.FormData(f);
 a(!data.has('tituloApresentacao'));a(!data.has('eixoTematicoPrincipal'));a.equal(data.get('observacoes'),'Resumo complementado');
 a(!f.textContent.includes('análise temática manual'));a.equal(f.querySelectorAll('[type=submit]').length,1);
});
test('one confirmation registers only the selected group and requires provenance for files',async()=>{
 const m=await component(),d=new JSDOM(m.administrativeForm('APU_SYN','<Pessoa>',{tema:true,material:true,foto:false},{tema:'Pendente',material:'Pendente',foto:'Aprovada'},'<input name="tituloApresentacao" required>',true,escape));
 const f=d.window.document.querySelector('form'),section=f.querySelector('select');
 a.equal(f.querySelectorAll('[type=submit]').length,1);a.equal(f.querySelectorAll('[name=motivo]').length,1);a(section.options[3].disabled);a(!f.innerHTML.includes('<Pessoa>'));
 section.value='material';m.selectSection(f);let data=new d.window.FormData(f);a(data.has('material'));a(!data.has('tituloApresentacao'));a(!data.has('foto'));a.throws(()=>m.receiptEvidence(data));
 f.elements.reference.value='Protocolo sintético';f.elements.receivedAt.value='2020-01-01T10:00';a.equal(m.receiptEvidence(new d.window.FormData(f)).reference,'Protocolo sintético');
 section.value='tema';m.selectSection(f);data=new d.window.FormData(f);a(data.has('tituloApresentacao'));a(!data.has('reference'));a(!data.has('material'));
 a(m.revocationForm('APU_SYN',escape).includes('Confirmar revogação'));
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
 a(!window.test.montarPendenciasApresentacoes([item]).includes('autorizar-tema'));
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
