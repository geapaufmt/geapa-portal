/**
 * Consumo somente leitura das views V2 do Portal GEAPA.
 *
 * O Portal nao cria planilhas, abas, triggers nem escreve nas bases V2. Esta
 * camada valida a sessao curta, monta contexto seguro e chama contratos
 * read-only expostos pelo GEAPA-CORE ou pelo modulo GEAPA Atividades.
 */

function portalMinhaFrequenciaV2(token) {
  return portalExecutarLeituraV2_(token, {
    id: 'minhaFrequencia',
    code: 'MINHA_FREQUENCIA_V2',
    message: 'Minha frequencia carregada pelas views V2.',
    listaCampo: 'registros',
    listaChaves: ['registros', 'frequencia', 'minhaFrequencia', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_FREQUENCIA_MEMBROS'
    ],
    requerDiretoria: false,
    funcoes: [
      'atividadesV2_portalGetMinhaFrequencia',
      'corePortalV2GetMinhaFrequencia',
      'corePortalReadonlyGetMinhaFrequencia',
      'corePortalMinhaFrequenciaV2',
      'portalV2GetMinhaFrequencia',
      'portal.v2.getMinhaFrequencia',
      'portal.getMinhaFrequencia'
    ],
    campos: [
      'ciclo',
      'totalPresencas',
      'totalFaltas',
      'totalJustificadas',
      'totalAbonadas',
      'faltasLiquidas',
      'limiteFaltasPeriodo',
      'percentualFrequencia',
      'percentualUsoLimite',
      'situacaoDisciplinar',
      'cargaHorariaTotal',
      'elegivelCertificado',
      'motivoInelegibilidade',
      'mensagemPortal',
      'ultimaAtualizacao'
    ],
    aliases: {}
  });
}

function portalMinhasApresentacoesV2(token) {
  return portalExecutarLeituraV2_(token, {
    id: 'minhasApresentacoes',
    code: 'MINHAS_APRESENTACOES_V2',
    message: 'Minhas apresentacoes carregadas pelas views V2.',
    listaCampo: 'apresentacoes',
    listaChaves: ['apresentacoes', 'minhasApresentacoes', 'registros', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_APRESENTACOES'
    ],
    requerDiretoria: false,
    funcoes: [
      'atividadesV2_portalGetMinhasApresentacoes',
      'corePortalV2GetMinhasApresentacoes',
      'corePortalReadonlyGetMinhasApresentacoes',
      'corePortalMinhasApresentacoesV2',
      'portalV2GetMinhasApresentacoes',
      'portal.v2.getMinhasApresentacoes',
      'portal.getMinhasApresentacoes'
    ],
    campos: [
      'idAtividade',
      'idApresentacao',
      'dataAtividade',
      'tituloPublico',
      'tema',
      'tipoPublico',
      'statusPublico',
      'statusApresentacao',
      'papel',
      'periodo',
      'cargaHoraria'
    ],
    aliases: {
      tema: ['tituloApresentacao', 'TITULO_APRESENTACAO'],
      tituloPublico: ['tituloApresentacao', 'TITULO_APRESENTACAO'],
      statusApresentacao: ['statusPublico', 'STATUS_PUBLICO'],
      statusPublico: ['STATUS_PUBLICO']
    }
  });
}

function portalMinhasJustificativasV2(token) {
  return portalExecutarLeituraV2_(token, {
    id: 'minhasJustificativas',
    code: 'MINHAS_JUSTIFICATIVAS_V2',
    message: 'Minhas justificativas carregadas pelas views V2.',
    listaCampo: 'justificativas',
    listaChaves: ['justificativas', 'minhasJustificativas', 'registros', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_JUSTIFICATIVAS'
    ],
    requerDiretoria: false,
    funcoes: [
      'atividadesV2_portalGetMinhasJustificativas',
      'corePortalV2GetMinhasJustificativas',
      'corePortalReadonlyGetMinhasJustificativas',
      'corePortalMinhasJustificativasV2',
      'portalV2GetMinhasJustificativas',
      'portal.v2.getMinhasJustificativas',
      'portal.getMinhasJustificativas'
    ],
    campos: [
      'idJustificativa',
      'idAtividade',
      'dataAtividade',
      'tituloPublico',
      'tipoPublico',
      'statusJustificativa',
      'statusPublico',
      'motivoCategoria',
      'enviadaEm',
      'decididaEm'
    ],
    aliases: {
      tituloPublico: ['tituloAtividade', 'TITULO_ATIVIDADE'],
      statusJustificativa: ['statusAnalise', 'STATUS_ANALISE'],
      statusPublico: ['statusAnalise', 'STATUS_ANALISE'],
      motivoCategoria: ['motivoDeclarado', 'MOTIVO_DECLARADO'],
      enviadaEm: ['dataEnvio', 'DATA_ENVIO'],
      decididaEm: ['dataAnalise', 'DATA_ANALISE']
    }
  });
}

