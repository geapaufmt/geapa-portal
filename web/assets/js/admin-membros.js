/**
 * Area administrativa somente leitura de membros.
 * O navegador consome apenas o contrato sanitizado do Apps Script/Core.
 */
(function configurarAdminMembros(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var state = {
    active: false,
    loading: false,
    filters: {},
    page: 1,
    pageSize: 25,
    items: [],
    pagination: {},
    options: {},
    lastUpdate: '',
    debounce: null
  };

  /** Inicializa eventos da rota e dos controles da tela. */
  function start() {
    if (!api || !ui || !navigation) return;
    document.addEventListener('portal:navigationchange', function onNavigation(event) {
      var route = event.detail && event.detail.rota;
      state.active = !!(route && route.id === 'admin-membros');
      if (state.active) loadMembers();
    });
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    document.addEventListener('click', handleClick);
    document.addEventListener('portal:memberregistered', function reloadAfterRegistration() { state.page = 1; loadMembers(); });
    if (navigation.getRotaAtual && navigation.getRotaAtual() === 'admin-membros') {
      state.active = true;
      loadMembers();
    }
  }

  /** Solicita ao backend uma pagina filtrada de membros. */
  function loadMembers() {
    if (!state.active || state.loading) return;
    state.loading = true;
    renderLoading();
    api.apiGet('/admin/membros', {
      filtros: JSON.stringify(Object.assign({}, state.filters, {
        pagina: state.page,
        pageSize: state.pageSize
      }))
    }).then(function onResponse(response) {
      if (!response || response.ok !== true) {
        var error = new Error(response && response.message || 'Nao foi possivel carregar os membros.');
        error.code = response && (response.code || response.errorCode) || '';
        throw error;
      }
      var data = response.data || {};
      state.items = Array.isArray(data.itens) ? data.itens : [];
      state.pagination = data.paginacao || {};
      state.options = data.opcoesFiltros || {};
      state.lastUpdate = data.ultimaAtualizacaoResumo || '';
      renderContent();
    }).catch(function onError(error) {
      renderError(error);
    }).then(function done() {
      state.loading = false;
    });
  }

  /** Renderiza o cabecalho compartilhado pelos estados da tela. */
  function renderShell(content) {
    var container = getContainer();
    if (!container || !state.active) return;
    container.innerHTML = [
      '<header class="portal-page-header admin-members-hero">',
      '<div class="portal-page-heading"><p class="portal-page-eyebrow eyebrow">Gestao do GEAPA</p><h2 class="portal-page-title" id="admin-membros-title">Membros</h2>',
      '<p class="portal-page-description intro">Visao operacional somente leitura para acompanhamento da Secretaria e Diretoria.</p></div>',
      '<div class="admin-members-hero-actions"><span class="portal-page-badge portal-page-badge--readonly admin-members-readonly">Consulta</span>' +
      (global.PortalGeapaMemberRegistration ? global.PortalGeapaMemberRegistration.renderAction() : '') + '</div>',
      '</header>',
      content
    ].join('');
    if (ui.hidratarLoadersLocais) ui.hidratarLoadersLocais(container);
  }

  /** Exibe o estado de carregamento sem apagar o contexto da rota. */
  function renderLoading() {
    renderShell('<div class="admin-members-state">' + montarLoadingLocal('Carregando membros...') + '</div>');
  }

  /** Renderiza filtros, resumo, tabela, cards e paginacao. */
  function renderContent() {
    var pagination = state.pagination || {};
    var total = Number(pagination.totalItens || 0);
    renderShell([
      renderFreshness(),
      renderFilters(),
      '<div class="portal-results-summary admin-members-summary"><div><strong>' + total + '</strong><span> membro(s) encontrado(s)</span></div>',
      '<small>Pagina ' + Number(pagination.pagina || 1) + ' de ' + Number(pagination.totalPaginas || 1) + '</small></div>',
      state.items.length ? renderTable(state.items) + renderCards(state.items) : renderEmpty(),
      renderPagination()
    ].join(''));
  }

  /** Exibe aviso quando o cache operacional nao possui atualizacao recente. */
  function renderFreshness() {
    var update = parseDate(state.lastUpdate);
    var stale = !update || Date.now() - update.getTime() > 48 * 60 * 60 * 1000;
    if (!stale) {
      return '<p class="admin-members-updated">Resumo atualizado em ' + escape(formatDateTime(update)) + '.</p>';
    }
    return '<div class="admin-members-stale"><strong>Resumo em atualizacao</strong><span>Alguns indicadores podem estar vazios ou desatualizados.</span></div>';
  }

  /** Monta os controles de busca e filtros enviados ao backend. */
  function renderFilters() {
    var filtrosAtivos = contarFiltrosAtivos();
    return [
      '<form class="portal-filter-panel admin-members-filters" data-admin-members-filters>',
      '<div class="portal-filter-grid portal-filter-grid--primary">',
      fieldText('texto', 'Buscar membro', 'Nome, RGA ou e-mail'),
      '</div>',
      '<details class="portal-filter-advanced" open>',
      '<summary>Filtros avancados <span class="portal-filter-count">' + filtrosAtivos + ' ativo(s)</span></summary>',
      '<div class="portal-filter-grid">',
      fieldSelect('tipoVinculo', 'Tipo de vinculo', state.options.tiposVinculo),
      fieldSelect('statusVinculo', 'Status do vinculo', state.options.statusVinculo),
      fieldSelect('perfilPortal', 'Perfil no Portal', state.options.perfisPortal),
      fieldSelect('portalAtivo', 'Portal ativo', ['SIM', 'NAO']),
      fieldSelect('comPendencias', 'Pendencias', ['SIM', 'NAO']),
      fieldSelect('situacaoFrequencia', 'Situacao de frequencia', state.options.frequencias),
      '</div>',
      '</details>',
      '<div class="portal-filter-actions"><button class="secondary-button compact-button" type="button" data-admin-members-clear>Limpar filtros</button></div>',
      '</form>'
    ].join('');
  }

  function contarFiltrosAtivos() {
    return Object.keys(state.filters || {}).filter(function active(key) {
      return String(state.filters[key] || '').trim() !== '';
    }).length;
  }

  /** Monta um campo de busca preservando o valor atual. */
  function fieldText(name, label, placeholder) {
    return '<label class="admin-members-search"><span>' + escape(label) + '</span><input type="search" name="' + name + '" value="' + escape(state.filters[name] || '') + '" placeholder="' + escape(placeholder) + '"></label>';
  }

  /** Monta um filtro select com opcoes fornecidas pelo Core. */
  function fieldSelect(name, label, values) {
    var selected = String(state.filters[name] || '');
    var list = Array.isArray(values) ? values : [];
    return [
      '<label><span>' + escape(label) + '</span><select name="' + name + '"><option value="">Todos</option>',
      list.map(function option(value) {
        return '<option value="' + escape(value) + '"' + (String(value) === selected ? ' selected' : '') + '>' + escape(formatLabel(value)) + '</option>';
      }).join(''),
      '</select></label>'
    ].join('');
  }

  /** Monta a tabela usada em telas largas. */
  function renderTable(items) {
    return [
      '<div class="readonly-table-wrap admin-members-table-wrap"><table class="readonly-table admin-members-table">',
      '<thead><tr><th>Membro</th><th>Vinculo</th><th>Ocupacao</th><th>Frequencia</th><th>Indicadores</th><th><span class="sr-only">Acoes</span></th></tr></thead><tbody>',
      items.map(function row(item) {
        return '<tr>' +
          '<td><strong>' + value(item.nomeExibicao) + '</strong><small>' + value(item.rga) + '</small><small>' + value(item.email) + '</small></td>' +
          '<td>' + chip(item.statusVinculoAtual) + '<small>' + value(item.tipoVinculoAtual) + '</small></td>' +
          '<td>' + value(item.cargoFuncaoAtual) + '<small>' + value(item.perfilPortalCalculado) + '</small></td>' +
          '<td>' + frequency(item.frequenciaResumida) + '</td>' +
          '<td><strong>' + numeric(item.qtdSemestresNoGrupo) + '</strong><small>semestres</small><small>' + numeric(item.qtdApresentacoesRealizadas) + ' apresentacoes</small></td>' +
          '<td><button class="secondary-button compact-button" type="button" data-admin-member-detail="' + escape(item.idPessoa) + '">Ver detalhes</button></td>' +
          '</tr>';
      }).join(''),
      '</tbody></table></div>'
    ].join('');
  }

  /** Monta cards equivalentes para telas pequenas sem rolagem horizontal. */
  function renderCards(items) {
    return '<div class="admin-members-cards">' + items.map(function card(item) {
      return [
        '<article class="admin-member-card">',
        '<div class="admin-member-card-head"><div><strong>' + value(item.nomeExibicao) + '</strong><small>' + value(item.rga) + '</small></div>' + chip(item.statusVinculoAtual) + '</div>',
        '<p>' + value(item.cargoFuncaoAtual) + '</p>',
        '<dl><div><dt>Vinculo</dt><dd>' + value(item.tipoVinculoAtual) + '</dd></div>',
        '<div><dt>Frequencia</dt><dd>' + frequency(item.frequenciaResumida) + '</dd></div>',
        '<div><dt>Semestres</dt><dd>' + numeric(item.qtdSemestresNoGrupo) + '</dd></div>',
        '<div><dt>Apresentacoes</dt><dd>' + numeric(item.qtdApresentacoesRealizadas) + '</dd></div></dl>',
        '<button class="secondary-button compact-button" type="button" data-admin-member-detail="' + escape(item.idPessoa) + '">Ver detalhes</button>',
        '</article>'
      ].join('');
    }).join('') + '</div>';
  }

  /** Monta navegacao entre paginas sem carregar toda a base no navegador. */
  function renderPagination() {
    var pagination = state.pagination || {};
    if (Number(pagination.totalPaginas || 1) <= 1) return '';
    return '<div class="admin-members-pagination">' +
      '<button class="secondary-button compact-button" type="button" data-admin-members-page="prev"' + (pagination.temAnterior ? '' : ' disabled') + '>Anterior</button>' +
      '<span>Pagina ' + Number(pagination.pagina || 1) + ' de ' + Number(pagination.totalPaginas || 1) + '</span>' +
      '<button class="secondary-button compact-button" type="button" data-admin-members-page="next"' + (pagination.temProxima ? '' : ' disabled') + '>Proxima</button></div>';
  }

  /** Exibe o estado vazio mantendo os filtros visiveis. */
  function renderEmpty() {
    return '<div class="admin-members-state portal-empty-state"><strong>Nenhum membro encontrado</strong><p>Ajuste ou limpe os filtros para ampliar a busca.</p></div>';
  }

  /** Exibe erros de autorizacao, publicacao ou indisponibilidade sem detalhes tecnicos sensiveis. */
  function renderError(error) {
    var code = String(error && (error.code || error.errorCode) || '').toUpperCase();
    var message = String(error && error.message || 'Nao foi possivel carregar os membros.');
    if (code === 'ACAO_NAO_RECONHECIDA') message = 'O backend publicado ainda nao possui a area de membros. Atualize o Web App.';
    if (code === 'ACESSO_NEGADO') message = 'Seu perfil nao possui permissao para consultar membros.';
    renderShell('<div class="admin-members-state admin-members-error"><strong>Falha ao carregar</strong><p>' + escape(message) + '</p><button class="secondary-button compact-button" type="button" data-admin-members-retry>Tentar novamente</button></div>');
  }

  function montarLoadingLocal(message) {
    if (ui.montarLoadingLocal) {
      return ui.montarLoadingLocal(message);
    }

    return '<p>' + escape(message || 'Carregando...') + '</p>';
  }

  /** Abre o detalhe usando exclusivamente o item ja retornado na pagina atual. */
  function openDetail(idPessoa) {
    var item = state.items.filter(function(member) { return String(member.idPessoa) === String(idPessoa); })[0];
    if (!item) return;
    var modal = document.getElementById('membro-admin-modal');
    var content = document.getElementById('membro-admin-modal-content');
    var title = document.getElementById('membro-admin-modal-title');
    if (!modal || !content) return;
    if (title) title.textContent = item.nomeExibicao || 'Detalhes do membro';
    content.innerHTML = [
      '<div class="admin-member-detail-lead">' + chip(item.statusVinculoAtual) + '<span>' + value(item.tipoVinculoAtual) + '</span></div>',
      '<dl class="admin-member-detail-grid">',
      detail('RGA', item.rga), detail('E-mail', item.email), detail('Ocupacao atual', item.cargoFuncaoAtual),
      detail('Perfil no Portal', item.perfilPortalCalculado), detail('Portal ativo', booleanLabel(item.portalAtivo)),
      detail('Tempo efetivo no grupo', item.tempoEfetivoNoGrupo), detail('Semestres no grupo', item.qtdSemestresNoGrupo),
      detail('Apresentacoes realizadas', item.qtdApresentacoesRealizadas), detail('Ciclo da ultima apresentacao', item.cicloUltimaApresentacao),
      detail('Frequencia resumida', item.frequenciaResumida), detail('Pendencias abertas', item.pendenciasAbertas),
      detail('Ja foi suspenso', item.flagJaFoiSuspenso), detail('Elegibilidade para diretoria', item.statusElegibilidadeDiretoria),
      detail('Ultima atualizacao', formatDateTime(parseDate(item.ultimaAtualizacao))),
      '</dl><p class="section-note">Esta tela nao permite editar cadastro, vinculo, suspensao ou desligamento.</p>'
    ].join('');
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  /** Fecha o detalhe e devolve o foco a tela administrativa. */
  function closeDetail() {
    var modal = document.getElementById('membro-admin-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  /** Monta um campo do detalhe com fallback amigavel. */
  function detail(label, rawValue) {
    var empty = rawValue === '' || rawValue === null || rawValue === undefined;
    return '<div' + (empty ? ' class="is-updating"' : '') + '><dt>' + escape(label) + '</dt><dd>' + value(rawValue) + '</dd></div>';
  }

  /** Trata envio do formulario de filtros. */
  function handleSubmit(event) {
    if (!event.target.closest('[data-admin-members-filters]')) return;
    event.preventDefault();
    state.page = 1;
    loadMembers();
  }

  /** Aplica filtros de selecao imediatamente no backend. */
  function handleChange(event) {
    if (!state.active || !event.target.closest('[data-admin-members-filters]')) return;
    state.filters[event.target.name] = event.target.value;
    state.page = 1;
    loadMembers();
  }

  /** Aplica busca textual com debounce para evitar chamadas a cada tecla. */
  function handleInput(event) {
    if (!state.active || event.target.name !== 'texto' || !event.target.closest('[data-admin-members-filters]')) return;
    state.filters.texto = event.target.value;
    state.page = 1;
    clearTimeout(state.debounce);
    state.debounce = setTimeout(loadMembers, 350);
  }

  /** Trata detalhe, limpeza, repeticao e navegacao de paginas. */
  function handleClick(event) {
    var detailButton = event.target.closest('[data-admin-member-detail]');
    var closeButton = event.target.closest('[data-admin-member-close]');
    var clearButton = event.target.closest('[data-admin-members-clear]');
    var retryButton = event.target.closest('[data-admin-members-retry]');
    var pageButton = event.target.closest('[data-admin-members-page]');
    if (detailButton) return openDetail(detailButton.getAttribute('data-admin-member-detail'));
    if (closeButton) return closeDetail();
    if (!state.active) return;
    if (clearButton) { state.filters = {}; state.page = 1; return loadMembers(); }
    if (retryButton) return loadMembers();
    if (pageButton && !pageButton.disabled) {
      state.page += pageButton.getAttribute('data-admin-members-page') === 'next' ? 1 : -1;
      loadMembers();
    }
  }

  /** Converte valores vazios em aviso legivel. */
  function value(rawValue) {
    return escape(rawValue === '' || rawValue === null || rawValue === undefined ? 'Em atualizacao' : rawValue);
  }

  /** Formata indicadores numericos sem recalcula-los. */
  function numeric(rawValue) {
    return rawValue === '' || rawValue === null || rawValue === undefined ? 'Em atualizacao' : escape(rawValue);
  }

  /** Monta um chip textual para estados de vinculo. */
  function chip(rawValue) {
    return '<span class="admin-member-chip">' + value(rawValue) + '</span>';
  }

  /** Monta a frequencia ja calculada pelo Core, sem derivar percentuais. */
  function frequency(rawValue) {
    return '<span class="admin-member-frequency">' + value(rawValue) + '</span>';
  }

  /** Traduz booleanos do contrato para texto de interface. */
  function booleanLabel(rawValue) {
    if (rawValue === true) return 'Sim';
    if (rawValue === false) return 'Nao';
    return '';
  }

  /** Formata rotulos tecnicos preservando o valor institucional recebido. */
  function formatLabel(rawValue) {
    return ui.formatarRotulo ? ui.formatarRotulo(rawValue || '') : String(rawValue || '').replace(/_/g, ' ');
  }

  /** Converte datas serializadas pelo Apps Script em Date quando validas. */
  function parseDate(rawValue) {
    if (!rawValue) return null;
    var date = rawValue instanceof Date ? rawValue : new Date(rawValue);
    return isNaN(date.getTime()) ? null : date;
  }

  /** Formata data e hora para o fuso visual do navegador. */
  function formatDateTime(date) {
    if (!date) return 'Em atualizacao';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  /** Escapa todo valor inserido em HTML. */
  function escape(rawValue) {
    return ui.escaparHtml(String(rawValue === null || rawValue === undefined ? '' : rawValue));
  }

  /** Retorna o container exclusivo da rota administrativa. */
  function getContainer() {
    return document.getElementById('admin-membros-content');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
