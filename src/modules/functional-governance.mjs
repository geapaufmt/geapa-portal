import {frequencySummary,mountFrequencyPlan} from '../act-ui/model-frequency-editor.mjs';
import {cycleDashboard,cycleDetail,semesterCard,interval,statusLabel,cycleEditable} from './admin-panels.mjs';
// Existing Portal facade and command journal. UI visibility grants no authority.
const esc=v=>window.PortalGeapaUi.escaparHtml(String(v??''));
const api=()=>window.PortalGeapaApi;
let generation=0,shown=null;
const field=(name,label,type='text',value='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" required></label>`;
const reason=()=>'<label>Motivo<textarea name="reason" required maxlength="2000"></textarea></label>';
const dates=x=>`${esc(x.civilStart)} – ${esc(x.civilEnd)}`;
async function get(route){const r=await api().apiGet(route,{});if(!r.ok)throw Error(r.message||'Consulta indisponível.');return r.data;}
async function send(route,payload){const r=await api().apiPost(route,{payload:JSON.stringify(payload)});if(!r.ok)throw Error(r.message||'Não foi possível confirmar. Tente novamente para recuperar o mesmo envio.');return r.data;}
function panel(){return document.getElementById('functional-governance-content');}
async function loadCycles(){
 const g=++generation,el=panel();el.textContent='Carregando ciclos e semestres…';
 try{const d=await get('/admin/ciclos-semestres');if(g!==generation)return;shown=d;
  el.classList.add('geapa-admin','geapa-governance');el.innerHTML=cycleDashboard(d);
 }catch(e){if(g===generation)el.textContent=e.message;}
}

let governanceModal=null;
function editor(title,body){
 if(!governanceModal){governanceModal=document.createElement('div');governanceModal.className='modal-backdrop';governanceModal.hidden=true;governanceModal.innerHTML='<section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="governance-dialog-title"><div class="modal-topbar"><h2 id="governance-dialog-title"></h2><button type="button" data-admin-modal-close>Fechar</button></div><div id="governance-editor"></div></section>';document.body.append(governanceModal);}
 governanceModal.removeAttribute('data-geapa-dirty');governanceModal.querySelector('[data-discard-prompt]')?.remove();governanceModal.setAttribute('data-geapa-protect-draft','');governanceModal.querySelector('h2').textContent=title;const content=governanceModal.querySelector('#governance-editor');content.innerHTML=body;window.PortalDesign.openDetailDialog(governanceModal,()=>{content.replaceChildren();});return content;
}
function detailsCycle(id){const c=shown?.cycles.find(x=>x.id===id);if(c)editor(c.label,cycleDetail(c,shown)+frequencySummary(c));}
function detailsSemester(id){const s=shown?.semesters.find(x=>x.id===id);if(!s)return;const c=shown.cycles.find(x=>x.id===s.cycleId);editor('Semestre '+s.label,window.PortalDesign.detailFacts([['Identificação',s.label],['Período',interval(s)],['Status',statusLabel(s.status)],['Revisão',s.revision],['Ciclo',c?.label||(s.cycleId?'Vínculo informado; ciclo não disponível':'Sem associação')],['ID',s.id]])+(c&&cycleEditable(c,shown)?'<button type="button" data-cycle-associate="'+esc(c.id)+'">Editar associação no ciclo</button>':''));}
function associationPicker(){if(!shown)return;editor('Associar semestres a ciclo','<p>Selecione o ciclo para revisar seus semestres vinculados.</p><div class="geapa-choice-list">'+shown.cycles.filter(c=>cycleEditable(c,shown)).map(c=>'<button type="button" data-cycle-associate="'+esc(c.id)+'">'+esc(c.label)+' · '+dates(c)+'</button>').join('')+'</div>');}

function editCycle(id,association=false){
 if(!shown||(!id&&!shown.canCreateCycle))return;
 const c=shown.cycles.find(x=>x.id===id)||{id:'',revision:0,label:'',civilStart:'',civilEnd:'',status:'DRAFT'};
 if(id&&!cycleEditable(c,shown))return;
 const form=editor(association?'Associar semestres':id?'Editar ciclo':'Novo ciclo de atividades','');
 form.innerHTML=`<form data-cycle-form class="readonly-form"><input name="id" type="hidden" value="${esc(c.id)}"><input name="revision" type="hidden" value="${c.revision}">${field('label','Identificação / nome','text',c.label)}${field('civilStart','Data inicial','date',c.civilStart)}${field('civilEnd','Data final','date',c.civilEnd)}${!id?'<label>Configuração institucional de referência<select name="policyId" required><option value="">Selecione</option>'+shown.policies.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')+'</select></label>':''}<fieldset><legend>Semestres associados</legend><p class="geapa-detail-note">Marque para associar; desmarque para desassociar. O Core revalida as datas e os vínculos ao salvar.</p><div data-semester-choices></div></fieldset>${!id?'<p>A criação mantém o ciclo em rascunho. Obrigações e regras de apresentações não são ativadas por este cadastro.</p>':''}${reason()}<button type="submit">${association?'Salvar associação':'Salvar ciclo'}</button><p data-feedback role="status"></p></form>`;
 const f=form.querySelector('form');if(association)f.elements.label.readOnly=true;if(association||(id&&c.status!=='DRAFT')){f.elements.civilStart.readOnly=true;f.elements.civilEnd.readOnly=true;}
 const selected=new Set(shown.semesters.filter(s=>s.cycleId===id).map(s=>s.id));f.addEventListener('change',e=>{if(e.target.name==='semesterIds'){if(e.target.checked)selected.add(e.target.value);else selected.delete(e.target.value);}});
 const render=()=>{const start=f.elements.civilStart.value,end=f.elements.civilEnd.value;f.querySelector('[data-semester-choices]').innerHTML=shown.semesters.filter(s=>(!s.cycleId||s.cycleId===id)&&start&&end&&s.civilStart>=start&&s.civilEnd<=end).map(s=>`<label><input type="checkbox" name="semesterIds" value="${esc(s.id)}" ${selected.has(s.id)?'checked':''}>${esc(s.label)} · ${dates(s)}</label>`).join('')||'<p>Nenhum semestre disponível integralmente contido nestas datas.</p>';};
 f.elements.civilStart.onchange=render;f.elements.civilEnd.onchange=render;render();
}
function newSemester(){if(!shown?.canSaveSemester)return;editor('Novo semestre letivo','').innerHTML=`<form data-semester-form class="readonly-form">${field('label','Identificação')}${field('civilStart','Data inicial','date')}${field('civilEnd','Data final','date')}<p>O semestre será salvo sem vínculo com ciclo.</p>${reason()}<button type="submit">Salvar semestre</button><p data-feedback role="status"></p></form>`;}
let dialog;
async function windows(){
 if(!dialog){dialog=document.createElement('dialog');dialog.className='situation-card';document.body.append(dialog);}dialog.innerHTML='<button data-window-dismiss>Fechar</button><p>Carregando prazos…</p>';if(!dialog.open)dialog.showModal();
 try{const d=await get('/admin/justificativas/janelas');if(!dialog.open)return;dialog.innerHTML=`<button data-window-dismiss>Fechar</button><h2>Reabrir prazo de justificativas</h2><p>Para abrir um prazo, acesse Atividades → Opções na atividade desejada.</p><h3>Histórico de prazos</h3>${d.windows.map(w=>`<article><p>${esc(w.status)} · até ${esc(new Date(w.deadline).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}))}</p><p>${esc(w.reason)}</p>${w.status==='OPEN'&&d.canClose?`<form data-window-close><input type="hidden" name="id" value="${esc(w.id)}"><input type="hidden" name="revision" value="${w.revision}"><label>Ação<select name="action"><option value="CLOSE">Encerrar</option><option value="CANCEL">Cancelar</option></select></label>${reason()}<button type="submit">Confirmar encerramento</button><p data-feedback role="status"></p></form>`:''}</article>`).join('')}`;
 }catch(e){dialog.innerHTML='<button data-window-dismiss>Fechar</button><p>'+esc(e.message)+'</p>';}
}
document.addEventListener('click',e=>{const frequency=e.target.closest('[data-cycle-frequency]');if(frequency){const c=shown?.cycles.find(c=>c.id===frequency.dataset.cycleFrequency);if(c){const box=editor('Planejamento e frequência — '+c.label,'');mountFrequencyPlan(box,c,shown.frequencyPolicies||[],send,()=>{governanceModal.removeAttribute('data-geapa-dirty');window.PortalDesign.closeDetailDialog(governanceModal);void loadCycles();});}}if(e.target.closest('[data-semester-new]'))newSemester();const detail=e.target.closest('[data-cycle-detail]');if(detail)detailsCycle(detail.dataset.cycleDetail);const sem=e.target.closest('[data-semester-detail]');if(sem)detailsSemester(sem.dataset.semesterDetail);const association=e.target.closest('[data-cycle-associate]');if(association)editCycle(association.dataset.cycleAssociate,true);if(e.target.closest('[data-cycle-association-picker]'))associationPicker();const cycle=e.target.closest('[data-cycle-edit]');if(cycle)editCycle(cycle.dataset.cycleEdit);if(e.target.closest('[data-exceptional-window]'))void windows();if(e.target.closest('[data-window-dismiss]'))dialog.close();});
document.addEventListener('submit',async e=>{
 const f=e.target;if(!f.matches('[data-semester-form],[data-cycle-form],[data-window-open],[data-window-close]'))return;e.preventDefault();if(f.dataset.saving==='true')return;f.dataset.saving='true';const epoch=generation,busyModal=governanceModal?.contains(f)?governanceModal:null;busyModal?.setAttribute('aria-busy','true');const values=new FormData(f),v=Object.fromEntries(values),feedback=f.querySelector('[data-feedback]'),buttons=f.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);feedback.textContent='Salvando…';
 try{let route,payload;
  if(f.matches('[data-semester-form]')){route='/admin/ciclos-semestres/semestre';payload={...v,id:'',revision:0,status:'PLANNED'};}
  else if(f.matches('[data-cycle-form]')){route='/admin/ciclos-semestres/ciclo';payload={...v,revision:Number(v.revision),policyId:v.policyId||'',semesterIds:values.getAll('semesterIds')};}
  else if(f.matches('[data-window-open]')){route='/admin/justificativas/janelas/abrir';payload={activityIds:values.getAll('activityIds'),deadline:Date.parse(v.deadline+':00-04:00'),reasonCode:v.reasonCode,reason:v.reason};if(!payload.activityIds.length)throw Error('Selecione pelo menos uma atividade.');}
  else{route='/admin/justificativas/janelas/encerrar';payload={...v,revision:Number(v.revision)};}
  await send(route,payload);if(epoch!==generation)return;busyModal?.removeAttribute('aria-busy');feedback.textContent='Salvo.';document.dispatchEvent(new CustomEvent('portal:justificativas-atualizadas'));if(route.startsWith('/admin/ciclos')){governanceModal.removeAttribute('data-geapa-dirty');window.PortalDesign.closeDetailDialog(governanceModal);await loadCycles();}else await windows();
 }catch(error){if(epoch===generation)feedback.textContent=error.message;}finally{f.dataset.saving='false';busyModal?.removeAttribute('aria-busy');buttons.forEach(b=>b.disabled=false);}
});
document.addEventListener('portal:navigationchange',e=>{const id=e.detail?.rota?.id;generation++;window.PortalDesign.closeDetailDialog(governanceModal,true);document.getElementById('exceptional-window-entry')?.remove();if(id==='admin-ciclos-semestres')void loadCycles();if(id==='admin-justificativas'&&window.PortalGeapaAuth?.canRegisterAttendance()){const bar=document.createElement('p');bar.id='exceptional-window-entry';bar.innerHTML='<button data-exceptional-window>Histórico de prazos extraordinários</button>';document.getElementById('placeholder-content').before(bar);}});
document.addEventListener('portal:act-session-cleared',()=>{generation++;shown=null;window.PortalDesign.closeDetailDialog(governanceModal,true);dialog?.close();if(dialog)dialog.textContent='';if(panel())panel().textContent='';document.getElementById('exceptional-window-entry')?.remove();});
// Creation resolves the current cycle and the dated canonical semester in Core.
