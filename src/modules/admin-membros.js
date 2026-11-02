/**
 * Diretório administrativo de pessoas; consulta e ações autorizadas separadamente.
 * O navegador consome apenas o contrato sanitizado do Core canônico.
 */
(function configurarAdminMembros(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var state = {
    active: false,
    loading: false,
    filters: {},
    people: false, snapshot: null, detailGeneration: 0, order: "title-asc", filtersOpen: false, generation: 0,
    page: 1,
    pageSize: 25,
    items: [],
    pagination: {},
    options: {},
    lastUpdate: '',
    debounce: null
  };

  document.addEventListener('portal:act-session-cleared',function(){state.generation++;clearTimeout(state.debounce);state.items=[];state.options={};state.pagination={};state.loading=false;var el=getContainer();if(el)el.textContent='';closeDetail();state.active=false;});

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
    if (!state.active) return;
    state.people=global.PortalDevContext?.members?.canReadPeople===true;
    state.loading = true;
    var generation=++state.generation;
    var focusName=document.activeElement?.closest('[data-admin-members-filters]')?document.activeElement.name:null;
    if(!getContainer()?.querySelector('[data-admin-members-filters]'))renderLoading();
    getContainer()?.setAttribute('aria-busy','true');
    api.apiGet(state.people?'/admin/pessoas':'/admin/membros', state.people?Object.assign({query:state.filters.texto||'',category:state.filters.category||'',state:state.filters.state||'',role:state.filters.role||'',order:state.order==='title-desc'?'name-desc':'name-asc',page:state.page,pageSize:state.pageSize},state.page>1&&state.snapshot?{snapshot:state.snapshot}:{}):{
      filtros: JSON.stringify(Object.assign({}, state.filters, {
        ordem: state.order,
        pagina: state.page,
        pageSize: state.pageSize
      }))
    }).then(function onResponse(response) {
      if(generation!==state.generation)return;
      if (!response || response.ok !== true) {
        var error = new Error(response && response.message || 'Não foi possível carregar as pessoas.');
        error.code = response && (response.code || response.errorCode) || '';
        throw error;
      }
      var data = response.data || {};
      state.items = state.people?(data.items||[]):Array.isArray(data.itens) ? data.itens : [];
      state.snapshot=state.people?data.snapshot:null;
      state.pagination = state.people?{totalItens:data.total,pagina:data.page,totalPaginas:data.pages}:data.paginacao || {};
      state.options = state.people?(data.options||{}):data.opcoesFiltros || {};
      state.lastUpdate = data.ultimaAtualizacaoResumo || '';
      renderContent();
      if(focusName){var focus=getContainer()?.querySelector('[name="'+focusName+'"]');focus?.focus();if(focus?.type==='search')focus.setSelectionRange(focus.value.length,focus.value.length);}
    }).catch(function onError(error) {
      if(generation!==state.generation)return;
      if(error.code==='DIRECTORY_CHANGED'){state.page=1;state.snapshot=null;error.message='O cadastro mudou durante a consulta. Atualize para retornar à primeira página.';}
      renderError(error);
    }).then(function done() {
      if(generation===state.generation){state.loading=false;getContainer()?.setAttribute('aria-busy','false');}
    });
  }

  /** Renderiza o cabecalho compartilhado pelos estados da tela. */
  function renderShell(content) {
    var container = getContainer();
    if (!container || !state.active) return;
    container.classList.add('geapa-admin');
    var actions=(global.PortalDevContext?.act?.board?'<a href="#/admin/pessoas/perfis-permissoes">Perfis e permissões</a>':'')+'<button type="button" data-admin-members-refresh>Atualizar</button>'+
      (global.PortalGeapaMemberRegistration?global.PortalGeapaMemberRegistration.renderAction():'')+
      (global.PortalDevContext?.members?.canReviewCorrections?'<a href="#/admin/correcoes-cadastrais">Correções cadastrais</a>':'')+
      (global.PortalDevContext?.members?.canReview?'<a href="#/admin/membros/solicitacoes-vinculo">Solicitações de vínculo</a>':'');
    container.innerHTML=global.PortalDesign.header('Pessoas',state.people?'Diretório institucional: relações e dados autorizados.':'Consulta atual de Membros. O diretório completo aguarda autorização específica.',actions,'admin-membros-title')+content;
    if (ui.hidratarLoadersLocais) ui.hidratarLoadersLocais(container);
  }

  /** Exibe o estado de carregamento sem apagar o contexto da rota. */
  function renderLoading() {
    renderShell('<div class="admin-members-state">' + montarLoadingLocal('Carregando pessoas...') + '</div>');
  }

  /** Renderiza filtros, resumo, tabela, cards e paginacao. */
  function renderContent() {
    // Keep the latest disclosure choice when a slower query replaces the cards.
    var filterPanel = getContainer()?.querySelector('[data-geapa-filters]');
    if (filterPanel) state.filtersOpen = filterPanel.open;
    var pagination = state.pagination || {};
    var total = Number(pagination.totalItens || 0);
    renderShell([
      renderFreshness(),
      renderFilters(),
      global.PortalDesign.summary(total,total===1?'pessoa encontrada':'pessoas encontradas',Number(pagination.pagina||1),Number(pagination.totalPaginas||1)),
      state.items.length ? renderCards(state.items) : renderEmpty(),
      renderPagination()
    ].join(''));
  }

  /** Exibe aviso quando o cache operacional nao possui atualizacao recente. */
  function renderFreshness() {
    if(state.people)return '<p class="geapa-detail-note">Consulta validada pelo Core. Nenhum dado privado é incluído na listagem.</p>';
    var update = parseDate(state.lastUpdate);
    var stale = !update || Date.now() - update.getTime() > 48 * 60 * 60 * 1000;
    if (!stale) {
      return '<p class="admin-members-updated">Resumo atualizado em ' + escape(formatDateTime(update)) + '.</p>';
    }
    return '<div class="admin-members-stale"><strong>Resumo em atualizacao</strong><span>Alguns indicadores podem estar vazios ou desatualizados.</span></div>';
  }

  /** Monta os controles de busca e filtros enviados ao backend. */
  function renderFilters() {
    var ds=global.PortalDesign;
    return '<form data-admin-members-filters>'+ds.filters(fieldText('texto','Buscar pessoas','Nome ou ID da pessoa'),ds.sortField(state.order,false),
      state.people?global.PortalPeople.filters(state.filters,state.options):fieldSelect('tipoVinculo','Categoria',state.options.tiposVinculo)+fieldSelect('statusVinculo','Situação do vínculo',state.options.statusVinculo),
      ds.activeFilters(state.filters),state.filtersOpen,'<button type="button" data-admin-members-clear>Limpar filtros</button>')+'</form>';
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

  function renderCards(items) {
    if(state.people)return global.PortalPeople.cards(items);
    var ds=global.PortalDesign;
    return '<div class="geapa-record-grid">'+items.map(function(item){return ds.card({id:item.idPessoa,title:item.nomeExibicao||'Membro',titleAttribute:'data-admin-member-detail',
      headHtml:ds.badge(item.statusVinculoAtual),factsHtml:ds.fact('Vínculo',formatLabel(item.tipoVinculoAtual))+ds.fact('Função',item.cargoFuncaoAtual)+ds.fact('Perfil',item.perfilPortalCalculado)+
        ds.fact('RGA',item.rga)+ds.fact('E-mail',item.email)+ds.fact('Frequência',item.frequenciaResumida)+ds.fact('Semestres',item.qtdSemestresNoGrupo)+ds.fact('Apresentações',item.qtdApresentacoesRealizadas),
      footerHtml:'<span>Consulta autorizada</span><button type="button" data-admin-member-detail="'+escape(item.idPessoa)+'">Ver detalhes</button>'
    });}).join('')+'</div>';
  }
  function renderPagination(){var p=state.pagination||{};return global.PortalDesign.pagination(Number(p.pagina||1),Number(p.totalPaginas||1),'data-admin-members-page');}

  /** Exibe o estado vazio mantendo os filtros visiveis. */
  function renderEmpty() {
    return '<div class="admin-members-state portal-empty-state"><strong>Nenhuma pessoa encontrada</strong><p>Ajuste ou limpe os filtros para ampliar a busca.</p></div>';
  }

  /** Exibe erros de autorizacao, publicacao ou indisponibilidade sem detalhes tecnicos sensiveis. */
  function renderError(error) {
    var code = String(error && (error.code || error.errorCode) || '').toUpperCase();
    var message = String(error && error.message || 'Não foi possível carregar as pessoas.');
    if (code === 'ACAO_NAO_RECONHECIDA') message = 'O backend publicado ainda nao possui a area de membros. Atualize o Web App.';
    if (code === 'ACESSO_NEGADO') message = 'Seu perfil nao possui permissao para consultar membros.';
    renderShell('<div class="admin-members-state admin-members-error"><strong>Falha ao carregar</strong><p>' + escape(message) + '</p><button class="secondary-button compact-button" type="button" data-admin-members-retry>Tentar novamente</button></div>');
  }

  function openPersonDetail(personId){
    var modal=document.getElementById('membro-admin-modal'),content=document.getElementById('membro-admin-modal-content'),title=document.getElementById('membro-admin-modal-title'),generation=++state.detailGeneration,session=state.generation;
    if(!modal||!content)return;if(title)title.textContent='Pessoa';content.innerHTML=montarLoadingLocal('Consultando pessoa...');
    global.PortalDesign.openDetailDialog(modal,function(){state.detailGeneration++;content.textContent='';});
    api.apiGet('/admin/pessoas/detalhe',{personId:personId}).then(function(response){
      if(generation!==state.detailGeneration||session!==state.generation||!state.active)return;
      if(!response?.ok)throw new Error(response?.message||'Consulta não autorizada.');
      if(title)title.textContent=response.data.displayLabel;content.innerHTML=global.PortalPeople.detail(response.data);
    }).catch(function(error){if(generation===state.detailGeneration&&session===state.generation)content.innerHTML='<p role="alert">'+escape(error.message||'Não foi possível consultar a pessoa.')+'</p>';});
  }
  function montarLoadingLocal(message) {
    if (ui.montarLoadingLocal) {
      return ui.montarLoadingLocal(message);
    }

    return '<p>' + escape(message || 'Carregando...') + '</p>';
  }

  /** Abre o detalhe usando exclusivamente o item ja retornado na pagina atual. */
  function openDetail(idPessoa) {
    if(state.people){openPersonDetail(idPessoa);return;}
    var item = state.items.filter(function(member) { return String(member.idPessoa) === String(idPessoa); })[0];
    if (!item) return;
    var modal = document.getElementById('membro-admin-modal');
    var content = document.getElementById('membro-admin-modal-content');
    var title = document.getElementById('membro-admin-modal-title');
    if (!modal || !content) return;
    if (title) title.textContent = item.nomeExibicao || 'Detalhes do membro';
    var ds=global.PortalDesign,updated=parseDate(item.ultimaAtualizacao);
    content.innerHTML = ds.detailHeader(item.idPessoa,[formatLabel(item.statusVinculoAtual),formatLabel(item.tipoVinculoAtual)])+
      ds.detailSection('Identificação',ds.detailFacts([['ID da pessoa',item.idPessoa],['RGA',item.rga],['E-mail',item.email]]))+
      ds.detailSection('Vínculo e acesso',ds.detailFacts([['Função atual',item.cargoFuncaoAtual],['Perfil no Portal',item.perfilPortalCalculado],['Portal ativo',item.portalAtivo],['Tempo efetivo no grupo',item.tempoEfetivoNoGrupo],['Semestres no grupo',item.qtdSemestresNoGrupo]]))+
      ds.detailSection('Atuação e indicadores',ds.detailFacts([['Apresentações realizadas',item.qtdApresentacoesRealizadas],['Ciclo da última apresentação',item.cicloUltimaApresentacao],['Frequência resumida',item.frequenciaResumida],['Pendências abertas',item.pendenciasAbertas],['Já foi suspenso',item.flagJaFoiSuspenso],['Elegibilidade para Diretoria',item.statusElegibilidadeDiretoria],['Última atualização',updated?formatDateTime(updated):null]]))+
      '<p class="geapa-detail-note">Somente informações autorizadas para seu perfil. Campos não disponíveis nesta consulta não são exibidos. Este detalhe é de consulta; não altera cadastro ou vínculo.</p>';
    ds.openDetailDialog(modal,function(){content.textContent='';});
  }

  /** Fecha o detalhe e devolve o foco à origem. */
  function closeDetail() {
    state.detailGeneration++;
    var modal=document.getElementById('membro-admin-modal');
    global.PortalDesign?.closeDetailDialog(modal);
    if(modal)modal.hidden=true;
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
    state.filtersOpen=!!event.target.closest("form")?.querySelector("[data-geapa-filters]")?.open;
    if(event.target.name==="ordem")state.order=event.target.value;else state.filters[event.target.name] = event.target.value;
    state.page = 1;
    loadMembers();
  }

  /** Aplica busca textual com debounce para evitar chamadas a cada tecla. */
  function handleInput(event) {
    if (!state.active || event.target.name !== 'texto' || !event.target.closest('[data-admin-members-filters]')) return;
    state.filtersOpen=!!event.target.closest("form")?.querySelector("[data-geapa-filters]")?.open;
    state.filters.texto = event.target.value;
    state.generation++;
    state.page = 1;
    clearTimeout(state.debounce);
    state.debounce = setTimeout(loadMembers, 350);
  }

  /** Trata detalhe, limpeza, repeticao e navegacao de paginas. */
  function handleClick(event) {
    var detailButton = event.target.closest('[data-admin-member-detail]');
    var closeButton = event.target.closest('[data-admin-member-close]');
    var clearButton = event.target.closest('[data-admin-members-clear]');
    var refreshButton = event.target.closest('[data-admin-members-refresh]');
    var retryButton = event.target.closest('[data-admin-members-retry]');
    var pageButton = event.target.closest('[data-admin-members-page]');
    if (detailButton) return openDetail(detailButton.getAttribute('data-admin-member-detail'));
    if (closeButton) return closeDetail();
    if (!state.active) return;
    if (refreshButton) return loadMembers();
    if (clearButton) { state.filters = {}; state.page = 1; return loadMembers(); }
    if (retryButton) return loadMembers();
    if (pageButton && !pageButton.disabled) {
      state.page += pageButton.getAttribute('data-admin-members-page') === 'next' ? 1 : -1;
      loadMembers();
    }
  }

  /** Converte valores vazios em aviso legivel. */
  function value(rawValue) {
    return escape(rawValue === '' || rawValue === null || rawValue === undefined ? 'Não disponível nesta consulta' : rawValue);
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
