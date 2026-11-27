const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {pathToFileURL}=require('node:url');
const {resolve}=require('node:path');

const dom=new JSDOM('<main id="placeholder-content"></main>',{url:'http://localhost/#/admin/gestao-institucional/governance',pretendToBeVisual:true});
const w=dom.window,d=w.document;
for(const key of ['window','location','document','Element','HTMLElement','HTMLFormElement','HTMLInputElement','HTMLSelectElement','HTMLButtonElement','CustomEvent','FormData','Event','MutationObserver','KeyboardEvent'])global[key]=w[key];
w.HTMLElement.prototype.getClientRects=()=>[{}];
const calls=[],posts=[];
const fixture=(q)=>({
 revision:1,canEdit:true,canCreateMinute:true,boards:[{id:'SYN',name:'Gestão sintética'}],
 procedureTypes:[{id:'EXTRAORDINARY_EXTENSION',flowVersion:2,allowedDays:[7]}],
 procedurePeople:[{personId:'PERSON',name:'Interessada',links:[],functions:[{id:'FUN',boardId:'SYN',roleKey:'TESTE'}]}],
 history:[],filters:q,pagination:{page:q.page,pages:2,total:12},
 records:q.section==='procedures'?[{kind:'BOARD_PROCEDURE',id:'P',title:'Procedimento sintético',revision:1,actions:['BP_VOTE','BP_CANCEL'],presentation:{personName:'Interessada',boardName:'Gestão sintética'},procedure:{state:'OPEN',target:{personId:'PERSON'},deadline:null,boardId:'SYN',contentVersion:1,title:'Procedimento',enactment:{state:'NOT_ENACTED',blocks:['MEETING_REQUIRED']},votes:[],electorate:null,openedAt:null}}]:
 q.section==='minutes'?[{id:'M',revision:1,title:'Ata sintética',minutes:{number:'01',contentRevision:1,state:'ARCHIVED',composition:{boardName:'Gestão sintética'}},actions:[]}]:
 [{id:'R',revision:1,title:'Registro sintético',documentaryState:'DRAFT',references:[],body:'Texto interno'}]
});
const answer=q=>({ok:true,data:{schemaVersion:'institutional-instruments-view-v1',section:'governance',index:{instruments:[],versions:[]},items:[],unavailableSections:[],total:0,hiddenCount:0,page:1,pages:1,governance:fixture(q),validUntil:Date.now()+90000}});
let reader=async q=>answer(q);
w.PortalGeapaNavigation={getRotaAtual:()=> 'institutional-governance'};
w.PortalGeapaApi={apiGet:async(route,args)=>{assert.equal(route,'/admin/gestao-institucional');const q=JSON.parse(args.governanceQuery);calls.push(q);return reader(q);},apiPost:async(route,args)=>{posts.push(JSON.parse(args.payload));return {ok:true,data:{request:{},preview:{value:'Conferir'}}};}};
const tick=()=>new Promise(r=>setImmediate(r));
const tab=id=>d.querySelector('[data-governance-tab="'+id+'"]');
const select=async id=>{tab(id).click();await tick();};
const event=name=>d.dispatchEvent(new w.CustomEvent(name));
const submit=f=>f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
const moduleUrl=pathToFileURL(resolve('dist/dev/assets/act-ui/institutional-directory.mjs'));
after(()=>{event('portal:act-session-cleared');w.close();});
test('governance route isolates readers, pagination, components, history and keyboard navigation',async()=>{
 await import(moduleUrl);event('portal:navigationchange');await tick();
 assert.deepEqual([...d.querySelectorAll('[role=tab]')].map(b=>b.textContent),['Procedimentos','Atas','Registros administrativos','Acervo']);
 assert.deepEqual(calls.map(q=>q.section),['procedures']);
 assert.equal(tab('procedures').getAttribute('aria-selected'),'true');
 assert.ok(d.querySelector('[data-board-procedures]'));assert.equal(d.querySelector('[data-minutes-area],[data-governance-new],[data-institutional-search]'),null);
 const primary=d.querySelector('[data-procedure-card] [data-procedure-action=BP_VOTE]');
 assert.ok(primary);assert.ok(d.querySelector('[data-geapa-options] [data-procedure-action=BP_CANCEL]'));
 primary.click();assert.ok(d.querySelector('[data-procedure-action-form][data-action=BP_VOTE]'));assert.equal(posts.length,0);
 d.querySelector('[data-admin-modal-close]').click();
 const search=d.querySelector('[data-governance-search]');search.elements.query.value='tema';submit(search);await tick();
 d.querySelector('[data-governance-page="2"]').click();await tick();assert.equal(calls.at(-1).page,2);
 tab('procedures').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await tick();
 assert.equal(d.activeElement,tab('minutes'));assert.equal(calls.at(-1).query,'');assert.equal(calls.at(-1).page,1);
 assert.ok(d.querySelector('[data-minute-card]'));assert.equal(d.querySelector('[data-board-procedures]'),null);
 await select('records');assert.ok(d.querySelector('[data-governance-card]'));assert.equal(d.querySelector('[data-minute-card]'),null);
 await select('archive');assert.equal(calls.at(-1).bucket,'completed');assert.equal(d.querySelector('[data-procedure-action]'),null);
 const choice=d.querySelector('[data-governance-collection]');choice.value='minutes';choice.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();
 assert.equal(calls.at(-1).bucket,'archived');assert.ok(d.querySelector('[data-minute-card]'));assert.equal(d.querySelector('[data-minute-new]'),null);
 const index=d.querySelector('[data-governance-collection]');index.value='index';index.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();
 assert.ok(d.querySelector('[data-institutional-search]'));assert.equal(d.querySelector('[data-minute-card]'),null);
 await select('procedures');assert.equal(calls.at(-1).query,'tema');assert.equal(calls.at(-1).page,2);
 const back=new Promise(r=>w.addEventListener('popstate',r,{once:true}));w.history.back();await back;await tick();assert.equal(tab('archive').getAttribute('aria-selected'),'true');assert.equal(d.querySelector('[data-governance-collection]').value,'index');
});
test('late response, expired session, denied and unavailable reads never render an empty authorized collection',async()=>{
 let resolveRead;reader=q=>q.section==='minutes'?new Promise(r=>{resolveRead=()=>r(answer(q));}):Promise.resolve(answer(q));
 await select('minutes');await select('records');resolveRead();await tick();assert.ok(d.querySelector('[data-governance-card]'));assert.equal(d.querySelector('[data-minute-card]'),null);
 await select('minutes');event('portal:act-session-cleared');resolveRead();await tick();assert.equal(d.querySelector('[data-minute-card],[data-governance-tab]'),null);
 reader=async()=>({ok:false,code:'AUTHORIZATION_DENIED'});event('portal:act-context-ready');await tick();
 assert.equal(calls.at(-1).section,'procedures');assert.equal(calls.at(-1).query,'');assert.match(d.querySelector('[role=alert]').textContent,/não autorizado/);
 reader=async()=>{throw Error('Falha transitória');};d.querySelector('[data-institutional-refresh]').click();await tick();assert.match(d.querySelector('[role=alert]').textContent,/Falha transitória/);
 reader=async q=>{const result=answer(q);delete result.data.governance;return result;};await select('records');assert.match(d.querySelector('[data-governance-panel]').textContent,/indisponível/);
 reader=async q=>{const result=answer(q);result.data.governance.records=[];result.data.governance.pagination.total=0;return result;};await select('minutes');assert.match(d.querySelector('[data-governance-panel]').textContent,/Nenhum registro encontrado nesta consulta autorizada/);
});
test('extraordinary proposal uses the advertised workflow and keeps the ordinary voting command',async()=>{
 reader=async q=>answer(q);await select('procedures');d.querySelector('[data-procedure-new]').click();
 const f=d.querySelector('[data-procedure-form]');assert.ok(f.querySelector('[data-proposal-description]').disabled);
 f.elements.personId.value='PERSON';f.elements.personId.dispatchEvent(new w.Event('change',{bubbles:true}));f.elements.functionId.value='FUN';f.elements.endDate.value='2027-01-31';f.elements.individualGrounds.value='Fundamento individual sintético para o ensaio.';f.elements.reason.value='Justificativa sintética.';
 submit(f);await tick();const input=posts.at(-1).payload;assert.equal(input.action,'BP_CREATE');assert.deepEqual(Object.keys(input.proposal).sort(),['days','documents','flowVersion','individualGrounds','target','type']);assert.equal(input.proposal.flowVersion,2);assert.equal(input.proposal.target.functionId,'FUN');assert.equal(posts.at(-1).phase,'preview');
});
