/** Experiencia do membro para solicitacoes voluntarias de vinculo. */
(function configurarSolicitacoesVinculo(global) {
  'use strict';

  var estado = { carregando: false, opcoes: null, itens: [] };

  function habilitado() {
    return !!(global.PortalGeapaConfig && global.PortalGeapaConfig.ENABLE_VINCULO_REQUESTS === true);
  }

  function raiz() { return document.getElementById('meu-vinculo-solicitacoes'); }
  function modal() { return document.getElementById('vinculo-solicitacao-modal'); }
  function escapar(value) { return global.PortalGeapaUi ? global.PortalGeapaUi.escaparHtml(String(value == null ? '' : value)) : String(value == null ? '' : value); }
  function data(value) { return global.PortalGeapaUi ? global.PortalGeapaUi.formatarData(value) : escapar(value || '—'); }
  function rotulo(value) { return String(value || '').toLowerCase().replace(/_/g, ' ').replace(/^./, function(c) { return c.toUpperCase(); }); }

  async function carregar() {
    var container = raiz();
    if (!container || !habilitado() || estado.carregando || !global.PortalGeapaApi) return;
    estado.carregando = true;
    container.hidden = false;
    container.innerHTML = '<div class="vinculo-card"><p class="empty-state">Carregando seu vínculo e solicitações...</p></div>';
    try {
      var respostas = await Promise.all([
        global.PortalGeapaApi.apiGet('/meu-vinculo/opcoes', {}),
        global.PortalGeapaApi.apiGet('/meu-vinculo/solicitacoes', {})
      ]);
      if (!respostas[0].ok) throw respostas[0];
      if (!respostas[1].ok) throw respostas[1];
      estado.opcoes = respostas[0].data || {};
      estado.itens = (respostas[1].data && respostas[1].data.items) || [];
      renderizar(container);
    } catch (error) {
      container.innerHTML = '<div class="vinculo-card"><h3>Meu vínculo com o GEAPA</h3><p class="portal-feedback is-error">' + escapar(error.message || 'Não foi possível carregar as solicitações de vínculo.') + '</p></div>';
    } finally { estado.carregando = false; }
  }

  function renderizar(container) {
    var opcoes = estado.opcoes || {};
    var vinculo = opcoes.vinculo || {};
    var semestre = opcoes.semestre || {};
    var parametro = opcoes.parametroSuspensao || {};
    var existente = opcoes.solicitacaoAberta;
    var botoes = existente
      ? '<p class="vinculo-alerta">Já existe uma solicitação em andamento: <strong>' + escapar(existente.idSolicitacao) + '</strong>.</p>'
      : '<div class="vinculo-actions"><button type="button" class="secondary-button" data-vinculo-new="suspensao" ' + ((opcoes.opcoes || {}).suspensaoDisponivel ? '' : 'disabled') + '>Solicitar suspensão temporária</button><button type="button" class="secondary-button" data-vinculo-new="desligamento" ' + ((opcoes.opcoes || {}).desligamentoDisponivel ? '' : 'disabled') + '>Solicitar desligamento voluntário</button></div>';
    container.innerHTML = [
      '<div class="vinculo-card">',
      '<div class="vinculo-heading"><div><p class="eyebrow">Meu vínculo</p><h3>Meu vínculo com o GEAPA</h3></div><button type="button" class="secondary-button compact-button" data-vinculo-refresh>Atualizar</button></div>',
      '<dl class="vinculo-summary"><div><dt>Tipo</dt><dd>' + escapar(rotulo(vinculo.tipo)) + '</dd></div><div><dt>Status</dt><dd>' + escapar(rotulo(vinculo.status)) + '</dd></div><div><dt>Ingresso</dt><dd>' + data(vinculo.dataInicio) + '</dd></div><div><dt>Semestre letivo</dt><dd>' + escapar(semestre.idSemestre || 'Não resolvido') + '</dd></div></dl>',
      parametro.valor ? '<p class="section-note">Suspensão mínima vigente: <strong>' + escapar(parametro.valor) + ' ' + escapar(parametro.unidade) + '</strong>. Base legal: ' + escapar(parametro.baseLegal) + '.</p>' : '',
      botoes,
      '<div class="vinculo-requests"><h4>Minhas solicitações de vínculo</h4>', montarItens(), '</div>',
      '<div data-vinculo-feedback></div>',
      '</div>'
    ].join('');
  }

  function montarItens() {
    if (!estado.itens.length) return '<p class="empty-state">Nenhuma solicitação registrada.</p>';
    return '<div class="vinculo-request-list">' + estado.itens.map(function(item) {
      return '<article class="vinculo-request-item"><div><strong>' + escapar(item.idSolicitacao) + '</strong><span>' + escapar(rotulo(item.tipo)) + ' · ' + escapar(rotulo(item.modalidade)) + '</span></div><div><span class="status-chip">' + escapar(rotulo(item.status)) + '</span><span>' + data(item.dataSolicitacao) + '</span></div>' +
        (item.mensagemDiretoria ? '<p>' + escapar(item.mensagemDiretoria) + '</p>' : '') +
        (item.podeCancelar ? '<button type="button" class="secondary-button compact-button" data-vinculo-cancel="' + escapar(item.idSolicitacao) + '">Cancelar solicitação</button>' : '') + '</article>';
    }).join('') + '</div>';
  }

  function abrir(tipo) {
    var el = modal();
    var form = el && el.querySelector('[data-vinculo-form]');
    if (!el || !form) return mostrarErro('O formulário de solicitação não foi carregado.');
    form.reset();
    form.elements.tipo.value = tipo;
    el.querySelector('[data-vinculo-modal-title]').textContent = tipo === 'suspensao' ? 'Solicitar suspensão temporária' : 'Solicitar desligamento voluntário';
    el.querySelector('[data-vinculo-suspensao]').hidden = tipo !== 'suspensao';
    el.querySelector('[data-vinculo-desligamento]').hidden = tipo !== 'desligamento';
    ['justificativa','dataInicioPretendida','dataFimPretendida'].forEach(function(name) { form.elements[name].required = tipo === 'suspensao'; });
    form.elements.modalidadeSolicitada.required = tipo === 'desligamento';
    var semestre = estado.opcoes && estado.opcoes.semestre;
    el.querySelector('[data-vinculo-semestre]').textContent = semestre ? 'Semestre ' + semestre.idSemestre + ' — término oficial em ' + data(semestre.dataFim) + '.' : 'Semestre letivo não resolvido.';
    el.hidden = false;
    form.querySelector('select:not([hidden]), input:not([type="hidden"])').focus();
  }

  function fechar() { var el = modal(); if (el) el.hidden = true; }
  function atualizarDuracao(form) {
    var slot = form.querySelector('[data-vinculo-duration]');
    var start = form.elements.dataInicioPretendida.value;
    var end = form.elements.dataFimPretendida.value;
    if (!slot || !start || !end) return;
    var partsA = start.split('-').map(Number); var partsB = end.split('-').map(Number);
    var days = Math.floor((Date.UTC(partsB[0], partsB[1] - 1, partsB[2]) - Date.UTC(partsA[0], partsA[1] - 1, partsA[2])) / 86400000) + 1;
    var minimum = estado.opcoes && estado.opcoes.parametroSuspensao;
    slot.textContent = days > 0 ? 'Duração civil: ' + days + ' dias. Mínimo vigente: ' + minimum.valor + ' ' + minimum.unidade + '.' : 'A data final deve ser posterior ou igual à inicial.';
  }
  function chave() { return 'SVI-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12); }

  async function enviar(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var tipo = form.elements.tipo.value;
    var button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    var payload = {
      chaveIdempotencia: form.dataset.idempotencia || (form.dataset.idempotencia = chave()),
      motivoCategoria: form.elements.motivoCategoria.value,
      cienciaRegras: form.elements.cienciaRegras.checked,
      cienciaRegrasVersao: 'PORTAL_VINCULO_V2',
      documentoReferencia: form.elements.documentoReferencia.value.trim()
    };
    var route;
    if (tipo === 'suspensao') {
      route = '/meu-vinculo/suspensao/solicitar';
      payload.justificativa = form.elements.justificativa.value.trim();
      payload.dataInicioPretendida = form.elements.dataInicioPretendida.value;
      payload.dataFimPretendida = form.elements.dataFimPretendida.value;
    } else {
      route = '/meu-vinculo/desligamento/solicitar';
      payload.modalidadeSolicitada = form.elements.modalidadeSolicitada.value;
      payload.observacoes = form.elements.observacoes.value.trim();
    }
    button.disabled = true; button.textContent = 'Enviando...';
    try {
      var response = await global.PortalGeapaApi.apiPost(route, { payload: JSON.stringify(payload) });
      if (!response.ok) throw response;
      fechar(); form.reset(); delete form.dataset.idempotencia;
      mostrarSucesso('Solicitação ' + response.data.idSolicitacao + ' registrada com status ' + response.data.status + '.');
      estado.opcoes = null; await carregarForcado();
    } catch (error) { mostrarErro(error.message || 'Não foi possível registrar a solicitação.'); }
    finally { button.disabled = false; button.textContent = 'Enviar solicitação'; }
  }

  async function cancelar(id) {
    if (!global.confirm('Deseja cancelar esta solicitação?')) return;
    var response = await global.PortalGeapaApi.apiPost('/meu-vinculo/solicitacao/cancelar', { payload: JSON.stringify({ idSolicitacao: id, motivo: 'Cancelamento solicitado pelo membro no Portal.' }) });
    if (!response.ok) return mostrarErro(response.message || 'Não foi possível cancelar.');
    mostrarSucesso('Solicitação cancelada.'); await carregarForcado();
  }

  async function carregarForcado() { estado.carregando = false; return carregar(); }
  function mostrarSucesso(message) { if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Solicitação de vínculo', message: message }); var slot = raiz() && raiz().querySelector('[data-vinculo-feedback]'); if (slot && global.PortalGeapaUi) global.PortalGeapaUi.mostrarMensagemPersistente(slot, { type: 'success', message: message }); }
  function mostrarErro(message) { if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'error', title: 'Não foi possível concluir', message: message, persistent: true }); }

  document.addEventListener('portal:navigationchange', function(event) { if (event.detail && event.detail.rota && event.detail.rota.id === 'minha-situacao') carregarForcado(); });
  document.addEventListener('click', function(event) {
    var button = event.target.closest('[data-vinculo-new],[data-vinculo-refresh],[data-vinculo-cancel],[data-vinculo-close]');
    if (!button) return;
    if (button.hasAttribute('data-vinculo-close')) fechar();
    else if (button.hasAttribute('data-vinculo-refresh')) carregarForcado();
    else if (button.dataset.vinculoNew) abrir(button.dataset.vinculoNew);
    else if (button.dataset.vinculoCancel) cancelar(button.dataset.vinculoCancel);
  });
  document.addEventListener('submit', function(event) { if (event.target.matches('[data-vinculo-form]')) enviar(event); });
  document.addEventListener('change', function(event) { if (event.target.matches('[data-vinculo-form] input[type="date"]')) atualizarDuracao(event.target.form); });
})(window);
