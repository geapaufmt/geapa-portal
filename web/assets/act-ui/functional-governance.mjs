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
function semesterCard(s){return `<article class="situation-card"><h4>${esc(s.label)}</h4><p>${dates(s)}</p></article>`;}
async function loadCycles(){
 const g=++generation,el=panel();el.textContent='Carregando ciclos e semestres…';
 try{const d=await get('/admin/ciclos-semestres');if(g!==generation)return;shown=d;
  const card=c=>`<article class="situation-card"><h3>${esc(c.label)}</h3><p>${dates(c)} · ${esc(c.status)}</p><p>Revisão ${c.revision}${c.configRevision?' · Configuração '+esc(c.configRevision):''}</p>${d.canCreateCycle?`<button data-cycle-edit="${esc(c.id)}">Editar ciclo e associação</button>`:''}<div class="summary-grid">${d.semesters.filter(s=>s.cycleId===c.id).map(semesterCard).join('')}</div></article>`;
  el.innerHTML=`<details><summary>+ Novo</summary>${d.canSaveSemester?'<button data-semester-new>Novo semestre letivo</button>':''} ${d.canCreateCycle?'<button data-cycle-edit="">Novo ciclo de atividades</button>':''}</details><div id="governance-editor"></div><h3>Ciclos de atividades</h3>${d.cycles.filter(c=>c.status!=='CLOSED').map(card).join('')}<h3>Semestres disponíveis</h3><div class="summary-grid">${d.semesters.filter(s=>!s.cycleId).map(semesterCard).join('')||'<p>Nenhum semestre sem ciclo.</p>'}</div>${d.cycles.some(c=>c.status==='CLOSED')?'<details><summary>Ciclos encerrados</summary>'+d.cycles.filter(c=>c.status==='CLOSED').map(card).join('')+'</details>':''}`;
 }catch(e){if(g===generation)el.textContent=e.message;}
}
function editCycle(id){
 const c=shown.cycles.find(x=>x.id===id)||{id:'',revision:0,label:'',civilStart:'',civilEnd:'',status:'DRAFT'};
 const form=document.getElementById('governance-editor');
 form.innerHTML=`<form data-cycle-form class="readonly-form"><h3>${id?'Editar ciclo':'Novo ciclo de atividades'}</h3><input name="id" type="hidden" value="${esc(c.id)}"><input name="revision" type="hidden" value="${c.revision}">${field('label','Identificação / nome','text',c.label)}${field('civilStart','Data inicial','date',c.civilStart)}${field('civilEnd','Data final','date',c.civilEnd)}${!id?'<label>Configuração institucional de referência<select name="policyId" required><option value="">Selecione</option>'+shown.policies.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')+'</select></label>':''}<fieldset><legend>Semestres disponíveis dentro do intervalo</legend><div data-semester-choices></div></fieldset><p>A criação mantém o ciclo em rascunho. Obrigações e regras de apresentações não são ativadas por este cadastro.</p>${reason()}<button type="submit">Salvar ciclo</button><p data-feedback role="status"></p></form>`;
 const f=form.querySelector('form');if(id&&c.status!=='DRAFT'){f.elements.civilStart.readOnly=true;f.elements.civilEnd.readOnly=true;}
 const render=()=>{const start=f.elements.civilStart.value,end=f.elements.civilEnd.value;f.querySelector('[data-semester-choices]').innerHTML=shown.semesters.filter(s=>(!s.cycleId||s.cycleId===id)&&start&&end&&s.civilStart>=start&&s.civilEnd<=end).map(s=>`<label><input type="checkbox" name="semesterIds" value="${esc(s.id)}" ${s.cycleId===id?'checked':''}>${esc(s.label)} · ${dates(s)}</label>`).join('')||'<p>Nenhum semestre disponível integralmente contido nestas datas.</p>';};
 f.elements.civilStart.onchange=render;f.elements.civilEnd.onchange=render;render();
}
function newSemester(){document.getElementById('governance-editor').innerHTML=`<form data-semester-form class="readonly-form"><h3>Novo semestre letivo</h3>${field('label','Identificação')}${field('civilStart','Data inicial','date')}${field('civilEnd','Data final','date')}<p>O semestre será salvo sem vínculo com ciclo.</p>${reason()}<button type="submit">Salvar semestre</button><p data-feedback role="status"></p></form>`;}
let dialog;
async function windows(){
 if(!dialog){dialog=document.createElement('dialog');dialog.className='situation-card';document.body.append(dialog);}dialog.innerHTML='<button data-window-dismiss>Fechar</button><p>Carregando prazos…</p>';if(!dialog.open)dialog.showModal();
 try{const d=await get('/admin/justificativas/janelas');if(!dialog.open)return;dialog.innerHTML=`<button data-window-dismiss>Fechar</button><h2>Reabrir prazo de justificativas</h2>${d.canOpen?`<form data-window-open class="readonly-form"><fieldset><legend>Atividades</legend>${d.activities.map(a=>`<label><input type="checkbox" name="activityIds" value="${esc(a.id)}">${esc(a.civilDate)} · ${esc(a.label)}</label>`).join('')||'<p>Nenhuma chamada finalizada elegível.</p>'}</fieldset>${field('deadline','Novo prazo — horário de Cuiabá','datetime-local')}<label>Motivo da reabertura<select name="reasonCode" required><option value="PORTAL_UNAVAILABLE">Portal indisponível</option><option value="SYSTEM_FAILURE">Falha no sistema</option><option value="ADMINISTRATIVE_REGULARIZATION">Regularização administrativa</option><option value="OTHER_JUSTIFIED">Outro motivo justificado</option></select></label>${reason()}<p>A reabertura permite submissão. A frequência só muda após análise da justificativa.</p><button type="submit">Abrir prazo extraordinário</button><p data-feedback role="status"></p></form>`:'<p>Você não possui permissão para reabrir prazos.</p>'}<h3>Histórico de prazos</h3>${d.windows.map(w=>`<article><p>${esc(w.status)} · até ${esc(new Date(w.deadline).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}))}</p><p>${esc(w.reason)}</p>${w.status==='OPEN'&&d.canClose?`<form data-window-close><input type="hidden" name="id" value="${esc(w.id)}"><input type="hidden" name="revision" value="${w.revision}"><label>Ação<select name="action"><option value="CLOSE">Encerrar</option><option value="CANCEL">Cancelar</option></select></label>${reason()}<button type="submit">Confirmar encerramento</button><p data-feedback role="status"></p></form>`:''}</article>`).join('')}`;
 }catch(e){dialog.innerHTML='<button data-window-dismiss>Fechar</button><p>'+esc(e.message)+'</p>';}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-semester-new]'))newSemester();const cycle=e.target.closest('[data-cycle-edit]');if(cycle)editCycle(cycle.dataset.cycleEdit);if(e.target.closest('[data-exceptional-window]'))void windows();if(e.target.closest('[data-window-dismiss]'))dialog.close();});
