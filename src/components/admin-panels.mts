/** Presentation of already-authorized DTOs. No policy or domain decision lives here. */
import {esc,header,actionDisclosure,detailFacts,badge} from './design-system.mjs';
export interface Semester {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;cycleId?:string|null}
export interface Cycle {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;configRevision?:string|null;canEdit?:boolean}
export interface Governance {cycles:Cycle[];semesters:Semester[];policies:{id:string;label:string}[];canCreateCycle:boolean;canSaveSemester:boolean}
const date=(value:string)=>!value?'Data não definida':/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value;
export const cycleEditable=(c:Cycle,d:Governance)=>c.status!=='CLOSED'&&(c.canEdit??d.canCreateCycle);
export const interval=(v:{civilStart:string;civilEnd:string})=>`${date(v.civilStart)} – ${date(v.civilEnd)}`;
const labels:Record<string,string>={DRAFT:'Rascunho',OPEN:'Aberto',CLOSED:'Encerrado',PLANNED:'Planejado',ACTIVE:'Ativo'};
export const statusLabel=(value:string)=>labels[value]??value;
export function semesterCard(s:Semester):string {
 return `<article class="geapa-semester" data-geapa-card aria-label="Semestre ${esc(s.label)}" tabindex="0"><button type="button" class="geapa-record-title" data-geapa-primary data-semester-detail="${esc(s.id)}">${esc(s.label)}</button><p>${esc(interval(s))}</p><small>${esc(statusLabel(s.status))}</small></article>`;
}
export function cycleCard(c:Cycle,d:Governance):string {
 const semesters=d.semesters.filter(s=>s.cycleId===c.id);
 const actions=`<button type="button" data-cycle-detail="${esc(c.id)}">Ver detalhes</button>`+(cycleEditable(c,d)?`<button type="button" data-cycle-edit="${esc(c.id)}">Editar ciclo</button><button type="button" data-cycle-associate="${esc(c.id)}">Editar associação de semestres</button>`:'');
 return `<article class="geapa-cycle geapa-record" data-geapa-card tabindex="0" aria-label="Ciclo ${esc(c.label)}"><div class="geapa-record-head"><div><small class="geapa-eyebrow">Ciclo de atividades</small><button type="button" class="geapa-record-title" data-geapa-primary data-cycle-detail="${esc(c.id)}">${esc(c.label)}</button><p class="geapa-cycle-period">${esc(interval(c))}</p></div>${actionDisclosure(actions)}</div><div class="geapa-record-status">${badge(statusLabel(c.status))}<small>Revisão ${esc(c.revision)}</small></div><p class="geapa-config-reference">Configuração institucional: ${c.configRevision?esc(c.configRevision):'Não informada nesta consulta'}</p><details class="geapa-linked-semesters"${semesters.length?' open':''}><summary>Semestres vinculados <span>${semesters.length}</span></summary><div class="geapa-semester-grid">${semesters.map(semesterCard).join('')||'<p class="geapa-detail-note">Nenhum semestre vinculado.</p>'}</div></details></article>`;
}
export function cycleDashboard(d:Governance):string {
 const actions=(d.canCreateCycle?'<button type="button" data-cycle-edit="">Novo ciclo de atividades</button>':'')+(d.canSaveSemester?'<button type="button" data-semester-new>Novo semestre letivo</button>':'')+(d.cycles.some(c=>cycleEditable(c,d))?'<button type="button" data-cycle-association-picker>Associar semestres a ciclo</button>':'');
 const available=d.semesters.filter(s=>!s.cycleId),current=d.cycles.filter(c=>c.status!=='CLOSED'),closed=d.cycles.filter(c=>c.status==='CLOSED');
 return header('Ciclos e semestres','Organize os ciclos de atividades e seus semestres letivos.',actions)+`<div class="geapa-results" role="status"><span>${d.cycles.length} ciclos · ${d.semesters.length} semestres letivos</span></div><section class="geapa-governance-section"><h3>Ciclos de atividades</h3><div class="geapa-cycle-grid">${current.map(c=>cycleCard(c,d)).join('')||'<p class="empty-state">Nenhum ciclo em andamento ou rascunho.</p>'}</div>${closed.length?`<details class="geapa-closed-cycles"><summary>Ciclos encerrados (${closed.length})</summary><div class="geapa-cycle-grid">${closed.map(c=>cycleCard(c,d)).join('')}</div></details>`:''}</section><section class="geapa-governance-section"><h3>Semestres disponíveis <small>${available.length}</small></h3><p class="geapa-detail-note">Semestres sem associação a um ciclo de atividades.</p><div class="geapa-available-semesters">${available.map(semesterCard).join('')||'<p class="empty-state">Todos os semestres estão vinculados.</p>'}</div></section>`;
}
export function cycleDetail(c:Cycle,d:Governance):string {
 return detailFacts([['Identificação',c.label],['Período',interval(c)],['Status',statusLabel(c.status)],['Revisão',c.revision],['Configuração institucional',c.configRevision],['ID',c.id]])+`<h3>Semestres vinculados</h3><div class="geapa-semester-grid">${d.semesters.filter(s=>s.cycleId===c.id).map(semesterCard).join('')||'<p>Nenhum semestre vinculado.</p>'}</div>`;
}
export {cardMainAction,installCardInteractions} from './card-interactions.mjs';
import {installCardInteractions} from './card-interactions.mjs';
if(typeof window!=='undefined'&&typeof document!=='undefined')installCardInteractions();

