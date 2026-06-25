/**
 * Integracao de leitura do modulo GEAPA Atividades para o Portal GEAPA.
 *
 * Esta camada nao cria, edita, registra chamada nem justifica falta. Ela apenas
 * valida a sessao do portal e chama o contrato publico seguro do modulo
 * geapa-atividades.
 */

/**
 * Lista atividades visiveis para o membro autenticado.
 *
 * @param {string} token Token temporario do portal.
 * @return {Object} Resposta padronizada da API.
 */
function portalListarAtividades(token) {
  var inicio = portalAgoraAtividadesMs_();
  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_(
    'atividadesLista:v2',
    contexto.identificadorSessao + ':' + contexto.contextoAtividades.perfil
  );
  var cache = portalLerJsonCache_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'ATIVIDADES_CACHE',
      'Atividades carregadas em cache temporário.',
      cache,
      portalMetaAtividades_('cache', inicio)
    );
  }

  var resposta = portalChamarAtividadesListar_(contexto.contextoAtividades);
  var normalizada = portalNormalizarRespostaAtividades_(resposta);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarJsonCache_(cacheKey, normalizada.data, PORTAL_CONFIG.cacheAtividadesSegundos);

  return portalRespostaOk_(
    'ATIVIDADES_CARREGADAS',
    'Atividades carregadas pelo módulo GEAPA Atividades.',
    normalizada.data,
    portalMetaAtividades_('geapa-atividades', inicio)
  );
}

/**
 * Carrega a lista e os detalhes seguros de atividades em uma unica chamada.
 *
 * Quando o modulo geapa-atividades expuser o bundle v2, ele e usado como fonte
 * preferencial. Se o contrato ainda nao existir no ambiente atual, o portal
 * monta o mesmo envelope usando os endpoints antigos de lista e detalhe.
 *
 * @param {string} token Token temporario do portal.
 * @return {Object} Resposta padronizada da API.
 */
function portalAtividadesBundle(token) {
  var inicio = portalAgoraAtividadesMs_();
  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_(
    'atividadesBundle',
    contexto.identificadorSessao + ':' + contexto.contextoAtividades.perfil
  );
  var cache = portalLerJsonCache_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'ATIVIDADES_BUNDLE_CACHE',
      'Atividades carregadas em cache temporario.',
      cache,
      portalMetaAtividades_('cache', inicio)
    );
  }

  var respostaBundle = portalChamarAtividadesBundle_(contexto.contextoAtividades);
  var normalizada = portalNormalizarRespostaBundleAtividades_(respostaBundle);

  if (!normalizada.ok) {
    normalizada = portalMontarBundleAtividadesFallback_(token);
  }

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarJsonCache_(cacheKey, normalizada.data, PORTAL_CONFIG.cacheAtividadesSegundos);

  return portalRespostaOk_(
    normalizada.code || 'ATIVIDADES_BUNDLE_CARREGADO',
    normalizada.message || 'Atividades carregadas em pacote unico.',
    normalizada.data,
    portalMetaAtividades_(normalizada.origem || 'geapa-atividades-bundle', inicio)
  );
}

/**
 * Carrega detalhes por atividade para preload assÃ­ncrono do front-end.
 *
 * A lista inicial da aba Atividades deve usar `portalListarAtividades`. Este
 * endpoint existe para aquecer o cache de detalhes sem bloquear a primeira
 * renderizacao da tela.
 *
 * @param {string} token Token temporario do portal.
 * @return {Object} Resposta padronizada da API.
 */
function portalPrecarregarDetalhesAtividades(token) {
  var inicio = portalAgoraAtividadesMs_();
  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_(
    'atividadesDetalhesPreload',
    contexto.identificadorSessao + ':' + contexto.contextoAtividades.perfil
  );
  var cache = portalLerJsonCache_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'ATIVIDADES_DETALHES_PRELOAD_CACHE',
      'Detalhes de atividades carregados em cache temporario.',
      cache,
      portalMetaAtividades_('cache', inicio)
    );
  }

  var resposta = portalChamarAtividadesDetalhesPreload_(contexto.contextoAtividades);
  var normalizada = portalNormalizarRespostaDetalhesPreload_(resposta);

  if (!normalizada.ok) {
    return portalRespostaErro_(
      'ATIVIDADES_DETALHES_INDISPONIVEIS',
      'Preload leve de detalhes ainda nao esta disponivel.',
      {}
    );
  }

  portalSalvarJsonCache_(cacheKey, normalizada.data, PORTAL_CONFIG.cacheAtividadesSegundos);

  return portalRespostaOk_(
    'ATIVIDADES_DETALHES_PRELOAD_CARREGADO',
    'Detalhes de atividades carregados para preload.',
    normalizada.data,
    portalMetaAtividades_(normalizada.origem || 'geapa-atividades-detalhes', inicio)
  );
}

