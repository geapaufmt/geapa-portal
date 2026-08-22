/**
 * Configuracoes iniciais do Portal GEAPA.
 *
 * Este arquivo deve concentrar constantes sem dados sensiveis. IDs reais de
 * planilhas, chaves privadas e enderecos sensiveis nao devem ser versionados.
 */

var PORTAL_CONFIG = {
  nomePortal: 'Portal GEAPA',
  versaoContrato: 'v2-readonly',
  ambiente: 'producao',
  ambientePerfilCadastral: 'PROD',
  ambienteDadosV2: 'PROD',
  firebaseProjectIds: Object.freeze({
    DEV: '',
    PROD: 'portal-geapa'
  }),

  /**
   * URL futura do frontend publicado.
   * Manter vazio enquanto o portal nao estiver publicado.
   */
  urlFrontend: '',

  /**
   * Tempo de validade do codigo temporario, em minutos.
   */
  validadeCodigoMinutos: 10,

  /**
   * Tempo de validade da sessao temporaria apos validar o codigo, em minutos.
   * Deve ser maior que a validade do codigo para evitar novo login a cada
   * atualizacao da pagina, mas ainda curto o bastante para reduzir risco em
   * computadores compartilhados.
   */
  validadeSessaoMinutos: 120,

  /**
   * Cache curto da tela "Minha situacao", em segundos.
   * Reduz leituras repetidas no GEAPA-CORE quando a mesma sessao atualiza a
   * pagina ou recarrega os dados em seguida.
   */
  cacheMinhaSituacaoSegundos: 120,

  /**
   * Cache curto da sessao resolvida pelo GEAPA-CORE, em segundos.
   * Evita repetir a resolucao de perfil/permissoes no mesmo fluxo de login,
   * Minha situacao e Atividades.
   */
  cacheSessaoCoreSegundos: 180,

  /**
   * Cache curto da leitura de atividades, em segundos.
   * A lista e os detalhes sao somente leitura, mas ainda passam pela validacao
   * da sessao antes de usar cache.
   */
  cacheAtividadesSegundos: 120,

  /**
   * Cache curto das views V2 somente leitura consumidas pelo portal.
   * O cache guarda apenas respostas ja filtradas para a sessao atual.
   */
  cacheViewsV2Segundos: 120,

  /**
   * Cache curto do conteudo editorial publico ja sanitizado pelo GEAPA-CORE.
   * Esse cache nao substitui o futuro espelho publico no Firestore; apenas
   * evita chamadas repetidas ao CORE enquanto a publicacao definitiva nao
   * estiver implementada.
   */
  cacheConteudoPublicoSegundos: 300,

  /**
   * Limite de tentativas para validar um codigo antes de bloquear a sessao
   * temporaria. Usado apenas no fluxo de teste inicial.
   */
  maxTentativasCodigo: 5,

  /**
   * Intervalo minimo entre duas solicitacoes de codigo para o mesmo e-mail.
   */
  intervaloSolicitacaoSegundos: 60,

  /**
   * Propriedades configuradas no Apps Script, fora do repositorio.
   */
  propriedades: {
    envioEmailHabilitado: 'PORTAL_ENVIO_EMAIL_HABILITADO',
    modoAcesso: 'PORTAL_MODO_ACESSO',
    emailsTeste: 'PORTAL_EMAILS_TESTE',
    membrosTeste: 'PORTAL_MEMBROS_TESTE_JSON',
    codigoSalt: 'PORTAL_CODIGO_SALT',
    diagnosticoIdentificador: 'PORTAL_DIAGNOSTICO_IDENTIFICADOR',
    firebaseWebApiKeyByEnvironment: Object.freeze({
      DEV: 'GEAPA_FIREBASE_DEV_WEB_API_KEY',
      PROD: 'GEAPA_FIREBASE_PROD_WEB_API_KEY'
    })
  }
};

/**
 * Retorna uma copia simples das configuracoes publicas do portal.
 * Nao incluir segredos neste retorno.
 */
function portalGetConfigPublica() {
  return {
    nomePortal: PORTAL_CONFIG.nomePortal,
    versaoContrato: PORTAL_CONFIG.versaoContrato,
    ambiente: PORTAL_CONFIG.ambiente,
    ambienteDadosV2: portalResolverAmbienteDadosV2_()
  };
}

function portalResolverAmbienteDadosV2_() {
  var environment = String(PORTAL_CONFIG.ambienteDadosV2 || '').trim().toUpperCase();
  if (environment !== 'DEV' && environment !== 'PROD') {
    throw new Error('PORTAL_CONFIG_AMBIENTE_DADOS_V2_INVALIDO');
  }
  var portalEnvironment = String(PORTAL_CONFIG.ambiente || '').trim().toUpperCase();
  var expected = portalEnvironment === 'PRODUCAO' || portalEnvironment === 'PROD' ? 'PROD' : 'DEV';
  if (environment !== expected) {
    throw new Error('PORTAL_CONFIG_AMBIENTES_DIVERGENTES');
  }
  return environment;
}

function portalMontarOpcoesCore_(origem, extras) {
  return Object.assign({}, extras || {}, {
    origem: String(origem || '').slice(0, 80),
    ambiente: portalResolverAmbienteDadosV2_(),
    environment: portalResolverAmbienteDadosV2_(),
    traceId: portalTraceIdAtual_()
  });
}

var __portal_trace_context = null;

function portalIniciarTrace_(acao, requestId) {
  __portal_trace_context = {
    traceId: String(requestId || ('PORTAL-' + Utilities.getUuid())).slice(0, 80),
    acao: String(acao || '').slice(0, 80),
    ambiente: portalResolverAmbienteDadosV2_(),
    inicioMs: new Date().getTime(),
    etapas: []
  };
  return __portal_trace_context;
}

function portalTraceIdAtual_() {
  return __portal_trace_context ? __portal_trace_context.traceId : '';
}

function portalTraceEtapa_(etapa, inicioMs, code, origem) {
  if (!__portal_trace_context) return;
  __portal_trace_context.etapas.push({
    etapa: String(etapa || '').slice(0, 80),
    duracaoMs: Math.max(new Date().getTime() - Number(inicioMs || new Date().getTime()), 0),
    code: String(code || '').slice(0, 80),
    origem: String(origem || '').slice(0, 80)
  });
}

function portalTraceMeta_() {
  if (!__portal_trace_context) {
    return { ambiente: portalResolverAmbienteDadosV2_() };
  }
  return {
    traceId: __portal_trace_context.traceId,
    ambiente: __portal_trace_context.ambiente,
    acao: __portal_trace_context.acao,
    tempoTotalMs: Math.max(new Date().getTime() - __portal_trace_context.inicioMs, 0),
    etapas: __portal_trace_context.etapas.slice()
  };
}
