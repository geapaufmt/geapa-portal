'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),p=require('path');
const root=p.resolve(__dirname,'../dist/prod/assets/physical-560120e5c1fbb33e');
const source=fs.readFileSync(root+'/app.mjs','utf8');
const fn=source.slice(source.indexOf('async function performRefresh('),source.indexOf('\nfunction scheduleExpiry('));
function fixture(requested='admin-membros'){
 const calls=[],state={requested,rendered:'inicio',valid:true,allow:true,pending:null,gate:true};
 const elements=new Map(),context={portal:null,uid:'SYNTHETIC',busy:null,epoch:1,enrollmentReadPaused:false,enrollment:null,
  contextReadPaused:false,navigator:{onLine:true},document:{querySelector:()=>null,hidden:false},recoverContextRead:({read})=>read(),routeMap:{'minha-situacao':['minha-situacao','status']},current:()=>state.valid,
  $:id=>{if(!elements.has(id))elements.set(id,{dataset:{state:'LOADING'}});return elements.get(id)},
  phase:(el,status)=>el.dataset.state=status,deadline:p=>p,scheduleExpiry(){},loadRoute:async()=>calls.push('load:'+state.rendered),observe:async()=>calls.push('observe'),actUid:()=>true,
  safeCode:e=>e.code,clearViews(){calls.push('clear')},failure:async(error)=>{throw error},messages:{},
  restoreEnrollment:async()=>false,restoreMemberTracking:async()=>false,restoreMaterialAccess:async()=>false,
  window:{PortalDevContext:{accessPending:true,act:null,members:null},PortalGeapaNavigation:null}};
 const nav=context.window.PortalGeapaNavigation={getRotaAtual:()=>state.rendered,getRequestedRoute:()=>state.requested,isAccessGateVisible:()=>state.gate,finishAccessValidation:message=>calls.push('gate-error:'+message),
  irPara:id=>{state.rendered=id;state.requested=id;calls.push('navigate:'+id)},
  restoreCurrentRoute(){calls.push('restore:'+state.requested);if(state.requested.startsWith('admin-membro')||state.requested==='admin-correcoes-cadastrais'||state.requested==='admin-solicitacoes-vinculo'){if(!context.window.PortalDevContext.members?.canReadDirectory){calls.push('DENIED');return false;}}state.rendered=state.requested||'inicio';return true;}};
 context.portal={members:{portalUser:async()=>({data:{technicalAccount:true}})},repositories:{accessStatus:async()=>({data:{status:'ACTIVE',validUntil:'2099-01-01'}})},act:{
  refresh:async()=>{context.window.PortalDevContext.act={available:true};return true;},
  refreshMembers:async()=>{calls.push('members:start');await new Promise(r=>state.pending=r);if(state.valid&&state.allow)context.window.PortalDevContext.members={available:true,canReadDirectory:true};calls.push('members:end');return state.allow;}}};
 vm.createContext(context);vm.runInContext(fn+';this.run=(options={initial:true})=>performRefresh(options);',context);
 return {state,calls,context,nav,run:context.run};
}
const turn=()=>new Promise(r=>setImmediate(r));
for(const route of ['admin-membros','admin-correcoes-cadastrais','admin-solicitacoes-vinculo'])test('cold reload waits for requested Members context: '+route,async()=>{
 const f=fixture(route),pending=f.run();await turn();a.equal(f.state.rendered,'inicio');a.equal(f.context.window.PortalDevContext.accessPending,true);a.deepEqual(f.calls,['members:start']);f.state.pending();await pending;a.equal(f.state.rendered,route);a.equal(f.state.requested,route);a.equal(f.context.window.PortalDevContext.accessPending,false);a(!f.calls.includes('navigate:minha-situacao'));
});
test('denied/expired Members authorization stays gated at requested URL',async()=>{const f=fixture(),pending=f.run();await turn();f.state.allow=false;f.state.pending();await pending;a(f.calls.includes('DENIED'));a.equal(f.state.requested,'admin-membros');a(!f.calls.some(x=>x.startsWith('load:')));a(!f.calls.includes('navigate:minha-situacao'));});
test('transient context failure does not destroy reload destination; explicit recovery can succeed',async()=>{const f=fixture();f.state.allow=false;let pending=f.run();await turn();f.state.pending();await pending;a.equal(f.state.requested,'admin-membros');f.state.allow=true;pending=f.run();await turn();f.state.pending();await pending;a.equal(f.state.rendered,'admin-membros');});
test('logout/account change while context loads cannot restore private route',async()=>{const f=fixture(),pending=f.run();await turn();f.state.valid=false;f.state.requested='login';f.state.pending();await pending;a(!f.calls.some(x=>x.startsWith('restore:')));a.equal(f.context.window.PortalDevContext.members,null);});
test('later navigation wins over delayed Members restoration',async()=>{const f=fixture(),pending=f.run();await turn();f.state.requested='admin-atividades';f.state.pending();await pending;a.equal(f.state.rendered,'admin-atividades');a(!f.calls.includes('restore:admin-membros'));});
for(const route of ['admin-atividades','inicio'])test('unrelated route does not wait for Members context: '+route,async()=>{const f=fixture(route);await f.run();a(!f.calls.includes('members:start'));a.equal(f.state.rendered,route);});
test('empty initial URL keeps existing default route',async()=>{const f=fixture('');await f.run();a.equal(f.state.rendered,'minha-situacao');});

