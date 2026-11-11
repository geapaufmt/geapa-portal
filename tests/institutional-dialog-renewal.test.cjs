const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){let now=0,reads=0,blocked=false;const jobs=new Map(),listeners={},el={innerHTML:'existing editor'};let id=0;const data={validUntil:60000,governance:{revision:3,canEdit:true,records:[]}},win={PortalGeapaNavigation:{getRotaAtual:()=> 'institutional-governance'},PortalGeapaApi:{apiGet:async()=>{reads++;return {ok:true,data:{...data,validUntil:now+60000}}}}};const doc={dispatchEvent(){},addEventListener:(n,f)=>listeners[n]=f,getElementById:()=>el,querySelector:()=>null,querySelectorAll:()=>[]};const src=fs.readFileSync('dist/dev/assets/act-ui/institutional-directory.mjs','utf8').replace(/^import .*;$/mg,'').replace(/export (function|const)/g,'$1');const c={CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}},window:win,document:doc,location:{hostname:'test'},console,Date:{now:()=>now},setTimeout:(f,ms)=>{jobs.set(++id,{f,at:now+ms});return id},clearTimeout:i=>jobs.delete(i),emptyGovernanceQuery:()=>({page:1}),suspendProtectedDialogs:value=>blocked=value};vm.createContext(c);vm.runInContext(src+';current='+JSON.stringify(data)+';scheduleExpiry(document.getElementById(),generation);',c);return {el,win,get blocked(){return blocked;},readCount:()=>reads,advance:async(t)=>{now=t;for(const[i,j]of [...jobs].filter(([,v])=>v.at<=now)){jobs.delete(i);j.f();await flush();}},context:c};}
test('institutional proof renews at half lifetime; original editor remains',async()=>{const f=fixture();await f.advance(30000);a.equal(f.readCount(),1);await f.advance(60001);a.equal(f.blocked,false);a.equal(f.el.innerHTML,'existing editor');});
test('reader denial suspends operations and retains the unsaved editor',async()=>{const f=fixture();f.win.PortalGeapaApi.apiGet=async()=>({ok:false});await f.advance(30000);a.equal(f.blocked,true);a.equal(f.el.innerHTML,'existing editor');await f.advance(60001);a.equal(f.blocked,true);});
test('slow renewal crossing proof expiry recovers without changing editor generation',async()=>{const f=fixture();let release;f.win.PortalGeapaApi.apiGet=()=>new Promise(r=>release=r);await f.advance(30000);await f.advance(60001);a.equal(f.blocked,true);release({ok:true,data:{validUntil:120000,governance:{revision:4,records:[{id:'another-minute'}]}}});await flush();a.equal(f.blocked,false);a.equal(vm.runInContext('generation',f.context),0);a.equal(f.el.innerHTML,'existing editor');});
test('late institutional renewal cannot restore a disposed identity or screen',async()=>{const f=fixture();let release;f.win.PortalGeapaApi.apiGet=()=>new Promise(r=>release=r);await f.advance(30000);vm.runInContext('generation++;current=undefined;',f.context);release({ok:true,data:{validUntil:120000}});await flush();a.equal(vm.runInContext('current',f.context),undefined);});
test('contact and parameter renewal preserve their own reader contract',async()=>{for(const section of ['identity','parameters']){const f=fixture();f.win.PortalGeapaNavigation.getRotaAtual=()=> 'institutional-'+section;let params;f.win.PortalGeapaApi.apiGet=async(_,p)=>{params=p;return {ok:true,data:{validUntil:120000}};};await f.advance(30000);a.equal(params.section,section);a.equal(params.view,undefined);a.equal(params.kind,'');a.equal(f.blocked,false);}});
test('norm detail opening signals renewal including an idle checkpoint',()=>{const source=fs.readFileSync('src/components/institutional-directory.mts','utf8');const handler=source.slice(source.lastIndexOf("document.addEventListener('click',e=>{if(!section()"));a.match(handler,/openDetailDialog\(opened,[\s\S]*document\.dispatchEvent\(new CustomEvent\('portal:institutional-dialog-opened'\)\)/);});

function failedListingFixture(){
 const f=fixture(),listeners={};f.el.classList={add(){}};f.el.replaceChildren=()=>{f.el.innerHTML='';f.el.children=[];};f.el.append=(...x)=>{f.el.children=x;};
 f.context.document.createElement=tag=>({tag,setAttribute(){},dataset:{}});
 f.context.institutionalSections=[['governance']];f.context.renderNormView=()=> 'authorized list';
 f.context.document.addEventListener=(name,callback)=>listeners[name]=callback;
 // Reinstall only the actual event handlers, preserving the module closure.
 const source=fs.readFileSync('dist/dev/assets/act-ui/institutional-directory.mjs','utf8');
 const start=source.indexOf("document.addEventListener('portal:navigationchange'");
 const end=source.indexOf("document.addEventListener('submit'",start);
 vm.runInContext(source.slice(start,end),f.context);vm.runInContext('clear();',f.context);
 return {...f,listeners};
}
test('context recovery remounts a failed listing once and reveals only a newly authorized result',async()=>{
 const f=failedListingFixture();let release,reads=0;f.el.hidden=true;
 f.win.PortalGeapaApi.apiGet=()=>{reads++;return new Promise(resolve=>release=resolve);};
 f.listeners['portal:act-context-ready']();f.listeners['portal:act-context-ready']();
 a.equal(reads,1);f.listeners['portal:act-session-suspended']();a.equal(f.el.hidden,true);
 release({ok:true,data:{schemaVersion:'institutional-instruments-view-v1',validUntil:60000}});await flush();
 a.equal(f.el.hidden,false);a.equal(f.el.innerHTML,'authorized list');
});
test('listing failure after suspension exposes safe retry feedback rather than an invisible access gate',async()=>{
 const f=failedListingFixture();let reject;f.win.PortalGeapaApi.apiGet=()=>new Promise((_,r)=>reject=r);
 f.listeners['portal:act-context-ready']();f.listeners['portal:act-session-suspended']();
 reject(vm.runInContext("Error('temporary read unavailable')",f.context));await flush();
 a.equal(f.el.hidden,false);a.equal(f.el.children[0].textContent,'temporary read unavailable');a.equal(f.el.children[1].textContent,'Atualizar');
 a.equal(vm.runInContext('current',f.context),undefined);
});
test('late listing recovery cannot reveal a disposed identity',async()=>{
 const f=failedListingFixture();let release;f.win.PortalGeapaApi.apiGet=()=>new Promise(r=>release=r);
 f.listeners['portal:act-context-ready']();f.listeners['portal:act-session-cleared']();f.el.hidden=true;
 release({ok:true,data:{schemaVersion:'institutional-instruments-view-v1',validUntil:60000}});await flush();
 a.equal(f.el.hidden,true);a.equal(vm.runInContext('current',f.context),undefined);
});
