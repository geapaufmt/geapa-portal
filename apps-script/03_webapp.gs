/**
 * Entrada do Web App do Apps Script.
 *
 * Nesta etapa, o endpoint roteia acoes reais do portal para contratos
 * Apps Script, mantendo as leituras V2 em modo somente leitura.
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
    'API do Portal GEAPA ativa.',
    {
      acoesDisponiveis: [
        'solicitarCodigo',
        'validarCodigo',
        'portalLogin',
        'conteudoPublicoSnapshot',
        'minhaSituacao',
        'atividadesBundle',
        'atividadesListar',
        'atividadesDetalhesPreload',
        'atividadeDetalhe',
        'atividadeChamada',
        'atividadeSalvarChamada',
        'atividadeCriar',
        'minhaFrequencia',
        'minhasApresentacoes',
        'minhasJustificativas',
        'justificativasConfig',
        'justificativaEnviar',
        'justificativaAnalisar',
        'justificativasPendenciasDiretoria',
        'proximasAtividades',
        'historicoAtividades',
        'pendenciasDiretoria',
        'painelDiretoriaV2',
        'statusViewsV2',
        'apresentacoesListarEixos',
        'apresentacaoEnviarTituloEixo',
        'apresentacaoRevisarTituloEixo',
        'apresentacaoReprovarTituloEixo',
        'apresentacaoRegistrarMaterial',
        'apresentacaoRevisarMaterial',
        'apresentacoesPendenciasDiretoria'
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
      'ERRO_INTERNO_PORTAL',
      'Erro ao processar requisicao do Portal GEAPA.',
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
 * Encaminha a acao solicitada para a funcao correspondente.
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

  if (acao === 'portalLogin') {
    return portalLoginFirebase(requisicao.idToken || '');
  }

  if (acao === 'conteudoPublicoSnapshot') {
    return portalConteudoPublicoSnapshot({
      forceRefresh: String(requisicao.forceRefresh || '').toLowerCase() === 'true'
    });
  }

  if (acao === 'minhaSituacao') {
    return portalMinhaSituacao(requisicao.token || '');
  }

  if (acao === 'atividadesBundle') {
    return portalAtividadesBundle(requisicao.token || '');
  }

  if (acao === 'atividadesListar') {
    return portalListarAtividades(requisicao.token || '');
  }

  if (acao === 'atividadesDetalhesPreload') {
    return portalPrecarregarDetalhesAtividades(requisicao.token || '');
  }

  if (acao === 'atividadeDetalhe') {
    return portalDetalheAtividade(
      requisicao.token || '',
      requisicao.idAtividade || ''
    );
  }

  if (acao === 'atividadeChamada') {
    return portalBuscarChamadaAtividade(
      requisicao.token || '',
      requisicao.idAtividade || ''
    );
  }

  if (acao === 'atividadeSalvarChamada') {
    return portalSalvarChamadaAtividade(
      requisicao.token || '',
      requisicao.payload || ''
    );
  }

  if (acao === 'atividadeCriar') {
    return portalCriarAtividade(
      requisicao.token || '',
      requisicao.payload || ''
    );
  }

  if (acao === 'minhaFrequencia') {
    return portalMinhaFrequenciaV2(requisicao.token || '');
  }

  if (acao === 'minhasApresentacoes') {
    return portalMinhasApresentacoesV2(requisicao.token || '');
  }

  if (acao === 'minhasJustificativas') {
    return portalMinhasJustificativasV2(requisicao.token || '');
  }

  if (acao === 'justificativasConfig') {
    return portalJustificativasConfigV2(requisicao.token || '');
  }

  if (acao === 'justificativaEnviar') {
    return portalJustificativaEnviarV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'justificativaAnalisar') {
    return portalJustificativaAnalisarV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'justificativasPendenciasDiretoria') {
    return portalJustificativasPendenciasDiretoriaV2(requisicao.token || '');
  }

  if (acao === 'proximasAtividades') {
    return portalProximasAtividadesV2(requisicao.token || '');
  }

  if (acao === 'historicoAtividades') {
    return portalHistoricoAtividadesV2(requisicao.token || '');
  }

  if (acao === 'pendenciasDiretoria') {
    return portalPendenciasDiretoriaV2(requisicao.token || '');
  }

  if (acao === 'painelDiretoriaV2') {
    return portalApiGetPainelDiretoriaV2(requisicao.token || '');
  }

  if (acao === 'statusViewsV2') {
    return portalStatusViewsV2(requisicao.token || '');
  }

  if (acao === 'apresentacoesListarEixos') {
    return portalApresentacoesListarEixosV2(requisicao.token || '');
  }

  if (acao === 'apresentacaoEnviarTituloEixo') {
    return portalApresentacaoEnviarTituloEixoV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'apresentacaoRevisarTituloEixo') {
    return portalApresentacaoRevisarTituloEixoV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'apresentacaoReprovarTituloEixo') {
    return portalApresentacaoReprovarTituloEixoV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'apresentacaoRegistrarMaterial') {
    return portalApresentacaoRegistrarMaterialV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'apresentacaoRevisarMaterial') {
    return portalApresentacaoRevisarMaterialV2(
      requisicao.token || '',
      requisicao.payload || requisicao
    );
  }

  if (acao === 'apresentacoesPendenciasDiretoria') {
    return portalApresentacoesPendenciasDiretoriaV2(requisicao.token || '');
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
function portalRespostaOk_(code, message, data, metaExtra) {
  return portalResposta_(true, code, message, data, metaExtra);
}

/**
 * Cria uma resposta de erro no envelope padrao da API.
 *
 * @param {string} code Codigo estavel do erro.
 * @param {string} message Mensagem curta e nao sensivel.
 * @param {Object} data Dados auxiliares nao sensiveis.
 * @return {Object} Resposta padronizada.
 */
function portalRespostaErro_(code, message, data, metaExtra) {
  return portalResposta_(false, code, message, data, metaExtra);
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
function portalResposta_(ok, code, message, data, metaExtra) {
  var meta = {
    app: PORTAL_CONFIG.nomePortal,
    modo: 'apps-script',
    versaoContrato: PORTAL_CONFIG.versaoContrato
  };

  if (metaExtra) {
    Object.keys(metaExtra).forEach(function copiarMeta(chave) {
      meta[chave] = metaExtra[chave];
    });
  }

  return {
    ok: ok,
    code: code,
    message: message,
    data: data || {},
    meta: meta
  };
}

function portalMensagemBloqueioPadrao_() {
  return 'Seu e-mail nao esta liberado para acessar o Portal GEAPA ou nao possui vinculo ativo no grupo. Entre com o mesmo e-mail cadastrado junto ao GEAPA.';
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