test('manual recovery restores requested board route after initial context failure',async()=>{const f=fixture('diretoria-competencias');await f.run({initial:false});a.equal(f.state.rendered,'diretoria-competencias');a.equal(f.context.window.PortalDevContext.accessPending,false);});
test('an old access-status response cannot schedule expiry for a new session',async()=>{const f=fixture('inicio');let release,deadlines=0;f.context.scheduleExpiry=()=>deadlines++;f.context.portal.repositories.accessStatus=()=>new Promise(r=>release=r);const old=f.run();await turn();f.state.valid=false;release({data:{status:'ACTIVE',validUntil:'2099-01-01'}});await old;a.equal(deadlines,0);});
test('background recovery also settles a previously blocked board route',async()=>{const f=fixture('diretoria-competencias');await f.run({background:true});a.equal(f.state.rendered,'diretoria-competencias');});
test('manual Members recovery waits for fresh Members authorization',async()=>{const f=fixture(),pending=f.run({initial:false});await turn();a.equal(f.state.rendered,'inicio');a(f.state.pending);f.state.pending();await pending;a.equal(f.state.rendered,'admin-membros');});
test('ordinary refresh never rerenders an already open route or loses a draft',async()=>{const f=fixture('diretoria-competencias');f.state.rendered='diretoria-competencias';f.state.gate=false;await f.run({background:true});a(!f.calls.some(x=>x.startsWith('restore:')));});
test('context deadline clears authorization hints and releases recovery lock without granting access',async()=>{const f=fixture('diretoria-competencias');f.context.messages.REQUEST_TIMEOUT='Consulta indisponível';f.context.portal.act.clear=()=>{f.context.window.PortalDevContext.act=null;f.calls.push('act:clear');};f.context.deadline=(promise,ms)=>ms===45000?Promise.reject({code:'REQUEST_TIMEOUT'}):promise;f.context.failure=async error=>f.calls.push('failure:'+error.code);await f.run();a(f.calls.includes('act:clear'));a(f.calls.includes('gate-error:Consulta indisponível'));a.equal(f.context.window.PortalDevContext.accessPending,false);a.equal(f.context.busy,null);a.equal(f.state.rendered,'inicio');a(!f.calls.some(x=>x.startsWith('restore:')));});
test('manual recovery after denied Members context still cannot enter without permission',async()=>{const f=fixture(),pending=f.run({initial:false});await turn();f.state.allow=false;f.state.pending();await pending;a(f.calls.includes('DENIED'));a.equal(f.state.rendered,'inicio');a.equal(f.context.window.PortalDevContext.accessPending,false);});
test('late manual recovery after logout cannot restore requested private page',async()=>{const f=fixture(),pending=f.run({initial:false});await turn();f.state.valid=false;f.state.requested='login';f.state.pending();await pending;a(!f.calls.some(x=>x.startsWith('restore:')));});
test('navigation resolves actual path to canonical route without granting access',()=>{
 const window={location:{hash:'#/admin/membros'},addEventListener(){}},document={readyState:'loading',addEventListener(){}};
 const ctx={window,document,accessIsPending:()=>true};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/navigation.mjs','utf8').replace(/^import .*;\r?\n/,''),ctx);
 const nav=window.PortalGeapaNavigation;a.equal(nav.getRotaAtual(),'inicio');a.equal(nav.getRequestedRoute(),'admin-membros');a.equal(nav.resolveRouteAccess({},nav.getRotas().find(r=>r.id==='admin-membros')).ok,false);
 window.location.hash='#/admin/correcoes-cadastrais?case=synthetic';a.equal(nav.getRequestedRoute(),'admin-correcoes-cadastrais');window.location.hash='#/unknown';a.equal(nav.getRequestedRoute(),'');
});
test('Members response preserves disclosure changes made during the request',()=>{
 const s=fs.readFileSync(p.resolve(root,'../act-ui/admin-membros.js'),'utf8'),start=s.indexOf('  function renderContent()'),end=s.indexOf('  function renderFreshness()',start),panel={open:true},state={filtersOpen:false,pagination:{},items:[]},rendered=[];
 const ctx={state,getContainer:()=>({querySelector:()=>panel}),global:{PortalDesign:{summary:()=>''}},renderShell(){},renderFreshness:()=>'',renderFilters:()=>{rendered.push(state.filtersOpen);return '';},renderEmpty:()=>'',renderPagination:()=>''};vm.createContext(ctx);vm.runInContext(s.slice(start,end)+';renderContent();',ctx);a.deepEqual(rendered,[true]);panel.open=false;vm.runInContext('renderContent()',ctx);a.deepEqual(rendered,[true,false]);
});

test('App Check outage keeps login but does not restore or misclassify a private route',async()=>{const f=fixture('admin-atividades');f.context.portal.act.refresh=async()=>{throw {code:'APP_CHECK_UNAVAILABLE'};};f.context.portal.act.clear=()=>{f.context.window.PortalDevContext.act=null;};f.context.failure=async e=>f.calls.push('failure:'+e.code);f.context.messages.APP_CHECK_UNAVAILABLE='Atualizar acesso';await f.run();a.equal(f.context.contextReadPaused,true);a(f.calls.includes('gate-error:Atualizar acesso'));a(!f.calls.some(x=>x.startsWith('restore:')));a.equal(f.context.busy,null);const n=f.calls.length;await f.run({background:true});a.equal(f.calls.length,n);f.context.portal.act.refresh=async()=>true;await f.run({initial:false});a.equal(f.context.contextReadPaused,false);a(f.calls.includes('restore:admin-atividades'));});
