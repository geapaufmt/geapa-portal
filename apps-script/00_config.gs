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
    }),
    firebaseProjectIdByEnvironment: Object.freeze({
      DEV: 'GEAPA_FIREBASE_DEV_PROJECT_ID',
      PROD: 'GEAPA_FIREBASE_PROD_PROJECT_ID'
    }),
    coreFirestoreProjectIdByEnvironment: Object.freeze({
      DEV: 'GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID',
      PROD: 'GEAPA_CORE_FIRESTORE_PROD_PROJECT_ID'
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

function portalLatencyDevActionEligible_(acao) {
  return [
    'apresentacaoEnviarTituloEixo',
    'apresentacaoRevisarTituloEixo',
    'apresentacaoReprovarTituloEixo'
  ].indexOf(String(acao || '').trim()) >= 0;
}

function portalLatencyDevSafeMetadata_(metadata) {
  var source = metadata || {};
  var safe = {};
  [
    'cache', 'durationMs', 'callCount', 'operation', 'httpStatus',
    'readCount', 'libraryCallCount', 'result'
  ].forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    var value = source[key];
    if (typeof value === 'number') {
      safe[key] = Math.max(0, Math.round(value));
      return;
    }
    if (typeof value === 'boolean') {
      safe[key] = value;
      return;
    }
    safe[key] = String(value || '').slice(0, 80);
  });
  return safe;
}

function portalLatencyDevLog_(code, label, atMs, metadata) {
  if (!__portal_trace_context ||
      __portal_trace_context.ambiente !== 'DEV' ||
      !__portal_trace_context.latencyDurable) return;
  var now = Number(atMs || new Date().getTime());
  var previous = Number(__portal_trace_context.latencyLastAtMs ||
    __portal_trace_context.inicioMs || now);
  var entry = Object.assign({
    event: 'GEAPA_PRESENTATIONS_DEV_LATENCY_V1',
    layer: 'PORTAL',
    requestId: __portal_trace_context.traceId,
    code: String(code || '').slice(0, 24),
    label: String(label || '').slice(0, 80),
    at: new Date(now).toISOString(),
    elapsedMs: Math.max(now - __portal_trace_context.inicioMs, 0),
    deltaMs: Math.max(now - previous, 0)
  }, portalLatencyDevSafeMetadata_(metadata));
  __portal_trace_context.latencyLastAtMs = now;
  try {
    console.log(JSON.stringify(entry));
  } catch (ignored) {}
}

function portalIniciarTrace_(acao, requestId, receivedAtMs, parsedAtMs) {
  var inicioMs = Number(receivedAtMs || new Date().getTime());
  var requestedTraceId = String(requestId || '').trim();
  var safeTraceId = /^[A-Za-z0-9][A-Za-z0-9._:-]{11,119}$/.test(
    requestedTraceId
  )
    ? requestedTraceId
    : 'PORTAL-' + Utilities.getUuid();
  __portal_trace_context = {
    traceId: safeTraceId.slice(0, 120),
    acao: String(acao || '').slice(0, 80),
    ambiente: portalResolverAmbienteDadosV2_(),
    inicioMs: inicioMs,
    latencyLastAtMs: inicioMs,
    latencyDurable: portalLatencyDevActionEligible_(acao),
    etapas: [],
    marcos: []
  };
  portalTraceMark_('B0', 'REQUEST_RECEBIDO', inicioMs);
  portalLatencyDevLog_('P0', 'PORTAL_REQUEST_RECEBIDO', inicioMs);
  portalLatencyDevLog_(
    'P1',
    'PORTAL_PARSING_CONCLUIDO',
    Number(parsedAtMs || new Date().getTime())
  );
  if (String(acao || '') === 'apresentacoesPendenciasDiretoria') {
    portalTraceMark_('G1', 'PORTAL_RECEBEU_REQUEST', inicioMs);
  }
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

function portalTraceMark_(code, label, atMs) {
  if (!__portal_trace_context || __portal_trace_context.ambiente !== 'DEV') return;
  var now = Number(atMs || new Date().getTime());
  __portal_trace_context.marcos.push({
    code: String(code || '').slice(0, 8),
    label: String(label || '').slice(0, 80),
    at: new Date(now).toISOString(),
    elapsedMs: Math.max(now - __portal_trace_context.inicioMs, 0)
  });
  if (/^B(?:0|1|2|9|10|11)$/.test(String(code || ''))) {
    portalLatencyDevLog_(code, label, now);
  }
}

function portalTraceImportMarks_(timing) {
  if (!__portal_trace_context || __portal_trace_context.ambiente !== 'DEV') return;
  var source = timing && Array.isArray(timing.marks) ? timing.marks : [];
  source.forEach(function(mark) {
    if (!/^B[3-8]$/.test(String(mark && mark.code || ''))) return;
    var parsed = new Date(String(mark.at || '')).getTime();
    portalTraceMark_(mark.code, mark.label, isNaN(parsed) ? null : parsed);
  });
}

function portalTraceImportManagementMarks_(timing) {
  if (!__portal_trace_context || __portal_trace_context.ambiente !== 'DEV') return;
  var source = timing && Array.isArray(timing.marks) ? timing.marks : [];
  source.forEach(function(mark) {
    if (!/^G(?:[4-9]|10|11)$/.test(String(mark && mark.code || ''))) return;
    var parsed = new Date(String(mark.at || '')).getTime();
    portalTraceMark_(mark.code, mark.label, isNaN(parsed) ? null : parsed);
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
    etapas: __portal_trace_context.etapas.slice(),
    marcos: __portal_trace_context.ambiente === 'DEV'
      ? __portal_trace_context.marcos.slice()
      : []
  };
}
