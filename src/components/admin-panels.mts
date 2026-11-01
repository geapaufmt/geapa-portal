/** Presentation of already-authorized DTOs. No policy or domain decision lives here. */
import {esc,header,actionDisclosure,detailFacts,badge} from './design-system.mjs';
export interface Semester {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;cycleId?:string|null}
export interface Cycle {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;configRevision?:string|null}
export interface Governance {cycles:Cycle[];semesters:Semester[];policies:{id:string;label:string}[];canCreateCycle:boolean;canSaveSemester:boolean}
const date=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value;
export const interval=(v:{civilStart:string;civilEnd:string})=>`${date(v.civilStart)} – ${date(v.civilEnd)}`;
const labels:Record<string,string>={DRAFT:'Rascunho',OPEN:'Aberto',CLOSED:'Encerrado',PLANNED:'Planejado',ACTIVE:'Ativo'};
export const statusLabel=(value:string)=>labels[value]??value;
export function semesterCard(s:Semester):string {
 return `<article class="geapa-semester" data-geapa-card aria-label="Semestre ${esc(s.label)}" tabindex="0"><button type="button" class="geapa-record-title" data-geapa-primary data-semester-detail="${esc(s.id)}">${esc(s.label)}</button><p>${esc(interval(s))}</p><small>${esc(statusLabel(s.status))}</small></article>`;
}
export function cycleCard(c:Cycle,d:Governance):string {
 const semesters=d.semesters.filter(s=>s.cycleId===c.id);
 const actions=`<button type="button" data-cycle-detail="${esc(c.id)}">Ver detalhes</button>`+(d.canCreateCycle?`<button type="button" data-cycle-edit="${esc(c.id)}">Editar ciclo</button><button type="button" data-cycle-associate="${esc(c.id)}">Editar associação de semestres</button>`:'');
 return `<article class="geapa-cycle geapa-record" data-geapa-card tabindex="0" aria-label="Ciclo ${esc(c.label)}"><div class="geapa-record-head"><div><small class="geapa-eyebrow">Ciclo de atividades</small><button type="button" class="geapa-record-title" data-geapa-primary data-cycle-detail="${esc(c.id)}">${esc(c.label)}</button><p class="geapa-cycle-period">${esc(interval(c))}</p></div>${actionDisclosure(actions)}</div><div class="geapa-record-status">${badge(statusLabel(c.status))}<small>Revisão ${esc(c.revision)}</small></div><p class="geapa-config-reference">Configuração institucional: ${c.configRevision?esc(c.configRevision):'Não informada nesta consulta'}</p><details class="geapa-linked-semesters"${semesters.length?' open':''}><summary>Semestres vinculados <span>${semesters.length}</span></summary><div class="geapa-semester-grid">${semesters.map(semesterCard).join('')||'<p class="geapa-detail-note">Nenhum semestre vinculado.</p>'}</div></details></article>`;
}
export function cycleDashboard(d:Governance):string {
 const actions=(d.canCreateCycle?'<button type="button" data-cycle-edit="">Novo ciclo de atividades</button>':'')+(d.canSaveSemester?'<button type="button" data-semester-new>Novo semestre letivo</button>':'')+(d.canCreateCycle&&d.cycles.length?'<button type="button" data-cycle-association-picker>Associar semestres a ciclo</button>':'');
 const available=d.semesters.filter(s=>!s.cycleId),current=d.cycles.filter(c=>c.status!=='CLOSED'),closed=d.cycles.filter(c=>c.status==='CLOSED');
 return header('Ciclos e semestres','Organize os ciclos de atividades e seus semestres letivos.',actions)+`<div class="geapa-results" role="status"><span>${d.cycles.length} ciclos · ${d.semesters.length} semestres letivos</span></div><section class="geapa-governance-section"><h3>Ciclos de atividades</h3><div class="geapa-cycle-grid">${current.map(c=>cycleCard(c,d)).join('')||'<p class="empty-state">Nenhum ciclo em andamento ou rascunho.</p>'}</div>${closed.length?`<details class="geapa-closed-cycles"><summary>Ciclos encerrados (${closed.length})</summary><div class="geapa-cycle-grid">${closed.map(c=>cycleCard(c,d)).join('')}</div></details>`:''}</section><section class="geapa-governance-section"><h3>Semestres disponíveis <small>${available.length}</small></h3><p class="geapa-detail-note">Semestres sem associação a um ciclo de atividades.</p><div class="geapa-available-semesters">${available.map(semesterCard).join('')||'<p class="empty-state">Todos os semestres estão vinculados.</p>'}</div></section>`;
}
export function cycleDetail(c:Cycle,d:Governance):string {
 return detailFacts([['Identificação',c.label],['Período',interval(c)],['Status',statusLabel(c.status)],['Revisão',c.revision],['Configuração institucional',c.configRevision],['ID',c.id]])+`<h3>Semestres vinculados</h3><div class="geapa-semester-grid">${d.semesters.filter(s=>s.cycleId===c.id).map(semesterCard).join('')||'<p>Nenhum semestre vinculado.</p>'}</div>`;
}
/** Card surface delegates to its own main button, never to a nested card. */
export function cardMainAction(target:Element,root:Document|HTMLElement=document):HTMLElement|null {
 const card=target.closest<HTMLElement>('[data-geapa-card]');
 if(!card||!root.contains(card)||target.closest('button,a,input,select,textarea,summary,label,[data-geapa-options]'))return null;
 return [...card.querySelectorAll<HTMLElement>('[data-geapa-primary]')].find(el=>el.closest('[data-geapa-card]')===card)??null;
}
export function installCardInteractions(root:Document|HTMLElement=document):()=>void {
 const click=(event:Event)=>{if(!(event.target instanceof Element))return;const e=event as MouseEvent;if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||window.getSelection()?.toString())return;cardMainAction(event.target,root)?.click();};
 const key=(event:Event)=>{const e=event as KeyboardEvent;if(!['Enter',' '].includes(e.key)||!(e.target instanceof HTMLElement)||!e.target.matches('[data-geapa-card]'))return;const action=cardMainAction(e.target,root);if(action){e.preventDefault();action.click();}};
 root.addEventListener('click',click);root.addEventListener('keydown',key);return()=>{root.removeEventListener('click',click);root.removeEventListener('keydown',key);};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installCardInteractions();
