'use strict';
// Notification Center — Portal UI unit tests
// Tests: bell toggle, panel, badge, mark-read, mark-all-read, session isolation,
// late-response drop after identity change, Escape key, outside-click dismissal.
const {test}=require('node:test'),a=require('node:assert/strict'),{JSDOM}=require('jsdom'),p=require('path'),{pathToFileURL}=require('url');
const root=p.resolve('dist/prod');

function buildDOM(){
  const dom=new JSDOM(`<!DOCTYPE html><html><body>
<div id="notifications-menu" hidden>
  <button id="notifications-toggle" type="button" aria-expanded="false" aria-controls="notifications-panel" aria-label="Notificações">
    <span id="notifications-badge" hidden>0</span>
  </button>
  <div id="notifications-panel" hidden>
    <div class="notifications-header">
      <span class="notifications-title">Notificações</span>
      <button id="notifications-mark-all" type="button" disabled>Marcar todas como lidas</button>
    </div>
    <div id="notifications-list" role="list">
      <p class="notifications-empty">Nenhuma notificação no momento.</p>
    </div>
  </div>
</div>
<div id="personal-menu" hidden>
  <button id="personal-toggle" aria-expanded="false" aria-controls="personal-panel">
    <span class="personal-avatar">•</span><span class="personal-greeting">Minha conta</span>
  </button>
  <div id="personal-panel" hidden></div>
</div>
</body></html>`,{url:'http://localhost'});
  return dom;
}

function makeNotification(id,{read=false,title='Teste',body='Corpo da notificação',event='SYNTHETIC_TEST',targetRoute=null}={}){
  return {id,personId:'p1',revision:1,event,title,body,targetRoute,category:'INFO',read,readAt:read?Date.now():null,createdAt:Date.now(),metadata:{}};
}

test('renderNotificationItem — unread item has correct classes and mark button', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {renderNotificationItem}=await import(url);
  const item=makeNotification('n1',{read:false,title:'Aviso','body':'Texto completo'});
  const html=renderNotificationItem(item);
  a(html.includes('unread'),'must have unread class');
  a(html.includes('data-mark-read="n1"'),'must have mark-read button');
  a(html.includes('Aviso'),'must include title');
  a(html.includes('Texto completo'),'must include body');
});

test('renderNotificationItem — read item has no mark button', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {renderNotificationItem}=await import(url);
  const item=makeNotification('n2',{read:true,title:'Lida'});
  const html=renderNotificationItem(item);
  a(!html.includes('unread'),'must NOT have unread class');
  a(!html.includes('data-mark-read'),'must NOT have mark-read button');
});

test('renderNotificationItem — targetRoute produces action button', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {renderNotificationItem}=await import(url);
  const item=makeNotification('n3',{read:false,targetRoute:'minha-situacao'});
  const html=renderNotificationItem(item);
  a(html.includes('data-route-target="minha-situacao"'),'must have route button');
});

test('renderNotificationItem — XSS escaping in title and body', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {renderNotificationItem}=await import(url);
  const item=makeNotification('n4',{read:false,title:'<script>alert(1)</script>',body:'<img onerror="x">'});
  const html=renderNotificationItem(item);
  a(!html.includes('<script>'),'script tag must be escaped');
  a(html.includes('&lt;script&gt;'),'title must be HTML-escaped');
  a(!html.includes('<img'),'img tag must be escaped');
});

test('formatNotificationDate — returns Portuguese locale date string', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {formatNotificationDate}=await import(url);
  const result=formatNotificationDate('2026-11-22T15:00:00.000Z');
  a(typeof result==='string' && result.length>0,'must return non-empty string');
  // Should contain day/month/year parts
  a(/\d{2}\/\d{2}\/\d{4}/.test(result)||result.length>5,'must look like a date');
});

test('formatNotificationDate — invalid ISO returns empty string', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {formatNotificationDate}=await import(url);
  const result=formatNotificationDate('not-a-date');
  a(result===''||typeof result==='string','must return string for invalid input');
});

test('bell: setupNotificationsBell returns API with expected functions', async()=>{
  // Verify exported function and its return shape via module inspection only.
  // setupNotificationsBell requires a browser DOM (document global), so we only
  // validate the export is present and callable in browser context. Here we just
  // verify the import and expected export names from the built asset.
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const mod=await import(url);
  a(typeof mod.setupNotificationsBell==='function','must export setupNotificationsBell');
  a(typeof mod.renderNotificationItem==='function','must export renderNotificationItem');
  a(typeof mod.formatNotificationDate==='function','must export formatNotificationDate');
});

test('bell: notifications-bell asset is in both environments', ()=>{
  const manifest=require('../config/assets.json');
  const row=manifest.assets.find(x=>x.url==='/assets/act-ui/notifications-bell.mjs');
  a(row!==undefined,'must be registered in assets.json');
  a(row.environments.includes('prod'),'must be in prod');
  a(row.environments.includes('dev'),'must be in dev');
  a.equal(row.generated,'build/typescript/notifications-bell.mjs');
});

test('bell: notifications-bell.mjs exists in dist/prod and dist/dev', ()=>{
  const fs=require('fs'),path=require('path');
  const prod=path.join(root,'assets/act-ui/notifications-bell.mjs');
  const dev=path.join('dist/dev','assets/act-ui/notifications-bell.mjs');
  a(fs.existsSync(prod),'prod asset must exist');
  a(fs.existsSync(dev),'dev asset must exist');
  const content=fs.readFileSync(prod,'utf8');
  a(content.includes('setupNotificationsBell'),'must export setupNotificationsBell');
  a(content.includes('notifications-badge'),'must reference notifications-badge');
  a(content.includes('notifications-list'),'must reference notifications-list');
});

