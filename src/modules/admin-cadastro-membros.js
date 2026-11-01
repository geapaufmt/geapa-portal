/** Admissao administrativa de membro ingressante cujo seletivo ja foi aprovado. */
(function configurarCadastroMembros(global) {
  'use strict';
  var api = global.PortalGeapaApi; var ui = global.PortalGeapaUi; var busy = false; var courses = []; var invitations = []; var invitationCursor = null; var mode = "registration"; var viewEpoch = 0; var refreshInvitationsWhenReady = false;

  function enabled() {
    return !!(global.PortalGeapaConfig && global.PortalGeapaConfig.ENABLE_MEMBER_REGISTRATION === true &&
      global.PortalGeapaAuth && global.PortalGeapaAuth.hasPermissao('membros:cadastrar_novos_membros'));
  }

  function renderAction() {
    return enabled() ? '<button class="primary-button compact-button" type="button" data-member-registration-open>Cadastrar membro aprovado</button><button class="secondary-button compact-button" type="button" data-member-invitations-open>Convites de ingresso</button>' : '';
  }

  function esc(value) { return ui.escaparHtml(String(value == null ? '' : value)); }
  function modal() { return document.getElementById('member-registration-modal'); }

  function ensureModal() {
    if (modal()) return modal();
    var node = document.createElement('div'); node.id = 'member-registration-modal'; node.className = 'portal-modal member-registration-modal'; node.hidden = true;
    node.innerHTML = '<div class="portal-modal-backdrop" data-member-registration-close></div><section class="portal-modal-card member-registration-card" role="dialog" aria-modal="true" aria-labelledby="member-registration-title"><header class="portal-modal-header"><div><p class="eyebrow">Processo seletivo ja aprovado</p><h2 id="member-registration-title">Cadastrar membro aprovado</h2></div><button type="button" class="icon-button" data-member-registration-close aria-label="Fechar">&times;</button></header><div data-member-registration-content></div></section>';
    document.body.appendChild(node); return node;
  }

  function open() {
    if (busy) return;
    if (!enabled()) return toast('error', 'O cadastro de membros nao esta disponivel para esta sessao.');
    mode='registration';var epoch=++viewEpoch;var node = ensureModal();node.querySelector('#member-registration-title').textContent='Cadastrar membro aprovado'; node.hidden = false; document.body.classList.add('modal-open');
    renderLoading();
    api.apiGet('/admin/ingressos-membros/catalogos', {}).then(function(response) {
      if(epoch!==viewEpoch||!enabled())return;
      if (!response || response.ok !== true) throw response || new Error('Catalogo indisponivel.');
      courses = Array.isArray(response.data && response.data.cursos) ? response.data.cursos : [];
      renderForm();
    }).catch(function(error) { if(epoch===viewEpoch&&enabled())renderError(error); });
  }

  function close() { if (busy) return; viewEpoch++; var node = modal(); if (node) node.hidden = true; document.body.classList.remove('modal-open'); }
  function openInvitations(more) {
    if (!enabled() || busy) return;
    mode='invitations';var epoch=++viewEpoch;
    var node = ensureModal(); node.hidden = false; document.body.classList.add('modal-open');
    node.querySelector('#member-registration-title').textContent = 'Convites de ingresso';
    if (!more) { invitations = []; invitationCursor = null; }
    renderLoading();
    api.apiGet('/admin/ingressos-membros', invitationCursor ? {cursor:invitationCursor} : {}).then(function(response) {
      if (!response || response.ok !== true) throw response || new Error('Não foi possível consultar os convites.');
      if(epoch!==viewEpoch||!enabled())return;invitations = invitations.concat(response.data.items || []); invitationCursor = response.data.nextCursor;
      var labels = {PRE_REGISTERED:'Aguardando envio',INVITED:'Convite enviado para processamento',ACCEPTED:'Aguardando conclusão cadastral',DECLINED:'Recusado',CANCELLED:'Cancelado',COMPLETED:'Ingresso concluído'};
      content().innerHTML = '<div class="member-registration-scroll"><p class="section-note">No DEV, as notificações são registradas em modo de teste, sem envio real.</p>' + invitations.map(function(v) {
        var buttons = (v.canSend ? '<button type="button" class="primary-button" data-invitation-action="SEND">Enviar convite</button>' : '') + (v.canResend ? '<button type="button" class="secondary-button" data-invitation-action="RESEND">Reenviar convite</button>' : '') + (v.canCancel ? '<button type="button" class="secondary-button" data-invitation-action="CANCEL">Cancelar convite</button>' : '');
        return '<section class="situation-card" data-enrollment-id="'+esc(v.enrollmentId)+'"><h3>'+esc(v.name)+'</h3><p>'+esc(v.emailMasked)+'</p><p>'+esc(labels[v.status] || v.status)+(v.expired&&v.canResend?' — prazo expirado':'')+'</p><div class="profile-form-actions">'+buttons+'</div></section>';
      }).join('') + (!invitations.length?'<p>Nenhum convite cadastrado.</p>':'') + '</div><div class="member-registration-feedback" data-member-registration-feedback role="status"></div><div class="portal-modal-actions">'+(invitationCursor?'<button type="button" class="secondary-button" data-member-invitations-more>Carregar mais</button>':'')+'<button type="button" class="secondary-button" data-member-registration-close>Fechar</button></div>';
    }).catch(function(error) { if(epoch===viewEpoch&&enabled())renderError(error); });
  }
  function invitationAction(button) {
    if (!enabled() || busy) return;
    var card = button.closest('[data-enrollment-id]'),v=invitations.find(function(v){return v.enrollmentId===card.dataset.enrollmentId;}),action=button.dataset.invitationAction;
    if (!v) return;
    var reason='Envio administrativo de convite de ingresso';
    if(action==='CANCEL'){
      var field=card.querySelector('[data-invitation-cancel-reason]');
      if(!field){var label=document.createElement('label');label.innerHTML='<span>Motivo do cancelamento</span><input type="text" maxlength="500" required data-invitation-cancel-reason>';card.appendChild(label);button.textContent='Confirmar cancelamento';label.querySelector('input').focus();return;}
      reason=field.value; if(!reason.trim()){field.reportValidity();return;}
    }
    var epoch=viewEpoch;
    if (reason===null || !String(reason).trim()) return;
    busy=true;var buttons=Array.from(content().querySelectorAll('button'));buttons.forEach(function(b){b.disabled=true;});
    api.apiPost('/admin/ingressos-membros/convite',{payload:JSON.stringify({enrollmentId:v.enrollmentId,revision:v.revision,action:action,reason:String(reason).trim()})}).then(function(response){
      if(epoch!==viewEpoch)return;if(!enabled()){refreshInvitationsWhenReady=true;return;}if(!response||response.ok!==true)throw response||new Error('Não foi possível confirmar o convite.');busy=false;toast('success',response.message);openInvitations(false);
    }).catch(function(error){if(epoch!==viewEpoch)return;if(!enabled()){refreshInvitationsWhenReady=true;return;}var feedback=content().querySelector('[data-member-registration-feedback]');if(feedback)feedback.textContent=error.message||'Não foi possível confirmar o envio. Tente novamente para recuperar a mesma operação.';}).finally(function(){busy=false;buttons.forEach(function(b){if(b.isConnected)b.disabled=false;});});
  }
  function content() { return ensureModal().querySelector('[data-member-registration-content]'); }
  function renderLoading() { content().innerHTML = '<div class="member-registration-state">Carregando catalogos oficiais...</div>'; }
  function renderError(error) { content().innerHTML = '<div class="member-registration-state member-registration-error"><strong>Nao foi possivel preparar o cadastro</strong><p>' + esc(error && error.message || 'Catalogo indisponivel.') + '</p><button type="button" class="secondary-button" data-member-registration-retry>Tentar novamente</button></div>'; }

  function renderForm() {
    content().innerHTML = [
      '<form data-member-registration-form novalidate>',
      '<div class="member-registration-scroll">',
      '<div class="member-registration-mode" role="radiogroup" aria-label="Modalidade do cadastro"><label><input type="radio" name="modalidadeCadastro" value="RAPIDO" checked> Cadastro rápido</label><label><input type="radio" name="modalidadeCadastro" value="COMPLETO"> Cadastro completo</label></div>',
      '<p class="section-note">Use esta tela somente depois da aprovacao institucional do ingresso. O Portal nao administra processo seletivo.</p>',
      '<div class="member-registration-grid">',
      field('nomeCompleto', 'Nome completo', 'text', true),
      field('emailPrincipal', 'E-mail principal', 'email', true), field('telefone', 'Telefone/WhatsApp', 'tel', true),
      field('rga', 'RGA', 'text', true),
      '</div>',
      '<section data-member-registration-complete hidden><h3>Dados complementares</h3>',
      '<p>O convidado poderá conferir e completar estes dados antes da ativação.</p>',
      '<div class="member-registration-grid">' + field('cpf', 'CPF', 'text', false) + field('dataNascimento', 'Data de nascimento', 'date', false) + field('paisOrigemCodigo', 'País de origem (código)', 'text', false, 'BR') + field('ufOrigem', 'UF de origem', 'text', false) + field('cidadeNatal', 'Cidade de origem', 'text', false) + courseField() + field('nomeExibicao', 'Nome de exibição', 'text', false) + field('instagram', 'Instagram', 'text', false) + '</div>',
      '</section>',
      '</div>',
      '<div class="member-registration-feedback" data-member-registration-feedback role="status" aria-live="polite"></div>',
      '<div class="portal-modal-actions"><button type="button" class="secondary-button" data-member-registration-close>Cancelar</button><button type="submit" class="primary-button" data-member-registration-submit>Salvar pré-cadastro</button></div>',
      '</form>'
    ].join('');
    var form = content().querySelector('form'); syncMode(form); syncCourse(form);
    if (global.PortalGeapaLocalidades) global.PortalGeapaLocalidades.hydrate(form);
    form.elements.nomeCompleto.focus();
  }

  function field(name, label, type, required, placeholder) {
    return '<label><span>' + esc(label) + '</span><input name="' + name + '" type="' + type + '"' + (required ? ' required' : '') + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '></label>';
  }
  function courseField() {
    return '<label><span>Curso</span><select name="cursoId"><option value="">Selecione</option>' + courses.map(function(course) { var suffix = [course.instituicao, course.campus].filter(Boolean).join(' - '); return '<option value="' + esc(course.cursoId) + '">' + esc(course.nomeCurso + (suffix ? ' - ' + suffix : '')) + '</option>'; }).join('') + '</select></label><label data-course-other hidden><span>Nome do curso</span><input name="cursoNomeOutro" type="text"></label>';
  }
  function formaIngressoField() {
    return '<label><span>Forma de ingresso</span><select name="formaIngresso" required><option value="PROCESSO_SELETIVO" selected>Processo seletivo ja concluido</option></select></label>';
  }
  function origemCadastroField() {
    return '<label><span>Origem do cadastro</span><select name="origemCadastro" required><option value="">Selecione</option><option value="CADASTRO_INTERESSE">Cadastro de interesse/acompanhamento</option><option value="CADASTRO_MANUAL">Cadastro administrativo manual</option><option value="SELETIVO_FECHADO">Lista final do processo seletivo</option></select></label>';
  }
  function syncMode(form) { var complete = form.elements.modalidadeCadastro.value === 'COMPLETO'; form.querySelector('[data-member-registration-complete]').hidden = !complete; }
  function syncCourse(form) { var other = form.elements.cursoId.value === 'OUTRO'; form.querySelector('[data-course-other]').hidden = !other; form.elements.cursoNomeOutro.required = false; }
  function key() { return 'portal-ingresso-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); }

  function payload(form) {
    var data = new FormData(form), result = { nomeCompleto: data.get('nomeCompleto'), emailPrincipal: data.get('emailPrincipal'), rga: data.get('rga'), telefone: data.get('telefone') };
    if (data.get('modalidadeCadastro') === 'COMPLETO') {
      var map = {cpf:'cpf',dataNascimento:'birthDate',paisOrigemCodigo:'countryCode',ufOrigem:'stateCode',cidadeNatal:'city',cursoId:'courseId',nomeExibicao:'displayName',instagram:'instagram'};
      result.dadosComplementares = {};
      Object.keys(map).forEach(function(key) { var value = String(data.get(key) || '').trim(); if (value) result.dadosComplementares[map[key]] = value; });
    }
    return result;
  }

  function submit(form) {
    if (busy) return; if (!form.reportValidity()) return;
    var epoch=viewEpoch;busy = true; var button = form.querySelector('[data-member-registration-submit]'); button.disabled = true; button.textContent = 'Cadastrando...';
    api.apiPost('/admin/ingressos-membros/cadastrar', { payload: JSON.stringify(payload(form)) }).then(function(response) {
      if(epoch!==viewEpoch||!enabled())return;if (!response || response.ok !== true) throw response || new Error('Nao foi possivel cadastrar.');
      content().innerHTML = '<div class="member-registration-success"><strong>Pré-cadastro registrado</strong><p>' + esc(response.message || 'O vínculo será ativado somente após o aceite e a conclusão cadastral.') + '</p><dl><dt>Protocolo do ingresso</dt><dd>' + esc(response.data && response.data.idIngresso || '') + '</dd><dt>Status</dt><dd>Aguardando convite e conclusão</dd></dl><p>O cadastro ainda não gera presenças, faltas ou obrigações.</p><button type="button" class="primary-button" data-member-registration-close>Concluir</button></div>';
      toast('success', 'Pré-cadastro salvo. Vínculo ainda não ativado.');
      document.dispatchEvent(new CustomEvent('portal:memberregistered'));
    }).catch(function(error) {
      if(epoch!==viewEpoch||!enabled())return;var feedback = form.querySelector('[data-member-registration-feedback]'); feedback.textContent = error && error.message || 'Nao foi possivel cadastrar.'; feedback.className = 'member-registration-feedback is-error';
      toast('error', feedback.textContent);
    }).then(function() { busy = false; if (button && button.isConnected) { button.disabled = false; button.textContent = 'Salvar pré-cadastro'; } });
  }

  function toast(type, message) { if (ui && ui.mostrarToast) ui.mostrarToast({ type: type, title: 'Cadastro de membro', message: message, persistent: type === 'error' }); }
  document.addEventListener('click', function(event) { var target = event.target.closest('[data-member-registration-open],[data-member-registration-close],[data-member-registration-retry],[data-member-invitations-open],[data-member-invitations-more],[data-invitation-action]'); if (!target) return; if(target.hasAttribute('data-invitation-action'))invitationAction(target);else if(target.hasAttribute('data-member-invitations-open'))openInvitations(false);else if(target.hasAttribute('data-member-invitations-more'))openInvitations(true);else if (target.hasAttribute('data-member-registration-open')) { ensureModal().querySelector('#member-registration-title').textContent='Cadastrar membro aprovado';open(); } else if (target.hasAttribute('data-member-registration-retry')) {if(mode==='invitations')openInvitations(false);else open();} else close(); });
  document.addEventListener('change', function(event) { var form = event.target.closest('[data-member-registration-form]'); if (!form) return; if (event.target.name === 'modalidadeCadastro') syncMode(form); if (event.target.name === 'cursoId') syncCourse(form); });
  document.addEventListener('submit', function(event) { var form = event.target.closest('[data-member-registration-form]'); if (!form) return; event.preventDefault(); submit(form); });
  document.addEventListener('portal:members-session-ready',function(){if(refreshInvitationsWhenReady&&enabled()&&!busy){refreshInvitationsWhenReady=false;var node=modal();if(node&&!node.hidden&&mode==='invitations')openInvitations(false);}});
  document.addEventListener('portal:act-session-cleared',function(){viewEpoch++;busy=false;refreshInvitationsWhenReady=false;invitations=[];invitationCursor=null;var node=modal();if(node){node.hidden=true;node.querySelector('[data-member-registration-content]').replaceChildren();}document.body.classList.remove('modal-open');});
  global.PortalGeapaMemberRegistration = Object.freeze({ renderAction: renderAction, open: open });
})(window);
