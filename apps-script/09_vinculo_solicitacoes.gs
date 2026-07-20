/**
 * Ponte segura do Portal para a Gestao V2 de solicitacoes voluntarias de
 * vinculo. Identidade e ambiente sao sempre resolvidos novamente no backend.
 */

function portalVinculoContexto_(token, permissao) {
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, permissao || '');
  if (!acesso.ok) return acesso;
  acesso.contexto.ambienteDadosV2 = portalResolverAmbienteDadosV2_();
  acesso.contexto.origem = 'PORTAL_SOLICITACOES_VINCULO_V2';
  return acesso;
}

function portalEgressFeedbackContexto_() {
  var environment = portalResolverAmbienteDadosV2_();
  return { ambienteDadosV2: environment, origem: 'PORTAL_AVALIACAO_EGRESSO_V2', featureFlags: { ENABLE_EGRESS_FEEDBACK: environment === 'DEV' } };
}

function portalEgressFeedbackExecutar_(nomeContrato, payload) {
  var inicio = portalAgoraMs_();
  try {
    if (typeof GEAPA_MEMBROS === 'undefined' || !GEAPA_MEMBROS || typeof GEAPA_MEMBROS[nomeContrato] !== 'function') return portalRespostaErro_('AVALIACAO_EGRESSO_INDISPONIVEL', 'A avaliacao de egresso nao esta disponivel.', {}, portalMetaDesempenho_('geapa-membros', inicio));
    var result = GEAPA_MEMBROS[nomeContrato](portalVinculoObjeto_(payload), portalEgressFeedbackContexto_()) || {};
    if (result.ok === false) return portalRespostaErro_(result.code || result.errorCode, result.message, { details: result.details || {} }, portalMetaDesempenho_('geapa-membros', inicio));
    return portalRespostaOk_(result.code, result.message, result.data || {}, portalMetaDesempenho_('geapa-membros', inicio));
  } catch (error) { return portalRespostaErro_(error.code || 'AVALIACAO_EGRESSO_ERRO', error.message || 'Nao foi possivel concluir.', {}, portalMetaDesempenho_('geapa-membros', inicio)); }
}

function portalVinculoObjeto_(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '{}')) || {}; }
  catch (error) { throw portalVinculoErro_('PAYLOAD_VINCULO_INVALIDO', 'Os dados enviados nao possuem formato valido.'); }
}

function portalVinculoErro_(code, message) {
  var error = new Error(message); error.code = code; error.errorCode = code; return error;
}

function portalVinculoExecutar_(token, permissao, nomeContrato, primeiroArgumento) {
  var inicio = portalAgoraMs_();
  try {
    var acesso = portalVinculoContexto_(token, permissao);
    if (!acesso.ok) return acesso.resposta;
    if (typeof GEAPA_MEMBROS === 'undefined' || !GEAPA_MEMBROS || typeof GEAPA_MEMBROS[nomeContrato] !== 'function') {
      return portalRespostaErro_('MEMBROS_VINCULO_V2_INDISPONIVEL', 'A gestao de solicitacoes de vinculo ainda nao esta disponivel.', {}, portalMetaDesempenho_('geapa-membros', inicio));
    }
    var args = primeiroArgumento === undefined ? [acesso.contexto] : [portalVinculoObjeto_(primeiroArgumento), acesso.contexto];
    var result = GEAPA_MEMBROS[nomeContrato].apply(GEAPA_MEMBROS, args) || {};
    var meta = portalMetaDesempenho_('geapa-membros', inicio);
    meta.requestId = String(result.requestId || '').slice(0, 80);
    if (result.ok === false) return portalRespostaErro_(result.code || result.errorCode || 'SOLICITACAO_VINCULO_ERRO', result.message || 'Nao foi possivel concluir a operacao.', { fieldErrors: result.fieldErrors || {}, details: result.details || {} }, meta);
    return portalRespostaOk_(result.code || 'SOLICITACAO_VINCULO_OK', result.message || 'Operacao concluida.', result.data || {}, Object.assign(meta, { warnings: result.warnings || [] }));
  } catch (error) {
    return portalRespostaErro_(error.code || error.errorCode || 'SOLICITACAO_VINCULO_ERRO', error.message || 'Nao foi possivel concluir a operacao.', {}, portalMetaDesempenho_('geapa-membros', inicio));
  }
}

function portalMeuVinculoOpcoesSolicitacao(token) { return portalVinculoExecutar_(token, 'membros:solicitar_alteracao_vinculo', 'membersMeuVinculoOpcoesSolicitacao'); }
function portalMeuVinculoSolicitacoesListar(token) { return portalVinculoExecutar_(token, '', 'membersMeuVinculoSolicitacoesListar'); }
function portalMeuVinculoSolicitarSuspensao(token, payload) { return portalVinculoExecutar_(token, 'membros:solicitar_alteracao_vinculo', 'membersMeuVinculoSolicitarSuspensao', payload); }
function portalMeuVinculoSolicitarDesligamento(token, payload) { return portalVinculoExecutar_(token, 'membros:solicitar_alteracao_vinculo', 'membersMeuVinculoSolicitarDesligamento', payload); }
function portalMeuVinculoCancelarSolicitacao(token, payload) { return portalVinculoExecutar_(token, '', 'membersMeuVinculoCancelarSolicitacao', payload); }

function portalAdminSolicitacoesVinculoListar(token, filtros) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacoesVinculoListar', filtros); }
function portalAdminSolicitacaoVinculoDetalhe(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoDetalhe', payload); }
function portalAdminSolicitacaoVinculoIniciarAnalise(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoIniciarAnalise', payload); }
function portalAdminSolicitacaoVinculoSolicitarComplemento(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoSolicitarComplemento', payload); }
function portalAdminSolicitacaoVinculoRegistrarAnalisePreliminar(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoRegistrarAnalisePreliminar', payload); }
function portalAdminSolicitacaoVinculoIndeferir(token, payload) { return portalVinculoExecutar_(token, 'membros:homologar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoIndeferir', payload); }
function portalAdminSolicitacaoVinculoHomologarSuspensao(token, payload) { return portalVinculoExecutar_(token, 'membros:homologar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoHomologarSuspensao', payload); }
function portalAdminSolicitacaoVinculoHomologarEfetivarDesligamento(token, payload) { return portalVinculoExecutar_(token, 'membros:homologar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoHomologarEfetivarDesligamento', payload); }
function portalAdminSolicitacaoVinculoCancelar(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoCancelar', payload); }
function portalAdminSolicitacaoVinculoReprocessar(token, payload) { return portalVinculoExecutar_(token, 'membros:executar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoReprocessar', payload); }
function portalAdminSolicitacaoVinculoReenviarNotificacao(token, payload) { return portalVinculoExecutar_(token, 'membros:analisar_solicitacoes_vinculo', 'membersAdminSolicitacaoVinculoReenviarNotificacao', payload); }
function portalAvaliacaoEgressoConsultar(payload) { return portalEgressFeedbackExecutar_('membersAvaliacaoEgressoConsultarPorToken', payload); }
function portalAvaliacaoEgressoResponder(payload) { return portalEgressFeedbackExecutar_('membersAvaliacaoEgressoResponder', payload); }
