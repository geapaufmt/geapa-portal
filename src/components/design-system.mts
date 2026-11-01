// Labels from the canonical reader only; never infer a semester from dates or IDs.
export function academicSemesterLabel(row: Record<string, unknown>): string {
  const text=(v:unknown)=>typeof v==='string'?v.trim():'';
  if(text(row.academicSemesterId))return text(row.academicSemesterLabel)||'Semestre não definido';
  if(row.semesterResolution==='HISTORICAL_DECLARED'&&text(row.historicalSemesterLabel))return text(row.historicalSemesterLabel);
  const legacy=text(row.rotuloSemestre);return /^\d{4}\/[12]$/.test(legacy)?legacy:'Semestre não definido';
}
/** Shared presentation only. All actions and data remain authorized by the Core. */
export const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type Sort = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc';
export function ordered<T>(items: readonly T[], order: Sort, fields: {title:(v:T)=>string;date:(v:T)=>string;id:(v:T)=>string}): T[] {
  const text = new Intl.Collator('pt-BR', {numeric:true,sensitivity:'base'});
  return [...items].sort((a,b) => {
    let result: number;
    if(order.startsWith('date')) {
      const av=fields.date(a),bv=fields.date(b);
      // Missing dates always follow dated records, in either direction.
      if(!av || !bv) return av ? -1 : bv ? 1 : text.compare(fields.id(a),fields.id(b));
      result=av.localeCompare(bv);
    } else result=text.compare(fields.title(a),fields.title(b));
    return (order.endsWith('desc') ? -result : result) || text.compare(fields.id(a),fields.id(b));
  });
}
export function pageOf<T>(items: readonly T[], page: number, size=20) {
  const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.min(pages,Math.max(1,Math.trunc(page)||1));
  return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length};
}
export const activeFilters=(filters:Record<string,unknown>):number=>Object.entries(filters).filter(([key,value])=>key!=='ordem' && key!=='texto' && String(value??'').trim()).length;
/** html arguments below are trusted markup built by the existing renderers, never API values. */
export function header(title:string, description:string, actionsHtml='',headingId='',eyebrow='Gestão do GEAPA'):string {
  return `<header class="geapa-page-header"><div><p class="geapa-eyebrow">${esc(eyebrow)}</p><h2${headingId?` id="${esc(headingId)}"`:''}>${esc(title)}</h2><p>${esc(description)}</p></div>${actionsHtml?`<details class="geapa-page-options" data-geapa-options><summary>Opções <span aria-hidden="true">⌄</span></summary><div class="geapa-page-options-panel">${actionsHtml}</div></details>`:''}</header>`;
}
export function sortField(value:string, dates=true):string {
  const options=[...(dates?[['date-asc','Data crescente'],['date-desc','Data decrescente']]:[]),['title-asc',dates?'Título A–Z':'Nome A–Z'],['title-desc',dates?'Título Z–A':'Nome Z–A']];
  return `<label class="geapa-sort"><span>Ordenar por</span><select name="ordem">${options.map(([id,label])=>`<option value="${id}"${value===id?' selected':''}>${label}</option>`).join('')}</select></label>`;
}
export function filters(searchHtml:string,sortHtml:string,fieldsHtml:string,count:number,open:boolean,clearHtml:string):string {
  return `<div class="geapa-search-row">${searchHtml}${sortHtml}</div><details class="geapa-filters" data-geapa-filters${open?' open':''}><summary>Filtros${count?` <span class="geapa-filter-count">${count} ativos</span>`:''}</summary><div class="geapa-filter-fields">${fieldsHtml}</div>${clearHtml}</details>`;
}
export function summary(total:number, noun:string,page:number,pages:number):string {
  return `<div class="geapa-results" role="status"><span><strong>${total}</strong> ${esc(noun)}</span><span>Página ${page} de ${pages}</span></div>`;
}
export function pagination(page:number,pages:number,attribute:string):string {
  if(pages<=1)return '';
  if(!/^data-[a-z-]+$/.test(attribute))throw Error('INVALID_PAGINATION_ATTRIBUTE');
  return `<nav class="geapa-pagination" aria-label="Páginas dos resultados"><button type="button" ${attribute}="prev"${page<=1?' disabled':''}>Anterior</button><span>${page} / ${pages}</span><button type="button" ${attribute}="next"${page>=pages?' disabled':''}>Próxima</button></nav>`;
}
export function badge(label:unknown,secondary=false):string {return `<span class="geapa-badge${secondary?' geapa-badge-secondary':''}">${esc(label)}</span>`;}
export function fact(label:string,value:unknown):string {
  return value===null||value===undefined||value===''?'':`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}
export interface RecordCard {
  id:unknown; title:unknown; titleAttribute:string;
  headHtml?:string; factsHtml:string; statusHtml?:string; footerHtml:string;
}
export function card(record:RecordCard):string {
  if(!/^data-[a-z-]+$/.test(record.titleAttribute))throw Error('INVALID_TITLE_ATTRIBUTE');
  return `<article class="geapa-record" data-geapa-card tabindex="0" aria-label="${esc(record.title)}"><div class="geapa-record-head"><div class="geapa-record-heading"><small class="geapa-record-id">${esc(record.id)}</small><button class="geapa-record-title" type="button" data-geapa-primary ${record.titleAttribute}="${esc(record.id)}">${esc(record.title)}</button></div>${record.headHtml??''}</div><dl class="geapa-record-facts">${record.factsHtml}</dl>${record.statusHtml?`<div class="geapa-record-status">${record.statusHtml}</div>`:''}<div class="geapa-record-foot">${record.footerHtml}</div></article>`;
}
/** Detail renderers accept only already-authorized scalar values. Unknown objects
 * are never expanded into private fields or coerced to '[object Object]'. */
export function detailFacts(items:readonly (readonly [string,unknown])[]):string {
  const rows=items.flatMap(([label,value])=>{
    if(value===null||value===undefined||value===''||!['string','number','boolean'].includes(typeof value))return [];
    return [fact(label,typeof value==='boolean'?(value?'Sim':'Não'):value)];
  });
  return rows.length?`<dl class="geapa-detail-facts">${rows.join('')}</dl>`:'';
}
export function detailSection(title:string,bodyHtml:string):string {
  return bodyHtml?`<section class="geapa-detail-section"><h3>${esc(title)}</h3>${bodyHtml}</section>`:'';
}
/** Only markup from the existing authorized action renderers is accepted. */
export function actionDisclosure(actionsHtml:string):string {
  return actionsHtml?`<details class="geapa-record-options" data-geapa-options><summary>Opções <span aria-hidden="true">⌄</span></summary><div class="geapa-record-options-panel">${actionsHtml}</div></details>`:'';
}
/** Metrics are already computed by the canonical reader; no frequency arithmetic. */
export function metrics(items:readonly (readonly [string,unknown])[]):string {
  return `<dl class="geapa-metrics">${items.filter(([,v])=>v!==null&&v!==undefined&&v!==''&&['string','number','boolean'].includes(typeof v)).map(([label,value])=>fact(label,value)).join('')}</dl>`;
}
export function textMatches(text:string,query:string):boolean {
  const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  return normalize(query).trim().split(/\s+/).every(word=>normalize(text).includes(word));
}
/** Explicitly filters only the currently rendered, already authorized collection. */
export function collectionSearch(label:string,bodyHtml:string,note:string,filtersHtml=''):string {
  return `<section class="geapa-collection" data-geapa-collection><div class="geapa-search-row"><label>${esc(label)}<input type="search" data-geapa-collection-search placeholder="Título, data ou informação exibida"></label><button type="button" data-geapa-collection-clear>Limpar busca</button></div><p class="geapa-detail-note">${esc(note)}</p>${filtersHtml}<p class="geapa-results" role="status" data-geapa-collection-count></p><div data-geapa-collection-items>${bodyHtml}</div></section>`;
}
export function mountCollectionSearch(root:HTMLElement):void {
  root.querySelectorAll<HTMLElement>('[data-geapa-collection]').forEach(scope=>{
    const input=scope.querySelector<HTMLInputElement>('[data-geapa-collection-search]'),status=scope.querySelector<HTMLElement>('[data-geapa-collection-count]');
    if(!input||!status)return;
    const filter=scope.querySelector<HTMLSelectElement>('select[data-geapa-collection-filter]'),active=scope.querySelector<HTMLElement>('[data-geapa-filter-active]');
    const cards=[...scope.querySelectorAll<HTMLElement>('[data-geapa-collection-items] .presentation-action-card,[data-geapa-collection-items] [data-geapa-filterable]')];
    const search=()=>{let visible=0;cards.forEach(card=>{card.hidden=!textMatches(card.textContent??'',input.value)||!!(filter?.value&&card.dataset.geapaStatus!==filter.value);if(!card.hidden)visible++;});if(active)active.textContent=filter?.value?'1 ativo':'';status.textContent=`${visible} de ${cards.length} registros exibidos`+(visible?'':'. Nenhum registro corresponde à busca.');};
    filter?.addEventListener('change',search);input.addEventListener('input',search);scope.querySelector('[data-geapa-collection-clear]')?.addEventListener('click',()=>{input.value='';if(filter)filter.value='';search();input.focus();});search();
  });
}
export function detailHeader(id:unknown,statuses:readonly unknown[],description:unknown=''):string {
  return `<div class="geapa-detail-lead"><small class="geapa-record-id">${esc(id)}</small><div class="geapa-record-status">${statuses.filter(v=>typeof v==='string'&&v).map((v,i)=>badge(v,i>0)).join('')}</div>${typeof description==='string'&&description?`<p class="geapa-detail-description">${esc(description)}</p>`:''}</div>`;
}
type DialogState={origin:HTMLElement|null;onClose:()=>void;observer:MutationObserver;key:(e:KeyboardEvent)=>void;click:(e:MouseEvent)=>void};
const dialogs=new Map<HTMLElement,DialogState>();
function finishDialog(modal:HTMLElement):void {
  const entry=dialogs.get(modal);if(!entry)return;dialogs.delete(modal);
  entry.observer.disconnect();document.removeEventListener('keydown',entry.key,true);modal.removeEventListener('click',entry.click,true);
  entry.onClose();modal.classList.remove('geapa-detail-modal');
  if(![...document.querySelectorAll<HTMLElement>('.modal-backdrop')].some(el=>!el.hidden))document.body.classList.remove('modal-open');
  if(entry.origin?.isConnected&&!entry.origin.closest('[hidden]'))entry.origin.focus();
}
export function closeDetailDialog(modal:HTMLElement|null,force=false):void {
  if(!modal||(!force&&modal.getAttribute?.('aria-busy')==='true'))return;
  if(!force&&modal.getAttribute?.('data-geapa-dirty')==='true'){
    if(!modal.querySelector('[data-discard-prompt]')){
      const prompt=document.createElement('div');prompt.className='geapa-discard-prompt';prompt.setAttribute('data-discard-prompt','');prompt.setAttribute('role','alert');
      prompt.innerHTML='<p>Há alterações não enviadas. Deseja descartá-las?</p><button type="button" data-keep-draft>Continuar editando</button><button type="button" class="secondary-button" data-discard-draft>Descartar e fechar</button>';
      (modal.querySelector('.modal-topbar')??modal).after(prompt);prompt.querySelector<HTMLElement>('button')?.focus();
    }
    return;
  }
  modal.removeAttribute?.('data-geapa-dirty');modal.querySelector('[data-discard-prompt]')?.remove();modal.hidden=true;finishDialog(modal);
}

export function openDetailDialog(modal:HTMLElement,onClose:()=>void=()=>{}):void {
  modal.classList.add('geapa-detail-modal');
  const existing=dialogs.get(modal);if(existing){existing.onClose=onClose;return;}
  const active=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const origin=active?.closest('details:not([open])')?.querySelector<HTMLElement>('summary')??active;
  const panel=modal.querySelector<HTMLElement>('[role="dialog"]')??modal;
  const focusable=()=>[...panel.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(el=>!el.matches(':disabled,[type="hidden"]')&&!el.closest('[hidden]')&&el.getClientRects().length>0);
  const key=(e:KeyboardEvent)=>{
    if(modal.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeDetailDialog(modal);return;}
    if(e.key!=='Tab')return;const list=focusable(),first=list[0],last=list.at(-1);
    if(!first){e.preventDefault();panel.focus();return;}
    if(!panel.contains(document.activeElement)||(e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first)?.focus();}
  };
  const click=(e:MouseEvent)=>{const target=e.target instanceof Element?e.target:null;if(target?.closest('[data-keep-draft]')){e.preventDefault();modal.querySelector('[data-discard-prompt]')?.remove();modal.querySelector<HTMLElement>('input:not([type=hidden]),textarea,select')?.focus();return;}if(target?.closest('[data-discard-draft]')){e.preventDefault();if(modal.getAttribute('aria-busy')!=='true')closeDetailDialog(modal,true);return;}if(e.target===modal||target?.closest('[data-admin-modal-close],[data-admin-vinculo-close],[data-member-registration-close],[data-admin-correction-close],[data-admin-member-close],#fechar-atividade-modal,[data-portal-v2-action="fechar-modal"]')){e.preventDefault();e.stopImmediatePropagation();closeDetailDialog(modal);}};
  const observer=new MutationObserver(()=>{if(modal.hidden)finishDialog(modal);});
  dialogs.set(modal,{origin,onClose,observer,key,click});observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('keydown',key,true);modal.addEventListener('click',click,true);
  modal.hidden=false;document.body.classList.add('modal-open');panel.tabIndex=-1;
  (panel.querySelector<HTMLElement>('.modal-topbar button')??panel).focus();
}
export function install():void {
  const dirty=(e:Event)=>{if(!(e.target instanceof Element))return;e.target.closest<HTMLElement>('[data-geapa-protect-draft]')?.setAttribute('data-geapa-dirty','true');};document.addEventListener('input',dirty);document.addEventListener('change',dirty);
  if(!document.querySelector('link[data-geapa-design]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/act-ui/design-system.css';css.dataset.geapaDesign='';document.head.append(css);}
  const close=(except?:Element)=>document.querySelectorAll<HTMLDetailsElement>('[data-geapa-options][open]').forEach(el=>{if(el!==except)el.open=false;});
  document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;close(target?.closest('[data-geapa-options]')??undefined);if(target?.closest('[data-geapa-options] button,[data-geapa-options] a'))close();});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;document.querySelectorAll<HTMLDetailsElement>('[data-geapa-options][open]').forEach(el=>{el.open=false;el.querySelector<HTMLElement>('summary')?.focus();});});
  document.addEventListener('portal:act-session-cleared',()=>{close();for(const modal of [...dialogs.keys()])closeDetailDialog(modal,true);});
}
declare global {interface Window {PortalDesign: {academicSemesterLabel:typeof academicSemesterLabel;header:typeof header;filters:typeof filters;sortField:typeof sortField;summary:typeof summary;pagination:typeof pagination;ordered:typeof ordered;pageOf:typeof pageOf;badge:typeof badge;fact:typeof fact;card:typeof card;activeFilters:typeof activeFilters;actionDisclosure:typeof actionDisclosure;metrics:typeof metrics;collectionSearch:typeof collectionSearch;mountCollectionSearch:typeof mountCollectionSearch;detailFacts:typeof detailFacts;detailSection:typeof detailSection;detailHeader:typeof detailHeader;openDetailDialog:typeof openDetailDialog;closeDetailDialog:typeof closeDetailDialog};}}
if(typeof window!=='undefined'&&typeof document!=='undefined'){install();window.PortalDesign=Object.freeze({academicSemesterLabel,header,filters,sortField,summary,pagination,ordered,pageOf,badge,fact,card,activeFilters,actionDisclosure,metrics,collectionSearch,mountCollectionSearch,detailFacts,detailSection,detailHeader,openDetailDialog,closeDetailDialog});}
