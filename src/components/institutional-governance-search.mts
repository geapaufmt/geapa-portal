import {esc} from './design-system.mjs';
export const governanceSections={procedures:'Procedimentos',minutes:'Atas',records:'Registros administrativos',archive:'Acervo'} as const;
export type GovernanceSection=keyof typeof governanceSections;
export const archiveCollections={completed:'Procedimentos concluídos',cancelled:'Procedimentos cancelados',minutes:'Atas arquivadas',records:'Registros administrativos',index:'Índice documental'} as const;
export type ArchiveCollection=keyof typeof archiveCollections;
export type GovernanceQuery={section?:GovernanceSection;bucket?:string;query:string;meetingType:string;boardId:string;state:string;from:string;to:string;normVersionId:string;page:number;procedureType?:string;proposer?:string;documentId?:string};
export const emptyGovernanceQuery=():GovernanceQuery=>({query:'',meetingType:'',boardId:'',state:'',from:'',to:'',normVersionId:'',page:1});
export function governanceSearch(q:GovernanceQuery,boards:{id:string;name:string}[]=[],norms:{id:string;label:string}[]=[],pagination?:{page:number;pages:number;total:number},fixedState=false):string{return `<section data-governance-search-area><form data-governance-search><div class="geapa-search-row"><label>Pesquisar título, número e assunto<input type="search" name="query" maxlength="100" value="${esc(q.query)}"></label><button type="submit">Buscar</button></div><details class="geapa-filters"><summary>Filtros documentais</summary><div class="minute-grid"><label ${q.section&&q.section!=='procedures'?'hidden':''}>Tipo de procedimento<input name="procedureType" maxlength="100" value="${esc(q.procedureType||'')}"></label><label ${q.section&&q.section!=='procedures'?'hidden':''}>Proponente (ID da pessoa)<input name="proposer" maxlength="100" value="${esc(q.proposer||'')}"></label><label>Documento relacionado (ID)<input name="documentId" maxlength="100" value="${esc(q.documentId||'')}"></label><label ${q.section&&q.section!=='minutes'?'hidden':''}>Tipo de reunião<input name="meetingType" maxlength="100" value="${esc(q.meetingType)}"></label><label>Gestão<select name="boardId"><option value="">Todas autorizadas</option>${boards.map(b=>`<option value="${esc(b.id)}" ${q.boardId===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><label ${fixedState?'hidden':''}>Situação<select name="state"><option value="">Todas</option>${[['OPEN','Em deliberação'],['APPROVED','Aprovada'],['REJECTED','Rejeitada'],['RECORDED','Registrada'],['INSUFFICIENT_MANIFESTATIONS','Manifestações insuficientes'],['SUSPENDED_COMPOSITION','Composição alterada'],['CONSENT_PENDING','Aguardando aceite'],['DEFENSE_PENDING','Aguardando manifestação'],['CANCELLED','Cancelada'],['DRAFT','Em redação'],['IN_REVIEW','Em conferência'],['CORRECTIONS_REQUESTED','Correções solicitadas'],['ARCHIVED','Arquivada'],['UNDER_REVIEW','Em conferência documental'],['EVIDENCE_PENDING','Evidência pendente']].map(([id,label])=>`<option value="${id}" ${q.state===id?'selected':''}>${label}</option>`).join('')}</select></label><label>De<input name="from" type="date" value="${esc(q.from)}"></label><label>Até<input name="to" type="date" value="${esc(q.to)}"></label><label>Versão normativa<select name="normVersionId"><option value="">Todas autorizadas</option>${norms.map(n=>`<option value="${esc(n.id)}" ${q.normVersionId===n.id?'selected':''}>${esc(n.label)}</option>`).join('')}</select></label></div><button type="submit">Aplicar filtros</button><button type="button" data-governance-clear>Limpar filtros</button></details></form>${pagination?`<div class="geapa-pagination"><span role="status">${pagination.total} registros · página ${pagination.page} de ${pagination.pages}</span><button type="button" data-governance-page="${pagination.page-1}" ${pagination.page<=1?'disabled':''}>Anterior</button><button type="button" data-governance-page="${pagination.page+1}" ${pagination.page>=pagination.pages?'disabled':''}>Próxima</button></div>`:''}</section>`;}

export function scopedQuery(section:GovernanceSection,collection:ArchiveCollection,filters:GovernanceQuery):GovernanceQuery {
 if(section!=='archive')return {...filters,section};
 switch(collection){
  case 'completed':return {...filters,section:'procedures',bucket:'completed'};
  case 'cancelled':return {...filters,section:'procedures',state:'CANCELLED'};
  case 'minutes':return {...filters,section:'minutes',bucket:'archived'};
  case 'records':return {...filters,section:'records'};
  case 'index':return {...filters,section:'archive'};
 }
}

export function governanceNavigation(section:GovernanceSection,collection:ArchiveCollection):string {
 const tabs=Object.entries(governanceSections).map(([id,label])=>
  `<button type="button" role="tab" id="governance-tab-${id}" aria-selected="${id===section}" aria-controls="governance-panel" tabindex="${id===section?0:-1}" data-governance-tab="${id}" aria-current="${id===section?'page':'false'}">${label}</button>`).join('');
 const collections=section==='archive'?`<label>Consultar no acervo<select data-governance-collection>${Object.entries(archiveCollections).map(([id,label])=>`<option value="${id}" ${id===collection?'selected':''}>${label}</option>`).join('')}</select></label>`:'';
 return `<nav role="tablist" class="geapa-module-tabs institutional-tabs" aria-label="Governança e deliberações">${tabs}</nav>${collections}<div role="tabpanel" id="governance-panel" aria-labelledby="governance-tab-${section}" data-governance-panel></div>`;
}

export function mountGovernanceSearch(host:HTMLElement,query:GovernanceQuery,boards:{id:string;name:string}[],norms:{id:string;label:string}[],pagination:{page:number;pages:number;total:number}|undefined,search:(q:GovernanceQuery)=>void,fixedState=false):void {
 const area=document.createElement('div');
 area.innerHTML=governanceSearch(query,boards,norms,pagination,fixedState);
 host.append(area);
 area.addEventListener('submit',event=>{
  event.preventDefault();
  if(!(event.target instanceof HTMLFormElement))return;
  const form=new FormData(event.target),next=emptyGovernanceQuery();
  for(const key of ['query','meetingType','boardId','state','from','to','normVersionId','procedureType','proposer','documentId'] as const) next[key]=String(form.get(key)||'').trim();
  search(next);
 });
 area.addEventListener('click',event=>{
  if(!(event.target instanceof Element))return;
  if(event.target.closest('[data-governance-clear]'))search(emptyGovernanceQuery());
  const button=event.target.closest<HTMLButtonElement>('[data-governance-page]');
  if(button&&!button.disabled)search({...query,page:Number(button.dataset.governancePage)});
 });
}
