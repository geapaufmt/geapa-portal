const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const source=()=>fs.readFileSync(path.resolve(__dirname,'../dist/prod/assets/act-ui/attendance-rh.mjs'),'utf8').replace(/^import .*;$/mg,'').replace(/export (function|const)/g,'$1');
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function setup(api){const dom=new JSDOM('<div id="placeholder-content"></div>',{url:'https://test.invalid/#/admin/frequencia-rh'}),{window}=dom;window.PortalGeapaNavigation={getRotaAtual:()=> 'admin-frequencia-rh'};window.PortalGeapaApi={apiGet:api,apiPost:async()=>({ok:true})};const context=vm.createContext({window,document:window.document,Element:window.Element,FormData:window.FormData,Intl,Date,esc,header:(t,d)=>`<h1>${t}</h1><p>${d}</p>`,badge:esc,fact:(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`,card:v=>`<article>${esc(v.title)}${v.factsHtml}${v.footerHtml}</article>`,openDetailDialog(d){d.hidden=false;},closeDetailDialog(d){d.remove();}});vm.runInContext(source(),context);return {window,context,body:()=>window.document.body.textContent,change:id=>{window.PortalRH.selectCycle(id);window.document.dispatchEvent(new window.Event('portal:navigationchange'));}};}
const tick=()=>new Promise(r=>setImmediate(r));
function response(id,absence=0){return {ok:true,data:{cycle:{id,label:id},cycles:[{id:'A',label:'A'},{id:'B',label:'B'}],integrity:'PROVISIONAL',notice:'Dados sintéticos',missingAttendanceActivityIds:[],activities:[],members:[{personId:'P',label:'Pessoa <script>',integrity:'PROVISIONAL',records:[],summary:{totalPresencas:2,faltasLiquidas:absence,totalJustificadas:0,totalAbonadas:0,percentualFrequencia:100},periods:[{absenceLimit:id==='A'?5:2,minimumAttendanceBasisPoints:id==='A'?8000:9000}]}]}};}
test('RH selects the unique current cycle, never hardcodes GEAPA_2026 or an ambiguous open cycle',()=>{const h=setup(async()=>({ok:false})),choose=(cycles)=>vm.runInContext(`defaultCycle(${JSON.stringify(cycles)},'2026-11-15')`,h.context);a.equal(choose([{id:'A',status:'OPEN',civilStart:'2026-01-01',civilEnd:'2026-12-31'},{id:'B',status:'OPEN',civilStart:'2027-01-01',civilEnd:'2027-12-31'}]),'A');a.equal(choose([{id:'A',status:'OPEN'},{id:'B',status:'OPEN'}]),'');h.window.close();});
test('RH discards a late response from the previous cycle and clears private state on logout',async()=>{const pending={};const h=setup((r,p)=>new Promise(resolve=>pending[p.cycleId]=resolve));h.change('A');h.change('B');pending.B(response('B'));await tick();pending.A(response('A'));await tick();a.equal(h.window.document.querySelector('[data-rh-cycle]').value,'B');h.window.document.querySelector('[data-rh-section="members"]').click();a(h.body().includes('90%'));a(!h.body().includes('80%'));a.equal(h.window.document.querySelectorAll('script').length,0);h.window.document.dispatchEvent(new h.window.Event('portal:act-session-cleared'));a.equal(h.window.PortalRH.cycleId,'');h.window.close();});
test('RH distinguishes zero absences from unproven totals and retains the legacy justification link',async()=>{const h=setup(async(r,p)=>response(p.cycleId,null));h.change('A');await tick();h.window.document.querySelector('[data-rh-section="members"]').click();a(h.body().includes('Não apurado'));h.window.document.querySelector('[data-rh-section="justifications"]').click();a.equal(h.window.location.hash,'#/admin/justificativas');a.equal(h.window.PortalRH.cycleId,'A');const html=vm.runInContext(`content(${JSON.stringify(response('A',0).data)},'members')`,h.context);a(html.includes('<dd>0</dd>'));h.window.close();});

test('RH form takes its document requirement from the authorized response',async()=>{
 for(const rules of [{FOLLOW_UP:true,FORMAL_WARNING:false},undefined,{FOLLOW_UP:'false'}]){
  const detail={cycleId:'A',items:[],institutionalHistory:[],allowedActions:['FOLLOW_UP','FORMAL_WARNING'],
   documentRequiredByAction:rules,canRecord:true,person:{revision:1,links:[{id:'L',type:'Sintético'}]}};
  const h=setup(async route=>route.endsWith('/providencias')?{ok:true,data:detail}:response('A'));
  const posts=[];h.window.PortalGeapaApi.apiPost=async(route,args)=>{posts.push(args);return {ok:true};};
  h.change('A');await tick();h.window.document.querySelector('[data-rh-section="actions"]').click();await tick();
  h.window.document.querySelector('[data-rh-case="P"]').click();await tick();
  const form=h.window.document.querySelector('[data-rh-case-form]'),fields=form.elements;
  fields.reason.value='Decisão sintética para teste';fields.occurrenceDate.value='2026-10-10';
  fields.decisionReference.value='TEST';fields.confirmed.checked=true;
  const send=()=>form.dispatchEvent(new h.window.Event('submit',{cancelable:true,bubbles:true}));
  const button=form.querySelector('button[type=submit]');
  a(form.querySelector('details').open);send();a.equal(posts.length,0);
  if(rules?.FOLLOW_UP===true){
   a(fields.documentReference.required);a(!button.disabled);
   fields.action.value='FORMAL_WARNING';fields.action.dispatchEvent(new h.window.Event('change',{bubbles:true}));
   a(!fields.documentReference.required);a(!form.querySelector('details').open);send();await tick();
   a.equal(posts.length,1);a.equal(posts[0].documentReference,'');
  }else{a(button.disabled);a.match(form.querySelector('[data-rh-document-note]').textContent,/indisponível/);}
  h.window.close();
 }
});

test('consulta individual usa somente a leitura nominal e descarta respostas fora do caso ou da sessão',async()=>{
 const h=setup(()=>{throw Error('consulta administrativa inesperada');});
 const w=h.window,doc=w.document,reads=[];
 w.PortalGeapaNavigation.getRotaAtual=()=>'consulta-providencia';
 w.PortalGeapaApi.readAttendanceCase=(cycle,person)=>new Promise(resolve=>reads.push({cycle,person,resolve}));
 doc.dispatchEvent(new w.Event('portal:navigationchange'));
 const form=doc.querySelector('[data-individual-case]');
 form.elements.cycleId.value='C1';form.elements.personId.value='P1';
 const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const result=(p)=>({ok:true,data:{person:{id:p},cycleId:'C1',items:[{personId:p,cycleId:'C1',state:'OPEN',history:[]}]}});
 submit();a.deepEqual([reads[0].cycle,reads[0].person],['C1','P1']);
 reads[0].resolve(result('P1'));await tick();a.match(h.body(),/Em acompanhamento/);
 a.equal(doc.querySelector('[data-rh-case-form],[data-rh-cycle],[data-rh-section]'),null);
 submit();reads[1].resolve(result('P2'));await tick();a.match(h.body(),/Não foi possível/);a(!h.body().includes('P2'));
 submit();doc.dispatchEvent(new w.Event('portal:act-session-cleared'));reads[2].resolve(result('P1'));await tick();
 a(!h.body().includes('Em acompanhamento'));h.window.close();
});

test('leitor individual envia somente pessoa e ciclo ao transporte protegido',async()=>{
 const {readAttendanceCase}=await import('../src/services/member-operations.mjs');
 const requests=[],reader={read:r=>{requests.push(r);return 'caso';}};
 a.equal(readAttendanceCase(reader,'C1','P1'),'caso');
 for(const ids of [['C1',''],['','P1'],['C1',{}],['../C1','P1']])a.throws(()=>readAttendanceCase(reader,...ids));
 a.deepEqual(requests,[{route:'/admin/frequencia-rh/providencias',params:{cycleId:'C1',personId:'P1'}}]);
});
