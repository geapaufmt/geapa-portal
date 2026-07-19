/** Area administrativa protegida para solicitacoes voluntarias de vinculo. */
(function configurarAdminSolicitacoesVinculo(global) {
  'use strict';
  var state = { items: [], detail: null };
  var root = function() { return document.getElementById('admin-solicitacoes-vinculo-content'); };
  var modal = function() { return document.getElementById('admin-vinculo-modal'); };
  var esc = function(v) { return global.PortalGeapaUi ? global.PortalGeapaUi.escaparHtml(String(v == null ? '' : v)) : String(v == null ? '' : v); };
  var label = function(v) { return String(v || '').toLowerCase().replace(/_/g, ' ').replace(/^./, function(c) { return c.toUpperCase(); }); };
  var asBoolean = function(v) { return v === true || ['SIM','TRUE','1'].indexOf(String(v == null ? '' : v).trim().toUpperCase()) >= 0; };
  var isFinalAction = function(action) { return ['indeferir','homologar-efetivar-desligamento'].indexOf(String(action || '')) >= 0; };

  async function load() {
    var container = root(); if (!container || !global.PortalGeapaApi) return;
    container.innerHTML = '<p class="empty-state">Carregando solicitações de vínculo...</p>';
    var filters = readFilters();
    var response = await global.PortalGeapaApi.apiGet('/admin/solicitacoes-vinculo', { filtros: JSON.stringify(filters) });
    if (!response.ok) return renderError(response.message);
    state.items = (response.data && response.data.items) || [];
    renderList();
  }

  function readFilters() {
    var form = document.querySelector('[data-admin-vinculo-filters]');
    if (!form) return {};
    return Object.fromEntries(Array.from(new FormData(form).entries()).filter(function(pair) { return String(pair[1] || '').trim(); }));
  }

  function renderList() {
    var container = root();
    var rows = state.items.length ? state.items.map(function(item) {
      return '<tr><td><strong>' + esc(item.idSolicitacao) + '</strong></td><td>' + esc(label(item.tipo)) + '</td><td>' + esc(label(item.modalidade)) + '</td><td>' + esc(item.idSemestre || '—') + '</td><td><span class="status-chip">' + esc(label(item.status)) + '</span></td><td><button type="button" class="secondary-button compact-button" data-admin-vinculo-detail="' + esc(item.idSolicitacao) + '">Analisar</button></td></tr>';
    }).join('') : '<tr><td colspan="6">Nenhuma solicitação encontrada.</td></tr>';
    container.innerHTML = '<div class="situation-topbar"><div><p class="eyebrow">Gestão do GEAPA · Membros</p><h2>Solicitações de vínculo</h2></div><button class="secondary-button compact-button" type="button" data-admin-vinculo-refresh>Atualizar</button></div>' +
      '<form class="vinculo-filter-grid" data-admin-vinculo-filters><label>Tipo<select name="tipo"><option value="">Todos</option><option>SUSPENSAO_VOLUNTARIA</option><option>DESLIGAMENTO_VOLUNTARIO</option></select></label><label>Modalidade<select name="modalidade"><option value="">Todas</option><option>SUSPENSAO_TEMPORARIA</option><option>DESLIGAMENTO_APOS_HOMOLOGACAO</option><option>DESLIGAMENTO_FIM_SEMESTRE</option></select></label><label>Status<input name="status"></label><label>Semestre<input name="idSemestre"></label><label>Data inicial<input type="date" name="dataInicio"></label><label>Data final<input type="date" name="dataFim"></label><label>Membro<input name="membro"></label><label>Responsável<input name="responsavel"></label><button class="secondary-button" type="submit">Filtrar</button></form>' +
      '<div class="table-scroll"><table class="portal-table"><thead><tr><th>Protocolo</th><th>Tipo</th><th>Modalidade</th><th>Semestre</th><th>Status</th><th>Ação</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderError(message) { var container = root(); if (container) container.innerHTML = '<p class="portal-feedback is-error">' + esc(message || 'Não foi possível carregar.') + '</p>'; }

  async function openDetail(id) {
    var el = modal(); var content = document.getElementById('admin-vinculo-modal-content');
    if (!el || !content) return;
    el.hidden = false; content.innerHTML = '<p class="empty-state">Carregando detalhe protegido...</p>';
    var response = await global.PortalGeapaApi.apiGet('/admin/solicitacoes-vinculo/detalhe', { payload: JSON.stringify({ idSolicitacao: id }) });
    if (!response.ok) { content.innerHTML = '<p class="portal-feedback is-error">' + esc(response.message) + '</p>'; return; }
    state.detail = response.data || {}; renderDetail();
  }

  function renderDetail() {
    var d = state.detail || {}; var request = d.solicitacao || {}; var person = d.pessoa || {}; var norm = d.parametrosNormativos || {}; var requirements = d.requisitosDecisaoFinal || {};
    var differences = (norm.divergencias || []).length ? '<div class="portal-feedback is-warning"><strong>Parâmetros alterados após o pedido.</strong><pre>' + esc(JSON.stringify(norm.divergencias, null, 2)) + '</pre></div>' : '<p class="section-note">Parâmetros vigentes coincidem com o snapshot do pedido.</p>';
    var minutesRule = request.TIPO_SOLICITACAO === 'DESLIGAMENTO_VOLUNTARIO' ? '<p class="section-note" data-admin-vinculo-ata-rule>' + esc(requirements.exigeTratamentoTransicao ? 'A regra de ata mudou desde o pedido. Selecione o tratamento de transição antes da decisão final.' : (requirements.exigeAta ? 'A decisão final exige referência oficial de ata. Base legal: ' + (requirements.baseLegal || 'não informada') : 'A regra normativa vigente dispensa ata nesta decisão final. A referência documental permanece opcional.')) + '</p>' : '';
    document.getElementById('admin-vinculo-modal-content').innerHTML = [
      '<div class="vinculo-admin-person"><strong>' + esc(person.nome || 'Pessoa') + '</strong><span>' + esc(person.rgaMascarado || '') + '</span><span>' + esc(person.emailMascarado || '') + '</span></div>',
      '<dl class="vinculo-summary"><div><dt>Protocolo</dt><dd>' + esc(request.ID_SOLICITACAO) + '</dd></div><div><dt>Status</dt><dd>' + esc(label(request.STATUS_SOLICITACAO)) + '</dd></div><div><dt>Tipo</dt><dd>' + esc(label(request.TIPO_SOLICITACAO)) + '</dd></div><div><dt>Modalidade</dt><dd>' + esc(label(request.MODALIDADE_SOLICITADA)) + '</dd></div></dl>',
      '<section><h3>Pedido</h3><p><strong>Motivo:</strong> ' + esc(request.MOTIVO_CATEGORIA || '—') + '</p><p><strong>Justificativa:</strong> ' + esc(request.JUSTIFICATIVA || request.OBSERVACOES_MEMBRO || '—') + '</p><p><strong>Documento:</strong> ' + esc(request.DOCUMENTO_REFERENCIA || '—') + '</p></section>',
      '<section><h3>Semestre e validações</h3><p>' + esc(request.ID_SEMESTRE_REFERENCIA || 'Sem referência') + ' · snapshot ' + esc(request.DATA_FIM_SEMESTRE_SNAPSHOT || '—') + '</p><p>' + esc(request.MENSAGEM_VALIDACAO || request.RESULTADO_VALIDACAO || '—') + '</p></section>',
      '<section><h3>Parâmetros normativos</h3>' + differences + '</section>',
      minutesRule,
      '<p class="section-note">' + esc(actionGuidance(request)) + '</p>',
      '<form data-admin-vinculo-action><input type="hidden" name="idSolicitacao" value="' + esc(request.ID_SOLICITACAO) + '"><label>Ação<select name="acao" required>' + actionOptions(request) + '</select></label><label>Observação / justificativa<textarea name="observacao" rows="4"></textarea></label><label data-admin-vinculo-ata-label>Referência oficial da ata (opcional) <input name="ataReferencia"></label><label>Tratamento de transição<select name="tratamentoTransicao"><option value="">Não aplicável</option><option>APLICAR_VIGENTE</option><option>APLICAR_SNAPSHOT</option></select></label><label>Justificativa administrativa reforçada<textarea name="justificativaAdministrativaReforcada" rows="3"></textarea></label><label class="profile-confirmation"><input type="checkbox" name="confirmacaoReforcada"> Confirmo a decisão final e seus efeitos institucionais.</label><button class="primary-button" type="submit">Registrar ação</button></form>'
    ].join('');
    syncFinalDecisionRequirements(document.querySelector('[data-admin-vinculo-action]'));
  }

  function actionOptions(request) {
    var status = request.STATUS_SOLICITACAO; var type = request.TIPO_SOLICITACAO; var options = [];
    if (status === 'RECEBIDO') options.push(['iniciar-analise','Iniciar análise (opcional)']);
    if (['RECEBIDO','EM_ANALISE','AGENDADO_PARA_ANALISE_FINAL','PRONTO_PARA_ANALISE_FINAL'].indexOf(status) >= 0) options.push(['solicitar-complemento','Solicitar complemento'], ['indeferir','Indeferir'], ['cancelar','Cancelar administrativamente']);
    if ((status === 'RECEBIDO' || status === 'EM_ANALISE') && request.MODALIDADE_SOLICITADA === 'DESLIGAMENTO_FIM_SEMESTRE') options.push(['analise-preliminar','Registrar análise preliminar']);
    if (status === 'EM_ANALISE' && type === 'SUSPENSAO_VOLUNTARIA') options.push(['homologar-suspensao','Deferir / aprovar suspensão']);
    if ((status === 'EM_ANALISE' || status === 'PRONTO_PARA_ANALISE_FINAL' || (status === 'RECEBIDO' && request.MODALIDADE_SOLICITADA === 'DESLIGAMENTO_APOS_HOMOLOGACAO')) && type === 'DESLIGAMENTO_VOLUNTARIO') options.push(['homologar-efetivar-desligamento','Deferir, homologar e efetivar desligamento']);
    if (status === 'ERRO_EXECUCAO') options.push(['reprocessar','Reprocessar erro recuperável']);
    if (status !== 'ERRO_EXECUCAO') options.push(['reenviar-notificacao','Reenviar notificação']);
    return '<option value="">Selecione</option>' + options.map(function(item) { return '<option value="' + item[0] + '">' + esc(item[1]) + '</option>'; }).join('');
  }

  function actionGuidance(request) {
    var status = String(request && request.STATUS_SOLICITACAO || '');
    if (status === 'RECEBIDO' && request.MODALIDADE_SOLICITADA === 'DESLIGAMENTO_APOS_HOMOLOGACAO') return 'Você pode iniciar a análise ou, se todas as conferências estiverem concluídas, deferir, homologar e efetivar diretamente.';
    if (status === 'RECEBIDO' && request.MODALIDADE_SOLICITADA === 'DESLIGAMENTO_FIM_SEMESTRE') return 'Registre a análise preliminar para agendar a decisão final. Iniciar análise continua opcional.';
    if (status === 'RECEBIDO') return 'Inicie a análise para prosseguir com esta modalidade.';
    if (status === 'EM_ANALISE' && request.TIPO_SOLICITACAO === 'SUSPENSAO_VOLUNTARIA') return 'Para deferir, selecione “Deferir / aprovar suspensão”. A referência de ata é opcional para suspensão.';
    if ((status === 'EM_ANALISE' || status === 'PRONTO_PARA_ANALISE_FINAL') && request.TIPO_SOLICITACAO === 'DESLIGAMENTO_VOLUNTARIO') return 'Para deferir, selecione “Deferir, homologar e efetivar desligamento”. A exigência de ata é informada pelo backend conforme a regra normativa aplicável.';
    return 'As ações disponíveis dependem do status, do tipo do pedido e das permissões confirmadas pelo backend.';
  }

  function effectiveMinutesRequirement(form) {
    var rule = state.detail && state.detail.requisitosDecisaoFinal || {};
    if (!rule.possuiDivergencia) return rule.exigeAta === true;
    var treatment = form && form.elements.tratamentoTransicao ? form.elements.tratamentoTransicao.value : '';
    if (treatment === 'APLICAR_SNAPSHOT') return asBoolean(rule.snapshot && rule.snapshot.valor);
    if (treatment === 'APLICAR_VIGENTE') return asBoolean(rule.vigente && rule.vigente.valor);
    return null;
  }

  function syncFinalDecisionRequirements(form) {
    if (!form || !form.elements) return;
    var action = form.elements.acao && form.elements.acao.value;
    var input = form.elements.ataReferencia;
    var labelElement = form.querySelector('[data-admin-vinculo-ata-label]');
    if (!input || !labelElement) return;
    var requirement = isFinalAction(action) ? effectiveMinutesRequirement(form) : false;
    var snapshotOption = form.elements.tratamentoTransicao && Array.from(form.elements.tratamentoTransicao.options).filter(function(option) { return option.value === 'APLICAR_SNAPSHOT'; })[0];
    var rule = state.detail && state.detail.requisitosDecisaoFinal || {};
    if (snapshotOption) snapshotOption.disabled = !!(rule.snapshot && rule.snapshot.disponivel === false);
    input.required = requirement === true;
    labelElement.childNodes[0].nodeValue = requirement === true ? 'Referência oficial da ata (obrigatória) ' : (requirement === null ? 'Referência oficial da ata (defina primeiro o tratamento de transição) ' : 'Referência oficial da ata (opcional) ');
  }

  async function submitAction(event) {
    event.preventDefault(); var form = event.target;
    if (!form || !form.elements || !form.matches('[data-admin-vinculo-action]')) {
      throw new Error('O formulário da decisão administrativa não foi identificado. Atualize a página e tente novamente.');
    }
    var values = Object.fromEntries(new FormData(form).entries());
    var minutesRequirement = isFinalAction(values.acao) ? effectiveMinutesRequirement(form) : false;
    if (minutesRequirement === null) throw new Error('Selecione o tratamento de transição normativa antes da decisão final.');
    if (minutesRequirement === true && !String(values.ataReferencia || '').trim()) throw new Error('Informe a referência oficial da ata exigida para esta decisão final.');
    var route = '/admin/solicitacoes-vinculo/' + values.acao; var payload = { idSolicitacao: values.idSolicitacao, obsDecisao: values.observacao, observacao: values.observacao, mensagem: values.observacao, motivo: values.observacao, ataReferencia: values.ataReferencia, tratamentoTransicao: values.tratamentoTransicao, justificativaAdministrativaReforcada: values.justificativaAdministrativaReforcada, overrideJustificativa: values.justificativaAdministrativaReforcada, confirmacaoReforcada: form.elements.confirmacaoReforcada.checked };
    var button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Registrando...';
    try { var response = await global.PortalGeapaApi.apiPost(route, { payload: JSON.stringify(payload) }); if (!response.ok) throw response; if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Gestão de vínculo', message: response.message }); await openDetail(values.idSolicitacao); await load(); }
    catch (error) { if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'error', title: 'Não foi possível registrar', message: error.message || 'Falha na ação administrativa.', persistent: true }); }
    finally { button.disabled = false; button.textContent = 'Registrar ação'; }
  }

  document.addEventListener('portal:navigationchange', function(event) { if (event.detail && event.detail.rota && event.detail.rota.id === 'admin-solicitacoes-vinculo') load(); });
  document.addEventListener('submit', function(event) {
    if (event.target.matches('[data-admin-vinculo-filters]')) { event.preventDefault(); load(); return; }
    if (!event.target.matches('[data-admin-vinculo-action]')) return;
    submitAction(event).catch(function(error) {
      console.error('[Portal GEAPA][Admin Vinculo] Falha inesperada ao processar a acao.', {
        code: String(error && (error.code || error.errorCode) || 'ADMIN_VINCULO_SUBMIT_UNEXPECTED_ERROR')
      });
      if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'error', title: 'Não foi possível registrar', message: error && error.message || 'Falha inesperada na ação administrativa.', persistent: true });
    });
  });
  document.addEventListener('change', function(event) { if (event.target.matches('[data-admin-vinculo-action] [name="acao"],[data-admin-vinculo-action] [name="tratamentoTransicao"]')) syncFinalDecisionRequirements(event.target.form); });
  document.addEventListener('click', function(event) { var target = event.target.closest('[data-admin-vinculo-detail],[data-admin-vinculo-refresh],[data-admin-vinculo-close]'); if (!target) return; if (target.dataset.adminVinculoDetail) openDetail(target.dataset.adminVinculoDetail); else if (target.hasAttribute('data-admin-vinculo-refresh')) load(); else modal().hidden = true; });
})(window);