/**
 * Carrega detalhes seguros de uma atividade visivel ao membro autenticado.
 *
 * @param {string} token Token temporario do portal.
 * @param {string} idAtividade ID da atividade.
 * @return {Object} Resposta padronizada da API.
 */
function portalDetalheAtividade(token, idAtividade) {
  var inicio = portalAgoraAtividadesMs_();
  var atividadeId = String(idAtividade || '').trim();

  if (!atividadeId) {
    return portalRespostaErro_(
      'ID_ATIVIDADE_OBRIGATORIO',
      'Informe a atividade para consulta.',
      {}
    );
  }

  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_(
    'atividadeDetalhe',
    contexto.identificadorSessao + ':' + atividadeId
  );
  var cache = portalLerJsonCache_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'ATIVIDADE_DETALHE_CACHE',
      'Detalhes da atividade carregados em cache temporário.',
      cache,
      portalMetaAtividades_('cache', inicio)
    );
  }

  var resposta = portalChamarAtividadesDetalhe_(
    atividadeId,
    contexto.contextoAtividades
  );
  var normalizada = portalNormalizarRespostaAtividades_(resposta);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarJsonCache_(cacheKey, normalizada.data, PORTAL_CONFIG.cacheAtividadesSegundos);

  return portalRespostaOk_(
    'ATIVIDADE_DETALHE_CARREGADO',
    'Detalhes da atividade carregados pelo módulo GEAPA Atividades.',
    normalizada.data,
    portalMetaAtividades_('geapa-atividades', inicio)
  );
}

/**
 * Busca a tela operacional de chamada para uma atividade.
 *
 * A permissao real e validada no modulo geapa-atividades. O portal apenas
 * valida a sessao e repassa contexto seguro do usuario atual.
 *
 * @param {string} token Token temporario do portal.
 * @param {string} idAtividade ID da atividade.
 * @return {Object} Resposta padronizada da API.
 */
function portalBuscarChamadaAtividade(token, idAtividade) {
  var inicio = portalAgoraAtividadesMs_();
  var atividadeId = String(idAtividade || '').trim();

  if (!atividadeId) {
    return portalRespostaErro_(
      'ID_ATIVIDADE_OBRIGATORIO',
      'Informe a atividade para chamada.',
      {}
    );
  }

  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var resposta = portalChamarAtividadesChamada_(
    atividadeId,
    contexto.contextoAtividades
  );
  var normalizada = portalNormalizarRespostaObjetoAtividades_(resposta);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  return portalRespostaOk_(
    'ATIVIDADE_CHAMADA_CARREGADA',
    'Chamada carregada pelo modulo GEAPA Atividades.',
    normalizada.data,
    portalMetaAtividades_('geapa-atividades-chamada', inicio)
  );
}

/**
 * Salva a chamada de uma atividade na base v2 DEV via modulo geapa-atividades.
 *
 * @param {string} token Token temporario do portal.
 * @param {string|Object} payloadJson Payload JSON enviado pelo front-end.
 * @return {Object} Resposta padronizada da API.
 */
function portalSalvarChamadaAtividade(token, payloadJson) {
  var inicio = portalAgoraAtividadesMs_();
  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var payload = portalLerPayloadJson_(payloadJson);

  if (!payload.ok) {
    return payload.resposta;
  }

  var resposta = portalChamarAtividadesSalvarChamada_(
    payload.data,
    contexto.contextoAtividades
  );
  var normalizada = portalNormalizarRespostaObjetoAtividades_(resposta);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalInvalidarCachesAtividadesAposChamada_(contexto, payload.data);

  return portalRespostaOk_(
    'ATIVIDADE_CHAMADA_SALVA',
    normalizada.message || 'Chamada salva com sucesso na base DEV.',
    normalizada.data,
    portalMetaAtividades_('geapa-atividades-chamada', inicio)
  );
}