/** Presentation only: fields and action flags come from existing authorized readers. */
export interface LinkRequest {idSolicitacao:string;tipo:string;modalidade:string;idSemestre?:string;status:string}
const memberLabels:Record<string,string>={DESLIGAMENTO_VOLUNTARIO:'Desligamento voluntário',SUSPENSAO_VOLUNTARIA:'Suspensão voluntária',SUSPENSAO_TEMPORARIA:'Suspensão temporária',DESLIGAMENTO_FIM_SEMESTRE:'Desligamento no fim do semestre',DESLIGAMENTO_APOS_HOMOLOGACAO:'Desligamento após homologação',EM_ANALISE:'Em análise'};
const memberLabel=(v:string)=>memberLabels[v]??v.toLocaleLowerCase('pt-BR').replaceAll('_',' ').replace(/^./,c=>c.toLocaleUpperCase('pt-BR'));
export function linkRequestCard(v:LinkRequest):string {
 return `<article class="geapa-record" data-geapa-card tabindex="0" aria-label="Solicitação ${esc(v.idSolicitacao)}"><div class="geapa-record-head"><div><small class="geapa-record-id">${esc(v.idSolicitacao)}</small><button type="button" class="geapa-record-title" data-geapa-primary data-admin-vinculo-detail="${esc(v.idSolicitacao)}">${esc(memberLabel(v.tipo||''))}</button></div>${badge(memberLabel(v.status||''))}</div>${detailFacts([['Modalidade',memberLabel(v.modalidade||'')],['Semestre de referência',v.idSemestre||'Não informado']])}<p class="geapa-detail-note">Consultar pedido e ações autorizadas</p></article>`;
}
export interface Invitation {enrollmentId:string;name:string;emailMasked?:string;status:string;expired?:boolean;canSend?:boolean;canResend?:boolean;canCancel?:boolean}
export const invitationLabels:Record<string,string>={PRE_REGISTERED:'Aguardando envio',INVITED:'Convite enviado para processamento',ACCEPTED:'Aguardando conclusão cadastral',DECLINED:'Recusado',CANCELLED:'Cancelado',COMPLETED:'Ingresso concluído'};
export function invitationCard(v:Invitation):string {
 const actions=(v.canSend?'<button type="button" data-invitation-action="SEND">Enviar convite</button>':'')+(v.canResend?'<button type="button" data-invitation-action="RESEND">Reenviar convite</button>':'')+(v.canCancel?'<button type="button" data-invitation-action="CANCEL">Cancelar convite</button>':'');
 return `<article class="geapa-record geapa-invitation" data-geapa-filterable data-geapa-status="${esc(v.status)}" data-enrollment-id="${esc(v.enrollmentId)}"><div class="geapa-record-head"><div><small class="geapa-record-id">${esc(v.enrollmentId)}</small><h3>${esc(v.name)}</h3></div>${actions?actionDisclosure(actions):''}</div><p>${esc(v.emailMasked||'Contato não disponível nesta consulta')}</p><div class="geapa-record-status">${badge(invitationLabels[v.status]||v.status)}${v.expired&&v.canResend?badge('Prazo expirado',true):''}</div></article>`;
}
declare global {interface Window {PortalMemberDesign:{linkRequestCard:typeof linkRequestCard;invitationCard:typeof invitationCard;invitationLabels:typeof invitationLabels}}}
if(typeof window!=='undefined')window.PortalMemberDesign=Object.freeze({linkRequestCard,invitationCard,invitationLabels});
