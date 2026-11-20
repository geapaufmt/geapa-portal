const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const dom=new JSDOM('<button id="origin">Abrir</button><div id="editor" class="modal-backdrop" hidden data-geapa-protect-draft><section role="dialog"><header class="modal-topbar"><button data-admin-modal-close>Fechar</button></header><input name="title" value="Original"><textarea name="body">Texto</textarea><input name="check" type="checkbox"><select name="state"><option>DRAFT</option><option>OTHER</option></select></section></div>',{runScripts:'outside-only',url:'http://localhost'});
 const w=dom.window;w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{}];};w.eval(fs.readFileSync(p.resolve(__dirname,'../dist/dev/assets/act-ui/design-system.mjs'),'utf8').replace(/^export /gm,''));
 const d=w.document,m=d.querySelector('#editor');d.querySelector('#origin').focus();let closed=0;w.PortalDesign.openDetailDialog(m,()=>closed++);
 return {w,d,m,closed:()=>closed,edit:(selector,value)=>{const e=m.querySelector(selector);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));},key:(key,shiftKey=false)=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key,shiftKey,bubbles:true,cancelable:true})),close:()=>w.PortalDesign.closeDetailDialog(m)};
}
test('PIA discard is outside the long scrolled form; Escape and safe action preserve text, focus and scroll',async()=>{const h=setup();h.edit('textarea','Alteração');const panel=h.m.querySelector('section'),field=h.m.querySelector('textarea');panel.scrollTop=900;field.focus();h.close();const confirm=h.d.querySelector('[role=alertdialog]');a(confirm);a(!h.m.contains(confirm));a(h.m.inert);a.equal(h.d.activeElement.textContent,'Continuar editando');h.key('Tab',true);a.equal(h.d.activeElement.textContent,'Descartar e sair');h.key('Tab');a.equal(h.d.activeElement.textContent,'Continuar editando');h.key('Escape');await tick();a(!h.m.hidden);a(!h.m.inert);a.equal(h.d.activeElement,field);a.equal(panel.scrollTop,900);a.equal(field.value,'Alteração');h.close();h.d.querySelector('[data-keep-draft]').click();await tick();a(!h.m.hidden);a.equal(panel.scrollTop,900);h.w.close();});
test('PIA clean and reverted inputs close without confirmation, including select and checkbox',async()=>{for(const [selector,changed,original]of [['textarea','Novo','Texto'],['input[name=check]',true,false],['select','OTHER','DRAFT']]){const h=setup();await tick();h.edit(selector,changed);a.equal(h.m.dataset.geapaDirty,'true');h.edit(selector,original);h.close();a(h.m.hidden);a.equal(h.d.querySelector('[role=alertdialog]'),null);a.equal(h.closed(),1);h.w.close();}});
test('PIA discard requires explicit decision; no duplicate prompt, busy dispatch or resurrection on logout',async()=>{const h=setup();h.edit('textarea','Novo');h.close();h.close();a.equal(h.d.querySelectorAll('[role=alertdialog]').length,1);h.m.setAttribute('aria-busy','true');h.d.querySelector('[data-discard-draft]').click();await tick();a(!h.m.hidden);h.close();a.equal(h.d.querySelector('[role=alertdialog]'),null);h.m.removeAttribute('aria-busy');h.close();h.d.querySelector('[data-discard-draft]').click();await tick();a(h.m.hidden);a.equal(h.closed(),1);a.equal(h.d.querySelectorAll('.geapa-confirm-modal').length,0);h.w.close();const g=setup();g.edit('textarea','Privado');g.close();g.d.dispatchEvent(new g.w.Event('portal:act-session-cleared'));await tick();a(g.m.hidden);a.equal(g.d.querySelector('[role=alertdialog]'),null);g.w.close();});
test('PIA asynchronous initial form population establishes baseline without ignoring subsequent edits',async()=>{const h=setup();h.m.querySelector('section').insertAdjacentHTML('beforeend','<input name="late" value="Canônico">');await tick();h.edit('[name=late]','Novo');h.edit('[name=late]','Canônico');h.close();a(h.m.hidden);h.w.close();});
test('Vigências subroute guards preserve independent permissions and expiring canonical hints',()=>{const dom=new JSDOM('',{runScripts:'outside-only',url:'http://localhost'}),w=dom.window;w.PortalDevContext={authenticated:true,act:{available:true,board:true,navigation:{schemaVersion:'admin-navigation-hints-v1',validUntil:Date.now()+60000,routes:{'admin-ciclos-semestres':false,'diretoria-competencias':true}}}};w.PortalGeapaAuth={canConfigureActivity:()=>true};w.accessIsPending=()=>false;w.eval(fs.readFileSync(p.resolve(__dirname,'../src/session/navigation.mjs'),'utf8').replace(/^import .*;\r?\n/,''));const nav=w.PortalGeapaNavigation,r=id=>nav.getRotas().find(x=>x.id===id);for(const id of ['admin-ciclos-semestres','admin-semestres-letivos'])a.equal(nav.resolveRouteAccess({},r(id)).ok,false);for(const id of ['diretoria-competencias','historico-diretorias'])a.equal(nav.resolveRouteAccess({},r(id)).ok,true);w.PortalDevContext.act.navigation.validUntil=0;a.equal(nav.resolveRouteAccess({},r('historico-diretorias')).ok,false);a.equal(r('admin-ciclos-semestres').path,'admin/vigencias');dom.window.close();});