function portalProximasAtividadesV2(token) {
  return portalExecutarLeituraAtividadesV2_(token, {
    id: 'proximasAtividades',
    code: 'PROXIMAS_ATIVIDADES_V2',
    message: 'Proximas atividades carregadas pelas views V2.',
    listaCampo: 'atividades',
    modo: 'proximas',
    destino: 'atividades',
    funcoes: [
      'atividadesV2_portalGetProximasAtividades',
      'atividadesV2_portalListarProximas',
      'portalV2GetProximasAtividades',
      'portal.v2.getProximasAtividades',
      'portal.getProximasAtividades'
    ]
  });
}

function portalHistoricoAtividadesV2(token) {
  return portalExecutarLeituraAtividadesV2_(token, {
    id: 'historicoAtividades',
    code: 'HISTORICO_ATIVIDADES_V2',
    message: 'Historico de atividades carregado pelas views V2.',
    listaCampo: 'atividades',
    modo: 'historico',
    destino: 'atividades',
    funcoes: [
      'atividadesV2_portalGetHistoricoAtividades',
      'atividadesV2_portalListarHistorico',
      'portalV2GetHistoricoAtividades',
      'portal.v2.getHistoricoAtividades',
      'portal.getHistoricoAtividades'
    ]
  });
}

function portalPendenciasDiretoriaV2(token) {
  return portalExecutarLeituraV2_(token, {
    id: 'pendenciasDiretoria',
    code: 'PENDENCIAS_DIRETORIA_V2',
    message: 'Pendencias da diretoria carregadas pelas views V2.',
    listaCampo: 'pendencias',
    listaChaves: ['pendencias', 'pendenciasDiretoria', 'registros', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_PENDENCIAS_DIRETORIA'
    ],
    requerDiretoria: true,
    permissoes: [
      'diretoria:pendencias',
      'membros:ler',
      'atividades:gerir',
      'justificativas:analisar',
      'sistema:admin'
    ],
    funcoes: [
      'atividadesV2_portalGetPendenciasDiretoria',
      'corePortalV2GetPendenciasDiretoria',
      'corePortalReadonlyGetPendenciasDiretoria',
      'portalV2GetPendenciasDiretoria',
      'portal.v2.getPendenciasDiretoria',
      'portal.getPendenciasDiretoria'
    ],
    campos: [
      'idPendencia',
      'tipo',
      'titulo',
      'descricaoPublica',
      'status',
      'severidade',
      'responsavelGrupo',
      'criadaEm',
      'atualizadaEm',
      'prazo'
    ],
    aliases: {
      idPendencia: ['ID_PENDENCIA'],
      tipo: ['tipoPendencia', 'TIPO_PENDENCIA'],
      titulo: ['tituloAtividade', 'TITULO_ATIVIDADE'],
      descricaoPublica: ['descricaoPendencia', 'DESCRICAO_PENDENCIA'],
      status: ['statusPendencia', 'STATUS_PENDENCIA'],
      severidade: ['gravidade', 'GRAVIDADE'],
      responsavelGrupo: ['responsavelSugerido', 'RESPONSAVEL_SUGERIDO'],
      atualizadaEm: ['ultimaAtualizacao', 'ULTIMA_ATUALIZACAO']
    }
  });
}

function portalStatusViewsV2(token) {
  return portalExecutarLeituraV2_(token, {
    id: 'statusViewsV2',
    code: 'STATUS_VIEWS_V2',
    message: 'Status das views V2 carregado.',
    listaCampo: 'views',
    listaChaves: ['views', 'statusViews', 'status', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_STATUS',
      'ATIVIDADES_V2_PORTAL_STATUS_ATIVIDADES'
    ],
    requerDiretoria: true,
    permissoes: [
      'sistema:status_v2',
      'sistema:admin',
      'atividades:gerir',
      'membros:ler'
    ],
    funcoes: [
      'atividadesV2_portalGetStatusViews',
      'corePortalV2GetStatusViews',
      'corePortalReadonlyGetStatusViewsV2',
      'portalV2GetStatusViews',
      'portal.v2.getStatusViews',
      'portal.getStatusViews'
    ],
    campos: [
      'view',
      'nome',
      'status',
      'ok',
      'linhas',
      'ultimaAtualizacao',
      'atualizadaEm',
      'origem',
      'mensagem'
    ],
    aliases: {
      view: ['idStatus', 'ID_STATUS'],
      nome: ['idStatus', 'ID_STATUS'],
      status: ['statusGeral', 'STATUS_GERAL'],
      ok: ['statusGeral', 'STATUS_GERAL'],
      atualizadaEm: ['dataHoraAtualizacao', 'DATA_HORA_ATUALIZACAO', 'ultimaAtualizacao'],
      mensagem: ['observacoes', 'OBSERVACOES', 'ultimoErro', 'ULTIMO_ERRO']
    }
  });
}

