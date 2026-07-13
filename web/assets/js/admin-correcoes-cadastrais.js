/** Fila administrativa de correcoes cadastrais nos ambientes autorizados. */
(function configurarCorrecoesCadastrais(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var config = global.PortalGeapaConfig || {};
  var state = { active: false, loading: false, page: 1, items: [], pagination: {}, filters: {}, selected: null };

  function start() {
    if (!api || !ui || !navigation) return;
    document.addEventListener('portal:navigationchange', function onNavigation(event) {
      var route = event.detail && event.detail.rota;
      state.active = !!(route && route.id === 'admin-correcoes-cadastrais');
      if (state.active) load();
    });
    document.addEventListener('submit', onSubmit);
    document.addEventListener('click', onClick);
    if (navigation.getRotaAtual && navigation.getRotaAtual() === 'admin-correcoes-cadastrais') {
      state.active = true;
      load();
    }
  }

  function load() {
    if (!state.active || state.loading) return;
    state.loading = true;
    renderShell('<p class="empty-state">Carregando solicitações cadastrais...</p>');
    api.apiGet('/admin/correcoes-cadastrais', {
      filtros: JSON.stringify({ status: state.filters.status || '', campo: state.filters.campo || '', pagina: state.page, pageSize: 25 })
    }).then(function response(result) {
      if (!result || result.ok !== true) throw new Error(result && result.message || 'Não foi possível carregar as solicitações.');
      state.items = Array.isArray(result.data && result.data.solicitacoes) ? result.data.solicitacoes : [];
      state.pagination = result.data && result.data.paginacao || {};
      render();
    }).catch(function error(err) {
      renderShell('<p class="empty-state">' + escape(err.message || 'Erro controlado ao carregar solicitações.') + '</p>');
    }).then(function done() { state.loading = false; });
  }

  function render() {
    var total = Number(state.pagination.totalItens || state.items.length);
    renderShell([
      '<form class="portal-filter-panel admin-corrections-filters" data-admin-corrections-filter>',
      '<div class="portal-filter-grid"><label><span>Buscar pessoa</span><input type="search" name="pessoa" value="' + escape(state.filters.pessoa || '') + '" placeholder="Nome, RGA ou e-mail"></label>', select('status', 'Status', ['', 'PENDENTE', 'EM_ANALISE', 'COMPLEMENTO_SOLICITADO', 'APROVADA', 'INDEFERIDA', 'APLICADA', 'ERRO_APLICACAO']),
      select('campo', 'Campo', ['', 'NOME_COMPLETO', 'CPF', 'RGA', 'DATA_NASCIMENTO', 'EMAIL_PRINCIPAL']), '</div>',
      '<div class="portal-filter-actions"><button class="secondary-button compact-button" type="button" data-admin-corrections-clear>Limpar filtros</button><button class="primary-button compact-button" type="submit">Filtrar</button></div></form>',
      '<p class="section-note"><strong>' + total + '</strong> solicitação(ões). Identificadores pessoais são exibidos de forma mascarada.</p>',
      state.items.length ? table(state.items) + cards(state.items) : '<p class="empty-state">Nenhuma solicitação encontrada.</p>',
      pagination()
    ].join(''));
  }

  function renderShell(content) {
    var container = document.getElementById('admin-correcoes-cadastrais-content');
    if (!container || !state.active) return;
    container.innerHTML = '<header class="portal-page-header"><div class="portal-page-heading"><p class="portal-page-eyebrow">Gestão do GEAPA</p><h2 class="portal-page-title" id="admin-correcoes-title">Correções cadastrais</h2><p class="portal-page-description">Análise e aplicação explícita de solicitações autorizadas pelo Core.</p></div><span class="portal-page-badge">HOMOLOG</span></header>' + content;
    var badge = container.querySelector('.portal-page-badge');
    if (badge) badge.textContent = String(config.ENVIRONMENT || '').toUpperCase() === 'PROD' ? 'PRODUCAO' : 'HOMOLOG';
  }

  function table(items) {
    return '<div class="readonly-table-wrap admin-corrections-table"><table class="readonly-table"><thead><tr><th>Pessoa</th><th>Solicitação</th><th>Campo</th><th>Data</th><th>Status</th><th>Valor solicitado</th><th>Ação</th></tr></thead><tbody>' + items.map(function row(item) {
      return '<tr><td>' + person(item) + '</td><td>' + value(item.id) + '</td><td>' + value(label(item.campo)) + '</td><td>' + value(formatDate(item.solicitadoEm)) + '</td><td>' + chip(item.status) + '</td><td>' + value(item.valorSolicitadoMascarado) + '</td><td><button class="secondary-button compact-button" data-admin-correction-detail="' + escape(item.id) + '" type="button">Analisar</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function cards(items) {
    return '<div class="admin-corrections-cards">' + items.map(function card(item) {
      return '<article class="admin-correction-card"><div><strong>' + value(label(item.campo)) + '</strong>' + chip(item.status) + '</div>' + person(item) + '<p>' + value(formatDate(item.solicitadoEm)) + '</p><p>Valor solicitado: ' + value(item.valorSolicitadoMascarado) + '</p><button class="secondary-button compact-button" data-admin-correction-detail="' + escape(item.id) + '" type="button">Analisar</button></article>';
    }).join('') + '</div>';
  }

  function open(item) {
    if (!item) return;
    state.selected = item;
    var modal = document.getElementById('admin-correction-modal');
    var content = document.getElementById('admin-correction-modal-content');
    if (!modal || !content) return;
    var canApply = String(item.status || '') === 'APROVADA';
    content.innerHTML = [
      '<div class="admin-correction-person">' + person(item) + '</div><dl class="summary-grid"><div class="summary-item"><dt>ID</dt><dd>' + value(item.id) + '</dd></div><div class="summary-item"><dt>Campo</dt><dd>' + value(label(item.campo)) + '</dd></div>',
      '<div class="summary-item"><dt>Atual</dt><dd>' + value(item.valorAtualMascarado) + '</dd></div><div class="summary-item"><dt>Solicitado</dt><dd>' + value(item.valorSolicitadoMascarado) + '</dd></div></dl>',
      item.justificativa ? '<p><strong>Justificativa:</strong> ' + value(item.justificativa) + '</p>' : '',
      '<form data-admin-correction-action><label><span>Decisão</span><select name="acao" required><option value="">Selecione</option><option value="EM_ANALISE">Colocar em análise</option><option value="COMPLEMENTO_SOLICITADO">Solicitar complemento</option><option value="APROVADA">Aprovar</option><option value="INDEFERIDA">Indeferir</option></select></label>',
      '<label><span>Motivo público</span><textarea name="motivo" rows="4" maxlength="1000"></textarea></label><p class="section-note">Motivo obrigatório para complemento e indeferimento.</p>',
      '<div class="profile-form-actions"><button class="primary-button" type="submit">Registrar análise</button>',
      canApply ? '<button class="secondary-button" type="button" data-admin-correction-apply>Aplicar correção aprovada</button>' : '', '</div></form>'
    ].join('');
    modal.hidden = false;
  }

  function onSubmit(event) {
    if (event.target.matches('[data-admin-corrections-filter]')) {
      event.preventDefault();
      var data = new FormData(event.target); state.filters = { pessoa: data.get('pessoa'), status: data.get('status'), campo: data.get('campo') }; state.page = 1; load(); return;
    }
    if (event.target.matches('[data-admin-correction-action]')) {
      event.preventDefault();
      var form = event.target; var data2 = new FormData(form); var action = String(data2.get('acao') || ''); var reason = String(data2.get('motivo') || '').trim();
      if ((action === 'COMPLEMENTO_SOLICITADO' || action === 'INDEFERIDA') && reason.length < 10) { ui.mostrarToast({ type: 'warning', message: 'Informe um motivo público com pelo menos 10 caracteres.' }); return; }
      write('/admin/correcoes-cadastrais/analisar', { idSolicitacao: state.selected.id, acao: action, motivo: reason }, 'Análise cadastrada.');
    }
  }

  function onClick(event) {
    var detail = event.target.closest('[data-admin-correction-detail]');
    if (detail) open(state.items.find(function find(item) { return String(item.id) === detail.dataset.adminCorrectionDetail; }));
    if (event.target.closest('[data-admin-correction-close]')) close();
    if (event.target.closest('[data-admin-corrections-clear]')) { state.filters = {}; state.page = 1; load(); }
    if (event.target.closest('[data-admin-correction-apply]') && state.selected && global.confirm('Aplicar esta correção aprovada na fonte oficial?')) {
      write('/admin/correcoes-cadastrais/aplicar', { idSolicitacao: state.selected.id }, 'Correção aplicada com sucesso.');
    }
    var page = event.target.closest('[data-admin-corrections-page]');
    if (page) { state.page = Number(page.dataset.adminCorrectionsPage || 1); load(); }
  }

  function write(route, payload, success) {
    payload.chaveIdempotencia = 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    ui.mostrarLoading('Salvando decisão...');
    api.apiPost(route, { payload: JSON.stringify(payload) }).then(function result(response) {
      if (!response || response.ok !== true) throw new Error(response && response.message || 'Não foi possível concluir a ação.');
      ui.mostrarToast({ type: 'success', title: 'Correção cadastral', message: response.message || success });
      close(); load();
    }).catch(function error(err) { ui.mostrarToast({ type: 'error', critical: true, message: err.message }); }).then(function done() { ui.ocultarLoading(); });
  }

  function close() { var modal = document.getElementById('admin-correction-modal'); if (modal) modal.hidden = true; state.selected = null; }
  function select(name, text, values) { return '<label><span>' + escape(text) + '</span><select name="' + name + '">' + values.map(function option(v) { return '<option value="' + escape(v) + '"' + (String(state.filters[name] || '') === v ? ' selected' : '') + '>' + escape(v ? label(v) : 'Todos') + '</option>'; }).join('') + '</select></label>'; }
  function pagination() { var p = state.pagination || {}; if (Number(p.totalPaginas || 1) <= 1) return ''; return '<div class="portal-pagination"><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.max(state.page - 1, 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>Anterior</button><span>Página ' + state.page + ' de ' + p.totalPaginas + '</span><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.min(state.page + 1, p.totalPaginas) + '"' + (state.page >= p.totalPaginas ? ' disabled' : '') + '>Próxima</button></div>'; }
  function label(v) { return String(v || '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, function c(x) { return x.toUpperCase(); }); }
  function formatDate(v) { var d = new Date(v); return isNaN(d.getTime()) ? String(v || '-') : d.toLocaleString('pt-BR'); }
  function chip(v) { return '<span class="status-pill">' + value(v) + '</span>'; }
  function person(item) { var p = item && item.pessoa || {}; return '<div class="admin-correction-person"><strong>' + value(p.nomeExibicao || 'Pessoa não identificada') + '</strong><small>' + value(p.rgaMascarado) + '</small><small>' + value(p.emailMascarado) + '</small></div>'; }
  function value(v) { return escape(v == null || v === '' ? '-' : v); }
  function escape(v) { return ui.escaparHtml(String(v == null ? '' : v)); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
