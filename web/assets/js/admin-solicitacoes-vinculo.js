/** Area administrativa protegida para solicitacoes voluntarias de vinculo. */
(function configurarAdminSolicitacoesVinculo(global) {
  'use strict';
  var state = { items: [], detail: null, scope: 'PENDENTES' };
  var root = function() { return document.getElementById('admin-solicitacoes-vinculo-content'); };
  var modal = function() { return document.getElementById('admin-vinculo-modal'); };
  var esc = function(v) { return global.PortalGeapaUi ? global.PortalGeapaUi.escaparHtml(String(v == null ? '' : v)) : String(v == null ? '' : v); };
  var label = function(v) { return String(v || '').toLowerCase().replace(/_/g, ' ').replace(/^./, function(c) { return c.toUpperCase(); }); };
  var asBoolean = function(v) { return v === true || ['SIM','TRUE','1'].indexOf(String(v == null ? '' : v).trim().toUpperCase()) >= 0; };
  var isFinalAction = function(action) { return ['indeferir','homologar-suspensao','homologar-efetivar-desligamento'].indexOf(String(action || '')) >= 0; };
  var manualValidationStatuses = ['NAO_VERIFICADO','PENDENTE','ATIVA','CONFLITO'];
  var terminalStatuses = ['CANCELADO_PELO_MEMBRO','CANCELADO_PELA_DIRETORIA','INDEFERIDO','EXECUTADO','CONCLUIDO'];
  var validationLabels = [
    ['VALIDACAO_VINCULO_ATIVO', 'Vínculo ativo'],
    ['VALIDACAO_SEMESTRE', 'Semestre'],
    ['VALIDACAO_APRESENTACAO', 'Apresentação'],
    ['VALIDACAO_ARQUIVOS_PENDENTES', 'Arquivos pendentes'],
    ['VALIDACAO_OBRIGACOES', 'Obrigações'],
    ['VALIDACAO_FUNCAO_ATIVA', 'Função ativa'],
    ['RESULTADO_VALIDACAO', 'Resultado geral']
  ];

  function statusToken(value) { return String(value || '').trim().toUpperCase(); }
  function isTerminal(item) { return item && item.terminal === true || terminalStatuses.indexOf(statusToken(item && (item.status || item.STATUS_SOLICITACAO))) >= 0; }
  function validationNeedsManualReview(value) { return manualValidationStatuses.indexOf(statusToken(value)) >= 0 || statusToken(value) === 'PENDENTE_ANALISE_MANUAL'; }
  function requestNeedsManualReview(request) {
    return ['VALIDACAO_APRESENTACAO','VALIDACAO_ARQUIVOS_PENDENTES','VALIDACAO_OBRIGACOES','VALIDACAO_FUNCAO_ATIVA'].some(function(field) {
      return validationNeedsManualReview(request && request[field]);
    });
  }
  function functionNeedsConfirmation(request) { return validationNeedsManualReview(request && request.VALIDACAO_FUNCAO_ATIVA); }

  function manualReviewMessage(status) {
    var token = statusToken(status);
    if (token === 'NAO_VERIFICADO') return 'Conferência manual necessária: a integração automática não conseguiu concluir.';
    if (token === 'ATIVA') return 'Conferência manual necessária: não prossiga enquanto a situação ativa não estiver formalmente regularizada.';
    if (token === 'CONFLITO') return 'Conferência manual necessária: existe conflito registrado para análise.';
    return 'Conferência manual necessária antes da decisão final.';
  }

  function renderValidations(request) {
    return '<dl class="vinculo-summary vinculo-validation-summary">' + validationLabels.map(function(item) {
      var value = request[item[0]] || 'NAO_INFORMADO';
      var warning = validationNeedsManualReview(value) ? '<span class="section-note">' + esc(manualReviewMessage(value)) + '</span>' : '';
      return '<div><dt>' + esc(item[1]) + '</dt><dd><span class="status-chip">' + esc(label(value)) + '</span>' + warning + '</dd></div>';
    }).join('') + '</dl>';
  }

  function functionConfirmationText(status) {
    var token = statusToken(status);
    if (token === 'NAO_VERIFICADO') return 'Confirmo que consultei as bases oficiais e que a pessoa não possui função ativa.';
    return 'Confirmo que a função anteriormente ativa foi formalmente encerrada, substituída ou transferida antes desta decisão.';
  }

  function renderFunctionConfirmation(request) {
    if (!functionNeedsConfirmation(request)) return '';
    return '<label class="profile-confirmation" data-admin-vinculo-function-confirmation><input type="checkbox" name="confirmacaoFuncaoRegularizada"> ' + esc(functionConfirmationText(request.VALIDACAO_FUNCAO_ATIVA)) + '</label>';
  }

  async function load() {
    var container = root(); if (!container || !global.PortalGeapaApi) return;
    container.innerHTML = '<p class="empty-state">Carregando solicitações de vínculo...</p>';
    var filters = readFilters();
    var response = await global.PortalGeapaApi.apiGet('/admin/solicitacoes-vinculo', { filtros: JSON.stringify(filters) });
    if (!response.ok) return renderError(response.message);
    state.items = (response.data && response.data.items) || [];
    renderListV2();
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
    var cards = state.items.length ? state.items.map(function(item) {
      return '<article class="admin-vinculo-card"><div class="admin-vinculo-card-header"><strong>' + esc(item.idSolicitacao) + '</strong><span class="status-chip">' + esc(label(item.status)) + '</span></div><dl><div><dt>Tipo</dt><dd>' + esc(label(item.tipo)) + '</dd></div><div><dt>Modalidade</dt><dd>' + esc(label(item.modalidade)) + '</dd></div><div><dt>Semestre</dt><dd>' + esc(item.idSemestre || '—') + '</dd></div></dl><button type="button" class="secondary-button compact-button" data-admin-vinculo-detail="' + esc(item.idSolicitacao) + '">Analisar</button></article>';
    }).join('') : '<p class="empty-state">Nenhuma solicitação encontrada.</p>';
    container.innerHTML = '<div class="situation-topbar"><div><p class="eyebrow">Gestão do GEAPA · Membros</p><h2>Solicitações de vínculo</h2></div><button class="secondary-button compact-button" type="button" data-admin-vinculo-refresh>Atualizar</button></div>' +
      '<form class="vinculo-filter-grid" data-admin-vinculo-filters><label>Tipo<select name="tipo"><option value="">Todos</option><option>SUSPENSAO_VOLUNTARIA</option><option>DESLIGAMENTO_VOLUNTARIO</option></select></label><label>Modalidade<select name="modalidade"><option value="">Todas</option><option>SUSPENSAO_TEMPORARIA</option><option>DESLIGAMENTO_APOS_HOMOLOGACAO</option><option>DESLIGAMENTO_FIM_SEMESTRE</option></select></label><label>Status<input name="status"></label><label>Semestre<input name="idSemestre"></label><label>Data inicial<input type="date" name="dataInicio"></label><label>Data final<input type="date" name="dataFim"></label><label>Membro<input name="membro"></label><label>Responsável<input name="responsavel"></label><button class="secondary-button" type="submit">Filtrar</button></form>' +
      '<div class="table-scroll admin-vinculo-table-wrap"><table class="portal-table admin-vinculo-table"><thead><tr><th>Protocolo</th><th>Tipo</th><th>Modalidade</th><th>Semestre</th><th>Status</th><th>Ação</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="admin-vinculo-cards">' + cards + '</div>';
  }

  function renderListV2() {
    var container = root();
    var visibleItems = state.items.filter(function(item) { return state.scope === 'ENCERRADAS' ? isTerminal(item) : !isTerminal(item); });
    var pendingCount = state.items.filter(function(item) { return !isTerminal(item); }).length;
    var closedCount = state.items.length - pendingCount;
    function actionLabel(item, compact) { return isTerminal(item) ? (compact ? 'Ver histórico' : 'Visualizar') : 'Analisar'; }
    var rows = visibleItems.length ? visibleItems.map(function(item) {
      return '<tr><td><strong>' + esc(item.idSolicitacao) + '</strong></td><td>' + esc(label(item.tipo)) + '</td><td>' + esc(label(item.modalidade)) + '</td><td>' + esc(item.idSemestre || '—') + '</td><td><span class="status-chip">' + esc(label(item.status)) + '</span></td><td><button type="button" class="secondary-button compact-button" data-admin-vinculo-detail="' + esc(item.idSolicitacao) + '">' + actionLabel(item, false) + '</button></td></tr>';
    }).join('') : '<tr><td colspan="6">Nenhuma solicitação encontrada nesta seção.</td></tr>';
    var cards = visibleItems.length ? visibleItems.map(function(item) {
      return '<article class="admin-vinculo-card"><div class="admin-vinculo-card-header"><strong>' + esc(item.idSolicitacao) + '</strong><span class="status-chip">' + esc(label(item.status)) + '</span></div><dl><div><dt>Tipo</dt><dd>' + esc(label(item.tipo)) + '</dd></div><div><dt>Modalidade</dt><dd>' + esc(label(item.modalidade)) + '</dd></div><div><dt>Semestre</dt><dd>' + esc(item.idSemestre || '—') + '</dd></div></dl><button type="button" class="secondary-button compact-button" data-admin-vinculo-detail="' + esc(item.idSolicitacao) + '">' + actionLabel(item, true) + '</button></article>';
    }).join('') : '<p class="empty-state">Nenhuma solicitação encontrada nesta seção.</p>';
    container.innerHTML = '<div class="situation-topbar"><div><p class="eyebrow">Gestão do GEAPA · Membros</p><h2>Solicitações de vínculo</h2></div><button class="secondary-button compact-button" type="button" data-admin-vinculo-refresh>Atualizar</button></div>' +
      '<div class="admin-vinculo-scope" role="tablist" aria-label="Situação das solicitações"><button type="button" role="tab" data-admin-vinculo-scope="PENDENTES" aria-selected="' + (state.scope === 'PENDENTES') + '">Pendentes (' + pendingCount + ')</button><button type="button" role="tab" data-admin-vinculo-scope="ENCERRADAS" aria-selected="' + (state.scope === 'ENCERRADAS') + '">Encerradas (' + closedCount + ')</button></div>' +
      '<form class="vinculo-filter-grid" data-admin-vinculo-filters><label>Tipo<select name="tipo"><option value="">Todos</option><option>SUSPENSAO_VOLUNTARIA</option><option>DESLIGAMENTO_VOLUNTARIO</option></select></label><label>Modalidade<select name="modalidade"><option value="">Todas</option><option>SUSPENSAO_TEMPORARIA</option><option>DESLIGAMENTO_APOS_HOMOLOGACAO</option><option>DESLIGAMENTO_FIM_SEMESTRE</option></select></label><label>Status<input name="status"></label><label>Semestre<input name="idSemestre"></label><label>Data inicial<input type="date" name="dataInicio"></label><label>Data final<input type="date" name="dataFim"></label><label>Membro<input name="membro"></label><label>Responsável<input name="responsavel"></label><button class="secondary-button" type="submit">Filtrar</button></form>' +
      '<div class="table-scroll admin-vinculo-table-wrap"><table class="portal-table admin-vinculo-table"><thead><tr><th>Protocolo</th><th>Tipo</th><th>Modalidade</th><th>Semestre</th><th>Status</th><th>Ação</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="admin-vinculo-cards">' + cards + '</div>';
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
    if (d.somenteLeitura === true || isTerminal(request)) { renderTerminalDetail(d, request, person); return; }
    var differences = (norm.divergencias || []).length ? '<div class="portal-feedback is-warning"><strong>Parâmetros alterados após o pedido.</strong><pre>' + esc(JSON.stringify(norm.divergencias, null, 2)) + '</pre></div>' : '<p class="section-note">Parâmetros vigentes coincidem com o snapshot do pedido.</p>';
    var minutesRule = request.TIPO_SOLICITACAO === 'DESLIGAMENTO_VOLUNTARIO' ? '<p class="section-note" data-admin-vinculo-ata-rule>' + esc(requirements.exigeTratamentoTransicao ? 'A regra de ata mudou desde o pedido. Selecione o tratamento de transição antes da decisão final.' : (requirements.exigeAta ? 'A decisão final exige referência oficial de ata. Base legal: ' + (requirements.baseLegal || 'não informada') : 'A regra normativa vigente dispensa ata nesta decisão final. A referência documental permanece opcional.')) + '</p>' : '';
    document.getElementById('admin-vinculo-modal-content').innerHTML = [
      '<div class="vinculo-admin-person"><strong>' + esc(person.nome || 'Pessoa') + '</strong><span>' + esc(person.rgaMascarado || '') + '</span><span>' + esc(person.emailMascarado || '') + '</span></div>',
      '<dl class="vinculo-summary"><div><dt>Protocolo</dt><dd>' + esc(request.ID_SOLICITACAO) + '</dd></div><div><dt>Status</dt><dd>' + esc(label(request.STATUS_SOLICITACAO)) + '</dd></div><div><dt>Tipo</dt><dd>' + esc(label(request.TIPO_SOLICITACAO)) + '</dd></div><div><dt>Modalidade</dt><dd>' + esc(label(request.MODALIDADE_SOLICITADA)) + '</dd></div></dl>',
      '<section><h3>Pedido</h3><p><strong>Motivo:</strong> ' + esc(request.MOTIVO_CATEGORIA || '—') + '</p><p><strong>Justificativa:</strong> ' + esc(request.JUSTIFICATIVA || request.OBSERVACOES_MEMBRO || '—') + '</p><p><strong>Documento:</strong> ' + esc(request.DOCUMENTO_REFERENCIA || '—') + '</p></section>',
      '<section><h3>Semestre e validações</h3><p>' + esc(request.ID_SEMESTRE_REFERENCIA || 'Sem referência') + ' · snapshot ' + esc(request.DATA_FIM_SEMESTRE_SNAPSHOT || '—') + '</p>' + renderValidations(request) + (request.MENSAGEM_VALIDACAO ? '<p class="section-note">' + esc(request.MENSAGEM_VALIDACAO) + '</p>' : '') + '</section>',
      '<section><h3>Parâmetros normativos</h3>' + differences + '</section>',
      minutesRule,
      '<p class="section-note">' + esc(actionGuidance(request)) + '</p>',
      '<form data-admin-vinculo-action><input type="hidden" name="idSolicitacao" value="' + esc(request.ID_SOLICITACAO) + '"><label>Ação<select name="acao" required>' + actionOptions(request) + '</select></label><label>Observação / justificativa<textarea name="observacao" rows="4"></textarea></label><label data-admin-vinculo-ata-label>Referência oficial da ata (opcional) <input name="ataReferencia"></label><label>Tratamento de transição<select name="tratamentoTransicao"><option value="">Não aplicável</option><option>APLICAR_VIGENTE</option><option>APLICAR_SNAPSHOT</option></select></label><label>Justificativa administrativa reforçada<textarea name="justificativaAdministrativaReforcada" rows="3" minlength="20"></textarea></label>' + renderFunctionConfirmation(request) + '<label class="profile-confirmation"><input type="checkbox" name="confirmacaoReforcada"> Confirmo a decisão final e seus efeitos institucionais.</label><button class="primary-button" type="submit">Registrar ação</button></form>'
    ].join('');
    syncFinalDecisionRequirements(document.querySelector('[data-admin-vinculo-action]'));
  }

  function renderTerminalDetail(detail, request, person) {
    document.getElementById('admin-vinculo-modal-content').innerHTML = [
      '<div class="vinculo-admin-person"><strong>' + esc(person.nome || 'Pessoa') + '</strong><span>' + esc(person.rgaMascarado || '') + '</span><span>' + esc(person.emailMascarado || '') + '</span></div>',
      '<div class="portal-feedback"><strong>Status terminal: ' + esc(label(request.STATUS_SOLICITACAO)) + '.</strong> Este registro está disponível somente para consulta.</div>',
      '<dl class="vinculo-summary"><div><dt>Protocolo</dt><dd>' + esc(request.ID_SOLICITACAO || '—') + '</dd></div><div><dt>Cancelado por</dt><dd>' + esc(request.CANCELADO_POR || '—') + '</dd></div><div><dt>Cancelado em</dt><dd>' + esc(request.CANCELADO_EM || '—') + '</dd></div><div><dt>Motivo do cancelamento</dt><dd>' + esc(request.MOTIVO_CANCELAMENTO || '—') + '</dd></div><div><dt>Decisão</dt><dd>' + esc(request.DECISAO_DIRETORIA || '—') + '</dd></div><div><dt>Decidido por</dt><dd>' + esc(request.DECIDIDO_POR || '—') + '</dd></div><div><dt>Data da decisão</dt><dd>' + esc(request.DATA_DECISAO || '—') + '</dd></div><div><dt>Data efetiva</dt><dd>' + esc(request.DATA_EFETIVA || '—') + '</dd></div></dl>',
      '<section class="admin-vinculo-history"><h3>Histórico</h3><pre>' + esc(request.HISTORICO_STATUS_JSON || '[]') + '</pre><h3>Auditoria autorizada</h3><pre>' + esc(request.AUDITORIA_JSON || '[]') + '</pre></section>',
      '<button type="button" class="secondary-button" data-admin-vinculo-resend="' + esc(request.ID_SOLICITACAO) + '">Reenviar notificação</button>'
    ].join('');
  }

  async function resendNotification(id) {
    var response = await global.PortalGeapaApi.apiPost('/admin/solicitacoes-vinculo/reenviar-notificacao', { payload: JSON.stringify({ idSolicitacao: id }) });
    if (!response.ok) throw response;
    if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Notificação', message: response.message || 'Notificação reenviada.' });
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
    var finalDecision = isFinalAction(action);
    var request = state.detail && state.detail.solicitacao || {};
    var functionConfirmation = form.elements.confirmacaoFuncaoRegularizada;
    if (functionConfirmation) functionConfirmation.required = finalDecision && functionNeedsConfirmation(request);
    var reinforcedJustification = form.elements.justificativaAdministrativaReforcada;
    if (reinforcedJustification) reinforcedJustification.required = finalDecision && requestNeedsManualReview(request);
    var reinforcedConfirmation = form.elements.confirmacaoReforcada;
    if (reinforcedConfirmation) reinforcedConfirmation.required = action === 'homologar-efetivar-desligamento';
  }

  function validateManualReview(form, values, request) {
    if (!isFinalAction(values.acao)) return;
    if (requestNeedsManualReview(request) && String(values.justificativaAdministrativaReforcada || '').trim().length < 20) {
      throw new Error('Registre uma justificativa administrativa reforçada com pelo menos 20 caracteres para as validações pendentes.');
    }
    if (functionNeedsConfirmation(request) && !(form.elements.confirmacaoFuncaoRegularizada && form.elements.confirmacaoFuncaoRegularizada.checked)) {
      throw new Error('Confirme a conferência da função antes da decisão final. A confirmação não substitui o encerramento, a transferência ou a substituição de uma função efetivamente ativa.');
    }
    if (values.acao === 'homologar-efetivar-desligamento' && !(form.elements.confirmacaoReforcada && form.elements.confirmacaoReforcada.checked)) {
      throw new Error('Confirme explicitamente a decisão final e seus efeitos institucionais.');
    }
  }

  function buildActionPayload(form, values) {
    return {
      idSolicitacao: values.idSolicitacao,
      obsDecisao: values.observacao,
      observacao: values.observacao,
      mensagem: values.observacao,
      motivo: values.observacao,
      ataReferencia: values.ataReferencia,
      tratamentoTransicao: values.tratamentoTransicao,
      justificativaAdministrativaReforcada: values.justificativaAdministrativaReforcada,
      overrideJustificativa: values.justificativaAdministrativaReforcada,
      confirmacaoFuncaoRegularizada: form.elements.confirmacaoFuncaoRegularizada ? form.elements.confirmacaoFuncaoRegularizada.checked : false,
      confirmacaoReforcada: form.elements.confirmacaoReforcada ? form.elements.confirmacaoReforcada.checked : false
    };
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
    var request = state.detail && state.detail.solicitacao || {};
    validateManualReview(form, values, request);
    var route = '/admin/solicitacoes-vinculo/' + values.acao; var payload = buildActionPayload(form, values);
    var button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Registrando...';
    try { var response = await global.PortalGeapaApi.apiPost(route, { payload: JSON.stringify(payload) }); if (!response.ok) throw response; if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Gestão de vínculo', message: response.message }); await openDetail(values.idSolicitacao); await load(); }
    catch (error) { if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'error', title: 'Não foi possível registrar', message: error.message || 'Falha na ação administrativa.', persistent: true }); }
    finally { button.disabled = false; button.textContent = 'Registrar ação'; }
  }

  if (global.__PORTAL_VINCULO_TEST__ === true) {
    global.__PortalAdminVinculoTestHooks = Object.freeze({
      validationNeedsManualReview: validationNeedsManualReview,
      requestNeedsManualReview: requestNeedsManualReview,
      functionNeedsConfirmation: functionNeedsConfirmation,
      functionConfirmationText: functionConfirmationText,
      renderFunctionConfirmation: renderFunctionConfirmation,
      renderValidations: renderValidations,
      validateManualReview: validateManualReview,
      buildActionPayload: buildActionPayload,
      isFinalAction: isFinalAction,
      isTerminal: isTerminal
    });
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
  document.addEventListener('click', function(event) { var target = event.target.closest('[data-admin-vinculo-detail],[data-admin-vinculo-refresh],[data-admin-vinculo-close],[data-admin-vinculo-scope],[data-admin-vinculo-resend]'); if (!target) return; if (target.dataset.adminVinculoDetail) openDetail(target.dataset.adminVinculoDetail); else if (target.dataset.adminVinculoScope) { state.scope = target.dataset.adminVinculoScope; renderListV2(); } else if (target.dataset.adminVinculoResend) resendNotification(target.dataset.adminVinculoResend).catch(function(error) { if (global.PortalGeapaUi) global.PortalGeapaUi.mostrarToast({ type: 'error', title: 'Falha no reenvio', message: error.message || 'Não foi possível reenviar.', persistent: true }); }); else if (target.hasAttribute('data-admin-vinculo-refresh')) load(); else modal().hidden = true; });
})(window);