function portalExecutarLeituraV2_(token, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_('viewsV2r2:' + config.id, contexto.identificadorSessao);
  var cache = portalLerJsonCacheViewsV2_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      config.code + '_CACHE',
      'View V2 carregada em cache temporario.',
      cache,
      portalMetaViewsV2_('cache', inicio)
    );
  }

  var resposta = portalChamarContratoViewsV2_(config, contexto);

  if (!resposta) {
    resposta = portalLerViewV2PorRegistry_(config);
  }

  var normalizada = portalNormalizarRespostaViewsV2_(resposta, config, contexto);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarJsonCacheViewsV2_(cacheKey, normalizada.data);

  return portalRespostaOk_(
    config.code,
    config.message,
    normalizada.data,
    portalMetaViewsV2_(normalizada.origem || 'views-v2', inicio)
  );
}

function portalExecutarLeituraAtividadesV2_(token, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_('viewsV2:' + config.id, contexto.identificadorSessao);
  var cache = portalLerJsonCacheViewsV2_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      config.code + '_CACHE',
      'Atividades V2 carregadas em cache temporario.',
      cache,
      portalMetaViewsV2_('cache', inicio)
    );
  }

  var resposta = portalChamarContratoViewsV2_(config, contexto);

  if (!resposta) {
    resposta = portalMontarAtividadesV2Fallback_(token, config.modo);
  }

  var normalizada = portalNormalizarRespostaAtividadesReadonlyV2_(resposta, config);

  if (!normalizada.ok) {
    return normalizada.resposta;
  }

  portalSalvarJsonCacheViewsV2_(cacheKey, normalizada.data);

  return portalRespostaOk_(
    config.code,
    config.message,
    normalizada.data,
    portalMetaViewsV2_(normalizada.origem || 'geapa-atividades', inicio)
  );
}

function portalMontarContextoViewsV2_(token, config) {
  var tokenNormalizado = String(token || '').trim();

  if (!tokenNormalizado) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'SESSAO_OBRIGATORIA',
        'Entre no portal para consultar esta area.',
        {}
      )
    };
  }

  if (!portalSessaoTemporariaValida_(tokenNormalizado)) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'SESSAO_INVALIDA_OU_EXPIRADA',
        'Sessao invalida ou expirada. Entre novamente.',
        {}
      )
    };
  }

  var identificadorSessao = portalGetIdentificadorSessao_(tokenNormalizado);
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificadorSessao, {
    origem: 'views-v2:' + config.id
  });
  var membro = portalMontarMembroDeSessaoPortal_(sessao, 'GEAPA_CORE.session') ||
    portalBuscarMembroPorIdentificadorSessao_(identificadorSessao) ||
    {};
  var usuario = portalMontarUsuarioDeSessao_(sessao, membro) ||
    portalMontarUsuarioBasico_(membro);

  if (sessao && (sessao.ok === false || sessao.autenticado === false || sessao.portalAtivo === false)) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        sessao.motivoBloqueio || 'PORTAL_INATIVO',
        'Seu acesso ao Portal GEAPA nao esta ativo no momento.',
        {}
      )
    };
  }

  if (config.requerDiretoria && !portalContextoViewsV2TemPermissao_(sessao, usuario, config.permissoes || [])) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'PERMISSAO_INSUFICIENTE',
        'Seu perfil atual nao possui permissao para consultar esta area.',
        {}
      )
    };
  }

  return {
    ok: true,
    identificadorSessao: identificadorSessao,
    sessao: sessao,
    usuario: usuario,
    contexto: {
      idPessoa: String(usuario.idPessoa || (sessao && sessao.idPessoa) || '').trim(),
      email: String(usuario.email || (sessao && sessao.email) || identificadorSessao || '').trim(),
      rga: String(usuario.rga || (sessao && sessao.rga) || '').trim(),
      perfilPortalEfetivo: String((sessao && sessao.perfilPortalEfetivo) || usuario.perfilPrincipal || 'MEMBRO').trim(),
      perfisPortal: (sessao && sessao.perfisPortal) || usuario.perfisPortal || usuario.perfis || ['MEMBRO'],
      permissoes: (sessao && sessao.permissoes) || portalPermissoesListaDeMapaViewsV2_(usuario.permissoes),
      somenteProprios: config.requerDiretoria !== true
    }
  };
}

