/**
 * Entrada do Web App do Apps Script.
 *
 * Nesta etapa, o endpoint ja roteia acoes do portal, mas todas as funcoes
 * chamadas ainda retornam dados simulados. Nao ha consulta real a planilhas.
 */

/**
 * Responde requisicoes GET basicas do Web App.
 *
 * @param {Object} e Evento de requisicao do Apps Script.
 * @return {TextOutput} JSON de status.
 */
function doGet(e) {
  return portalJsonOutput_(portalRespostaOk_(
    'PORTAL_API_OK',
    'API do Portal GEAPA ativa em modo placeholder.',
    {
      acoesDisponiveis: [
        'solicitarCodigo',
        'validarCodigo',
        'minhaSituacao'
      ],
      parametrosRecebidos: e && e.parameter ? e.parameter : {}
    }
  ));
}

/**
 * Responde requisicoes POST do Web App.
 *
 * @param {Object} e Evento de requisicao do Apps Script.
 * @return {TextOutput} JSON de status.
 */
function doPost(e) {
  try {
    var requisicao = portalLerRequisicao_(e);
    var resposta = portalExecutarAcao_(requisicao);
    return portalJsonOutput_(resposta);
  } catch (erro) {
    return portalJsonOutput_(portalRespostaErro_(
      'ERRO_INTERNO_PLACEHOLDER',
      'Erro ao processar requisicao placeholder.',
      {
        detalhe: erro && erro.message ? erro.message : String(erro)
      }
    ));
  }
}

/**
 * Le parametros enviados pelo front-end.
 *
 * O front-end envia application/x-www-form-urlencoded para evitar complexidade
 * desnecessaria de CORS nesta fase. O parser JSON fica aqui para facilitar
 * testes manuais no futuro.
 *
 * @param {Object} e Evento de requisicao do Apps Script.
 * @return {Object} Parametros normalizados.
 */
function portalLerRequisicao_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var corpo = e && e.postData && e.postData.contents ? e.postData.contents : '';

  if (corpo && e.postData.type === 'application/json') {
    try {
      var json = JSON.parse(corpo);
      return Object.assign({}, parametros, json);
    } catch (erro) {
      throw new Error('JSON invalido no corpo da requisicao.');
    }
  }

  return parametros;
}

/**
 * Encaminha a acao solicitada para a funcao placeholder correspondente.
 *
 * @param {Object} requisicao Parametros recebidos do front-end.
 * @return {Object} Resposta da acao.
 */
function portalExecutarAcao_(requisicao) {
  var acao = requisicao.acao || '';

  if (!acao) {
    return portalRespostaErro_(
      'ACAO_OBRIGATORIA',
      'Informe a ação da API.',
      {}
    );
  }

  if (acao === 'solicitarCodigo') {
    return portalSolicitarCodigo(requisicao.emailOuRga || '');
  }

  if (acao === 'validarCodigo') {
    return portalValidarCodigo(
      requisicao.emailOuRga || '',
      requisicao.codigo || ''
    );
  }

  if (acao === 'minhaSituacao') {
    return portalMinhaSituacao(requisicao.token || '');
  }

  return portalRespostaErro_(
    'ACAO_NAO_RECONHECIDA',
    'Ação não reconhecida.',
    {
      acaoRecebida: acao
    }
  );
}

/**
 * Cria uma resposta de sucesso no envelope padrao da API.
 *
 * @param {string} code Codigo estavel da resposta.
 * @param {string} message Mensagem curta e nao sensivel.
 * @param {Object} data Dados especificos da acao.
 * @return {Object} Resposta padronizada.
 */
function portalRespostaOk_(code, message, data) {
  return portalResposta_(true, code, message, data);
}

/**
 * Cria uma resposta de erro no envelope padrao da API.
 *
 * @param {string} code Codigo estavel do erro.
 * @param {string} message Mensagem curta e nao sensivel.
 * @param {Object} data Dados auxiliares nao sensiveis.
 * @return {Object} Resposta padronizada.
 */
function portalRespostaErro_(code, message, data) {
  return portalResposta_(false, code, message, data);
}

/**
 * Monta o envelope padrao de resposta da API.
 *
 * @param {boolean} ok Resultado da operacao.
 * @param {string} code Codigo estavel.
 * @param {string} message Mensagem curta.
 * @param {Object} data Dados especificos da acao.
 * @return {Object} Resposta padronizada.
 */
function portalResposta_(ok, code, message, data) {
  return {
    ok: ok,
    code: code,
    message: message,
    data: data || {},
    meta: {
      app: PORTAL_CONFIG.nomePortal,
      modo: 'placeholder',
      versaoContrato: PORTAL_CONFIG.versaoContrato
    }
  };
}

/**
 * Cria uma resposta JSON padronizada para o Web App.
 *
 * @param {Object} payload Dados a serem enviados ao cliente.
 * @return {TextOutput} Saida JSON.
 */
function portalJsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