/**
 * Cria uma atividade como rascunho seguro via modulo geapa-atividades.
 *
 * A permissao real, a geracao de ID, os defaults de status/visibilidade e a
 * escrita na base operacional pertencem ao modulo Atividades. O Portal apenas
 * valida sessao, repassa contexto seguro e limpa caches locais apos criacao
 * real.
 *
 * @param {string} token Token temporario do portal.
 * @param {string|Object} payloadJson Payload JSON enviado pelo front-end.
 * @return {Object} Resposta padronizada da API.
 */
function portalCriarAtividade(token, payloadJson) {
  var inicio = portalAgoraAtividadesMs_();
  var contexto = portalMontarContextoAtividades_(token);
  var meta;

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var payload = portalLerPayloadJson_(payloadJson);

  if (!payload.ok) {
    return payload.resposta;
  }

  var resposta = portalChamarAtividadesCriar_(
    payload.data,
    contexto.contextoAtividades
  );
  var normalizada = portalNormalizarRespostaObjetoAtividades_(resposta);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  if (payload.data && payload.data.dryRun === false) {
    portalInvalidarCachesAtividadesAposCriacao_(contexto);
  }

  meta = portalMetaAtividades_('geapa-atividades-criar', inicio);
  meta.avisos = normalizada.avisos || [];

  return portalRespostaOk_(
    payload.data && payload.data.dryRun === false
      ? 'ATIVIDADE_CRIADA'
      : 'ATIVIDADE_PREVIA_VALIDADA',
    normalizada.message || (payload.data && payload.data.dryRun === false
      ? 'Atividade criada como rascunho.'
      : 'Previa de atividade validada.'),
    normalizada.data,
    meta
  );
}

function portalInvalidarCachesAtividadesAposChamada_(contexto, payload) {
  var operacao = String((payload || {}).operacao || '').trim().toUpperCase();
  var identificador = contexto && contexto.identificadorSessao;
  var perfilAtividades = contexto && contexto.contextoAtividades
    ? contexto.contextoAtividades.perfil
    : 'MEMBRO';

  if (['FINALIZAR', 'REABRIR'].indexOf(operacao) < 0 || !identificador) {
    return;
  }

  try {
    CacheService.getScriptCache().removeAll([
      portalCacheKey_('viewsV2r2:minhasJustificativas', identificador),
      portalCacheKey_('viewsV2r2:minhaFrequencia', identificador),
      portalCacheKey_('viewsV2r2:justificativasPendenciasDiretoria', identificador),
      portalCacheKey_('viewsV2r2:pendenciasDiretoria', identificador),
      portalCacheKey_('viewsV2r1:painelDiretoriaV2', identificador),
      portalCacheKey_('atividadesLista:v2', identificador + ':' + perfilAtividades),
      portalCacheKey_('atividadesBundle', identificador + ':' + perfilAtividades),
      portalCacheKey_('atividadesDetalhesPreload', identificador + ':' + perfilAtividades)
    ]);
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalInvalidarCachesAtividadesAposCriacao_(contexto) {
  var identificador = contexto && contexto.identificadorSessao;
  var perfilAtividades = contexto && contexto.contextoAtividades
    ? contexto.contextoAtividades.perfil
    : 'MEMBRO';

  if (!identificador) {
    return;
  }

  try {
    CacheService.getScriptCache().removeAll([
      portalCacheKey_('atividadesLista:v2', identificador + ':' + perfilAtividades),
      portalCacheKey_('atividadesBundle', identificador + ':' + perfilAtividades),
      portalCacheKey_('atividadesDetalhesPreload', identificador + ':' + perfilAtividades)
    ]);
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalMontarContextoAtividades_(token) {
  var tokenNormalizado = String(token || '').trim();

  if (!tokenNormalizado) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'SESSAO_OBRIGATORIA',
        'Entre no portal para consultar atividades.',
        {}
      )
    };
  }

  if (!portalSessaoTemporariaValida_(tokenNormalizado)) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'SESSAO_INVALIDA_OU_EXPIRADA',
        'Sessão inválida ou expirada. Entre novamente.',
        {}
      )
    };
  }

  var identificadorSessao = portalGetIdentificadorSessao_(tokenNormalizado);
  var situacao = portalLerMinhaSituacaoCache_(identificadorSessao);
  var sessao = situacao ? portalExtrairSessaoMinhaSituacao_(situacao) : null;

  if (!situacao) {
    situacao = portalBuscarMinhaSituacaoViaGeapaCore_(identificadorSessao);

    if (situacao) {
      portalSalvarMinhaSituacaoCache_(identificadorSessao, situacao);
      sessao = portalExtrairSessaoMinhaSituacao_(situacao);
    }
  }

  if (!sessao) {
    sessao = portalResolverSessaoAtualViaGeapaCore_(identificadorSessao, {
      origem: 'atividades'
    });
  }

  var membro = portalMontarMembroDeSessaoPortal_(sessao, 'GEAPA_CORE.session') ||
    portalBuscarMembroPorIdentificadorSessao_(identificadorSessao) ||
    {};
  var usuario = situacao && situacao.usuario
    ? situacao.usuario
    : portalMontarUsuarioDeSessao_(sessao, membro) ||
      portalMontarUsuarioBasico_(membro);
  var perfilAtividades = portalResolverPerfilAtividades_(usuario);
  var perfisPortal = portalListarPerfisAtividades_(usuario, sessao);
  var permissoes = portalListarPermissoesAtividades_(usuario, sessao);

  return {
    ok: true,
    identificadorSessao: identificadorSessao,
    contextoAtividades: {
      perfil: perfilAtividades,
      idPessoa: String(usuario.idPessoa || (sessao && sessao.idPessoa) || membro.idPessoa || '').trim(),
      rga: String(membro.rga || '').trim(),
      email: String(usuario.email || membro.emailCadastrado || identificadorSessao || '').trim(),
      perfilPortalEfetivo: String((sessao && sessao.perfilPortalEfetivo) || usuario.perfilPortalEfetivo || usuario.perfilPrincipal || '').trim(),
      perfisPortal: perfisPortal,
      permissoes: permissoes,
      somenteVisiveis: perfilAtividades === 'MEMBRO'
    }
  };
}

