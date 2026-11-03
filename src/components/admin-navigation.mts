import {esc,openDetailDialog,closeDetailDialog} from './design-system.mjs';
export const groups=[
 {id:'people',label:'Pessoas',items:[['admin-membros','Pessoas'],['perfis-permissoes','Perfis e permissões'],['admin-correcoes-cadastrais','Correções cadastrais'],['admin-solicitacoes-vinculo','Solicitações de vínculo']]},
 {id:'activities',label:'Atividades',items:[['admin-atividades','Atividades'],['admin-apresentacoes','Apresentações'],['admin-justificativas','Justificativas'],['admin-eixos-tematicos','Eixos temáticos']]},
 {id:'institutional',label:'Gestão Institucional',items:[['institutional-identity','Identidade e contatos'],['institutional-parameters','Parâmetros operacionais'],['institutional-norms','Normas e documentos'],['institutional-governance','Governança e deliberações']]}
] as const;
export type Hint={schemaVersion:string;director:boolean;validUntil:number;routes:Record<string,boolean>};
type Route={id:string;path?:string;hash?:string;label:string;mostrarNoMenu?:boolean};
type Nav={atualizarMenu?:()=>void;getRotaAtual:()=>string;getRequestedRoute:()=>string;isAccessGateVisible:()=>boolean;getRotas:()=>Route[];canAccessRoute:(session:null,route:Route)=>boolean};
type Host=Window&{PortalGeapaNavigation?:Nav;PortalDevContext?:{authenticated?:boolean;accessPending?:boolean;act?:{available?:boolean;navigation?:Hint}};PortalAdminNavigation?:{isDirector:typeof isDirector;restricted:typeof restricted;sideRoutes:typeof sideRoutes;isModuleActive:typeof isModuleActive;mount:typeof mount}};
export function validHints(value:Hint|undefined,now=Date.now()):boolean{return !!value&&value.schemaVersion==='admin-navigation-hints-v1'&&Number.isFinite(value.validUntil)&&value.validUntil>now;}
export function isDirector():boolean{if(typeof window==='undefined')return false;const c=(window as Host).PortalDevContext;return !!c?.authenticated&&!c.accessPending&&!!c.act?.available&&validHints(c.act.navigation)&&c.act.navigation?.director===true;}
const reason='Seu acesso atual não habilita esta funcionalidade neste escopo. A autorização depende da função vigente, da competência e das condições definidas pelo Core.';
export function restricted(label:string,explanation=reason):string{return `<span class="geapa-restricted" data-geapa-discovery><button type="button" disabled aria-disabled="true"><span aria-hidden="true">🔒</span> ${esc(label)}</button><button type="button" class="geapa-restriction-info" data-geapa-explain="${esc(explanation)}" data-geapa-feature="${esc(label)}" aria-label="Por que ${esc(label)} está indisponível?">ⓘ</button></span>`;}
export function renderSections(label:string,items:{label:string;href:string;allowed:boolean;current:boolean}[],transparent:boolean):string{
 return `<nav class="geapa-module-tabs institutional-tabs" aria-label="Seções de ${esc(label)}">${items.filter(v=>v.allowed||transparent).map(v=>v.allowed?`<a href="${esc(v.href)}"${v.current?' aria-current="page"':''}>${esc(v.label)}</a>`:restricted(v.label)).join('')}</nav>`;
}
export function sideRoutes<T extends Route>(routes:T[],all:T[],allowed:(r:T)=>boolean,transparent:boolean):T[]{
 const grouped=new Set<string>(groups.flatMap(g=>g.items.map(([id])=>id))),result=routes.filter(r=>!grouped.has(r.id));
 for(const group of groups){const entries=group.items.map(([id])=>all.find(r=>r.id===id)).filter((r):r is T=>!!r),first=entries.find(allowed),root=entries[0];if(first)result.push({...first,label:group.label});else if(transparent&&root)result.push({...root,label:group.label});}
 return result;
}
export function isModuleActive(route:string,current:string):boolean{return route===current||groups.some(g=>g.items.some(([id])=>id===route)&&g.items.some(([id])=>id===current));}
let timer:ReturnType<typeof setTimeout>|undefined,dialog:HTMLElement|undefined;
function mount(){const host=window as Host,nav=host.PortalGeapaNavigation,app=document.getElementById('portal-app');if(!nav||!app)return;const current=nav.isAccessGateVisible?.()?nav.getRequestedRoute():nav.getRotaAtual(),group=groups.find(g=>g.items.some(([id])=>id===current));let target=document.getElementById('geapa-module-navigation');clearTimeout(timer);
 const expiry=host.PortalDevContext?.act?.navigation?.validUntil;if(expiry&&expiry>Date.now())timer=setTimeout(()=>{if(!isDirector()){close();document.querySelectorAll('[data-geapa-discovery]').forEach(el=>el.remove());}nav.atualizarMenu?.();mount();},Math.min(expiry-Date.now()+1,2147483647));
 if(!isDirector())close();
 if(!group||!host.PortalDevContext?.authenticated){target?.remove();return;}
 const all=nav.getRotas(),items=group.items.map(([id,label])=>{const route=all.find(r=>r.id===id);return {label,href:'#/'+(route?.path||''),allowed:!!route&&nav.canAccessRoute(null,route),current:id===current};});
 const html=renderSections(group.label,items,isDirector());if(!items.some(i=>i.allowed)&&!isDirector()){target?.remove();return;}
 if(!target){target=document.createElement('div');target.id='geapa-module-navigation';app.prepend(target);}if(target.innerHTML!==html)target.innerHTML=html;

}
function close(){if(dialog){const d=dialog;dialog=undefined;closeDetailDialog(d,true);d.remove();}}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 (window as Host).PortalAdminNavigation=Object.freeze({isDirector,restricted,sideRoutes,isModuleActive,mount});
 for(const name of ['portal:navigationchange','portal:navigationdenied','portal:menuupdated','portal:members-session-ready','portal:act-session-cleared','portal:act-context-ready'])document.addEventListener(name,()=>{if(name==='portal:act-context-ready')(window as Host).PortalGeapaNavigation?.atualizarMenu?.();if(name==='portal:act-session-cleared'||name==='portal:navigationchange')close();mount();});
 document.addEventListener('click',e=>{const button=e.target instanceof Element?e.target.closest<HTMLElement>('[data-geapa-explain]'):null;if(!button)return;e.preventDefault();e.stopPropagation();close();const d=document.createElement('div');dialog=d;d.className='modal-backdrop';d.hidden=true;const n=(window as Host).PortalGeapaNavigation,r=n?.getRotas().find(v=>v.id==='perfis-permissoes'),can=!!r&&!!n?.canAccessRoute(null,r);
 d.innerHTML=`<section class="modal-panel geapa-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="geapa-restriction-title"><header class="modal-topbar"><h2 id="geapa-restriction-title">${esc(button.dataset.geapaFeature)}</h2><button type="button" data-admin-modal-close aria-label="Fechar explicação">×</button></header><p>${esc(button.dataset.geapaExplain)}</p><p>Conhecer a funcionalidade não concede acesso aos seus dados nem permite executar operações.</p>${can?'<a href="#/admin/pessoas/perfis-permissoes">Consultar Perfis e permissões</a>':'<p>A consulta de Perfis e permissões também depende de autorização institucional.</p>'}</section>`;document.body.append(d);openDetailDialog(d,()=>{d.remove();if(dialog===d)dialog=undefined;});});
 mount();
}
