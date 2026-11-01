/** Fila administrativa de correcoes cadastrais nos ambientes autorizados. */
(function configurarCorrecoesCadastrais(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var config = global.PortalGeapaConfig || {};
  var state = { active: false, loading: false, page: 1, items: [], pagination: {}, filters: {}, selected: null, cursors: [null], nextCursor: null, epoch: 0, detailRead: 0, saving:false };

  function start() {
    if (!api || !ui || !navigation) return;
    document.addEventListener('portal:navigationchange', function onNavigation(event) {
      var route = event.detail && event.detail.rota;
      state.active = !!(route && route.id === 'admin-correcoes-cadastrais');
      if (state.active) load();else close(true);
    });
    document.addEventListener('portal:act-session-cleared', function(){ state.epoch++;state.items=[];state.selected=null;state.cursors=[null];state.nextCursor=null;close(true);var c=document.getElementById('admin-correcoes-cadastrais-content');if(c)c.replaceChildren(); });
    document.addEventListener('portal:members-session-ready', function(){if(state.active)load();});
    document.addEventListener('submit', onSubmit);
    document.addEventListener('click', onClick);
    if (navigation.getRotaAtual && navigation.getRotaAtual() === 'admin-correcoes-cadastrais') {
      state.active = true;
      load();
    }
  }

  function load() {
    if (!state.active || state.loading) return;
    state.loading = true;var epoch=state.epoch;
    renderShell('<p class="empty-state">Carregando solicitações cadastrais...</p>');
    api.apiGet('/admin/correcoes-cadastrais', {
      cursor: state.cursors[state.page-1]||null,status:state.filters.status||'',field:({NOME_COMPLETO:'displayName',CPF:'cpf',RGA:'rga',DATA_NASCIMENTO:'birthDate',PAIS_ORIGEM:'countryCode',CURSO_ID:'courseId'})[state.filters.campo]||''
    }).then(function response(result) {
      if(epoch!==state.epoch)return; if (!result || result.ok !== true) throw new Error(result && result.message || 'Não foi possível carregar as solicitações.');
      state.items = Array.isArray(result.data && result.data.solicitacoes) ? result.data.solicitacoes : [];
      state.nextCursor=result.data.nextCursor||null;state.pagination={totalPaginas:state.page+(state.nextCursor?1:0)};if(state.filters.pessoa)state.items=state.items.filter(function(i){return i.pessoa.nomeExibicao.toLocaleLowerCase().includes(state.filters.pessoa.toLocaleLowerCase());});
      render();
    }).catch(function error(err) {
      if(epoch!==state.epoch)return;
      renderShell('<p class="empty-state">' + escape(err.message || 'Erro controlado ao carregar solicitações.') + '</p>');
    }).then(function done() { state.loading = false; });
  }

  function render() {
    var ds=global.PortalDesign,count=[state.filters.status,state.filters.campo].filter(Boolean).length;
    renderShell('<form data-admin-corrections-filter>'+ds.filters('<label>Buscar pessoa<input type="search" name="pessoa" value="'+escape(state.filters.pessoa||'')+'" placeholder="Nome nesta página"></label>','',select('status','Status',['','PENDENTE','EM_ANALISE','COMPLEMENTO_SOLICITADO','INDEFERIDA','CANCELADA','APLICADA'])+select('campo','Campo',['','NOME_COMPLETO','CPF','RGA','DATA_NASCIMENTO','PAIS_ORIGEM','CURSO_ID']),count,count>0,'<div class="portal-filter-actions"><button type="button" data-admin-corrections-clear>Limpar filtros</button></div>')+'<button class="primary-button" type="submit">Aplicar busca e filtros</button></form><p class="geapa-detail-note">Busca por nome nesta página. Status e campo consultam a fila autorizada. Dados pessoais permanecem mascarados.</p><div class="geapa-results" role="status"><span><strong>'+state.items.length+'</strong> solicitações exibidas</span><span>Página '+state.page+'</span></div>'+(state.items.length?cards(state.items):'<p class="empty-state">Nenhuma solicitação encontrada.</p>')+pagination());
  }

  function renderShell(content) {
    var container = document.getElementById('admin-correcoes-cadastrais-content');
    if (!container || !state.active) return;
    container.classList.add('geapa-admin');
    container.innerHTML=global.PortalDesign.header('Correções cadastrais','Consulte solicitações e registre a análise autorizada.')+content;
  }
  function cards(items){return '<div class="geapa-record-grid geapa-correction-grid">'+items.map(function(item){return '<article class="geapa-record geapa-review-card" data-geapa-card tabindex="0" aria-label="Correção de '+escape(label(item.campo))+'"><div class="geapa-record-head"><div><small class="geapa-record-id">'+escape(item.id)+'</small><button type="button" class="geapa-record-title" data-geapa-primary data-admin-correction-detail="'+escape(item.id)+'">'+escape(label(item.campo))+'</button></div>'+global.PortalDesign.badge(label(item.status))+'</div>'+person(item)+'<dl class="geapa-record-facts">'+global.PortalDesign.fact('Solicitada em',formatDate(item.solicitadoEm))+global.PortalDesign.fact('Valor atual',item.valorAtualMascarado)+global.PortalDesign.fact('Valor solicitado',item.valorSolicitadoMascarado)+'</dl><p class="geapa-detail-note">Ver detalhes e ações disponíveis</p></article>';}).join('')+'</div>';}

  function open(idSolicitacao, revelarDados) {
    if (!idSolicitacao) return;
    var epoch=state.epoch,read=++state.detailRead;
    var modal = document.getElementById('admin-correction-modal');
    var content = document.getElementById('admin-correction-modal-content');
    if (!modal || !content) return;
    modal.setAttribute('data-geapa-protect-draft','');modal.removeAttribute('data-geapa-dirty');content.innerHTML = '<p class="empty-state">Carregando detalhe autorizado...</p>';
    global.PortalDesign.openDetailDialog(modal,function(){state.detailRead++;state.selected=null;content.replaceChildren();});
    state.selected=null;
    return api.apiGet('/admin/correcoes-cadastrais/detalhe', {
      idSolicitacao: idSolicitacao, revelarDados: revelarDados === true
    }).then(function response(result) {
      if(epoch!==state.epoch||read!==state.detailRead||modal.hidden)return;if (!result || result.ok !== true || !result.data) throw new Error('Detalhe cadastral indisponível.');
      state.selected = result.data;
      renderDetail(result.data);
    }).catch(function error(err) {
      if(epoch!==state.epoch||read!==state.detailRead||modal.hidden)return;
      content.innerHTML = '<p class="empty-state">Não foi possível consultar o detalhe. Tente novamente.</p><button type="button" class="secondary-button" data-admin-correction-detail="'+escape(idSolicitacao)+'">Tentar novamente</button>';
    });
  }

  function renderDetail(item) {
    var content = document.getElementById('admin-correction-modal-content');
    if (!content || !item) return;
    var canApply = false;
    var revealAction = item.requerRevelacao && !item.dadosRevelados
      ? '<button class="secondary-button" type="button" data-admin-correction-reveal>Exibir dados para análise</button><p class="section-note">A autorização será verificada novamente e a visualização ficará registrada.</p>'
      : '';
    var history = Array.isArray(item.historicoDecisoes) && item.historicoDecisoes.length
      ? '<div class="admin-correction-history"><h3>Histórico de decisões</h3>' + item.historicoDecisoes.map(function event(row) {
          return '<article><strong>' + value(label(row.status || row.decisao)) + '</strong><span>' + value(formatDate(row.analisadoEm)) + '</span>' + (row.motivoPublico ? '<p>' + value(row.motivoPublico) + '</p>' : '') + (row.analisadoPorMascarado ? '<small>Analisado por: ' + value(row.analisadoPorMascarado) + '</small>' : '') + '</article>';
        }).join('') + '</div>'
      : '<p class="section-note">Ainda não há decisões registradas.</p>';
    content.innerHTML = [
      '<div class="admin-correction-person">' + person(item) + '</div><dl class="summary-grid"><div class="summary-item"><dt>ID</dt><dd>' + value(item.id) + '</dd></div><div class="summary-item"><dt>Campo</dt><dd>' + value(label(item.campo)) + '</dd></div>',
      '<div class="summary-item"><dt>Solicitada em</dt><dd>' + value(formatDate(item.solicitadoEm)) + '</dd></div><div class="summary-item"><dt>Status</dt><dd>' + chip(item.status) + '</dd></div></dl>',
      '<div class="admin-correction-comparison"><section><span>Atual na fonte oficial</span><strong>' + value(item.valorAtual) + '</strong></section><section><span>Solicitado</span><strong>' + value(item.valorSolicitado) + '</strong></section></div>',
      revealAction,
      item.justificativa ? '<p><strong>Justificativa:</strong> ' + value(item.justificativa) + '</p>' : '',
      history,
      '<form data-admin-correction-action'+(item.canAnalyze?'':' hidden')+'><label><span>Decisão</span><select name="acao" required><option value="">Selecione</option><option value="EM_ANALISE">Colocar em análise</option><option value="COMPLEMENTO_SOLICITADO">Solicitar complemento</option><option value="APROVADA"'+(item.canApply?'':' disabled')+'>Aprovar</option><option value="INDEFERIDA">Indeferir</option></select></label>',
      '<label><span>Motivo público</span><textarea name="motivo" rows="4" maxlength="1000" required></textarea></label><p class="section-note">Motivo obrigatório para complemento e indeferimento.</p>',
      '<div class="profile-form-actions"><button class="primary-button" type="submit">Registrar análise</button>',
      canApply ? '<button class="secondary-button" type="button" data-admin-correction-apply>Aplicar correção aprovada</button>' : '', '</div></form>'
    ].join('');
  }

  function onSubmit(event) {
    if (event.target.matches('[data-admin-corrections-filter]')) {
      event.preventDefault();
      var data = new FormData(event.target); state.filters = { pessoa: data.get('pessoa'), status: data.get('status'), campo: data.get('campo') }; state.page = 1;state.cursors=[null]; load(); return;
    }
    if (event.target.matches('[data-admin-correction-action]')) {
      if(state.saving||!state.selected){event.preventDefault();return;}
      event.preventDefault();
      var form = event.target; var data2 = new FormData(form); var action = String(data2.get('acao') || ''); var reason = String(data2.get('motivo') || '').trim();
      if (action !== 'EM_ANALISE' && reason.length < 10) { ui.mostrarToast({ type: 'warning', message: 'Informe um motivo público com pelo menos 10 caracteres.' }); return; }
      if (action === 'APROVADA') {
        if (!global.confirm('Aprovar e aplicar esta correção na fonte oficial em uma única operação?')) return;
        write('/admin/correcoes-cadastrais/acao', { requestId: state.selected.id, revision:state.selected.revision, action:'APPLY', reason:reason }, 'Correção aprovada e aplicada com sucesso.');
        return;
      }
      write('/admin/correcoes-cadastrais/acao', { requestId: state.selected.id, revision:state.selected.revision, action:({EM_ANALISE:'REVIEW',COMPLEMENTO_SOLICITADO:'REQUEST_COMPLEMENT',INDEFERIDA:'REJECT'})[action], reason:reason }, 'Análise cadastrada.');
    }
  }

  function onClick(event) {
    var detail = event.target.closest('[data-admin-correction-detail]');
    if (detail) open(detail.dataset.adminCorrectionDetail, false);
    if (event.target.closest('[data-admin-correction-close]')) close();
    if (event.target.closest('[data-admin-correction-reveal]') && state.selected && global.confirm('Exibir os dados completos necessários para análise? Esta visualização será auditada.')) {
      open(state.selected.id, true);
    }
    if (event.target.closest('[data-admin-corrections-clear]')) { state.filters = {}; state.page = 1;state.cursors=[null]; load(); }
    if (event.target.closest('[data-admin-correction-apply]') && state.selected && global.confirm('Aplicar esta correção aprovada na fonte oficial?')) {
      write('/admin/correcoes-cadastrais/aplicar', { idSolicitacao: state.selected.id }, 'Correção aplicada com sucesso.');
    }
    var page = event.target.closest('[data-admin-corrections-page]');
    if (page) {if(Number(page.dataset.adminCorrectionsPage)>state.page)state.cursors[state.page]=state.nextCursor; state.page = Number(page.dataset.adminCorrectionsPage || 1); load(); }
  }

  function write(route, payload, success) {
    if(state.saving)return;state.saving=true;
    var epoch=state.epoch,modal=document.getElementById('admin-correction-modal');
    var disabledStates=Array.from(modal?.querySelectorAll('button,input,select,textarea')||[]).map(function(el){return [el,el.disabled];});modal?.setAttribute('aria-busy','true');disabledStates.forEach(function(pair){pair[0].disabled=true;});
    ui.mostrarLoading('Salvando decisão...');
    api.apiPost(route, payload).then(function result(response) {
      if(epoch!==state.epoch)return;if (!response || response.ok !== true) throw new Error(response && response.message || 'Não foi possível concluir a ação.');
      ui.mostrarToast({ type: 'success', title: 'Correção cadastral', message: response.message || success });
      state.saving=false;modal?.removeAttribute('aria-busy');modal?.removeAttribute('data-geapa-dirty');close();state.page=1;state.cursors=[null]; load();
    }).catch(function error(err) { if(epoch!==state.epoch)return;ui.mostrarToast({ type: 'error', critical: true, message: err.message }); }).then(function done() { state.saving=false;modal?.removeAttribute('aria-busy');disabledStates.forEach(function(pair){pair[0].disabled=pair[1];});ui.ocultarLoading(); });
  }

  function close(force=false) {if(state.saving&&!force)return;var modal=document.getElementById('admin-correction-modal');global.PortalDesign.closeDetailDialog(modal,force);}
  function select(name, text, values) { return '<label><span>' + escape(text) + '</span><select name="' + name + '">' + values.map(function option(v) { return '<option value="' + escape(v) + '"' + (String(state.filters[name] || '') === v ? ' selected' : '') + '>' + escape(v ? label(v) : 'Todos') + '</option>'; }).join('') + '</select></label>'; }
  function pagination() { var p = state.pagination || {}; if (Number(p.totalPaginas || 1) <= 1) return ''; return '<div class="portal-pagination"><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.max(state.page - 1, 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>Anterior</button><span>Página ' + state.page + ' de ' + p.totalPaginas + '</span><button class="secondary-button compact-button" data-admin-corrections-page="' + Math.min(state.page + 1, p.totalPaginas) + '"' + (state.page >= p.totalPaginas ? ' disabled' : '') + '>Próxima</button></div>'; }
  function label(v) { return String(v || '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, function c(x) { return x.toUpperCase(); }); }
  function formatDate(v) { var d = new Date(v); return isNaN(d.getTime()) ? String(v || '-') : d.toLocaleString('pt-BR'); }
  function chip(v) { return '<span class="status-pill">' + value(label(v)) + '</span>'; }
  function person(item) { var p = item && item.pessoa || {}; return '<div class="admin-correction-person-lines"><strong>' + value(p.nomeExibicao || 'Pessoa não identificada') + '</strong><span>RGA: ' + value(p.rgaMascarado) + '</span><span>E-mail: ' + value(p.emailMascarado) + '</span></div>'; }
  function value(v) { return escape(v == null || v === '' ? '-' : v); }
  function escape(v) { return ui.escaparHtml(String(v == null ? '' : v)); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