/**
 * Resolve o perfil entendido pelo modulo geapa-atividades.
 *
 * O Core trabalha com perfis mais ricos, como PRESIDENCIA e SECRETARIA. O
 * modulo de Atividades recebe um perfil operacional menor e continua validando
 * as permissoes reais no backend.
 *
 * @param {Object} usuario Usuario normalizado da sessao.
 * @return {string} Perfil esperado pelo modulo de Atividades.
 */
function portalResolverPerfilAtividades_(usuario) {
  var dados = usuario || {};
  var perfis = Array.isArray(dados.perfis) && dados.perfis.length
    ? dados.perfis
    : (Array.isArray(dados.perfisPortal) ? dados.perfisPortal : []);
  var permissoes = dados.permissoes || {};

  if (
    portalUsuarioTemPerfil_(perfis, 'ADMIN') ||
    portalUsuarioTemPerfil_(perfis, 'ADMIN_TECNICO') ||
    permissoes['sistema:admin'] === true ||
    permissoes.podeGerenciarConfiguracoes === true
  ) {
    return 'ADMIN_TECNICO';
  }

  if (portalUsuarioTemPerfil_(perfis, 'SECRETARIA')) {
    return 'SECRETARIO';
  }

  if (
    portalUsuarioTemPerfil_(perfis, 'DIRETORIA') ||
    portalUsuarioTemPerfil_(perfis, 'PRESIDENCIA') ||
    permissoes['atividades:gerir'] === true ||
    permissoes.podeGerenciarAtividades === true
  ) {
    return 'DIRETORIA';
  }

  return 'MEMBRO';
}

function portalListarPerfisAtividades_(usuario, sessao) {
  var fonte = Array.isArray(usuario && usuario.perfisPortal) && usuario.perfisPortal.length
    ? usuario.perfisPortal
    : (Array.isArray(usuario && usuario.perfis) && usuario.perfis.length
      ? usuario.perfis
      : (Array.isArray(sessao && sessao.perfisPortal) ? sessao.perfisPortal : []));

  return portalUnicos_(fonte.map(function normalizar(perfil) {
    return String(perfil || '').trim().toUpperCase();
  }).filter(Boolean));
}

function portalListarPermissoesAtividades_(usuario, sessao) {
  var permissoes = usuario && usuario.permissoes ? usuario.permissoes : {};
  var lista = Array.isArray(sessao && sessao.permissoes) ? sessao.permissoes.slice() : [];
  var mapa = {};

  lista.forEach(function guardar(permissao) {
    var chave = String(permissao || '').trim();
    if (chave) {
      mapa[chave] = true;
    }
  });

  Object.keys(permissoes || {}).forEach(function copiar(chave) {
    if (permissoes[chave] === true) {
      mapa[chave] = true;
    }
  });

  return Object.keys(mapa);
}