function portalContextoViewsV2TemPermissao_(sessao, usuario, permissoesNecessarias) {
  var perfis = (sessao && sessao.perfisPortal) || usuario.perfisPortal || usuario.perfis || [];
  var permissoes = (sessao && sessao.permissoes) || portalPermissoesListaDeMapaViewsV2_(usuario.permissoes);
  var mapa = {};

  permissoes.forEach(function guardar(permissao) {
    mapa[String(permissao || '').trim()] = true;
  });

  if (mapa['sistema:admin']) {
    return true;
  }

  if ((permissoesNecessarias || []).some(function temPermissao(permissao) {
    return mapa[permissao] === true;
  })) {
    return true;
  }

  if (permissoes.some(function permissaoCanonica(permissao) {
    return String(permissao || '').indexOf(':') > 0;
  })) {
    return false;
  }

  return perfis.some(function temPerfil(perfil) {
    var normalizado = String(perfil || '').trim().toUpperCase();
    return ['ADMIN', 'ADMIN_TECNICO', 'DIRETORIA', 'PRESIDENCIA', 'SECRETARIA'].indexOf(normalizado) >= 0;
  });
}

function portalPermissoesListaDeMapaViewsV2_(permissoes) {
  var lista = [];
  var dados = permissoes || {};

  Object.keys(dados).forEach(function copiar(chave) {
    if (dados[chave] === true) {
      lista.push(chave);
    }
  });

  return lista;
}

function portalChamarContratoViewsV2_(config, contexto) {
  var payload = {
    idPessoa: contexto.contexto.idPessoa,
    email: contexto.contexto.email,
    rga: contexto.contexto.rga,
    perfilPortalEfetivo: contexto.contexto.perfilPortalEfetivo,
    perfisPortal: contexto.contexto.perfisPortal,
    permissoes: contexto.contexto.permissoes,
    somenteProprios: contexto.contexto.somenteProprios === true
  };
  var funcoes = config.funcoes || [];
  var libs = config.destino === 'atividades'
    ? portalListarBibliotecasAtividadesViewsV2_()
    : portalListarBibliotecasGeapaCore_();
  var resposta;
  var i;

  for (i = 0; i < funcoes.length; i++) {
    resposta = portalChamarFuncaoGlobalViewsV2_(funcoes[i], payload);
    if (resposta) {
      return resposta;
    }
  }

  for (i = 0; i < libs.length; i++) {
    for (var j = 0; j < funcoes.length; j++) {
      resposta = portalChamarMetodoObjetoViewsV2_(libs[i].api, funcoes[j], payload);
      if (resposta) {
        return resposta;
      }
    }
  }

  return null;
}

function portalLerViewV2PorRegistry_(config) {
  var keys = config.registryKeys || [];
  var erros = [];

  for (var i = 0; i < keys.length; i++) {
    var key = String(keys[i] || '').trim();
    var registros = portalLerRegistrosViewV2PorKey_(key, erros);

    if (registros) {
      return portalMontarRespostaViewV2PorRegistry_(config, key, registros);
    }
  }

  if (erros.length) {
    Logger.log('GEAPA-PORTAL-VIEWS-V2-REGISTRY ' + JSON.stringify({
      view: config.id,
      erros: erros.slice(0, 3)
    }));
  }

  return portalMontarRespostaViewV2PorRegistry_(config, '', []);
}

function portalLerRegistrosViewV2PorKey_(key, erros) {
  var libs = portalListarBibliotecasGeapaCore_();

  if (!key) {
    return null;
  }

  for (var i = 0; i < libs.length; i++) {
    var api = libs[i].api || {};

    try {
      if (typeof api.coreReadRecordsByKey === 'function') {
        return api.coreReadRecordsByKey(key, {
          headerRow: 1,
          skipBlankRows: true
        }) || [];
      }

      if (typeof api.coreGetSheetByKey === 'function' && typeof api.coreReadSheetRecords === 'function') {
        return api.coreReadSheetRecords(api.coreGetSheetByKey(key), {
          headerRow: 1,
          skipBlankRows: true
        }) || [];
      }
    } catch (erro) {
      erros.push({
        key: key,
        biblioteca: libs[i].nome,
        erro: erro && erro.message ? erro.message : String(erro)
      });
    }
  }

  return null;
}