document.addEventListener('submit',async e=>{
 const f=e.target;if(!f.matches('[data-semester-form],[data-cycle-form],[data-window-open],[data-window-close]'))return;e.preventDefault();const values=new FormData(f),v=Object.fromEntries(values),feedback=f.querySelector('[data-feedback]'),buttons=f.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);feedback.textContent='Salvando…';
 try{let route,payload;
  if(f.matches('[data-semester-form]')){route='/admin/ciclos-semestres/semestre';payload={...v,id:'',revision:0,status:'PLANNED'};}
  else if(f.matches('[data-cycle-form]')){route='/admin/ciclos-semestres/ciclo';payload={...v,revision:Number(v.revision),policyId:v.policyId||'',semesterIds:values.getAll('semesterIds')};}
  else if(f.matches('[data-window-open]')){route='/admin/justificativas/janelas/abrir';payload={activityIds:values.getAll('activityIds'),deadline:Date.parse(v.deadline+':00-04:00'),reasonCode:v.reasonCode,reason:v.reason};if(!payload.activityIds.length)throw Error('Selecione pelo menos uma atividade.');}
  else{route='/admin/justificativas/janelas/encerrar';payload={...v,revision:Number(v.revision)};}
  await send(route,payload);feedback.textContent='Salvo.';document.dispatchEvent(new CustomEvent('portal:justificativas-atualizadas'));if(route.startsWith('/admin/ciclos'))await loadCycles();else await windows();
 }catch(error){feedback.textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}
});
document.addEventListener('portal:navigationchange',e=>{const id=e.detail?.rota?.id;generation++;document.getElementById('exceptional-window-entry')?.remove();if(id==='admin-ciclos-semestres')void loadCycles();if(id==='admin-justificativas'&&window.PortalGeapaAuth?.canRegisterAttendance()){const bar=document.createElement('p');bar.id='exceptional-window-entry';bar.innerHTML='<button data-exceptional-window>Reabrir prazo de justificativas</button>';document.getElementById('placeholder-content').before(bar);}});
document.addEventListener('portal:act-session-cleared',()=>{generation++;shown=null;dialog?.close();if(dialog)dialog.textContent='';if(panel())panel().textContent='';document.getElementById('exceptional-window-entry')?.remove();});
// Extend the existing model form only with the newly approved explicit links.
new MutationObserver(()=>{
 const form=document.querySelector('[data-activity-form="criar-atividade"]');if(!form||form.dataset.cycleFields)return;form.dataset.cycleFields='loading';
 const box=document.createElement('fieldset');box.innerHTML='<legend>Ciclo e semestre</legend><p>Carregando ciclos…</p>';form.prepend(box);
 void get('/admin/ciclos-semestres').then(d=>{if(!form.isConnected)return;box.innerHTML='<legend>Ciclo e semestre</legend><label>Ciclo de atividades<select name="cycleId" required><option value="">Selecione</option>'+d.cycles.filter(c=>c.status!=='CLOSED').map(c=>`<option value="${esc(c.id)}">${esc(c.label)} · ${dates(c)}</option>`).join('')+'</select></label><label>Semestre letivo<select name="academicSemesterId"><option value="">Fora de semestre letivo</option></select></label>';
  const cycle=form.elements.cycleId,semester=form.elements.academicSemesterId;
  cycle.onchange=()=>{semester.innerHTML='<option value="">Fora de semestre letivo</option>'+d.semesters.filter(s=>s.cycleId===cycle.value).map(s=>`<option value="${esc(s.id)}">${esc(s.label)} · ${dates(s)}</option>`).join('');};form.dataset.cycleFields='ready';
 }).catch(e=>{box.textContent=e.message;const blocked=document.createElement('input');blocked.required=true;blocked.setCustomValidity('Atualize os ciclos antes de criar a atividade.');blocked.setAttribute('aria-label','Ciclos indisponíveis');box.append(blocked);});
}).observe(document.body,{childList:true,subtree:true});