/**
 * Verifica se o usuario possui um perfil.
 *
 * @param {string[]} perfis Perfis normalizados.
 * @param {string} perfil Perfil desejado.
 * @return {boolean} Resultado.
 */
function portalUsuarioTemPerfil_(perfis, perfil) {
  var desejado = String(perfil || '').trim().toUpperCase();

  for (var i = 0; i < perfis.length; i++) {
    if (String(perfis[i] || '').trim().toUpperCase() === desejado) {
      return true;
    }
  }

  return false;
}

function portalChamarAtividadesListar_(contexto) {
  if (typeof atividades_listarParaPortal === 'function') {
    return atividades_listarParaPortal(contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividades_listarParaPortal === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividades_listarParaPortal(contexto);
  }

  return null;
}

function portalChamarAtividadesDetalhe_(idAtividade, contexto) {
  if (typeof atividades_buscarDetalheParaPortal === 'function') {
    return atividades_buscarDetalheParaPortal(idAtividade, contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividades_buscarDetalheParaPortal === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividades_buscarDetalheParaPortal(idAtividade, contexto);
  }

  return null;
}

function portalChamarAtividadesChamada_(idAtividade, contexto) {
  if (typeof atividadesV2_portalGetChamada === 'function') {
    return atividadesV2_portalGetChamada(idAtividade, contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalGetChamada === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalGetChamada(idAtividade, contexto);
  }

  return null;
}

function portalChamarAtividadesSalvarChamada_(payload, contexto) {
  if (typeof atividadesV2_portalSalvarChamada === 'function') {
    return atividadesV2_portalSalvarChamada(payload, contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalSalvarChamada === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalSalvarChamada(payload, contexto);
  }

  return null;
}

function portalChamarAtividadesCriar_(payload, contexto) {
  if (typeof atividadesV2_portalCriarAtividade === 'function') {
    return atividadesV2_portalCriarAtividade(payload, contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalCriarAtividade === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalCriarAtividade(payload, contexto);
  }

  return null;
}

function portalChamarAtividadesBundle_(contexto) {
  if (typeof atividadesV2_portalGetAtividadesBundle === 'function') {
    return atividadesV2_portalGetAtividadesBundle(contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalGetAtividadesBundle === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalGetAtividadesBundle(contexto);
  }

  return null;
}

function portalChamarAtividadesDetalhesPreload_(contexto) {
  if (typeof atividadesV2_portalGetAtividadesDetalhes === 'function') {
    return atividadesV2_portalGetAtividadesDetalhes(contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalGetAtividadesDetalhes === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalGetAtividadesDetalhes(contexto);
  }

  return null;
}

function portalNormalizarRespostaAtividades_(resposta) {
  if (!resposta) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'ATIVIDADES_INDISPONIVEIS',
        'A integração de atividades ainda não está disponível.',
        {}
      )
    };
  }

  if (resposta.ok !== true) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.errorCode || 'ERRO_ATIVIDADES',
        resposta.message || 'Não foi possível consultar atividades.',
        {}
      )
    };
  }

  return {
    ok: true,
    data: resposta.data || []
  };
}

function portalNormalizarRespostaObjetoAtividades_(resposta) {
  if (!resposta) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'ATIVIDADES_INDISPONIVEIS',
        'A integracao de atividades ainda nao esta disponivel.',
        {}
      )
    };
  }

  if (resposta.ok !== true) {
    var dadosErro = resposta.data || {};

    if (resposta.fieldErrors && !dadosErro.fieldErrors) {
      dadosErro.fieldErrors = resposta.fieldErrors;
    }

    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.errorCode || 'ERRO_ATIVIDADES',
        resposta.message || 'Nao foi possivel consultar atividades.',
        dadosErro
      )
    };
  }

  var dados = resposta.data || {};

  if (resposta.performance && !dados.performance) {
    dados.performance = resposta.performance;
  }

  if (resposta.escrita && !dados.escrita) {
    dados.escrita = resposta.escrita;
  }

  return {
    ok: true,
    message: resposta.message || '',
    data: dados,
    avisos: resposta.avisos ||
      (resposta.meta && resposta.meta.avisos) ||
      (dados.meta && dados.meta.avisos) ||
      []
  };
}

