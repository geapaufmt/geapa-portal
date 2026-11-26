/** Presentation of already-authorized DTOs. No policy or domain decision lives here. */
import {esc,header,actionDisclosure,detailFacts,badge} from './design-system.mjs';
export interface Semester {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;cycleId?:string|null}
export interface Cycle {id:string;label:string;civilStart:string;civilEnd:string;status:string;revision:number;configRevision?:string|null;canEdit?:boolean;canManageParameters?:boolean}
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
 const actions=`<button type="button" data-cycle-detail="${esc(c.id)}">Ver detalhes</button><button type="button" data-cycle-parameters="${esc(c.id)}">Gerenciar parâmetros</button>`+(cycleEditable(c,d)?`<button type="button" data-cycle-edit="${esc(c.id)}">Editar ciclo</button><button type="button" data-cycle-associate="${esc(c.id)}">Editar associação de semestres</button>`:'');
 return `<article class="geapa-cycle geapa-record" data-geapa-card tabindex="0" aria-label="Ciclo ${esc(c.label)}"><div class="geapa-record-head"><div><small class="geapa-eyebrow">Ciclo de atividades</small><button type="button" class="geapa-record-title" data-geapa-primary data-cycle-detail="${esc(c.id)}">${esc(c.label)}</button><p class="geapa-cycle-period">${esc(interval(c))}</p></div>${actionDisclosure(actions)}</div><div class="geapa-record-status">${badge(statusLabel(c.status))}<small>Revisão ${esc(c.revision)}</small></div><p class="geapa-config-reference">Configuração institucional: ${c.configRevision?esc(c.configRevision):'Não informada nesta consulta'}</p><details class="geapa-linked-semesters"${semesters.length?' open':''}><summary>Semestres vinculados <span>${semesters.length}</span></summary><div class="geapa-semester-grid">${semesters.map(semesterCard).join('')||'<p class="geapa-detail-note">Nenhum semestre vinculado.</p>'}</div></details></article>`;
}
export function cycleDashboard(d:Governance,section:'cycles'|'semesters'='cycles'):string {
 const actions=(section==='cycles'&&d.canCreateCycle?'<button type="button" data-cycle-edit="">Novo ciclo de atividades</button>':'')+(section==='semesters'&&d.canSaveSemester?'<button type="button" data-semester-new>Novo semestre letivo</button>':'')+(d.cycles.some(c=>cycleEditable(c,d))?'<button type="button" data-cycle-association-picker>Associar semestres a ciclo</button>':'');
 const current=d.cycles.filter(c=>c.status!=='CLOSED'),closed=d.cycles.filter(c=>c.status==='CLOSED');
 const lead=header('Vigências',section==='cycles'?'Ciclos de atividades, parâmetros e planejamento.':'Semestres letivos e suas associações aos ciclos.',actions);
 if(section==='semesters')return lead+`<p class="geapa-results" role="status">${d.semesters.length} semestres letivos</p><div class="geapa-semester-grid">${d.semesters.map(s=>`<section>${semesterCard(s)}<p class="geapa-detail-note">${s.cycleId?`Ciclo: ${esc(d.cycles.find(c=>c.id===s.cycleId)?.label||s.cycleId)}`:'Sem associação a um ciclo'}</p></section>`).join('')||'<p class="empty-state">Nenhum semestre cadastrado.</p>'}</div>`;
 return lead+`<div class="geapa-results" role="status"><span>${d.cycles.length} ciclos · ${d.semesters.length} semestres letivos</span></div><section class="geapa-governance-section"><h3>Ciclos de atividades</h3><div class="geapa-cycle-grid">${current.map(c=>cycleCard(c,d)).join('')||'<p class="empty-state">Nenhum ciclo em andamento ou rascunho.</p>'}</div>${closed.length?`<details class="geapa-closed-cycles"><summary>Ciclos encerrados (${closed.length})</summary><div class="geapa-cycle-grid">${closed.map(c=>cycleCard(c,d)).join('')}</div></details>`:''}</section>`;
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
export interface Invitation {enrollmentId:string;name:string;emailMasked?:string;status:string;expired?:boolean;canSend?:boolean;canResend?:boolean;canCancel?:boolean;canReview?:boolean;canResolve?:boolean;canAmend?:boolean;canConfirmAdmission?:boolean;membershipType?:string|null;approvalReference?:string|null;reviewState?:string;reviewNote?:string}
export const invitationLabels:Record<string,string>={PRE_REGISTERED:'Aguardando convite',INVITED:'Convite disponível no Portal',ACCEPTED:'Aguardando conclusão cadastral',DECLINED:'Recusado',CANCELLED:'Cancelado',COMPLETED:'Ingresso concluído'};
export function invitationCard(v:Invitation):string {
 const acknowledge=v.canReview&&['PENDING','RESOLVED'].includes(v.reviewState||'');
 const reviewActions=(acknowledge?'<button type="button" data-invitation-action="ACKNOWLEDGE">Registrar ciência</button>':'')+
  (v.canReview?'<button type="button" data-invitation-action="REQUEST_CORRECTION">Solicitar correção</button>':'')+
  (v.canResolve?'<button type="button" data-invitation-action="RESOLVE_CORRECTION">Informar correção realizada</button>':'');
 const states:Record<string,string>={PENDING:'Aguardando ciência',ACKNOWLEDGED:'Ciência registrada',CORRECTION_REQUESTED:'Correção solicitada',RESOLVED:'Correção informada'};
 const actions=reviewActions+(v.canConfirmAdmission?'<button type="button" data-invitation-action="CONFIRM_ADMISSION">Confirmar admissão</button>':'')+(v.canAmend?'<button type="button" data-invitation-action="AMEND">Corrigir cadastro</button>':'')+(v.canSend?'<button type="button" data-invitation-action="SEND">Disponibilizar convite</button>':'')+(v.canResend?'<button type="button" data-invitation-action="RESEND">Renovar convite</button>':'')+(v.canCancel?'<button type="button" data-invitation-action="CANCEL">Cancelar convite</button>':'');
 const entry=['INVITED','ACCEPTED'].includes(v.status)?'<p>O candidato deve entrar no Portal com a Conta Google do e-mail cadastrado para acessar <a href="/#/ingresso" target="_blank" rel="noopener">seu ingresso</a>. Nenhum e-mail foi enviado por esta ação.</p>':'';
 return `<article class="geapa-record geapa-invitation" data-geapa-filterable data-geapa-status="${esc(v.status)}" data-enrollment-id="${esc(v.enrollmentId)}"><div class="geapa-record-head"><div><small class="geapa-record-id">${esc(v.enrollmentId)}</small><h3>${esc(v.name)}</h3></div>${actions?actionDisclosure(actions):''}</div>${acknowledge?'<label><input type="checkbox" data-batch-review> Selecionar para ciência</label>':''}<p>${esc(v.membershipType==='MEMBRO_EFETIVO'?'Membro efetivo':v.membershipType==='MEMBRO_INGRESSANTE'?'Membro ingressante':'Categoria ainda não definida')} ${esc(v.approvalReference)}</p>${v.reviewState?' <p>'+esc(states[v.reviewState])+' '+esc(v.reviewNote)+'</p>':''}<p>${esc(v.emailMasked||'Contato não disponível nesta consulta')}</p><div class="geapa-record-status">${badge(invitationLabels[v.status]||v.status)}${v.expired&&v.canResend?badge('Prazo expirado',true):''}</div>${entry}</article>`;
}
declare global {interface Window {PortalMemberDesign:{linkRequestCard:typeof linkRequestCard;invitationCard:typeof invitationCard;invitationLabels:typeof invitationLabels}}}
if(typeof window!=='undefined')window.PortalMemberDesign=Object.freeze({linkRequestCard,invitationCard,invitationLabels});