function portalMontarRespostaViewV2PorRegistry_(config, key, registros) {
  var lista = Array.isArray(registros) ? registros : [];
  var dados = {
    resumo: {
      total: lista.length
    },
    ultimaAtualizacao: portalObterUltimaAtualizacaoListaViewsV2_(lista)
  };

  dados[config.listaCampo] = lista;

  return {
    ok: true,
    origem: key ? 'geapa-core-registry:' + key : 'geapa-core-registry:vazio',
    data: dados
  };
}

function portalObterUltimaAtualizacaoListaViewsV2_(lista) {
  var maior = '';

  (lista || []).forEach(function comparar(item) {
    var valor = portalObterCampoFlexViewsV2_(item, [
      'ultimaAtualizacao',
      'ULTIMA_ATUALIZACAO',
      'atualizadoEm',
      'ATUALIZADO_EM',
      'dataHoraAtualizacao',
      'DATA_HORA_ATUALIZACAO'
    ]);
    var texto = String(valor || '').trim();

    if (texto && (!maior || texto > maior)) {
      maior = texto;
    }
  });

  return maior;
}

function portalChamarFuncaoGlobalViewsV2_(nome, payload) {
  var registry = portalFuncoesGlobaisViewsV2_();

  if (String(nome || '').indexOf('.') >= 0) {
    return null;
  }

  try {
    if (typeof registry[nome] === 'function') {
      return registry[nome](payload);
    }

    if (typeof globalThis !== 'undefined' && typeof globalThis[nome] === 'function') {
      return globalThis[nome](payload);
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-VIEWS-V2 ' + JSON.stringify({
      funcao: nome,
      erro: erro && erro.message ? erro.message : String(erro)
    }));
  }

  return null;
}

function portalFuncoesGlobaisViewsV2_() {
  var funcoes = {};

  if (typeof corePortalV2GetMinhaFrequencia === 'function') {
    funcoes.corePortalV2GetMinhaFrequencia = corePortalV2GetMinhaFrequencia;
  }

  if (typeof corePortalReadonlyGetMinhaFrequencia === 'function') {
    funcoes.corePortalReadonlyGetMinhaFrequencia = corePortalReadonlyGetMinhaFrequencia;
  }

  if (typeof corePortalMinhaFrequenciaV2 === 'function') {
    funcoes.corePortalMinhaFrequenciaV2 = corePortalMinhaFrequenciaV2;
  }

  if (typeof portalV2GetMinhaFrequencia === 'function') {
    funcoes.portalV2GetMinhaFrequencia = portalV2GetMinhaFrequencia;
  }

  if (typeof corePortalV2GetMinhasApresentacoes === 'function') {
    funcoes.corePortalV2GetMinhasApresentacoes = corePortalV2GetMinhasApresentacoes;
  }

  if (typeof corePortalReadonlyGetMinhasApresentacoes === 'function') {
    funcoes.corePortalReadonlyGetMinhasApresentacoes = corePortalReadonlyGetMinhasApresentacoes;
  }

  if (typeof corePortalMinhasApresentacoesV2 === 'function') {
    funcoes.corePortalMinhasApresentacoesV2 = corePortalMinhasApresentacoesV2;
  }

  if (typeof portalV2GetMinhasApresentacoes === 'function') {
    funcoes.portalV2GetMinhasApresentacoes = portalV2GetMinhasApresentacoes;
  }

  if (typeof corePortalV2GetMinhasJustificativas === 'function') {
    funcoes.corePortalV2GetMinhasJustificativas = corePortalV2GetMinhasJustificativas;
  }

  if (typeof corePortalReadonlyGetMinhasJustificativas === 'function') {
    funcoes.corePortalReadonlyGetMinhasJustificativas = corePortalReadonlyGetMinhasJustificativas;
  }

  if (typeof corePortalMinhasJustificativasV2 === 'function') {
    funcoes.corePortalMinhasJustificativasV2 = corePortalMinhasJustificativasV2;
  }

  if (typeof portalV2GetMinhasJustificativas === 'function') {
    funcoes.portalV2GetMinhasJustificativas = portalV2GetMinhasJustificativas;
  }

  if (typeof atividadesV2_portalGetProximasAtividades === 'function') {
    funcoes.atividadesV2_portalGetProximasAtividades = atividadesV2_portalGetProximasAtividades;
  }

  if (typeof atividadesV2_portalListarProximas === 'function') {
    funcoes.atividadesV2_portalListarProximas = atividadesV2_portalListarProximas;
  }

  if (typeof portalV2GetProximasAtividades === 'function') {
    funcoes.portalV2GetProximasAtividades = portalV2GetProximasAtividades;
  }

  if (typeof atividadesV2_portalGetHistoricoAtividades === 'function') {
    funcoes.atividadesV2_portalGetHistoricoAtividades = atividadesV2_portalGetHistoricoAtividades;
  }

  if (typeof atividadesV2_portalListarHistorico === 'function') {
    funcoes.atividadesV2_portalListarHistorico = atividadesV2_portalListarHistorico;
  }

  if (typeof portalV2GetHistoricoAtividades === 'function') {
    funcoes.portalV2GetHistoricoAtividades = portalV2GetHistoricoAtividades;
  }

  if (typeof corePortalV2GetPendenciasDiretoria === 'function') {
    funcoes.corePortalV2GetPendenciasDiretoria = corePortalV2GetPendenciasDiretoria;
  }

  if (typeof corePortalReadonlyGetPendenciasDiretoria === 'function') {
    funcoes.corePortalReadonlyGetPendenciasDiretoria = corePortalReadonlyGetPendenciasDiretoria;
  }

  if (typeof portalV2GetPendenciasDiretoria === 'function') {
    funcoes.portalV2GetPendenciasDiretoria = portalV2GetPendenciasDiretoria;
  }

  if (typeof corePortalV2GetStatusViews === 'function') {
    funcoes.corePortalV2GetStatusViews = corePortalV2GetStatusViews;
  }

  if (typeof corePortalReadonlyGetStatusViewsV2 === 'function') {
    funcoes.corePortalReadonlyGetStatusViewsV2 = corePortalReadonlyGetStatusViewsV2;
  }

  if (typeof portalV2GetStatusViews === 'function') {
    funcoes.portalV2GetStatusViews = portalV2GetStatusViews;
  }

  return funcoes;
}

