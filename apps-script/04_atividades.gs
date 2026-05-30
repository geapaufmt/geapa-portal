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
  var contexto = portalMontarContextoAtividades_(token);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_(
    'atividadesLista',
    contexto.identificadorSessao + ':' + contexto.contextoAtividades.perfil
  );
  var cache = portalLerJsonCache_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'ATIVIDADES_CACHE',
      'Atividades carregadas em cache temporário.',
      cache,
      portalMetaAtividades_('cache')
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
    portalMetaAtividades_('geapa-atividades')
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
      portalMetaAtividades_('cache')
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
    portalMetaAtividades_(normalizada.origem || 'geapa-atividades-bundle')
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
      portalMetaAtividades_('cache')
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
    portalMetaAtividades_(normalizada.origem || 'geapa-atividades-detalhes')
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
      portalMetaAtividades_('cache')
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
    portalMetaAtividades_('geapa-atividades')
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
    portalMetaAtividades_('geapa-atividades-chamada')
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

  return portalRespostaOk_(
    'ATIVIDADE_CHAMADA_SALVA',
    normalizada.message || 'Chamada salva com sucesso na base DEV.',
    normalizada.data,
    portalMetaAtividades_('geapa-atividades-chamada')
  );
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

  if (!situacao) {
    situacao = portalBuscarMinhaSituacaoViaGeapaCore_(identificadorSessao);

    if (situacao) {
      portalSalvarMinhaSituacaoCache_(identificadorSessao, situacao);
    }
  }

  var membro = portalBuscarMembroPorIdentificadorSessao_(identificadorSessao) || {};
  var usuario = situacao && situacao.usuario
    ? situacao.usuario
    : portalMontarUsuarioBasico_(membro);
  var perfilAtividades = portalResolverPerfilAtividades_(usuario);

  return {
    ok: true,
    identificadorSessao: identificadorSessao,
    contextoAtividades: {
      perfil: perfilAtividades,
      rga: String(membro.rga || '').trim(),
      email: String(membro.emailCadastrado || identificadorSessao || '').trim(),
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
  var perfis = Array.isArray(dados.perfis) ? dados.perfis : [];
  var permissoes = dados.permissoes || {};

  if (
    portalUsuarioTemPerfil_(perfis, 'ADMIN') ||
    portalUsuarioTemPerfil_(perfis, 'ADMIN_TECNICO') ||
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
    permissoes.podeGerenciarAtividades === true
  ) {
    return 'DIRETORIA';
  }

  return 'MEMBRO';
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
    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.errorCode || 'ERRO_ATIVIDADES',
        resposta.message || 'Nao foi possivel consultar atividades.',
        {}
      )
    };
  }

  return {
    ok: true,
    message: resposta.message || '',
    data: resposta.data || {}
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
  var detalhesPorId = {};

  calendario.forEach(function carregarDetalhe(atividade) {
    var idAtividade = atividade && atividade.idAtividade
      ? String(atividade.idAtividade).trim()
      : '';

    if (!idAtividade || atividade.podeVerDetalhes === false) {
      return;
    }

    var detalhe = portalDetalheAtividade(token, idAtividade);

    if (detalhe && detalhe.ok === true && detalhe.data) {
      detalhesPorId[idAtividade] = detalhe.data;
    }
  });

  return {
    ok: true,
    code: 'ATIVIDADES_BUNDLE_FALLBACK',
    message: 'Atividades carregadas por fallback de lista e detalhes.',
    origem: 'fallback-lista-detalhe',
    data: {
      calendario: calendario,
      detalhesPorId: detalhesPorId,
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

function portalMetaAtividades_(origem) {
  return {
    atividades: {
      origemDados: origem,
      cacheSegundos: PORTAL_CONFIG.cacheAtividadesSegundos
    }
  };
}