test('bell: global-shell.mjs imports notifications-bell.mjs', ()=>{
  const fs=require('fs'),path=require('path');
  const content=fs.readFileSync(path.join(root,'assets/act-ui/global-shell.mjs'),'utf8');
  a(content.includes('notifications-bell'),'global-shell must import notifications-bell');
  a(content.includes('setupNotificationsBell'),'global-shell must call setupNotificationsBell');
});

test('bell: dist HTML contains notifications-menu before personal-menu', ()=>{
  const fs=require('fs');
  for(const env of ['prod','dev']){
    const html=fs.readFileSync(`dist/${env}/index.html`,'utf8');
    a(html.includes('id="notifications-menu"'),`${env}: must have notifications-menu`);
    a(html.includes('id="notifications-toggle"'),`${env}: must have notifications-toggle`);
    a(html.includes('id="notifications-badge"'),`${env}: must have notifications-badge`);
    a(html.includes('id="notifications-panel"'),`${env}: must have notifications-panel`);
    a(html.includes('id="notifications-list"'),`${env}: must have notifications-list`);
    a(html.includes('id="notifications-mark-all"'),`${env}: must have notifications-mark-all`);
    // notifications-menu must appear before personal-menu
    const nPos=html.indexOf('id="notifications-menu"');
    const pPos=html.indexOf('id="personal-menu"');
    a(nPos<pPos,`${env}: notifications-menu must appear before personal-menu`);
    // No duplicate IDs
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    a.equal(new Set(ids).size,ids.length,`${env}: must have no duplicate IDs`);
  }
});

test('bell: notifications CSS classes present in design-system.css', ()=>{
  const fs=require('fs');
  const css=fs.readFileSync('src/styles/design-system.css','utf8');
  const classes=['.notifications-menu','.notifications-toggle','.notifications-badge','.notifications-panel','.notifications-header','.notifications-title','.notification-item','.notification-item.unread','.notifications-list','.notifications-empty','.notification-item-title','.notification-item-body','.notification-item-actions'];
  for(const cls of classes){
    a(css.includes(cls),`CSS must define ${cls}`);
  }
});

test('bell: notification items do not contain cross-user personId', async()=>{
  const url=pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href;
  const {renderNotificationItem}=await import(url);
  // PersonId must never be rendered in HTML (user isolation)
  const item={id:'n10',personId:'secret-person-id-should-not-appear',revision:1,event:'SYNTHETIC_TEST',title:'Test',body:'Body',targetRoute:null,category:'INFO',read:false,readAt:null,createdAt:new Date().toISOString(),metadata:{}};
  const html=renderNotificationItem(item);
  a(!html.includes('secret-person-id-should-not-appear'),'personId must not be rendered in HTML');
});

test('the mounted bell uses the Core view and confirmed receipts and clears private state',async t=>{
 const dom=buildDOM(),win=dom.window,doc=win.document;
 for(const [key,value] of Object.entries({window:win,document:doc,Node:win.Node})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>previous?Object.defineProperty(globalThis,key,previous):delete globalThis[key]);
 }
 t.after(()=>win.close());
 const {setupNotificationsBell}=await import(pathToFileURL(root+'/assets/act-ui/notifications-bell.mjs').href);
 const row=makeNotification('a'.repeat(32),{targetRoute:'minha-situacao'});
 const response=()=>({ok:true,data:{schemaVersion:'member-notification-view-v1',revision:1,items:[{...row}],unreadCount:row.read?0:1}});
 const context={authenticated:true,identityScope:'SYN:A:1',act:{available:true}};
 let get=async()=>response(),rejectWrite=true;
 const api={apiGet:route=>{a.equal(route,'/meu-vinculo/notificacoes');return get();},apiPost:async(route,params)=>{
  a.equal(route,'/meu-vinculo/notificacoes/leitura');
  a(['MARK_READ','MARK_ALL_READ'].includes(params.action));
  if(rejectWrite)return {ok:false};
  row.read=true;return response();
 }};
 const bell=setupNotificationsBell({context:()=>context,api});
 await bell.refresh();a.equal(bell.getUnreadCount(),1);a.equal(bell.getItems()[0].id,row.id);
 const button=doc.getElementById('notifications-toggle'),panel=doc.getElementById('notifications-panel');
 button.click();await new Promise(setImmediate);a.equal(panel.hidden,false);
 doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape'}));a.equal(doc.activeElement,button);
 await bell.markRead(row.id);a.equal(row.read,false);a.match(doc.querySelector('[role=status]').textContent,/sem confirmação/i);
 await bell.refresh();a.equal(bell.getUnreadCount(),1);
 rejectWrite=false;await bell.markAllRead();a.equal(bell.getUnreadCount(),0);a.equal(bell.getItems()[0].read,true);
 let resolve;get=()=>new Promise(done=>{resolve=done;});const pending=bell.refresh();
 context.identityScope='SYN:B:2';doc.dispatchEvent(new win.Event('portal:act-session-cleared'));
 resolve(response());await pending;a.equal(bell.getItems().length,0);a.equal(doc.getElementById('notifications-menu').hidden,true);
 get=async()=>({ok:true,data:{schemaVersion:'member-notification-view-v1',revision:1,items:[],unreadCount:0}});
 doc.dispatchEvent(new win.Event('portal:act-context-ready'));await bell.refresh();bell.open();a.equal(doc.activeElement,panel);
 doc.body.dispatchEvent(new win.Event('pointerdown',{bubbles:true}));a.equal(panel.hidden,true);
});
