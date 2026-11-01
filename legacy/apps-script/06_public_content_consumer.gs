/**
 * Consumo read-only do CMS editorial publico do Portal GEAPA.
 *
 * A estrutura e a sanitizacao principal pertencem ao GEAPA-CORE. O portal
 * apenas chama o contrato publico do CORE, aplica cache curto e devolve um
 * envelope padrao para o front-end. Nao cria planilhas, abas ou Registry.
 */

var PORTAL_CONTEUDO_PUBLICO_CACHE_KEY = 'portal:conteudoPublico:snapshot:v1';

/**
 * Retorna o snapshot publico editorial ja sanitizado pelo GEAPA-CORE.
 *
 * Esta acao e publica porque o CORE ja filtra apenas conteudo publicavel. Ela
 * nao deve incluir atividades, apresentacoes, dados de membros, permissoes,
 * frequencia ou diretoria oficial.
 *
 * @param {Object=} options Opcoes operacionais. Use forceRefresh em testes.
 * @return {Object} Resposta padronizada da API do portal.
 */
function portalConteudoPublicoSnapshot(options) {
  var inicio = portalAgoraConteudoPublicoMs_();
  var opts = options || {};

  if (!opts.forceRefresh) {
    var cache = portalLerConteudoPublicoCache_();
    if (cache) {
      return portalRespostaOk_(
        'CONTEUDO_PUBLICO_CACHE',
        'Conteudo publico carregado em cache temporario.',
        cache,
        portalMetaConteudoPublico_('cache', inicio)
      );
    }
  }

  var respostaCore = portalChamarCoreConteudoPublicoSnapshot_(opts);
  var normalizada = portalNormalizarSnapshotConteudoPublico_(respostaCore);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarConteudoPublicoCache_(normalizada.data);

  return portalRespostaOk_(
    'CONTEUDO_PUBLICO_CORE',
    'Conteudo publico carregado pelo GEAPA-CORE.',
    normalizada.data,
    portalMetaConteudoPublico_('geapa-core', inicio, normalizada.meta)
  );
}

/**
 * Diagnostico manual da integracao com o CMS publico no GEAPA-CORE.
 *
 * Nao expor como fluxo visual. Use pelo editor do Apps Script para conferir se
 * a Library e as keys PORTAL_PUBLIC_* estao disponiveis.
 *
 * @return {Object} Diagnostico seguro.
 */