function portalChamarMetodoObjetoViewsV2_(api, caminho, payload) {
  var partes = String(caminho || '').split('.');
  var atual = api;
  var inicio = 0;

  if (partes[0] === 'portal' && api && api.portal) {
    atual = api.portal;
    inicio = 1;
  }

  try {
    for (var i = inicio; i < partes.length; i++) {
      if (!atual) {
        return null;
      }

      atual = atual[partes[i]];
    }

    if (typeof atual === 'function') {
      return atual(payload);
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-VIEWS-V2 ' + JSON.stringify({
      metodo: caminho,
      erro: erro && erro.message ? erro.message : String(erro)
    }));
  }

  return null;
}

function portalNormalizarRespostaViewsV2_(resposta, config, contexto) {
  if (!resposta) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'VIEWS_V2_INDISPONIVEIS',
        'As views V2 ainda nao estao disponiveis para esta consulta.',
        {}
      )
    };
  }

  if (resposta.ok === false) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.code || resposta.errorCode || 'ERRO_VIEW_V2',
        resposta.message || 'Nao foi possivel consultar a view V2.',
        {}
      )
    };
  }

  var bruto = resposta.data || resposta.dados || resposta;
  var lista = portalExtrairListaViewsV2_(bruto, config.listaChaves);
  var filtrada = portalFiltrarListaPropriaViewsV2_(lista, contexto);
  var data = {
    sessao: portalResumoSessaoViewsV2_(contexto),
    resumo: portalExtrairResumoViewsV2_(bruto, config.resumoChaves),
    ultimaAtualizacao: portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt'])
  };

  data[config.listaCampo] = filtrada.map(function sanitizar(item) {
    return portalSanitizarItemViewsV2_(item, config.campos, config.aliases);
  });

  return {
    ok: true,
    origem: (resposta.meta && resposta.meta.origem) || resposta.origem || 'views-v2',
    data: data
  };
}