function portalLerPayloadJson_(payloadJson) {
  if (payloadJson && typeof payloadJson === 'object') {
    return {
      ok: true,
      data: payloadJson
    };
  }

  var bruto = String(payloadJson || '').trim();

  if (!bruto) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'PAYLOAD_OBRIGATORIO',
        'Informe os dados da chamada.',
        {}
      )
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(bruto)
    };
  } catch (erro) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'PAYLOAD_INVALIDO',
        'Os dados da chamada estao em formato invalido.',
        {}
      )
    };
  }
}

function portalNormalizarRespostaDetalhesPreload_(resposta) {
  if (!resposta || resposta.ok !== true) {
    return {
      ok: false
    };
  }

  var dados = resposta.data || resposta.dados || resposta || {};
  var detalhesPorId = portalNormalizarDetalhesPorIdAtividades_(dados.detalhesPorId || dados.detalhes);

  return {
    ok: true,
    origem: dados.detalhesPorId || dados.detalhes
      ? 'geapa-atividades-detalhes'
      : 'geapa-atividades-bundle',
    data: {
      detalhesPorId: detalhesPorId,
      ultimaAtualizacao: dados.ultimaAtualizacao || new Date().toISOString()
    }
  };
}

function portalNormalizarRespostaBundleAtividades_(resposta) {
  if (!resposta || resposta.ok !== true) {
    return {
      ok: false
    };
  }

  var dados = resposta.data || resposta.dados || resposta || {};
  var calendario = Array.isArray(dados)
    ? dados
    : (Array.isArray(dados.calendario) ? dados.calendario : []);
  var detalhesPorId = portalNormalizarDetalhesPorIdAtividades_(dados.detalhesPorId);

  return {
    ok: true,
    code: 'ATIVIDADES_BUNDLE_CARREGADO',
    message: resposta.message || 'Atividades carregadas em pacote unico.',
    origem: 'geapa-atividades-bundle',
    data: {
      modo: dados.modo || 'LEVE',
      calendario: calendario,
      detalhesPorId: detalhesPorId,
      ultimaAtualizacao: dados.ultimaAtualizacao || new Date().toISOString()
    }
  };
}

function portalNormalizarDetalhesPorIdAtividades_(valor) {
  var detalhes = {};

  if (Array.isArray(valor)) {
    valor.forEach(function guardarDetalhe(item) {
      if (item && item.idAtividade) {
        detalhes[item.idAtividade] = item;
      }
    });
    return detalhes;
  }

  if (valor && typeof valor === 'object') {
    Object.keys(valor).forEach(function copiarDetalhe(idAtividade) {
      if (valor[idAtividade]) {
        detalhes[idAtividade] = valor[idAtividade];
      }
    });
  }

  return detalhes;
}

function portalMontarBundleAtividadesFallback_(token) {
  var lista = portalListarAtividades(token);

  if (!lista || lista.ok !== true) {
    return {
      ok: false,
      resposta: lista || portalRespostaErro_(
        'ATIVIDADES_INDISPONIVEIS',
        'A integracao de atividades ainda nao esta disponivel.',
        {}
      )
    };
  }

  var calendario = Array.isArray(lista.data) ? lista.data : [];

  return {
    ok: true,
    code: 'ATIVIDADES_BUNDLE_FALLBACK',
    message: 'Atividades carregadas por fallback de lista.',
    origem: 'fallback-lista',
    data: {
      calendario: calendario,
      detalhesPorId: {},
      ultimaAtualizacao: new Date().toISOString()
    }
  };
}

function portalLerJsonCache_(chave) {
  var bruto = CacheService.getScriptCache().get(chave);

  if (!bruto) {
    return null;
  }

  try {
    return JSON.parse(bruto);
  } catch (erro) {
    return null;
  }
}

function portalSalvarJsonCache_(chave, valor, segundos) {
  if (!segundos || !chave) {
    return;
  }

  try {
    CacheService.getScriptCache().put(chave, JSON.stringify(valor), segundos);
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalMetaAtividades_(origem, inicioMs) {
  var inicio = Number(inicioMs) || portalAgoraAtividadesMs_();

  return {
    desempenho: {
      origemDados: origem,
      tempoMs: Math.max(portalAgoraAtividadesMs_() - inicio, 0),
      cacheAtividadesSegundos: PORTAL_CONFIG.cacheAtividadesSegundos
    },
    atividades: {
      origemDados: origem,
      cacheSegundos: PORTAL_CONFIG.cacheAtividadesSegundos
    }
  };
}

function portalAgoraAtividadesMs_() {
  return new Date().getTime();
}
