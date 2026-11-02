// Compose existing SELF readers. Their shared projection coalesces the server
// read; no new authority, endpoint or institutional role is created here.
export async function readMyActivity(members){
 if(members.tenures){
  const [status,result]=await Promise.all([members.status(),members.tenures()]),presentation=result.data,tenures=presentation.tenures,current=tenures.filter(t=>t.status==='CURRENT');
  return {data:{membership:status.data,presentation,history:tenures.filter(t=>t.status==='ENDED'),upcoming:tenures.filter(t=>!['CURRENT','ENDED'].includes(t.status)),board:current.filter(t=>t.group==='DIRETORIA'),advisory:current.filter(t=>t.group==='ASSESSORIA'),council:current.filter(t=>t.group==='CONSELHO'),other:current.filter(t=>!['DIRETORIA','ASSESSORIA','CONSELHO'].includes(t.group))}};
 }
 const [status,functions,history]=await Promise.all([members.status(),members.currentFunctions(),members.functionHistory()]);
 const rows=[...new Map(functions.data.map(f=>[f.idVigencia,f])).values()];
 return {data:{membership:status.data,history:history.data,board:rows.filter(f=>f.group==='DIRETORIA'),advisory:rows.filter(f=>f.group==='ASSESSORIA'),council:rows.filter(f=>f.group==='CONSELHO'),other:rows.filter(f=>!['DIRETORIA','ASSESSORIA','CONSELHO'].includes(f.group))}};
}
export function renderMyActivity(data,escape,statusLabels){
 if(data.presentation&&globalThis.PortalInstitutionalTenure)return globalThis.PortalInstitutionalTenure.activity(data,statusLabels);
 const sections=[['Diretoria atual',data.board],['Assessorias',data.advisory],['Conselho',data.council],['Outras funções',data.other],['Histórico de atuação',data.history||[]]];
 return '<section><h3>Vínculo atual</h3><p>'+escape(statusLabels[data.membership.state]||data.membership.state)+'</p></section>'+sections.filter(([,rows])=>rows.length).map(([title,rows])=>'<section class="situation-section"><h3>'+title+'</h3>'+rows.map(f=>'<article><h4>'+escape(f.roleKey.replaceAll('_',' '))+'</h4><p>Início: '+escape(f.startDate)+'</p>'+(f.endDateReal||f.endDatePlanned?'<p>Fim: '+escape(f.endDateReal||f.endDatePlanned)+'</p>':'')+'<p>Gestão: '+escape(f.idDiretoria)+'</p></article>').join('')+'</section>').join('');
}