function portalNormalizarRespostaAtividadesReadonlyV2_(resposta, config) {
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

  if (resposta.ok === false) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.code || resposta.errorCode || 'ERRO_ATIVIDADES',
        resposta.message || 'Nao foi possivel consultar atividades.',
        {}
      )
    };
  }

  var bruto = resposta.data || resposta.dados || resposta;
  var lista = Array.isArray(bruto)
    ? bruto
    : portalExtrairListaViewsV2_(bruto, ['atividades', 'calendario', 'registros', 'itens']);
  var atividades = lista
    .map(portalSanitizarAtividadeReadonlyV2_)
    .filter(function filtrarPorModo(item) {
      return config.modo === 'historico'
        ? portalAtividadeV2EhHistorico_(item)
        : portalAtividadeV2EhProxima_(item);
    });

  return {
    ok: true,
    origem: resposta.origem || 'geapa-atividades',
    data: {
      atividades: atividades,
      resumo: {
        total: atividades.length
      },
      ultimaAtualizacao: portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt'])
    }
  };
}

function portalMontarAtividadesV2Fallback_(token, modo) {
  var lista = portalListarAtividades(token);

  if (!lista || lista.ok !== true) {
    return lista;
  }

  return {
    ok: true,
    origem: 'atividadesListar-fallback',
    data: {
      atividades: Array.isArray(lista.data) ? lista.data : [],
      ultimaAtualizacao: new Date().toISOString(),
      modo: modo
    }
  };
}

function portalExtrairListaViewsV2_(dados, chaves) {
  if (Array.isArray(dados)) {
    return dados;
  }

  for (var i = 0; i < chaves.length; i++) {
    if (Array.isArray(dados && dados[chaves[i]])) {
      return dados[chaves[i]];
    }
  }

  return [];
}

function portalExtrairResumoViewsV2_(dados, chaves) {
  var resumo = {};

  for (var i = 0; i < chaves.length; i++) {
    if (dados && dados[chaves[i]] && typeof dados[chaves[i]] === 'object' && !Array.isArray(dados[chaves[i]])) {
      resumo = dados[chaves[i]];
      break;
    }
  }

  return portalSanitizarObjetoBasicoViewsV2_(resumo, [
    'total',
    'presentes',
    'faltas',
    'justificadas',
    'pendentes',
    'deferidas',
    'indeferidas',
    'realizadas',
    'previstas',
    'percentual',
    'percentualFrequencia',
    'ultimaAtualizacao'
  ]);
}

function portalFiltrarListaPropriaViewsV2_(lista, contexto) {
  if (!contexto || !contexto.contexto || contexto.contexto.somenteProprios !== true) {
    return lista;
  }

  return (lista || []).filter(function filtrar(item) {
    return portalItemPertenceAoUsuarioViewsV2_(item, contexto.contexto);
  });
}

function portalItemPertenceAoUsuarioViewsV2_(item, usuario) {
  var dados = item || {};
  var idPessoa = String(dados.idPessoa || dados.ID_PESSOA || '').trim();
  var idPessoaUsuario = String(usuario.idPessoa || '').trim();
  var rga = String(dados.rga || dados.RGA || '').trim().toLowerCase();
  var rgaUsuario = String(usuario.rga || '').trim().toLowerCase();
  var email = String(dados.email || dados.EMAIL || dados.emailCadastrado || '').trim().toLowerCase();
  var emailUsuario = String(usuario.email || '').trim().toLowerCase();

  if (idPessoa && idPessoaUsuario && idPessoa === idPessoaUsuario) {
    return true;
  }

  if (rga && rgaUsuario && rga === rgaUsuario) {
    return true;
  }

  if (email && emailUsuario && email === emailUsuario) {
    return true;
  }

  return false;
}

function portalSanitizarItemViewsV2_(item, campos, aliases) {
  return portalSanitizarObjetoBasicoViewsV2_(item || {}, campos || [], aliases || {});
}

function portalSanitizarAtividadeReadonlyV2_(item) {
  return portalSanitizarObjetoBasicoViewsV2_(item || {}, [
    'idAtividade',
    'dataAtividade',
    'diaSemana',
    'horarioInicio',
    'horarioFim',
    'tituloPublico',
    'tipoPublico',
    'subtipoAtividade',
    'local',
    'formato',
    'classificacaoAcesso',
    'publicoAlvo',
    'contaPresenca',
    'contaFalta',
    'geraCertificado',
    'cargaHoraria',
    'statusPublico',
    'visibilidadePortal',
    'podeVerDetalhes'
  ]);
}

function portalSanitizarObjetoBasicoViewsV2_(objeto, campos, aliases) {
  var dados = objeto || {};
  var saida = {};
  var mapaAliases = aliases || {};

  (campos || []).forEach(function copiar(campo) {
    var chaves = [campo].concat(mapaAliases[campo] || []);
    var valor = portalObterCampoFlexViewsV2_(dados, chaves);

    if (valor !== undefined && valor !== null && !portalCampoProibidoViewsV2_(campo)) {
      saida[campo] = valor;
    }
  });

  return saida;
}

