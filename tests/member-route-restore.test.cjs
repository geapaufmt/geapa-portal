'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),p=require('path');
const root=p.resolve(__dirname,'../dist/prod/assets/physical-560120e5c1fbb33e');
const source=fs.readFileSync(root+'/app.mjs','utf8');
const fn=source.slice(source.indexOf('async function performRefresh('),source.indexOf('\nfunction scheduleExpiry('));
function fixture(requested='admin-membros'){
 const calls=[],state={requested,rendered:'inicio',valid:true,allow:true,pending:null};
 const elements=new Map(),context={portal:null,uid:'SYNTHETIC',busy:null,epoch:1,enrollmentReadPaused:false,enrollment:null,
  routeMap:{'minha-situacao':['minha-situacao','status']},current:()=>state.valid,
  $:id=>{if(!elements.has(id))elements.set(id,{dataset:{state:'LOADING'}});return elements.get(id)},
  phase:(el,status)=>el.dataset.state=status,deadline:p=>p,scheduleExpiry(){},loadRoute:async()=>calls.push('load:'+state.rendered),observe:async()=>calls.push('observe'),actUid:()=>true,
  safeCode:e=>e.code,clearViews(){calls.push('clear')},failure:async(error)=>{throw error},messages:{},
  restoreEnrollment:async()=>false,restoreMemberTracking:async()=>false,restoreMaterialAccess:async()=>false,
  window:{PortalDevContext:{accessPending:true,act:null,members:null},PortalGeapaNavigation:null}};
 const nav=context.window.PortalGeapaNavigation={getRotaAtual:()=>state.rendered,getRequestedRoute:()=>state.requested,
  irPara:id=>{state.rendered=id;state.requested=id;calls.push('navigate:'+id)},
  restoreCurrentRoute(){calls.push('restore:'+state.requested);if(state.requested.startsWith('admin-membro')||state.requested==='admin-correcoes-cadastrais'||state.requested==='admin-solicitacoes-vinculo'){if(!context.window.PortalDevContext.members?.canReadDirectory){calls.push('DENIED');return false;}}state.rendered=state.requested||'inicio';return true;}};
 context.portal={members:{portalUser:async()=>({data:{technicalAccount:true}})},repositories:{accessStatus:async()=>({data:{status:'ACTIVE',validUntil:'2099-01-01'}})},act:{
  refresh:async()=>{context.window.PortalDevContext.act={available:true};return true;},
  refreshMembers:async()=>{calls.push('members:start');await new Promise(r=>state.pending=r);if(state.valid&&state.allow)context.window.PortalDevContext.members={available:true,canReadDirectory:true};calls.push('members:end');return state.allow;}}};
 vm.createContext(context);vm.runInContext(fn+';this.run=()=>performRefresh({initial:true});',context);
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
