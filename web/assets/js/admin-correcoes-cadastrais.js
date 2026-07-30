/** Fila administrativa de correcoes cadastrais nos ambientes autorizados. */
(function configurarCorrecoesCadastrais(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var config = global.PortalGeapaConfig || {};
  var state = { active: false, loading: false, writing: false, page: 1, items: [], pagination: {}, filters: {}, selected: null };

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

  function open(idSolicitacao, revelarDados) {
    if (!idSolicitacao) return;
    var modal = document.getElementById('admin-correction-modal');
    var content = document.getElementById('admin-correction-modal-content');
    if (!modal || !content) return;
    content.innerHTML = '<p class="empty-state">Carregando detalhe autorizado...</p>';
    modal.hidden = false;
    api.apiGet('/admin/correcoes-cadastrais/detalhe', {
      payload: JSON.stringify({ idSolicitacao: idSolicitacao, revelarDados: revelarDados === true })
    }).then(function response(result) {
      if (!result || result.ok !== true || !result.data) throw new Error(result && result.message || 'Não foi possível carregar o detalhe da solicitação.');
      state.selected = result.data;
      renderDetail(result.data);
    }).catch(function error(err) {
      content.innerHTML = '<p class="empty-state">' + escape(err.message || 'Detalhe cadastral indisponível.') + '</p>';
    });
  }

  function renderDetail(item) {
    var content = document.getElementById('admin-correction-modal-content');
    if (!content || !item) return;
    var status = String(item.status || '').toUpperCase();
    var canApproveApply = ['PENDENTE', 'EM_ANALISE', 'COMPLEMENTO_SOLICITADO', 'APROVADA', 'ERRO_APLICACAO'].indexOf(status) >= 0;
    var canAnalyze = ['PENDENTE', 'EM_ANALISE', 'COMPLEMENTO_SOLICITADO'].indexOf(status) >= 0;
    var revealAction = item.requerRevelacao && !item.dadosRevelados
      ? '<button class="secondary-button" type="button" data-admin-correction-reveal>Exibir dados para análise</button><p class="section-note">A autorização será verificada novamente e a visualização ficará registrada.</p>'
      : '';
    var history = Array.isArray(item.historicoDecisoes) && item.historicoDecisoes.length
      ? '<div class="admin-correction-history"><h3>Histórico de decisões</h3>' + item.historicoDecisoes.map(function event(row) {
          return '<article><strong>' + value(row.status || row.decisao) + '</strong><span>' + value(formatDate(row.analisadoEm)) + '</span>' + (row.motivoPublico ? '<p>' + value(row.motivoPublico) + '</p>' : '') + (row.analisadoPorMascarado ? '<small>Analisado por: ' + value(row.analisadoPorMascarado) + '</small>' : '') + '</article>';
        }).join('') + '</div>'
      : '<p class="section-note">Ainda não há decisões registradas.</p>';
    var actionPanel = '';
    if (canAnalyze || canApproveApply) {
      actionPanel = [
        canAnalyze ? '<form data-admin-correction-action><label><span>Decisão</span><select name="acao" required><option value="">Selecione</option><option value="EM_ANALISE">Colocar em análise</option><option value="COMPLEMENTO_SOLICITADO">Solicitar complemento</option><option value="INDEFERIDA">Indeferir</option></select></label>' : '<div class="profile-apply-panel">',
        canAnalyze ? '<label><span>Motivo público</span><textarea name="motivo" rows="4" maxlength="1000"></textarea></label><p class="section-note">Motivo obrigatório para complemento e indeferimento.</p>' : '',
        '<div class="profile-form-actions">', canAnalyze ? '<button class="secondary-button" type="submit">Registrar análise</button>' : '',
        canApproveApply ? '<button class="primary-button" type="button" data-admin-correction-approve-apply>Aprovar e aplicar alteração</button>' : '', '</div>',
        '<p class="profile-apply-warning">A aprovação aplicará imediatamente o valor solicitado nas fontes oficiais e atualizará as visões derivadas.</p>',
        canAnalyze ? '</form>' : '</div>'
      ].join('');
    }
    content.innerHTML = [
      '<div class="admin-correction-person">' + person(item) + '</div><dl class="summary-grid"><div class="summary-item"><dt>ID</dt><dd>' + value(item.id) + '</dd></div><div class="summary-item"><dt>Campo</dt><dd>' + value(label(item.campo)) + '</dd></div>',
      '<div class="summary-item"><dt>Solicitada em</dt><dd>' + value(formatDate(item.solicitadoEm)) + '</dd></div><div class="summary-item"><dt>Status</dt><dd>' + chip(item.status) + '</dd></div></dl>',
      '<div class="admin-correction-comparison"><section><span>Atual na fonte oficial</span><strong>' + value(item.valorAtual) + '</strong></section><section><span>Solicitado</span><strong>' + value(item.valorSolicitado) + '</strong></section></div>',
      revealAction,
      item.justificativa ? '<p><strong>Justificativa:</strong> ' + value(item.justificativa) + '</p>' : '',
      history,
      actionPanel
    ].join('');
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
    if (detail) open(detail.dataset.adminCorrectionDetail, false);
    if (event.target.closest('[data-admin-correction-close]')) close();
    if (event.target.closest('[data-admin-correction-reveal]') && state.selected && global.confirm('Exibir os dados completos necessários para análise? Esta visualização será auditada.')) {
      open(state.selected.id, true);
    }
    if (event.target.closest('[data-admin-corrections-clear]')) { state.filters = {}; state.page = 1; load(); }
    var approveApply = event.target.closest('[data-admin-correction-approve-apply]');
    if (approveApply && state.selected && global.confirm('Aprovar e aplicar esta alteração nas fontes oficiais agora?')) {
      writeApproveApply(approveApply);
    }
    var page = event.target.closest('[data-admin-corrections-page]');
    if (page) { state.page = Number(page.dataset.adminCorrectionsPage || 1); load(); }
  }

  function write(route, payload, success) {
    if (state.writing) return;
    state.writing = true;
    payload.chaveIdempotencia = 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    ui.mostrarLoading('Salvando decisão...');
    api.apiPost(route, { payload: JSON.stringify(payload) }).then(function result(response) {
      if (!response || response.ok !== true) throw new Error(response && response.message || 'Não foi possível concluir a ação.');
      ui.mostrarToast({ type: 'success', title: 'Correção cadastral', message: response.message || success });
      close(); load();
    }).catch(function error(err) { ui.mostrarToast({ type: 'error', critical: true, message: err.message }); }).then(function done() { state.writing = false; ui.ocultarLoading(); });
  }

  function writeApproveApply(button) {
    if (state.writing || !state.selected) return;
    state.writing = true;
    var originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Aplicando alteração...';
    var payload = {
      idSolicitacao: state.selected.id,
      confirmacao: true,
      chaveIdempotencia: 'admin-apply-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
    };
    ui.mostrarLoading('Aprovando e aplicando alteração...');
    api.apiPost('/admin/correcoes-cadastrais/aprovar-aplicar', { payload: JSON.stringify(payload) }).then(function result(response) {
      if (!response || response.ok !== true) throw new Error(response && response.message || 'Não foi possível aprovar e aplicar a alteração.');
      renderApplySuccess(response.data || {});
      ui.mostrarToast({ type: 'success', title: 'Alteração aplicada', message: response.message || 'Solicitação aprovada e aplicada com sucesso.' });
      load();
    }).catch(function error(err) {
      button.disabled = false;
      button.textContent = originalText;
      ui.mostrarToast({ type: 'error', critical: true, message: err.message });
    }).then(function done() {
      state.writing = false;
      ui.ocultarLoading();
    });
  }

  function renderApplySuccess(data) {
    var content = document.getElementById('admin-correction-modal-content');
    if (!content) return;
    content.innerHTML = [
      '<div class="portal-success-panel"><h3>Alteração aplicada</h3>',
      '<p>A solicitação foi aprovada e aplicada nas fontes oficiais.</p>',
      '<dl class="summary-grid"><div class="summary-item"><dt>Status</dt><dd>' + value(data.status || 'APLICADA') + '</dd></div>',
      '<div class="summary-item"><dt>Solicitação</dt><dd>' + value(data.idSolicitacao || state.selected && state.selected.id) + '</dd></div>',
      '<div class="summary-item"><dt>Aplicada em</dt><dd>' + value(formatDate(data.aplicadoEm)) + '</dd></div>',
      '<div class="summary-item"><dt>Responsável</dt><dd>' + value(data.analisadoPorMascarado) + '</dd></div>',
      '<div class="summary-item"><dt>Log</dt><dd>' + value(data.idLog) + '</dd></div></dl></div>'
    ].join('');
  }

  function close() { var modal = document.getElementById('admin-correction-modal'); if (modal) modal.hidden = true; state.selected = null; }
  function select(name, text, values) { return '<label><span>' + escape(text) + '</span><select name="' + name + '">' + values.map(function option(v) { return '<option value="' + escape(v) + '"' + (String(state.filters[name] || '') === v ? ' selected' : '') + '>' + escape(v ? label(v) : 'Todos') + '</option>'; }).join('') + '</select></label>'; }
  function pagination() { var p = state.pagination || {}; if (Number(p.totalPaginas || 1) <= 1) return ''; return '<div class="portal-pagination"><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.max(state.page - 1, 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>Anterior</button><span>Página ' + state.page + ' de ' + p.totalPaginas + '</span><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.min(state.page + 1, p.totalPaginas) + '"' + (state.page >= p.totalPaginas ? ' disabled' : '') + '>Próxima</button></div>'; }
  function label(v) { return String(v || '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, function c(x) { return x.toUpperCase(); }); }
  function formatDate(v) { var d = new Date(v); return isNaN(d.getTime()) ? String(v || '-') : d.toLocaleString('pt-BR'); }
  function chip(v) { return '<span class="status-pill">' + value(v) + '</span>'; }
  function person(item) { var p = item && item.pessoa || {}; return '<div class="admin-correction-person-lines"><strong>' + value(p.nomeExibicao || 'Pessoa não identificada') + '</strong><span>RGA: ' + value(p.rgaMascarado) + '</span><span>E-mail: ' + value(p.emailMascarado) + '</span></div>'; }
  function value(v) { return escape(v == null || v === '' ? '-' : v); }
  function escape(v) { return ui.escaparHtml(String(v == null ? '' : v)); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
