/**
 * Entrada futura do Web App do Apps Script.
 *
 * Nesta V1, o endpoint retorna apenas informacoes de status. A roteirizacao
 * real das acoes do portal sera implementada em uma etapa posterior.
 */

/**
 * Responde requisicoes GET basicas do Web App.
 *
 * @param {Object} e Evento de requisicao do Apps Script.
 * @return {TextOutput} JSON de status.
 */
function doGet(e) {
  return portalJsonOutput_({
    ok: true,
    app: PORTAL_CONFIG.nomePortal,
    modo: 'placeholder',
    mensagem: 'Web App do Portal GEAPA ainda sem endpoints reais.',
    parametrosRecebidos: e && e.parameter ? e.parameter : {}
  });
}

/**
 * Responde requisicoes POST basicas do Web App.
 *
 * Futuramente este ponto podera encaminhar acoes como:
 * - solicitarCodigo;
 * - validarCodigo;
 * - minhaSituacao.
 *
 * @param {Object} e Evento de requisicao do Apps Script.
 * @return {TextOutput} JSON de status.
 */
function doPost(e) {
  return portalJsonOutput_({
    ok: false,
    app: PORTAL_CONFIG.nomePortal,
    modo: 'placeholder',
    mensagem: 'POST ainda nao implementado nesta V1.',
    corpoRecebido: e && e.postData ? e.postData.contents : ''
  });
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
