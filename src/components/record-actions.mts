/** UI affordances only. The canonical Core authorizes every read and command. */
export type ActionId = 'detail'|'edit'|'review'|'hide'|'publish'|'reopen'|'cancel'|'realize'|'attendance'|'attendance-view'|'window'|'history';
export interface ActivityAction {id: ActionId; label: string; enabled: boolean; reason: string}
const discoverable:ReadonlyArray<readonly [ActionId,string]>=[['edit','Editar'],['review','Conferência administrativa'],['publish','Publicar'],['hide','Ocultar'],['cancel','Cancelar atividade'],['reopen','Reabrir'],['realize','Registrar realização'],['attendance','Gerenciar chamada'],['window','Prazo extraordinário de justificativas']];
export function discoverActions(actions:ActivityAction[],director:boolean):ActivityAction[]{return director?[...actions,...discoverable.filter(([id])=>!actions.some(a=>a.id===id)).map(([id,label])=>({id,label,enabled:false,reason:'🔒 Não habilitado para seu acesso neste recurso. Consulte Perfis e permissões para conhecer as condições institucionais.'}))]:actions;}
interface WindowView {id: string; revision: number; status: string; deadline: number; reason: string; canClose: boolean}
export interface ActivityActions {
  schemaVersion: 'activity-actions-v1'; activityId: string; revision: number; title: string;
  validUntil: number; actions: ActivityAction[];
  extraordinary: null|{eligible: boolean; reason: string; canOpen: boolean; windows: WindowView[]; recipients: {id: string; label: string}[]};
}
export interface PortalApi {
  apiGet(route: string, params: Record<string,string>): Promise<{ok:boolean; data?:unknown; message?:string}>;
  apiPost(route: string, params: {payload:string}): Promise<{ok:boolean; message?:string}>;
}
interface MenuOptions {anchor: HTMLElement; title: string; load: ()=>Promise<unknown>; onSelect: (id:ActionId,data:ActivityActions)=>void}
interface WindowOptions {activityId: string; anchor: HTMLElement; api: PortalApi}
declare global {interface Window {PortalRecordActions: Readonly<{open: typeof openRecordActions; close: typeof closeRecordActions; window: typeof openExceptionalWindow}>}}