function portalObterCampoFlexViewsV2_(dados, chaves) {
  var keys = Object.keys(dados || {});

  for (var i = 0; i < chaves.length; i++) {
    var alvo = portalNormalizarChaveViewsV2_(chaves[i]);

    for (var j = 0; j < keys.length; j++) {
      if (portalNormalizarChaveViewsV2_(keys[j]) === alvo) {
        return dados[keys[j]];
      }
    }
  }

  return undefined;
}

function portalNormalizarChaveViewsV2_(chave) {
  return String(chave || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function portalCampoProibidoViewsV2_(campo) {
  var normalizado = portalNormalizarChaveViewsV2_(campo);
  return normalizado.indexOf('cpf') >= 0 ||
    normalizado.indexOf('token') >= 0 ||
    normalizado.indexOf('spreadsheet') >= 0 ||
    normalizado.indexOf('planilha') >= 0 ||
    normalizado.indexOf('drive') >= 0 ||
    normalizado.indexOf('email') >= 0;
}

function portalResumoSessaoViewsV2_(contexto) {
  var sessao = contexto.sessao || {};

  return {
    perfilPortalEfetivo: sessao.perfilPortalEfetivo || contexto.usuario.perfilPrincipal || 'MEMBRO',
    perfisPortal: sessao.perfisPortal || contexto.usuario.perfisPortal || contexto.usuario.perfis || [],
    portalAtivo: sessao.portalAtivo !== false
  };
}

function portalAtividadeV2EhProxima_(atividade) {
  var status = String(atividade.statusPublico || '').toUpperCase();
  var inicio = portalTimestampAtividadeViewsV2_(atividade);

  if (['REALIZADA', 'ENCERRADA', 'FINALIZADA', 'CANCELADA', 'CANCELADO'].indexOf(status) >= 0) {
    return false;
  }

  return !inicio || inicio >= portalAgoraViewsV2Ms_();
}

function portalAtividadeV2EhHistorico_(atividade) {
  var status = String(atividade.statusPublico || '').toUpperCase();
  var inicio = portalTimestampAtividadeViewsV2_(atividade);

  if (['CANCELADA', 'CANCELADO'].indexOf(status) >= 0) {
    return false;
  }

  if (['REALIZADA', 'ENCERRADA', 'FINALIZADA'].indexOf(status) >= 0) {
    return true;
  }

  return inicio && inicio < portalAgoraViewsV2Ms_();
}

function portalTimestampAtividadeViewsV2_(atividade) {
  var data = String(atividade.dataAtividade || '').trim();
  var hora = String(atividade.horarioInicio || '00:00').trim().replace('h', ':');
  var dt;

  if (!data) {
    return 0;
  }

  if (!/^\d{1,2}:\d{2}/.test(hora)) {
    hora = '00:00';
  }

  dt = new Date(data + 'T' + hora + ':00');
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}

function portalListarBibliotecasAtividadesViewsV2_() {
  var libs = [];

  if (typeof GEAPA_ATIVIDADES !== 'undefined') {
    libs.push({
      nome: 'GEAPA_ATIVIDADES',
      api: GEAPA_ATIVIDADES
    });
  }

  return libs;
}

function portalLerJsonCacheViewsV2_(chave) {
  var bruto = chave ? CacheService.getScriptCache().get(chave) : '';

  if (!bruto) {
    return null;
  }

  try {
    return JSON.parse(bruto);
  } catch (erro) {
    return null;
  }
}

function portalSalvarJsonCacheViewsV2_(chave, valor) {
  if (!chave || !valor || !PORTAL_CONFIG.cacheViewsV2Segundos) {
    return;
  }

  try {
    CacheService.getScriptCache().put(
      chave,
      JSON.stringify(valor),
      PORTAL_CONFIG.cacheViewsV2Segundos
    );
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalMetaViewsV2_(origem, inicioMs) {
  return {
    desempenho: {
      origemDados: origem,
      tempoMs: Math.max(portalAgoraViewsV2Ms_() - (Number(inicioMs) || portalAgoraViewsV2Ms_()), 0),
      cacheViewsV2Segundos: PORTAL_CONFIG.cacheViewsV2Segundos
    },
    viewsV2: {
      origemDados: origem,
      somenteLeitura: true
    }
  };
}

function portalAgoraViewsV2Ms_() {
  return new Date().getTime();
}