function portalConteudoPublicoDiagnostics() {
  var resultado = {
    ok: false,
    coreDisponivel: portalCoreConteudoPublicoDisponivel_(),
    snapshotDisponivel: false,
    diagnosticsDisponivel: false,
    diagnostics: null,
    snapshotResumo: null
  };

  if (!resultado.coreDisponivel) {
    resultado.message = 'GEAPA_CORE.corePortalPublicContentBuildPublicSnapshot nao esta disponivel.';
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  resultado.snapshotDisponivel = true;

  if (
    typeof GEAPA_CORE !== 'undefined' &&
    typeof GEAPA_CORE.corePortalPublicContentDiagnostics === 'function'
  ) {
    resultado.diagnosticsDisponivel = true;
    resultado.diagnostics = GEAPA_CORE.corePortalPublicContentDiagnostics();
  }

  var snapshot = portalChamarCoreConteudoPublicoSnapshot_({ forceRefresh: true });
  var normalizado = portalNormalizarSnapshotConteudoPublico_(snapshot);
  resultado.ok = normalizado.ok;
  resultado.snapshotResumo = normalizado.ok
    ? portalResumoSnapshotConteudoPublico_(normalizado.data)
    : normalizado.resposta;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function portalChamarCoreConteudoPublicoSnapshot_(options) {
  if (!portalCoreConteudoPublicoDisponivel_()) {
    return null;
  }

  var resposta = GEAPA_CORE.corePortalPublicContentBuildPublicSnapshot(options || {});

  if (resposta && resposta.ok === true) {
    return resposta;
  }

  return portalChamarCoreConteudoPublicoSnapshotParcial_(resposta, options || {});
}

function portalCoreConteudoPublicoDisponivel_() {
  return (
    typeof GEAPA_CORE !== 'undefined' &&
    typeof GEAPA_CORE.corePortalPublicContentBuildPublicSnapshot === 'function'
  );
}

function portalChamarCoreConteudoPublicoSnapshotParcial_(respostaOriginal, options) {
  var avisos = [];
  var data = {
    pages: {},
    documents: [],
    media: [],
    config: {},
    boardComplements: [],
    peopleComplements: [],
    managementComplements: [],
    peopleConfig: {}
  };

  portalCopiarPaginaCoreConteudoPublico_(
    data.pages,
    'home',
    'corePortalPublicContentGetHome',
    avisos,
    options
  );
  portalCopiarPaginaCoreConteudoPublico_(
    data.pages,
    'sobre',
    'corePortalPublicContentGetSobre',
    avisos,
    options
  );
  portalCopiarPaginaCoreConteudoPublico_(
    data.pages,
    'historia',
    'corePortalPublicContentGetHistoria',
    avisos,
    options
  );
  portalCopiarPaginaCoreConteudoPublico_(
    data.pages,
    'parceiros',
    'corePortalPublicContentGetParceiros',
    avisos,
    options
  );

  data.documents = portalChamarCoreListaConteudoPublico_(
    'corePortalPublicContentGetDocumentos',
    avisos,
    options
  );
  data.media = portalChamarCoreListaConteudoPublico_(
    'corePortalPublicContentGetMidias',
    avisos,
    options
  );
  data.config = portalChamarCoreObjetoConteudoPublico_(
    'corePortalPublicContentGetConfig',
    avisos,
    options
  );
  data.boardComplements = portalChamarCoreListaConteudoPublico_(
    'corePortalPublicContentGetDiretoriaComplementos',
    avisos,
    options
  );
  data.peopleComplements = portalChamarCoreListaConteudoPublico_(
    'corePortalPublicContentGetPessoasComplementos',
    avisos,
    options
  );
  data.managementComplements = portalChamarCoreListaConteudoPublico_(
    'corePortalPublicContentGetGestoesComplementos',
    avisos,
    options
  );
  data.peopleConfig = portalChamarCoreObjetoConteudoPublico_(
    'corePortalPublicContentGetPessoasConfig',
    avisos,
    options
  );

  if (!Object.keys(data.pages).length && !data.documents.length && !data.media.length) {
    return respostaOriginal;
  }

  return {
    ok: true,
    data: data,
    meta: {
      origem: 'GEAPA_CORE_PARCIAL',
      fonte: 'PORTAL_CONTEUDO_PUBLICO',
      avisos: avisos,
      erroSnapshotCompleto: respostaOriginal ? {
        code: respostaOriginal.code || respostaOriginal.errorCode || '',
        message: respostaOriginal.message || ''
      } : null
    }
  };
}

function portalCopiarPaginaCoreConteudoPublico_(pages, slug, functionName, avisos, options) {
  var data = portalChamarCoreObjetoConteudoPublico_(functionName, avisos, options);

  if (data && Object.keys(data).length) {
    pages[slug] = data;
  }
}

function portalChamarCoreListaConteudoPublico_(functionName, avisos, options) {
  var data = portalChamarCoreObjetoConteudoPublico_(functionName, avisos, options);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.itens)) {
    return data.itens;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  if (data && Array.isArray(data.blocos)) {
    return data.blocos;
  }

  return [];
}

function portalChamarCoreObjetoConteudoPublico_(functionName, avisos, options) {
  if (
    typeof GEAPA_CORE === 'undefined' ||
    typeof GEAPA_CORE[functionName] !== 'function'
  ) {
    avisos.push(functionName + ': indisponivel');
    return {};
  }

  try {
    var resposta = GEAPA_CORE[functionName](options || {});

    if (!resposta) {
      avisos.push(functionName + ': resposta vazia');
      return {};
    }

    if (resposta.ok === false) {
      avisos.push(functionName + ': ' + (resposta.code || resposta.errorCode || 'erro'));
      return {};
    }

    return resposta.data || resposta;
  } catch (erro) {
    avisos.push(functionName + ': ' + (erro && erro.message ? erro.message : String(erro)));
    return {};
  }
}

function portalNormalizarSnapshotConteudoPublico_(respostaCore) {
  if (!respostaCore) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'CONTEUDO_PUBLICO_CORE_INDISPONIVEL',
        'O contrato de conteudo publico do GEAPA-CORE ainda nao esta disponivel.',
        {}
      )
    };
  }

  if (respostaCore.ok !== true) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        respostaCore.errorCode || respostaCore.code || 'CONTEUDO_PUBLICO_CORE_ERRO',
        respostaCore.message || 'Nao foi possivel carregar o conteudo publico.',
        {}
      )
    };
  }

  var data = respostaCore.data || {};

  return {
    ok: true,
    data: {
      pages: data.pages || {},
      documents: Array.isArray(data.documents) ? data.documents : [],
      media: Array.isArray(data.media) ? data.media : [],
      config: data.config || {},
      boardComplements: Array.isArray(data.boardComplements)
        ? data.boardComplements
        : [],
      peopleComplements: Array.isArray(data.peopleComplements)
        ? data.peopleComplements
        : [],
      managementComplements: Array.isArray(data.managementComplements)
        ? data.managementComplements
        : [],
      peopleConfig: data.peopleConfig || {}
    },
    meta: respostaCore.meta || {}
  };
}