const actionIds = new Set<ActionId>(['detail','edit','review','hide','publish','reopen','cancel','realize','attendance','attendance-view','window','history']);
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null;
export function parseActions(value:unknown):ActivityActions {
  if(!object(value)||value.schemaVersion!=='activity-actions-v1'||typeof value.activityId!=='string'||typeof value.title!=='string'||!Number.isSafeInteger(value.revision)||typeof value.validUntil!=='number'||!Array.isArray(value.actions))throw Error('INVALID_ACTION_CONTRACT');
  for(const v of value.actions)if(!object(v)||!actionIds.has(v.id as ActionId)||typeof v.label!=='string'||typeof v.enabled!=='boolean'||typeof v.reason!=='string')throw Error('INVALID_ACTION_CONTRACT');
  const w=value.extraordinary;
  if(w!==null){if(!object(w)||typeof w.eligible!=='boolean'||typeof w.reason!=='string'||typeof w.canOpen!=='boolean'||!Array.isArray(w.windows)||!Array.isArray(w.recipients))throw Error('INVALID_ACTION_CONTRACT');
    for(const r of w.recipients)if(!object(r)||typeof r.id!=='string'||typeof r.label!=='string')throw Error('INVALID_ACTION_CONTRACT');
    for(const r of w.windows)if(!object(r)||typeof r.id!=='string'||!Number.isSafeInteger(r.revision)||typeof r.status!=='string'||typeof r.deadline!=='number'||typeof r.reason!=='string'||typeof r.canClose!=='boolean')throw Error('INVALID_ACTION_CONTRACT');}
  return value as unknown as ActivityActions;
}
const escapes:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>escapes[c]!);
const node=<T extends Element>(parent:ParentNode,selector:string):T=>{const v=parent.querySelector<T>(selector);if(!v)throw Error('UI_ELEMENT_MISSING');return v;};
const eventElement=(event:Event)=>event.target instanceof Element?event.target:null;
const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/act-ui/record-actions.css';document.head.append(css);
let current:{dialog:HTMLDialogElement;anchor:HTMLElement}|null=null,sequence=0;
export function closeRecordActions():void {
  sequence++;if(!current)return;const {dialog,anchor}=current;current=null;dialog.close();dialog.remove();anchor.setAttribute('aria-expanded','false');if(anchor.isConnected)anchor.focus();
}
function closeOnOutside(dialog:HTMLDialogElement,event:MouseEvent):void {
  const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeRecordActions();
}
function positionMenu(anchor:HTMLElement,dialog:HTMLDialogElement):void {
  const r=anchor.getBoundingClientRect(),height=dialog.getBoundingClientRect().height;
  const below=r.bottom+8,above=r.top-height-8;
  const top=below+height<=innerHeight-12?below:above>=12?above:Math.max(12,innerHeight-height-12);
  dialog.style.setProperty('--menu-left',Math.max(12,Math.min(r.right-360,innerWidth-372))+'px');
  dialog.style.setProperty('--menu-top',top+'px');
}
export async function openRecordActions({anchor,title,load,onSelect}:MenuOptions):Promise<void> {
  closeRecordActions();const seq=sequence,dialog=document.createElement('dialog');dialog.className='record-actions';dialog.setAttribute('aria-label','Opções da atividade');
  dialog.innerHTML=`<header><strong>${esc(title)}</strong><button type="button" data-record-close aria-label="Fechar opções">×</button></header><p role="status">Consultando ações permitidas…</p>`;
  document.body.append(dialog);current={dialog,anchor};anchor.setAttribute('aria-haspopup','dialog');anchor.setAttribute('aria-expanded','true');
  dialog.showModal();positionMenu(anchor,dialog);node<HTMLButtonElement>(dialog,'button').focus();
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeRecordActions();});
  dialog.addEventListener('click',e=>{closeOnOutside(dialog,e);if(eventElement(e)?.closest('[data-record-close]'))closeRecordActions();});
  dialog.addEventListener('keydown',e=>{const list=[...dialog.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];if(!list.length)return;const i=list.findIndex(v=>v===document.activeElement);let n:number|undefined;
    if(e.key==='ArrowDown')n=(i+1)%list.length;if(e.key==='ArrowUp')n=i<0?list.length-1:(i-1+list.length)%list.length;if(e.key==='Home')n=0;if(e.key==='End')n=list.length-1;if(n!==undefined){e.preventDefault();list[n]?.focus();}});
  try {
    const data=parseActions(await load());if(seq!==sequence||!dialog.open)return;
    const director=(window as Window&{PortalAdminNavigation?:{isDirector:()=>boolean}}).PortalAdminNavigation?.isDirector()===true;
    const nav=(window as Window&{PortalGeapaNavigation?:{getRotas:()=>{id:string}[];canAccessRoute:(session:null,route:{id:string})=>boolean}}).PortalGeapaNavigation,profiles=nav?.getRotas().find(r=>r.id==='perfis-permissoes'),canProfiles=director&&!!profiles&&!!nav?.canAccessRoute(null,profiles);
    dialog.innerHTML=`<header><div><small>Opções da atividade</small><strong>${esc(data.title||title)}</strong></div><button type="button" data-record-close aria-label="Fechar opções">×</button></header><div role="menu" aria-label="Ações da atividade">${discoverActions(data.actions,director).map(v=>`<button type="button" role="menuitem" data-record-action="${esc(v.id)}" aria-disabled="${!v.enabled}"><span>${esc(v.label)}</span>${v.reason?`<small>${esc(v.reason)}</small>`:''}<span aria-hidden="true">${v.enabled?'›':'🔒'}</span></button>`).join('')}</div><p class="record-note">As permissões são verificadas novamente ao enviar.</p>${canProfiles?'<p><a href="#/admin/pessoas/perfis-permissoes">Perfis e permissões</a></p>':''}`;
    positionMenu(anchor,dialog);dialog.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    dialog.addEventListener('click',e=>{const b=eventElement(e)?.closest<HTMLButtonElement>('[data-record-action]');if(!b||b.getAttribute('aria-disabled')==='true')return;const id=b.dataset.recordAction as ActionId;if(!actionIds.has(id))return;closeRecordActions();onSelect(id,data);});
  }catch {if(seq===sequence&&dialog.open)node(dialog,'[role="status"]').textContent='Não foi possível verificar as ações. Feche e tente novamente.';}
}
export async function openExceptionalWindow({activityId,anchor,api}:WindowOptions):Promise<void> {
  closeRecordActions();const dialog=document.createElement('dialog');dialog.className='record-window';dialog.setAttribute('aria-label','Prazo extraordinário de justificativas');document.body.append(dialog);current={dialog,anchor};const seq=sequence;
  dialog.innerHTML='<p role="status">Consultando prazo e destinatários…</p>';dialog.showModal();
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeRecordActions();});dialog.addEventListener('click',e=>closeOnOutside(dialog,e));
  try {
    const response=await api.apiGet('/act/context',{idAtividade:activityId});if(seq!==sequence||!dialog.open)return;if(!response.ok)throw Error('READ_FAILED');
    const data=parseActions(response.data),w=data.extraordinary;if(!w||data.activityId!==activityId)throw Error('AUTHORIZATION_DENIED');
    const statusLabels:Record<string,string>={OPEN:'Aberto',CLOSED:'Encerrado',CANCELLED:'Cancelado',EXPIRED:'Expirado'};
    dialog.innerHTML=`<header><h2>Prazo extraordinário de justificativas</h2><button type="button" data-dismiss aria-label="Fechar prazo extraordinário">×</button></header><p><strong>${esc(data.title)}</strong><br>${esc(activityId)}</p><p>A atividade está fixada neste formulário. A reabertura permite apenas enviar uma justificativa para análise humana.</p>${w.canOpen?`<form data-context-window><label>Novo prazo — horário de Cuiabá<input name="deadline" type="datetime-local" required></label><label>Destinatários<select name="audience"><option value="ALL">Todos os participantes elegíveis da chamada</option><option value="SELECTED">Selecionar participantes elegíveis</option></select></label><fieldset data-recipients hidden><legend>Participantes com falta elegível</legend>${w.recipients.map(p=>`<label><input type="checkbox" name="personIds" value="${esc(p.id)}">${esc(p.label)}</label>`).join('')||'<p>Nenhum participante elegível.</p>'}</fieldset><label>Motivo<select name="reasonCode" required><option value="">Selecione</option><option value="PORTAL_UNAVAILABLE">Portal indisponível</option><option value="SYSTEM_FAILURE">Falha no sistema</option><option value="ADMINISTRATIVE_REGULARIZATION">Regularização administrativa</option><option value="OTHER_JUSTIFIED">Outro motivo justificado</option></select></label><label>Justificativa administrativa<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Abrir prazo extraordinário</button><p role="status" data-feedback></p></form>`:`<p role="status">${esc(w.reason||'Já existe prazo ativo. Consulte ou encerre esse prazo antes de abrir outro.')}</p>`}<h3>Histórico de prazos</h3>${w.windows.map(v=>`<article><strong>${esc(statusLabels[v.status]||v.status)}</strong><p>Até ${esc(new Date(v.deadline).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}))}</p><p>${esc(v.reason)}</p>${v.canClose?`<form data-context-close data-window-id="${esc(v.id)}" data-revision="${v.revision}"><label>Ação<select name="action"><option value="CLOSE">Encerrar prazo</option><option value="CANCEL">Cancelar prazo</option></select></label><label>Justificativa administrativa<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Confirmar encerramento</button><p role="status" data-feedback></p></form>`:''}</article>`).join('')||'<p>Nenhuma janela registrada.</p>'}`;
    const dismiss=node<HTMLButtonElement>(dialog,'[data-dismiss]');dismiss.onclick=closeRecordActions;dismiss.focus();
    dialog.querySelector<HTMLSelectElement>('[name="audience"]')?.addEventListener('change',e=>{node<HTMLElement>(dialog,'[data-recipients]').hidden=(e.currentTarget as HTMLSelectElement).value!=='SELECTED';});
    dialog.addEventListener('submit',async e=>{
      e.preventDefault();const f=e.target;if(!(f instanceof HTMLFormElement)||f.dataset.busy==='true')return;
      const values=new FormData(f),feedback=node<HTMLElement>(f,'[data-feedback]'),opening=f.hasAttribute('data-context-window');let payload:Record<string,unknown>;
      if(opening){const ids=values.get('audience')==='SELECTED'?values.getAll('personIds'):[];if(values.get('audience')==='SELECTED'&&!ids.length){feedback.textContent='Selecione pelo menos um participante.';return;}payload={activityIds:[activityId],personIds:ids,deadline:Date.parse(String(values.get('deadline'))+':00-04:00'),reasonCode:values.get('reasonCode'),reason:values.get('reason')};}
      else payload={id:f.dataset.windowId,revision:Number(f.dataset.revision),action:values.get('action'),reason:values.get('reason')};
      const submit=node<HTMLButtonElement>(f,'button');f.dataset.busy='true';submit.disabled=true;feedback.textContent='Confirmando operação…';
      try{const answer=await api.apiPost('/admin/justificativas/janelas/'+(opening?'abrir':'encerrar'),{payload:JSON.stringify(payload)});if(!answer.ok)throw Error(answer.message||'Não foi possível confirmar.');if(seq!==sequence||!dialog.open)return;await openExceptionalWindow({activityId,anchor,api});}
      catch(error){if(seq===sequence&&dialog.open)feedback.textContent=error instanceof Error?error.message:'Não foi possível confirmar. O próximo envio consulta a operação pendente antes de criar outra.';}
      finally{if(f.isConnected){f.dataset.busy='false';submit.disabled=false;}}
    });
  }catch{if(seq===sequence&&dialog.open){dialog.innerHTML='<button data-dismiss>Fechar</button><p role="alert">Não foi possível consultar o prazo ou seu acesso não permite esta operação.</p>';node<HTMLButtonElement>(dialog,'button').onclick=closeRecordActions;}}
}
document.addEventListener('portal:act-session-cleared',closeRecordActions);document.addEventListener('portal:navigationchange',closeRecordActions);
window.PortalRecordActions=Object.freeze({open:openRecordActions,close:closeRecordActions,window:openExceptionalWindow});
