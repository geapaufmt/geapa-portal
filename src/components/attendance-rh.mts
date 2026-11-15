import {esc,header,badge,fact,card,openDetailDialog} from './design-system.mjs';
type Row=Record<string,any>;
type Host=Window&{PortalGeapaApi:{apiGet:(r:string,p?:Row)=>Promise<Row>};PortalGeapaNavigation?:{getRotaAtual:()=>string};PortalRH?:{cycleId:string;sections:(active:string)=>string;selectCycle:(id:string)=>void}};
const tabs=[['overview','Visão geral'],['members','Membros'],['justifications','Justificativas'],['actions','Providências'],['history','Histórico']];
let cycleId='',section='overview',generation=0,data:Row|undefined;
const host=()=>window as unknown as Host;
export function sections(active:string):string{return `<nav class="geapa-module-tabs" aria-label="Seções de Frequência e RH">${tabs.map(([id,label])=>`<button type="button" data-rh-section="${id}" aria-pressed="${id===active}">${label}</button>`).join('')}</nav>`;}
const value=(v:unknown)=>v===null||v===undefined?'Não apurado':String(v);
const status=(s:string)=>({DEFINITIVE:'Definitiva',PROVISIONAL:'Provisória',INCOMPLETE:'Incompleta'}[s]||s);
function member(m:Row):string{return card({id:m.personId,title:m.label,titleAttribute:'data-rh-person',statusHtml:badge(status(m.integrity)),factsHtml:fact('Presenças',m.summary.totalPresencas)+fact('Faltas líquidas',value(m.summary.faltasLiquidas))+fact('Justificadas / abonadas',`${m.summary.totalJustificadas} / ${m.summary.totalAbonadas}`)+fact('Frequência',m.summary.percentualFrequencia===null?'Não apurada':m.summary.percentualFrequencia+'%')+m.periods.map((p:Row)=>fact('Limite de faltas',value(p.absenceLimit))+fact('Frequência mínima',p.minimumAttendanceBasisPoints===null?'Não estabelecida':p.minimumAttendanceBasisPoints/100+'%')).join(''),footerHtml:'<button type="button" data-rh-person="'+esc(m.personId)+'">Consultar frequência individual</button>'});}
export function content(d:Row,selected:string):string{
 const members=d.members||[];
 if(selected==='members')return `<div class="geapa-record-grid">${members.map(member).join('')}</div>`;
 if(selected==='actions'){const flagged=members.filter((m:Row)=>m.periods.some((p:Row)=>p.atLimit));return `<p>Atingir um limite sinaliza necessidade de análise. Qualquer sanção exige decisão competente e direito de manifestação.</p><div class="geapa-record-grid">${flagged.map(member).join('')}</div>${!flagged.length?'<p>Nenhum limite atingido nos resultados apurados.</p>':''}`;}
 if(selected==='history')return `<p>Histórico de frequência do ciclo selecionado. As decisões institucionais permanentes mantêm sua própria vigência.</p><div class="geapa-record-grid">${members.map(member).join('')}</div>`;
 return `<section aria-label="Integridade da apuração">${badge(status(d.integrity))}<p>${esc(d.notice)}</p><dl class="geapa-detail-facts">${fact('Ciclo',d.cycle.label)+fact('Participantes com registros',members.length)+fact('Chamadas pendentes de conferência',d.missingAttendanceActivityIds.length)}</dl></section><p>Consulte os limites e a frequência de cada pessoa em Membros. Justificativas pendentes podem alterar a apuração.</p>`;
}
function paint(){const el=document.getElementById('placeholder-content');if(!el||!data)return;el.classList.add('geapa-act-workspace');el.innerHTML=header('Frequência e RH','Apuração e acompanhamento administrativo por ciclo.')+`<label>Ciclo institucional<select data-rh-cycle>${data.cycles.map((c:Row)=>`<option value="${esc(c.id)}"${c.id===cycleId?' selected':''}>${esc(c.label)}</option>`).join('')}</select></label>`+sections(section)+`<section aria-live="polite">${content(data,section)}</section>`;}
async function load(){const token=++generation,el=document.getElementById('placeholder-content');if(!el)return;el.textContent='Carregando frequência do ciclo…';try{
 if(!cycleId){const r=await host().PortalGeapaApi.apiGet('/admin/ciclos-semestres',{});if(!r.ok)throw Error(r.message||'Consulta de ciclos indisponível.');const cycles=r.data.cycles||r.data.ciclos||[],open=cycles.filter((c:Row)=>c.status==='OPEN');if(open.length===1)cycleId=open[0].id;else{if(token!==generation)return;el.innerHTML=header('Frequência e RH','Selecione um ciclo institucional.')+`<label>Ciclo institucional<select data-rh-cycle><option value="">Selecione</option>${cycles.map((c:Row)=>`<option value="${esc(c.id)}">${esc(c.label||c.cycleLabel||c.id)}</option>`).join('')}</select></label>`;return;}}
 const selected=cycleId,r=await host().PortalGeapaApi.apiGet('/admin/frequencia-rh',{cycleId:selected});if(token!==generation||selected!==cycleId)return;if(!r.ok)throw Error(r.message||'Não foi possível apurar a frequência.');if(r.data.cycle.id!==selected)throw Error('A resposta não corresponde ao ciclo selecionado.');data=r.data;paint();
 }catch(e){if(token===generation)el.innerHTML=header('Frequência e RH','Consulta indisponível.')+`<p role="alert">${esc((e as Error).message)}</p><button type="button" data-rh-retry>Atualizar consulta</button>`;}}
function selectCycle(id:string){cycleId=id;data=undefined;generation++;if(host().PortalRH)host().PortalRH!.cycleId=id;}
if(typeof window!=='undefined'){
 host().PortalRH={cycleId,sections,selectCycle};
 document.addEventListener('portal:navigationchange',()=>{generation++;if(host().PortalGeapaNavigation?.getRotaAtual()==='admin-frequencia-rh')void load();});
 document.addEventListener('portal:act-session-cleared',()=>{selectCycle('');section='overview';});
 document.addEventListener('portal:justificativas-atualizadas',()=>{data=undefined;if(host().PortalGeapaNavigation?.getRotaAtual()==='admin-frequencia-rh')void load();});
 document.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t.matches('[data-rh-cycle]')){selectCycle(t.value);void load();}});
 document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target.closest<HTMLElement>('[data-rh-section],[data-rh-person],[data-rh-retry]'):null;if(!t)return;
 if(t.hasAttribute('data-rh-retry')){void load();return;}
 if(t.dataset.rhSection){section=t.dataset.rhSection;if(section==='justifications'){host().PortalRH!.cycleId=cycleId;window.location.hash='/admin/justificativas';return;}if(host().PortalGeapaNavigation?.getRotaAtual()!=='admin-frequencia-rh'){window.location.hash='/admin/frequencia-rh';return;}paint();return;}
 const m=data?.members.find((v:Row)=>v.personId===t.dataset.rhPerson);if(!m)return;const dialog=document.createElement('div');dialog.className='modal-backdrop';dialog.hidden=true;dialog.innerHTML=`<section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="rh-member-title"><header class="modal-topbar"><h2 id="rh-member-title">${esc(m.label)}</h2><button type="button" data-admin-modal-close>Fechar</button></header><p>${esc(data!.cycle.label)} · ${esc(status(m.integrity))}</p><dl class="geapa-detail-facts">${m.records.map((r:Row)=>fact(`${r.civilDate||'Data não comprovada'} · ${r.title}`,r.label)).join('')}</dl></section>`;document.body.append(dialog);openDetailDialog(dialog,()=>dialog.remove());
 });
}
