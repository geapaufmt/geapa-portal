/** Cadastro administrativo de pessoas cujo ingresso no GEAPA ja foi aprovado. */
(function configurarCadastroMembros(global) {
  'use strict';
  var api = global.PortalGeapaApi; var ui = global.PortalGeapaUi; var busy = false; var courses = [];

  function enabled() {
    return !!(global.PortalGeapaConfig && global.PortalGeapaConfig.ENABLE_MEMBER_REGISTRATION === true &&
      global.PortalGeapaAuth && global.PortalGeapaAuth.hasPermissao('membros:cadastrar_novos_membros'));
  }

  function renderAction() {
    return enabled() ? '<button class="primary-button compact-button" type="button" data-member-registration-open>Cadastrar novo membro</button>' : '';
  }

  function esc(value) { return ui.escaparHtml(String(value == null ? '' : value)); }
  function modal() { return document.getElementById('member-registration-modal'); }

  function ensureModal() {
    if (modal()) return modal();
    var node = document.createElement('div'); node.id = 'member-registration-modal'; node.className = 'portal-modal member-registration-modal'; node.hidden = true;
    node.innerHTML = '<div class="portal-modal-backdrop" data-member-registration-close></div><section class="portal-modal-card member-registration-card" role="dialog" aria-modal="true" aria-labelledby="member-registration-title"><header class="portal-modal-header"><div><p class="eyebrow">Ingresso ja aprovado</p><h2 id="member-registration-title">Cadastrar novo membro</h2></div><button type="button" class="icon-button" data-member-registration-close aria-label="Fechar">&times;</button></header><div data-member-registration-content></div></section>';
    document.body.appendChild(node); return node;
  }

  function open() {
    if (!enabled()) return toast('error', 'O cadastro de membros nao esta disponivel para esta sessao.');
    var node = ensureModal(); node.hidden = false; document.body.classList.add('modal-open');
    renderLoading();
    api.apiGet('/admin/ingressos-membros/catalogos', {}).then(function(response) {
      if (!response || response.ok !== true) throw response || new Error('Catalogo indisponivel.');
      courses = Array.isArray(response.data && response.data.cursos) ? response.data.cursos : [];
      if (!courses.length) throw new Error('Nenhum curso esta habilitado para cadastro.');
      renderForm();
    }).catch(function(error) { renderError(error); });
  }

  function close() { var node = modal(); if (node) node.hidden = true; document.body.classList.remove('modal-open'); }
  function content() { return ensureModal().querySelector('[data-member-registration-content]'); }
  function renderLoading() { content().innerHTML = '<div class="member-registration-state">Carregando catalogos oficiais...</div>'; }
  function renderError(error) { content().innerHTML = '<div class="member-registration-state member-registration-error"><strong>Nao foi possivel preparar o cadastro</strong><p>' + esc(error && error.message || 'Catalogo indisponivel.') + '</p><button type="button" class="secondary-button" data-member-registration-retry>Tentar novamente</button></div>'; }

  function renderForm() {
    content().innerHTML = [
      '<form data-member-registration-form novalidate>',
      '<div class="member-registration-mode" role="radiogroup" aria-label="Modalidade do cadastro"><label><input type="radio" name="modalidadeCadastro" value="RAPIDO" checked> Cadastro rapido e convite</label><label><input type="radio" name="modalidadeCadastro" value="COMPLETO"> Cadastro completo</label></div>',
      '<p class="section-note">Use esta tela somente depois da aprovacao institucional do ingresso. O Portal nao administra processo seletivo.</p>',
      '<div class="member-registration-grid">',
      field('nomeCompleto', 'Nome completo', 'text', true), field('nomeExibicao', 'Nome de exibicao', 'text', false),
      field('emailPrincipal', 'E-mail principal', 'email', true), field('telefone', 'Telefone', 'tel', false),
      field('rga', 'RGA', 'text', true), courseField(), field('dataIngresso', 'Data oficial de ingresso', 'date', true),
      field('semestreEntrada', 'Semestre de entrada no GEAPA', 'text', true, 'Ex.: 2026/1'), formaIngressoField(),
      field('documentoReferencia', 'Referencia administrativa', 'text', false),
      '<label class="member-registration-wide"><span>Observacao administrativa</span><textarea name="observacaoAdministrativa" maxlength="1500"></textarea></label>',
      '</div>',
      '<section data-member-registration-complete hidden><h3>Dados complementares</h3>',
      '<div class="member-registration-grid">' + field('dataNascimento', 'Data de nascimento', 'date', false) + field('instagram', 'Instagram', 'text', false) + '</div>',
      (global.PortalGeapaLocalidades ? global.PortalGeapaLocalidades.renderFields({ paisOrigemCodigo: 'BR' }) : ''),
      '</section>',
      '<div class="member-registration-feedback" data-member-registration-feedback role="status" aria-live="polite"></div>',
      '<div class="portal-modal-actions"><button type="button" class="secondary-button" data-member-registration-close>Cancelar</button><button type="submit" class="primary-button" data-member-registration-submit>Executar cadastro</button></div>',
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
    return '<label><span>Curso</span><select name="cursoId" required><option value="">Selecione</option>' + courses.map(function(course) { var suffix = [course.instituicao, course.campus].filter(Boolean).join(' - '); return '<option value="' + esc(course.cursoId) + '">' + esc(course.nomeCurso + (suffix ? ' - ' + suffix : '')) + '</option>'; }).join('') + '</select></label><label data-course-other hidden><span>Nome do curso</span><input name="cursoNomeOutro" type="text"></label>';
  }
  function formaIngressoField() {
    return '<label><span>Forma de ingresso</span><select name="formaIngresso" required><option value="">Selecione</option><option value="PROCESSO_SELETIVO">Processo seletivo ja concluido</option><option value="CONVITE_DIRETORIA">Convite da Diretoria</option><option value="TRANSFERENCIA_INTERNA">Transferencia interna</option><option value="OUTRO">Outro</option></select></label>';
  }
  function syncMode(form) { var complete = form.elements.modalidadeCadastro.value === 'COMPLETO'; form.querySelector('[data-member-registration-complete]').hidden = !complete; }
  function syncCourse(form) { var other = form.elements.cursoId.value === 'OUTRO'; form.querySelector('[data-course-other]').hidden = !other; form.elements.cursoNomeOutro.required = other; }
  function key() { return 'portal-ingresso-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); }

  function payload(form) {
    var data = new FormData(form); var complete = data.get('modalidadeCadastro') === 'COMPLETO';
    var result = {
      chaveIdempotencia: form.dataset.idempotencyKey || (form.dataset.idempotencyKey = key()), modalidadeCadastro: data.get('modalidadeCadastro'),
      nomeCompleto: data.get('nomeCompleto'), nomeExibicao: data.get('nomeExibicao'), emailPrincipal: data.get('emailPrincipal'), telefone: data.get('telefone'),
      rga: data.get('rga'), cursoId: data.get('cursoId'), cursoNomeOutro: data.get('cursoNomeOutro'), dataIngresso: data.get('dataIngresso'),
      semestreEntrada: data.get('semestreEntrada'), formaIngresso: data.get('formaIngresso'), documentoReferencia: data.get('documentoReferencia'), observacaoAdministrativa: data.get('observacaoAdministrativa')
    };
    if (complete) {
      result.dadosComplementares = { dataNascimento: data.get('dataNascimento'), instagram: data.get('instagram') };
      if (global.PortalGeapaLocalidades) Object.assign(result.dadosComplementares, global.PortalGeapaLocalidades.serialize(form));
    }
    return result;
  }

  function submit(form) {
    if (busy) return; if (!form.reportValidity()) return;
    busy = true; var button = form.querySelector('[data-member-registration-submit]'); button.disabled = true; button.textContent = 'Cadastrando...';
    api.apiPost('/admin/ingressos-membros/cadastrar', { payload: JSON.stringify(payload(form)) }).then(function(response) {
      if (!response || response.ok !== true) throw response || new Error('Nao foi possivel cadastrar.');
      content().innerHTML = '<div class="member-registration-success"><strong>Novo membro cadastrado</strong><p>' + esc(response.message || 'O vinculo esta ativo.') + '</p><dl><dt>Protocolo do ingresso</dt><dd>' + esc(response.data && response.data.idIngresso || '') + '</dd><dt>Status</dt><dd>EXECUTADO</dd></dl><p>O convite foi enfileirado sem bloquear o cadastro.</p><button type="button" class="primary-button" data-member-registration-close>Concluir</button></div>';
      toast('success', 'Novo membro cadastrado e vinculo ativado.');
      document.dispatchEvent(new CustomEvent('portal:memberregistered'));
    }).catch(function(error) {
      var feedback = form.querySelector('[data-member-registration-feedback]'); feedback.textContent = error && error.message || 'Nao foi possivel cadastrar.'; feedback.className = 'member-registration-feedback is-error';
      toast('error', feedback.textContent);
    }).then(function() { busy = false; if (button && button.isConnected) { button.disabled = false; button.textContent = 'Executar cadastro'; } });
  }

  function toast(type, message) { if (ui && ui.mostrarToast) ui.mostrarToast({ type: type, title: 'Cadastro de membro', message: message, persistent: type === 'error' }); }
  document.addEventListener('click', function(event) { var target = event.target.closest('[data-member-registration-open],[data-member-registration-close],[data-member-registration-retry]'); if (!target) return; if (target.hasAttribute('data-member-registration-open')) open(); else if (target.hasAttribute('data-member-registration-retry')) open(); else close(); });
  document.addEventListener('change', function(event) { var form = event.target.closest('[data-member-registration-form]'); if (!form) return; if (event.target.name === 'modalidadeCadastro') syncMode(form); if (event.target.name === 'cursoId') syncCourse(form); });
  document.addEventListener('submit', function(event) { var form = event.target.closest('[data-member-registration-form]'); if (!form) return; event.preventDefault(); submit(form); });
  global.PortalGeapaMemberRegistration = Object.freeze({ renderAction: renderAction, open: open });
})(window);