function portalResumoSnapshotConteudoPublico_(snapshot) {
  var dados = snapshot || {};
  var pages = dados.pages || {};

  return {
    pages: Object.keys(pages),
    blocosHome: portalContarArrayConteudoPublico_(pages.home && pages.home.blocos),
    blocosSobre: portalContarArrayConteudoPublico_(pages.sobre && pages.sobre.blocos),
    marcosHistoria: portalContarArrayConteudoPublico_(pages.historia && pages.historia.marcos),
    parceiros: portalContarArrayConteudoPublico_(pages.parceiros && pages.parceiros.itens),
    documentos: portalContarArrayConteudoPublico_(dados.documents),
    midias: portalContarArrayConteudoPublico_(dados.media),
    complementosDiretoria: portalContarArrayConteudoPublico_(dados.boardComplements),
    complementosPessoas: portalContarArrayConteudoPublico_(dados.peopleComplements),
    complementosGestoes: portalContarArrayConteudoPublico_(dados.managementComplements),
    configKeys: dados.config ? Object.keys(dados.config).length : 0
  };
}

function portalContarArrayConteudoPublico_(valor) {
  return Array.isArray(valor) ? valor.length : 0;
}

function portalLerConteudoPublicoCache_() {
  var bruto = CacheService.getScriptCache().get(PORTAL_CONTEUDO_PUBLICO_CACHE_KEY);

  if (!bruto) {
    return null;
  }

  try {
    return JSON.parse(bruto);
  } catch (erro) {
    return null;
  }
}

function portalSalvarConteudoPublicoCache_(snapshot) {
  var segundos = PORTAL_CONFIG.cacheConteudoPublicoSegundos || 0;

  if (!segundos || !snapshot) {
    return;
  }

  try {
    CacheService.getScriptCache().put(
      PORTAL_CONTEUDO_PUBLICO_CACHE_KEY,
      JSON.stringify(snapshot),
      segundos
    );
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalMetaConteudoPublico_(origem, inicioMs, metaCore) {
  return {
    desempenho: {
      origemDados: origem,
      tempoMs: Math.max(portalAgoraConteudoPublicoMs_() - inicioMs, 0),
      cacheConteudoPublicoSegundos: PORTAL_CONFIG.cacheConteudoPublicoSegundos
    },
    conteudoPublico: {
      origemDados: origem,
      core: metaCore || null
    }
  };
}

function portalAgoraConteudoPublicoMs_() {
  return new Date().getTime();
}