test('PDF order participates in discard protection even with identical captions',async()=>{
 for(const caption of ['', 'Mesma legenda']){
  const h=setup();
  h.w.eval(fs.readFileSync(p.resolve(__dirname,'../dist/dev/assets/act-ui/institutional-document-files.mjs'),'utf8')
   .replace(/^import .*;$/mg,'').replace(/^export /gm,'')+'\nwindow.filesFixture={mountFileFields,fileFields};');
  h.w.esc=String;
  h.m.querySelector('section').insertAdjacentHTML('beforeend',h.w.filesFixture.fileFields());
  const files=['A','B'].map(id=>({fileId:id,name:id+'.pdf',mime:'application/pdf',caption,sha256:id}));
  const editor=h.w.filesFixture.mountFileFields(h.m,files,true);
  await tick();
  const move=()=>h.m.querySelector('[data-document-up="1"]').click();
  move();
  a.deepEqual(Array.from(editor.input(),r=>r.fileId),['B','A']);
  h.close();a(h.d.querySelector('[role=alertdialog]'));
  h.d.querySelector('[data-keep-draft]').click();await tick();
  move();await tick();h.close();a(h.m.hidden);a.equal(h.closed(),1);
  editor.dispose();h.w.close();
 }
});

test('Vigências retries a failed semester read in place and performs no write',async()=>{
 const dom=new JSDOM('<main id="functional-governance-content"></main>',{runScripts:'outside-only'}),w=dom.window;
 const calls=[];
 w.PortalDesign={closeDetailDialog(){}};
 w.PortalGeapaNavigation={getRotaAtual:()=> 'admin-semestres-letivos'};
 w.PortalGeapaApi={apiGet:async route=>{calls.push(route);return calls.length===1?{ok:false,message:'Falha sintética'}:{ok:true,data:{}};}};
 w.cycleDashboard=(_data,tab)=>'<h2>'+tab+'</h2>';
 w.eval(fs.readFileSync(p.resolve(__dirname,'../dist/dev/assets/act-ui/functional-governance.mjs'),'utf8').replace(/^import .*;$/gm,''));
 w.document.dispatchEvent(new w.CustomEvent('portal:navigationchange',{detail:{rota:{id:'admin-semestres-letivos'}}}));
 await tick();a.equal(w.document.querySelector('[role=alert]').textContent,'Falha sintética');
 w.document.querySelector('button').click();await tick();
 a.deepEqual(calls,['/admin/ciclos-semestres','/admin/ciclos-semestres']);
 a.equal(w.document.querySelector('h2').textContent,'semesters');w.close();
});
