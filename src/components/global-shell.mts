// Presentation only: routes remain resolved by the existing navigation contract.
type Route={id:string;label:string;grupoMenu:string;status:string};
type Navigation={getAllowedRoutes():Route[];getRotaAtual():string;fecharMenu():void};
type Context={authenticated?:boolean;accessPending?:boolean;enrollment?:boolean};
export function personalRoutes(routes:Route[],context:Context):Route[]{
 if(!context.authenticated||context.accessPending)return [];
 return routes.filter(r=>r.grupoMenu==='meu-vinculo'&&r.status==='implementado');
}
export function greeting(name:string){const words=name.trim().split(/\s+/).filter(Boolean);return {label:words[0]?'Olá, '+words[0]:'Minha conta',initial:words[0]?.charAt(0).toLocaleUpperCase('pt-BR')||'•'};}
export function setupGlobalShell(nav:Navigation,context:()=>Context){
 const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
 const host=el('personal-menu'),button=el<HTMLButtonElement>('personal-toggle'),panel=el('personal-panel'),links=el('personal-links'),identity=el('usuario-contexto'),status=el('estado-acesso'),sidebar=el('portal-sidebar'),toggle=el<HTMLButtonElement>('menu-toggle'),header=document.querySelector<HTMLElement>('.portal-header')!;
 const close=(focus=false)=>{panel.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
 function update(){const c=context();host.hidden=!c.authenticated;if(host.hidden){close();identity.textContent='';}
  const name=greeting(identity.hidden?'':identity.textContent||'');button.querySelector('.personal-greeting')!.textContent=name.label;button.querySelector('.personal-avatar')!.textContent=name.initial;
  const routes=personalRoutes(nav.getAllowedRoutes(),c);if(c.enrollment&&c.authenticated&&!c.accessPending)routes.push({id:'ingresso',label:'Meu ingresso',grupoMenu:'meu-vinculo',status:'implementado'});
  // Preserve keyboard focus when the context notification carries no UI change.
  const signature=JSON.stringify(routes.map(r=>[r.id,r.label]))+nav.getRotaAtual();if(links.dataset.signature!==signature){links.replaceChildren();for(const r of routes){const b=document.createElement('button');b.type='button';b.dataset.routeTarget=r.id;b.textContent=r.label;if(r.id===nav.getRotaAtual())b.setAttribute('aria-current','page');links.append(b);}links.dataset.signature=signature;}
  el('personal-status').textContent=status.textContent;
  el('session-retry').hidden=c.authenticated===true||!['ERROR','BLOCKED'].includes(status.dataset.state||'');
 }
 button.addEventListener('click',()=>{if(panel.hidden){nav.fecharMenu();panel.hidden=false;button.setAttribute('aria-expanded','true');(panel.querySelector('button') as HTMLElement|null)?.focus();}else close();});
 el('session-retry').addEventListener('click',()=>el('atualizar-acesso').click());
 panel.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))close();});
 document.addEventListener('pointerdown',e=>{if(!host.contains(e.target as Node))close();});
 document.addEventListener('focusin',e=>{if(!host.contains(e.target as Node))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!panel.hidden){e.preventDefault();close(true);}else if(toggle.getAttribute('aria-expanded')==='true'){nav.fecharMenu();toggle.focus();}}
  if(e.key==='Tab'&&toggle.getAttribute('aria-expanded')==='true'&&matchMedia('(max-width: 899px)').matches){const items=[...sidebar.querySelectorAll<HTMLElement>('button:not([hidden]),summary,a[href]')].filter(n=>n.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 });
 panel.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const items=[...panel.querySelectorAll<HTMLButtonElement>('button:not([hidden])')],index=items.indexOf(document.activeElement as HTMLButtonElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();});
 toggle.addEventListener('click',()=>{close();if(toggle.getAttribute('aria-expanded')==='true')(sidebar.querySelector('summary,button,a') as HTMLElement|null)?.focus();});
 document.addEventListener('portal:menuupdated',update);document.addEventListener('portal:navigationchange',()=>{close();update();const title=document.querySelector<HTMLElement>('#portal-app section:not([hidden]) h2, #portal-app section:not([hidden]) h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}});
 new MutationObserver(update).observe(identity,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 new MutationObserver(update).observe(status,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});
 // Real header height is shared by drawer and backdrop, including zoom/rotation.
 new ResizeObserver(()=>document.documentElement.style.setProperty('--portal-header-height',header.getBoundingClientRect().height+'px')).observe(header);
 update();
}
