const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={cpf:'CPF',birthDate:'Data de nascimento',countryCode:'País de origem',stateCode:'Estado de origem',city:'Cidade de origem',courseId:'Curso'};
const states=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const errors={REQUEST_TIMEOUT:'A confirmação demorou mais que o esperado. Tente novamente para recuperar o mesmo envio, sem duplicá-lo.',VALIDATION_ERROR:'Confira os dados informados e as pendências indicadas.',STALE_REVISION:'O cadastro mudou em outra aba. Atualize antes de confirmar.',ACCESS_REVOKED:'Este convite não está disponível. Consulte a Diretoria.',STALE_AUTHORIZATION:'Entre novamente para confirmar sua identidade.',COMMAND_PENDING:'O envio ainda está sendo confirmado. Tente novamente para recuperar a mesma operação.',COMMAND_NOT_ADMITTED:'O envio anterior foi recuperado. Atualize antes de uma nova alteração.'};
const date=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'});
export function enrollmentProfile(entries,previous,communications){
 const profile={},axes=[];
 for(const [key,value]of entries){if(key==='optionalCommunications')continue;if(key==='interestAxisIds'){axes.push(String(value));continue;}profile[key]=String(value).trim();}
 profile.countryCode=profile.countryCode.toUpperCase();if(profile.countryCode!=='BR')profile.stateCode='';
 if(['countryCode','stateCode','city'].some(k=>profile[k]!==String(previous[k]||'')))profile.municipalityCode='';
 if(entries.some(([k])=>k==='interestAxesAvailable')){delete profile.interestAxesAvailable;profile.interestAxisIds=axes;}
 profile.optionalCommunications=communications;return profile;
}
export function enrollmentFieldErrors(p,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Cuiaba'})){
 const errors={};
 if(p.cpf){const n=p.cpf.replace(/[.\s-]/g,'');const digit=(size)=>{let sum=0;for(let i=0;i<size;i++)sum+=Number(n[i])*(size+1-i);const rest=(sum*10)%11;return rest===10?0:rest;};if(!/^\d{11}$/.test(n)||/^(\d)\1{10}$/.test(n)||digit(9)!==Number(n[9])||digit(10)!==Number(n[10]))errors.cpf='Informe um CPF válido.';}
 if(p.birthDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)||!Number.isFinite(Date.parse(p.birthDate))||new Date(p.birthDate).toISOString().slice(0,10)!==p.birthDate||p.birthDate<'1900-01-01'||p.birthDate>today))errors.birthDate='Confira a data de nascimento.';
 if(p.countryCode&&!/^[A-Z]{2}$/.test(p.countryCode))errors.countryCode='Use o código de duas letras do país, como BR.';
 if(p.stateCode&&!states.includes(p.stateCode))errors.stateCode='Selecione um estado válido.';
 for(const key of ['lattes','linkedin','photoUrl'])if(p[key]&&!/^https:\/\/[^\s/@]+(?:\/[^\s]*)?$/.test(p[key]))errors[key]='Informe um link HTTPS válido.';
 if(p.instagram&&!/^@?[a-zA-Z0-9._]{1,30}$/.test(p.instagram))errors.instagram='Informe o nome do perfil no Instagram.';
 if(p.orcid&&!/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/.test(p.orcid))errors.orcid='Use o formato 0000-0000-0000-0000.';
 return errors;
}
export function enrollmentHtml(v){
 if(v.terminal){const messages={DECLINED:'Seu convite foi recusado. Nenhum vínculo foi ativado.',CANCELLED:'O convite foi cancelado pela administração. Consulte a Diretoria.',EXPIRED:'O prazo deste convite expirou. Solicite o reenvio à Diretoria.',COMPLETED:'Seu cadastro foi concluído e o vínculo foi ativado.'};return '<h2>Situação do ingresso</h2><p>'+esc(messages[v.status]||'Convite indisponível.')+'</p>'+(v.status==='COMPLETED'?'<button class="primary-button" data-enrollment-enter>Entrar no Portal</button>':'');}
 const field=(name,label,type='text')=>`<label><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(v.profile[name]||'')}" ${name==='birthDate'?'max="'+new Date().toISOString().slice(0,10)+'"':''}><small data-field-error="${name}"></small></label>`;
 const terms=v.norms.map(n=>`<li><a href="${/^https:\/\//.test(n.pdfUrl)?esc(n.pdfUrl):'#'}" target="_blank" rel="noopener noreferrer">${esc(n.label)} — ${esc(n.version)}</a></li>`).join('');
 const summary=`<h2>Ingresso no GEAPA</h2><dl class="summary-grid"><dt>Nome completo</dt><dd>${esc(v.registration.fullName)}</dd><dt>E-mail</dt><dd>${esc(v.registration.email)}</dd><dt>RGA</dt><dd>${esc(v.registration.rga)}</dd><dt>Telefone/WhatsApp</dt><dd>${esc(v.registration.phone)}</dd></dl><p>Confira os dados. Se houver erro na identificação, solicite a correção à Diretoria.</p><p>Convite disponível até ${esc(date(v.expiresAt))}.</p>`;
 const footer='<div role="status" aria-live="polite" data-enrollment-feedback></div>';
 if(v.status==='INVITED')return summary+'<p>O aceite permite completar seu cadastro. O vínculo será ativado após a conclusão.</p><div class="profile-form-actions"><button class="primary-button" data-enrollment-action="ACCEPT">Aceitar convite</button><button class="secondary-button" data-enrollment-decline>Recusar convite</button></div><div data-decline-confirm hidden><p>Confirma a recusa do convite? Seu vínculo não será ativado.</p><button class="secondary-button" data-enrollment-action="DECLINE">Confirmar recusa</button><button class="secondary-button" data-decline-back>Voltar</button></div>'+footer;
 return summary+`<p>${v.missing.length?'Pendências: '+esc(v.missing.map(k=>labels[k]||k).join(', '))+'.':'Dados obrigatórios preenchidos.'} Você pode salvar e continuar depois.</p>
 <form data-enrollment-form novalidate><h3>Dados pessoais e origem</h3><div class="member-registration-grid">${field('cpf','CPF')}${field('birthDate','Data de nascimento','date')}${field('countryCode','País de origem (código de duas letras)')}
 <label data-origin-state><span>Estado de origem (brasileiros)</span><select name="stateCode"><option value="">Selecione</option>${states.map(s=>`<option value="${s}" ${v.profile.stateCode===s?'selected':''}>${s}</option>`).join('')}</select><small data-field-error="stateCode"></small></label>${field('city','Cidade de origem')}</div>
 <h3>Dados acadêmicos</h3><label><span>Curso</span><select name="courseId"><option value="">Selecione</option>${v.courses.map(c=>`<option value="${esc(c.id)}" ${v.profile.courseId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><small data-field-error="courseId"></small></label>
 <details><summary>Dados opcionais</summary><div class="member-registration-grid">${field('displayName','Nome de exibição')}${field('instagram','Instagram')}${field('lattes','Currículo Lattes','url')}${field('orcid','ORCID')}${field('linkedin','LinkedIn','url')}${field('photoUrl','Link da foto de perfil','url')}</div><label><span>Breve histórico acadêmico</span><textarea name="academicBio" maxlength="3000">${esc(v.profile.academicBio)}</textarea></label><label><input name="optionalCommunications" type="checkbox" ${v.profile.optionalCommunications===true?'checked':''}> Desejo receber comunicações não essenciais</label><p>A foto de perfil e as preferências de comunicação são independentes da autorização de imagem.</p></details>
 ${v.interestAxes?.length?`<fieldset><legend>Eixos temáticos de interesse — opcional</legend><input type="hidden" name="interestAxesAvailable" value="true">${v.interestAxes.map(axis=>`<label><input type="checkbox" name="interestAxisIds" value="${esc(axis.id)}" ${(v.profile.interestAxisIds||[]).includes(axis.id)?'checked':''}> ${esc(axis.name)}</label>`).join('')}</fieldset>`:''}<button type="submit" class="primary-button">Salvar cadastro e continuar depois</button></form>
 <section><h3>Ciência das normas</h3><ul>${terms}</ul>${v.normAcknowledgement?'<p>Ciência registrada em '+esc(date(v.normAcknowledgement.at))+'.</p>':''}<label><input type="checkbox" data-norm-ack> ${esc(v.acknowledgement)}</label><button class="secondary-button" data-enrollment-action="ACKNOWLEDGE">Registrar ciência das normas</button></section>
 ${v.imageTerm?`<section><h3>Uso de imagem, voz e nome — opcional</h3><p>${esc(v.imageTerm.text)}</p><p>Finalidade: ${esc(v.imageTerm.purpose)}</p><p>Recusar ou revogar esta autorização não impede seu ingresso.</p><p>Manifestação atual: ${esc(({GRANTED:'Autorizado',DECLINED:'Não autorizado',REVOKED:'Revogado'})[v.imageManifestation?.state]||'Não informada')}</p><label><input type="checkbox" data-image-ack> Autorizo expressamente o uso descrito acima.</label><div class="profile-form-actions"><button class="secondary-button" data-image-choice="GRANTED">Registrar autorização</button><button class="secondary-button" data-image-choice="DECLINED">Não autorizar</button>${v.imageManifestation?.state==='GRANTED'?'<button class="secondary-button" data-image-choice="REVOKED">Revogar autorização</button>':''}</div></section>`:''}
 <div class="profile-form-actions"><button class="primary-button" data-enrollment-action="COMPLETE">Concluir cadastro e confirmar ingresso</button><button class="secondary-button" data-enrollment-reload>Atualizar situação</button></div>${footer}`;
}
export function createEnrollmentView({target,client,auth,onActivated}){
 let data=null,dirty=false,busy=false,serial=0,active=false;
 const clear=()=>{serial++;data=null;dirty=false;busy=false;active=false;target.replaceChildren();};
 const feedback=message=>{const box=target.querySelector('[data-enrollment-feedback]');if(box)box.textContent=message;};
 function render(){target.innerHTML=enrollmentHtml(data);dirty=false;adaptOrigin();}
 function adaptOrigin(){const form=target.querySelector('form'),state=form?.querySelector('[data-origin-state]');if(state)state.hidden=!!form.elements.countryCode.value.trim()&&form.elements.countryCode.value.trim().toUpperCase()!=='BR';}
 async function load(open=false){const ticket=auth.capture(),version=++serial;const answer=await (open?client.open():client.read());auth.assert(ticket);if(version!==serial)return false;if(!answer?.ok||!answer.data)throw {code:'SCHEMA_UNSUPPORTED'};data=answer.data;active=true;render();return true;}
 async function action(kind,payload={}){
  if(busy||!data)return;
  if(kind==='SAVE'){
   const errors=enrollmentFieldErrors(payload.profile);target.querySelectorAll('[data-field-error]').forEach(el=>el.textContent=errors[el.dataset.fieldError]||'');
   if(Object.keys(errors).length){feedback('Confira os campos indicados. Seus dados foram preservados.');target.querySelector('[name="'+Object.keys(errors)[0]+'"]')?.focus();return;}
  }
  if(dirty&&kind!=='SAVE'){feedback('Salve os dados preenchidos antes de continuar.');return;}
  const ticket=auth.capture(),version=serial;busy=true;target.querySelectorAll('button').forEach(b=>b.disabled=true);feedback('Confirmando…');
  try{const answer=await client.submit(data.revision,kind,payload);auth.assert(ticket);if(version!==serial)return;
   if(answer.receipt?.state==='FAILED')throw {code:answer.receipt.code==='REVISION_CONFLICT'?'STALE_REVISION':'VALIDATION_ERROR'};
   if(answer.receipt?.state!=='COMPLETED')throw {code:'COMMAND_PENDING'};
   if(kind==='DECLINE'){target.innerHTML='<h2>Convite recusado</h2><p>Sua decisão foi registrada. Nenhum vínculo foi ativado.</p>';data=null;return;}
   if(kind==='COMPLETE'){target.innerHTML='<h2>Ingresso confirmado</h2><p>Seu cadastro foi concluído e o vínculo foi ativado.</p><button class="primary-button" data-enrollment-enter>Entrar no Portal</button>';data=null;return;}
   await load();feedback('Registro salvo.');
  }catch(error){if(version===serial){feedback(errors[error.code]||'Não foi possível confirmar a resposta. Os campos foram preservados. Tente novamente para recuperar o mesmo envio.');if(kind==='COMPLETE')for(const name of data?.missing||[]){const el=target.querySelector('[data-field-error="'+name+'"]');if(el)el.textContent='Preencha e salve este campo.';}}}
  finally{busy=false;if(version===serial)target.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 target.addEventListener('input',e=>{if(e.target.closest('form')){dirty=true;adaptOrigin();}});
 target.addEventListener('submit',e=>{const form=e.target.closest('[data-enrollment-form]');if(!form)return;e.preventDefault();const profile=enrollmentProfile([...new FormData(form)],data.profile,form.elements.optionalCommunications.checked);void action('SAVE',{profile});});
 target.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||busy)return;if(b.hasAttribute('data-enrollment-enter')){clear();void onActivated();return;}if(b.hasAttribute('data-decline-back')){target.querySelector('[data-decline-confirm]').hidden=true;return;}if(b.hasAttribute('data-enrollment-decline')){target.querySelector('[data-decline-confirm]').hidden=false;return;}if(b.hasAttribute('data-enrollment-reload')){if(dirty){feedback('Salve os campos antes de atualizar.');return;}void load().catch(err=>feedback(errors[err.code]||'Não foi possível atualizar.'));return;}
  let kind=b.dataset.enrollmentAction,payload={};if(b.dataset.imageChoice){kind='IMAGE';if(b.dataset.imageChoice==='GRANTED'&&!target.querySelector('[data-image-ack]').checked){feedback('Confirme expressamente a autorização antes de registrá-la.');return;}payload={choice:b.dataset.imageChoice,termVersion:data.imageTerm.version};}
  if(kind==='ACKNOWLEDGE'){if(!target.querySelector('[data-norm-ack]').checked){feedback('Marque a declaração de ciência das normas.');return;}payload={accepted:true,termVersion:data.normTermVersion,documents:data.norms.map(n=>({id:n.id,version:n.version}))};}
  if(kind)void action(kind,payload);
 });
 return {open:()=>load(true),load:()=>load(false),clear,get active(){return active;},get busy(){return busy;}};
}
