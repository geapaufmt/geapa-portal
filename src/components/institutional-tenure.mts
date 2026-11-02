import {esc,badge,detailFacts,detailSection} from './design-system.mjs';
export type TenureSegment={idVigencia:string;idTermo:string;startDate:string;endDate:string|null;status:string};
export type Tenure={id:string;idVinculo?:string;roleKey:string;group:string;idDiretoria:string;boardName:string;boardStartDate:string;boardEndDate:string;startDate:string;endDate:string|null;status:string;segments:TenureSegment[]};
export type InstitutionalLink={id:string;type:string;startDate:string;endDate:string|null;status:string;state?:string|null};
export type TenurePresentation={schemaVersion:'member-tenure-presentation-v1';asOf:string;links?:InstitutionalLink[];tenures:Tenure[]};
export const institutionalDate=(v:string|null)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):'Não informado';
export const tenureStatus=(v:string)=>({CURRENT:'Em exercício',FUTURE:'Previsto',ENDED:'Encerrado',INACTIVE:'Sem exercício vigente'}[v]||'Situação a conferir');
export function tenureSegments(t:Tenure):string {
 return '<details class="geapa-tenure-segments"><summary>Segmentos de exercício ('+t.segments.length+')</summary>'+t.segments.map(s=>'<div class="geapa-tenure-segment">'+detailFacts([['Semestre de Diretoria',s.idTermo],['Início',institutionalDate(s.startDate)],['Término',institutionalDate(s.endDate)],['Situação temporal',tenureStatus(s.status)]])+'<small>Vigência: '+esc(s.idVigencia)+'</small></div>').join('')+'</details>';
}
export function tenureCard(t:Tenure,label:(v:string)=>string):string {
 return '<article class="geapa-tenure"><header class="geapa-record-head"><h4>'+esc(label(t.roleKey))+'</h4>'+badge(tenureStatus(t.status))+'</header>'+detailFacts([['Gestão',t.boardName||t.idDiretoria],['Exercício individual',institutionalDate(t.startDate)+' – '+institutionalDate(t.endDate)]])+'<p class="geapa-detail-note">Mandato da gestão: '+esc(institutionalDate(t.boardStartDate)+' – '+institutionalDate(t.boardEndDate))+'</p>'+tenureSegments(t)+'</article>';
}
export function institutionalLinks(links:InstitutionalLink[],label:(v:string)=>string):string {
 return links.map(v=>'<article class="geapa-tenure geapa-institutional-link"><header class="geapa-record-head"><h4>'+esc(label(v.type))+'</h4>'+badge(v.status==='CURRENT'?'Atual':v.status==='ENDED'?'Histórico':'Previsto')+'</header><p class="geapa-link-id">ID do vínculo: <span>'+esc(v.id)+'</span></p>'+detailFacts([['Situação',v.state?label(v.state):v.status==='ENDED'?'Vínculo encerrado':v.status==='FUTURE'?'Vínculo previsto':'Não informada'],['Início',institutionalDate(v.startDate)],...(v.endDate?[['Término documentado',institutionalDate(v.endDate)] as [string,string]]:[])])+'</article>').join('');
}
type Activity={membership:{state:string};board:Tenure[];advisory:Tenure[];council:Tenure[];other:Tenure[];history:Tenure[];upcoming?:Tenure[]};
export function renderInstitutionalActivity(data:Activity,labels:Record<string,string>):string {
 const label=(v:string)=>labels[v]||({TESOUREIRO:'Diretoria Financeira',DIRETOR_ADMINISTRATIVO:'Diretoria Administrativa',DIRETOR_RECURSOS_HUMANOS:'Diretoria de Recursos Humanos'}[v])||v.replaceAll('_',' ');
 const sections:[string,Tenure[]][]=[['Diretoria atual',data.board],['Assessorias',data.advisory],['Conselho',data.council],['Outras funções',data.other],['Exercícios previstos ou sem vigência atual',data.upcoming||[]],['Histórico de atuação',data.history]];
 return (data.membership.state?detailSection('Vínculo atual','<p>'+esc(label(data.membership.state))+'</p>'):'')+sections.filter(([,v])=>v.length).map(([title,v])=>detailSection(title,v.map(t=>tenureCard(t,label)).join(''))).join('');
}
declare global {var PortalInstitutionalTenure:{activity:typeof renderInstitutionalActivity};}
if(typeof window!=='undefined')globalThis.PortalInstitutionalTenure={activity:renderInstitutionalActivity};
