/**
 * Consumo somente leitura das views V2 do Portal GEAPA.
 *
 * O Portal nao cria planilhas, abas, triggers nem escreve nas bases V2. Esta
 * camada valida a sessao curta, monta contexto seguro e chama contratos
 * read-only expostos pelo GEAPA-CORE ou pelo modulo GEAPA Atividades.
 */

function portalMinhaFrequenciaV2(token) {
  return portalExecutarMinhaFrequenciaAtividadesV2_(token, {
    id: 'minhaFrequencia',
    code: 'MINHA_FREQUENCIA_V2',
    message: 'Minha frequencia carregada pelas views V2.',
    requerDiretoria: false,
    funcoes: [
      'atividadesV2_portalGetMinhaFrequencia',
      'corePortalV2GetMinhaFrequencia',
      'corePortalReadonlyGetMinhaFrequencia',
      'corePortalMinhaFrequenciaV2',
      'portalV2GetMinhaFrequencia',
      'portal.v2.getMinhaFrequencia',
      'portal.getMinhaFrequencia'
    ]
  });
}

function portalMinhasApresentacoesV2(token) {
  return portalExecutarMinhasApresentacoesPorAtividadesV2_(token);
}

function portalExecutarMinhasApresentacoesPorAtividadesV2_(token) {
  var inicio = portalAgoraViewsV2Ms_();
  var config = {
    id: 'minhasApresentacoes',
    requerDiretoria: false
  };
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_('viewsV2r5:minhasApresentacoesAtividades', contexto.identificadorSessao);
  var cache = portalLerJsonCacheViewsV2_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'MINHAS_APRESENTACOES_V2_CACHE',
      'Minhas apresentacoes carregadas em cache temporario.',
      cache,
      portalMetaViewsV2_('cache', inicio)
    );
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var respostaMinhas = portalChamarAtividadesMinhasApresentacoesV2_(contextoAtividades);

  if (respostaMinhas && respostaMinhas.ok !== false) {
    var dataMinhas = portalMontarMinhasApresentacoesDiretasV2_(respostaMinhas, contexto);

    portalSalvarJsonCacheViewsV2_(cacheKey, dataMinhas);

    return portalRespostaOk_(
      'MINHAS_APRESENTACOES_V2',
      'Minhas apresentacoes carregadas pelo contrato especifico de atividades.',
      dataMinhas,
      portalMetaViewsV2_('portal-atividades-minhas-apresentacoes', inicio)
    );
  }

  var resposta = portalChamarAtividadesBundle_(contextoAtividades);

  if (!resposta || resposta.ok === false) {
    resposta = portalChamarAtividadesDetalhesPreload_(contextoAtividades);
  }

  var data = portalMontarMinhasApresentacoesDeDetalhesV2_(resposta, contexto);

  portalSalvarJsonCacheViewsV2_(cacheKey, data);

  return portalRespostaOk_(
    'MINHAS_APRESENTACOES_V2',
    'Minhas apresentacoes carregadas a partir dos detalhes de atividades.',
    data,
    portalMetaViewsV2_('portal-atividades-detalhes', inicio)
  );
}

function portalMontarMinhasApresentacoesDiretasV2_(resposta, contexto) {
  var bruto = resposta && resposta.ok !== false
    ? (resposta.data || resposta.dados || resposta)
    : {};
  var lista = portalExtrairListaViewsV2_(bruto, ['apresentacoes', 'registros', 'itens']);
  var apresentacoes = lista
    .filter(function filtrar(item) {
      return item && typeof item === 'object';
    })
    .map(function sanitizar(item) {
      return portalSanitizarApresentacaoDeAtividadeV2_(item, item);
    });

  return {
    sessao: portalResumoSessaoViewsV2_(contexto),
    apresentacoes: apresentacoes,
    resumo: {
      total: apresentacoes.length
    },
    ultimaAtualizacao: portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt']) ||
      new Date().toISOString()
  };
}

function portalMontarMinhasApresentacoesDeDetalhesV2_(resposta, contexto) {
  var bruto = resposta && resposta.ok !== false
    ? (resposta.data || resposta.dados || resposta)
    : {};
  var detalhes = portalExtrairDetalhesAtividadesParaApresentacoesV2_(bruto);
  var calendarioPorId = portalMontarMapaCalendarioAtividadesV2_(bruto);
  var apresentacoes = [];

  detalhes.forEach(function varrerDetalhe(detalhe) {
    var idAtividade = portalObterCampoFlexViewsV2_(detalhe, ['idAtividade', 'ID_ATIVIDADE']);
    var detalheCompleto = Object.assign({}, calendarioPorId[idAtividade] || {}, detalhe || {});
    var lista = portalParseListaJsonViewsV2_(
      portalObterCampoFlexViewsV2_(detalheCompleto, [
        'apresentacoesPublicas',
        'APRESENTACOES_PUBLICAS_JSON',
        'apresentacoesPublicasJson'
      ])
    );

    lista.forEach(function copiar(apresentacao) {
      if (portalApresentacaoPertenceAoUsuarioV2_(apresentacao, detalheCompleto, contexto.contexto)) {
        apresentacoes.push(portalSanitizarApresentacaoDeAtividadeV2_(apresentacao, detalheCompleto));
      }
    });
  });

  return {
    sessao: portalResumoSessaoViewsV2_(contexto),
    apresentacoes: apresentacoes,
    resumo: {
      total: apresentacoes.length
    },
    ultimaAtualizacao: portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt']) ||
      new Date().toISOString()
  };
}

function portalMontarMapaCalendarioAtividadesV2_(dados) {
  var origem = dados || {};
  var lista = Array.isArray(origem.calendario)
    ? origem.calendario
    : portalExtrairListaViewsV2_(origem, ['atividades', 'registros', 'itens']);
  var mapa = {};

  (lista || []).forEach(function mapear(item) {
    var idAtividade = portalObterCampoFlexViewsV2_(item, ['idAtividade', 'ID_ATIVIDADE']);

    if (idAtividade) {
      mapa[idAtividade] = item;
    }
  });

  return mapa;
}

function portalMontarContextoAtividadesReadonlyV2_(contexto) {
  var origem = (contexto && contexto.contexto) || {};
  var perfil = portalResolverPerfilAtividadesReadonlyV2_(origem);

  return {
    perfil: perfil,
    idPessoa: String(origem.idPessoa || '').trim(),
    rga: String(origem.rga || '').trim(),
    email: String(origem.email || '').trim(),
    perfilPortalEfetivo: String(origem.perfilPortalEfetivo || '').trim(),
    perfisPortal: origem.perfisPortal || ['MEMBRO'],
    permissoes: origem.permissoes || [],
    somenteProprios: origem.somenteProprios !== false,
    somenteVisiveis: perfil === 'MEMBRO'
  };
}

function portalChamarAtividadesMinhasApresentacoesV2_(contexto) {
  if (typeof atividadesV2_portalGetMinhasApresentacoes === 'function') {
    return atividadesV2_portalGetMinhasApresentacoes(contexto);
  }

  if (
    typeof GEAPA_ATIVIDADES !== 'undefined' &&
    typeof GEAPA_ATIVIDADES.atividadesV2_portalGetMinhasApresentacoes === 'function'
  ) {
    return GEAPA_ATIVIDADES.atividadesV2_portalGetMinhasApresentacoes(contexto);
  }

  return null;
}

function portalResolverPerfilAtividadesReadonlyV2_(contexto) {
  if (typeof portalResolverPerfilAtividades_ === 'function') {
    return portalResolverPerfilAtividades_(contexto || {});
  }

  var perfis = []
    .concat((contexto && contexto.perfisPortal) || [])
    .concat((contexto && contexto.perfis) || [])
    .concat((contexto && contexto.perfilPortalEfetivo) || []);
  var normalizados = perfis.map(function normalizar(perfil) {
    return String(perfil || '').trim().toUpperCase();
  });

  if (normalizados.indexOf('ADMIN') >= 0 ||
      normalizados.indexOf('ADMIN_TECNICO') >= 0 ||
      normalizados.indexOf('DIRETORIA') >= 0 ||
      normalizados.indexOf('PRESIDENCIA') >= 0) {
    return 'DIRETORIA';
  }

  if (normalizados.indexOf('SECRETARIA') >= 0 || normalizados.indexOf('SECRETARIO') >= 0) {
    return 'SECRETARIO';
  }

  return 'MEMBRO';
}

function portalExtrairDetalhesAtividadesParaApresentacoesV2_(dados) {
  var origem = dados || {};
  var detalhesPorId = origem.detalhesPorId || origem.detalhes || origem.atividadesDetalhes;
  var lista;

  if (Array.isArray(origem)) {
    return origem;
  }

  if (Array.isArray(detalhesPorId)) {
    return detalhesPorId;
  }

  if (detalhesPorId && typeof detalhesPorId === 'object') {
    return Object.keys(detalhesPorId).map(function mapear(idAtividade) {
      var detalhe = detalhesPorId[idAtividade] || {};
      if (!detalhe.idAtividade) {
        detalhe.idAtividade = idAtividade;
      }
      return detalhe;
    });
  }

  lista = portalExtrairListaViewsV2_(origem, ['atividades', 'calendario', 'registros', 'itens']);
  return lista || [];
}

function portalParseListaJsonViewsV2_(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (valor && typeof valor === 'object') {
    return [valor];
  }

  if (typeof valor === 'string' && valor.trim()) {
    try {
      var parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch (erro) {
      return [];
    }
  }

  return [];
}

function portalApresentacaoPertenceAoUsuarioV2_(apresentacao, detalhe, usuario) {
  var dados = apresentacao || {};
  var atividade = detalhe || {};

  return portalValorUsuarioConfereV2_(dados, usuario, [
    'idPessoa',
    'idPessoaPrincipal',
    'ID_PESSOA'
  ], 'idPessoa') ||
    portalValorUsuarioConfereV2_(dados, usuario, [
    'rga',
    'RGA'
  ], 'rga') ||
    portalValorUsuarioConfereV2_(dados, usuario, [
    'email',
      'EMAIL'
  ], 'email') ||
    portalValorUsuarioConfereV2_(atividade, usuario, [
    'idPessoaPrincipal',
    'ID_PESSOA_PRINCIPAL'
  ], 'idPessoa') ||
    portalValorUsuarioConfereV2_(atividade, usuario, [
    'rgaPrincipal',
    'RGA_PRINCIPAL'
  ], 'rga') ||
    portalValorUsuarioConfereV2_(atividade, usuario, [
    'emailPrincipal',
    'EMAIL_PRINCIPAL'
  ], 'email');
}

function portalValorUsuarioConfereV2_(dados, usuario, chaves, campoUsuario) {
  var valor = String(portalObterCampoFlexViewsV2_(dados || {}, chaves) || '').trim().toLowerCase();
  var esperado = String((usuario || {})[campoUsuario] || '').trim().toLowerCase();

  return Boolean(valor && esperado && valor === esperado);
}

function portalNormalizarBooleanViewsV2_(valor) {
  if (valor === true || valor === false) {
    return valor;
  }

  var texto = String(valor || '').trim().toLowerCase();

  if (['true', 'sim', 's', '1', 'yes'].indexOf(texto) >= 0) {
    return true;
  }

  if (['false', 'nao', 'não', 'n', '0', 'no'].indexOf(texto) >= 0) {
    return false;
  }

  return false;
}

function portalNormalizarAcoesApresentacaoV2_(valor) {
  var origem = valor || {};
  var permitido = [
    'podeEditarTituloEixo',
    'podeEnviarMaterial',
    'podeReenviarMaterial',
    'podeAbrirMaterial',
    'podeAbrirPastaAtividade'
  ];
  var saida = {};

  if (typeof origem === 'string' && origem.trim()) {
    try {
      origem = JSON.parse(origem);
    } catch (erro) {
      origem = {};
    }
  }

  if (!origem || typeof origem !== 'object' || Array.isArray(origem)) {
    origem = {};
  }

  permitido.forEach(function copiar(chave) {
    saida[chave] = portalNormalizarBooleanViewsV2_(origem[chave]);
  });

  return saida;
}

function portalSanitizarApresentacaoDeAtividadeV2_(apresentacao, detalhe) {
  var origem = apresentacao || {};
  var atividade = detalhe || {};
  var titulo = portalObterCampoFlexViewsV2_(origem, [
    'titulo',
    'tema',
    'tituloPublico',
    'resumoPublico',
    'TITULO',
    'TEMA'
  ]);
  var rotuloSemestre = portalObterCampoFlexViewsV2_(origem, [
    'rotuloSemestre',
    'periodo',
    'ROTULO_SEMESTRE'
  ]) || portalObterCampoFlexViewsV2_(atividade, [
    'rotuloSemestre',
    'periodo',
    'periodoLetivo',
    'cicloSemestre',
    'ROTULO_SEMESTRE',
    'PERIODO_LETIVO'
  ]);
  var item = {
    idApresentacao: portalObterCampoFlexViewsV2_(origem, [
      'idApresentacao',
      'ID_APRESENTACAO'
    ]),
    idAtividade: portalObterCampoFlexViewsV2_(atividade, ['idAtividade', 'ID_ATIVIDADE']) ||
      portalObterCampoFlexViewsV2_(origem, ['idAtividade', 'ID_ATIVIDADE']),
    dataAtividade: portalObterCampoFlexViewsV2_(atividade, ['dataAtividade', 'data', 'DATA_ATIVIDADE']) ||
      portalObterCampoFlexViewsV2_(origem, ['dataAtividade', 'data', 'DATA_ATIVIDADE']),
    tituloPublico: portalObterCampoFlexViewsV2_(atividade, ['tituloPublico', 'titulo', 'TITULO_PUBLICO']),
    tema: titulo,
    titulo: titulo,
    tituloAtividade: portalObterCampoFlexViewsV2_(atividade, ['tituloAtividade', 'tituloPublico', 'titulo', 'TITULO_ATIVIDADE']),
    tituloApresentacao: portalObterCampoFlexViewsV2_(origem, ['tituloApresentacao', 'titulo', 'tema', 'TITULO_APRESENTACAO']),
    nomeApresentador: portalObterCampoFlexViewsV2_(origem, [
      'nomeApresentador',
      'responsavelSugerido',
      'responsavel',
      'nomePessoaPrincipal',
      'nomePessoaPrincipalPublico',
      'NOME_APRESENTADOR',
      'RESPONSAVEL_SUGERIDO'
    ]),
    tipoPublico: portalObterCampoFlexViewsV2_(atividade, ['tipoPublico', 'tipoAtividade', 'TIPO_PUBLICO']),
    statusApresentacao: portalObterCampoFlexViewsV2_(origem, [
      'statusApresentacao',
      'statusPublico',
      'status',
      'STATUS_APRESENTACAO',
      'STATUS_PUBLICO'
    ]) || portalObterCampoFlexViewsV2_(atividade, ['statusPublico', 'status', 'STATUS_PUBLICO']),
    eixoTematicoPrincipal: portalObterCampoFlexViewsV2_(origem, [
      'eixoTematicoPrincipal',
      'eixoPrincipal',
      'EIXO_TEMATICO_PRINCIPAL'
    ]) || portalObterCampoFlexViewsV2_(atividade, ['eixoTematicoPrincipal', 'eixoPrincipal', 'EIXO_TEMATICO_PRINCIPAL']),
    eixoTematicoSecundario: portalObterCampoFlexViewsV2_(origem, [
      'eixoTematicoSecundario',
      'eixoSecundario',
      'EIXO_TEMATICO_SECUNDARIO'
    ]) || portalObterCampoFlexViewsV2_(atividade, ['eixoTematicoSecundario', 'eixoSecundario', 'EIXO_TEMATICO_SECUNDARIO']),
    papel: portalObterCampoFlexViewsV2_(origem, ['papel', 'papelPessoaPrincipal']) ||
      portalObterCampoFlexViewsV2_(atividade, ['papelPessoaPrincipal', 'papel']),
    statusTituloEixo: portalObterCampoFlexViewsV2_(origem, [
      'statusTituloEixo',
      'STATUS_TITULO_EIXO',
      'statusEixoTematico',
      'STATUS_EIXO_TEMATICO'
    ]),
    statusMaterial: portalObterCampoFlexViewsV2_(origem, [
      'statusMaterial',
      'STATUS_MATERIAL',
      'statusEnvioMaterial',
      'STATUS_ENVIO_MATERIAL'
    ]),
    idArquivoMaterial: portalObterCampoFlexViewsV2_(origem, [
      'idArquivoMaterial',
      'ID_ARQUIVO_MATERIAL'
    ]),
    nomeArquivoMaterial: portalObterCampoFlexViewsV2_(origem, [
      'nomeArquivoMaterial',
      'NOME_ARQUIVO_MATERIAL'
    ]),
    linkMaterialPublico: portalObterCampoFlexViewsV2_(origem, [
      'linkMaterialPublico',
      'LINK_MATERIAL_APRESENTACAO',
      'linkMaterialApresentacao'
    ]),
    versaoMaterial: portalObterCampoFlexViewsV2_(origem, [
      'versaoMaterial',
      'VERSAO_MATERIAL'
    ]),
    mensagemTituloEixo: portalObterCampoFlexViewsV2_(origem, [
      'mensagemTituloEixo',
      'MENSAGEM_TITULO_EIXO',
      'mensagemReprovacaoTituloEixo',
      'MENSAGEM_REPROVACAO_TITULO_EIXO'
    ]),
    acoesMembro: portalNormalizarAcoesApresentacaoV2_(portalObterCampoFlexViewsV2_(origem, [
      'acoesMembro',
      'ACOES_MEMBRO'
    ])),
    periodo: rotuloSemestre,
    rotuloSemestre: rotuloSemestre,
    cargaHoraria: portalObterCampoFlexViewsV2_(atividade, ['cargaHoraria', 'CARGA_HORARIA']),
    linkPastaDrive: portalObterCampoFlexViewsV2_(atividade, [
      'linkPastaDrive',
      'linkPastaPublica',
      'linkPastaPublico',
      'LINK_PASTA_DRIVE',
      'LINK_PASTA_PUBLICA'
    ]),
    idPastaDrive: portalObterCampoFlexViewsV2_(atividade, ['idPastaDrive', 'ID_PASTA_DRIVE'])
  };

  return portalSanitizarObjetoBasicoViewsV2_(item, [
    'idApresentacao',
    'idAtividade',
    'dataAtividade',
    'tituloPublico',
    'tema',
    'titulo',
    'tituloAtividade',
    'tituloApresentacao',
    'nomeApresentador',
    'tipoPublico',
    'statusApresentacao',
    'eixoTematicoPrincipal',
    'eixoTematicoSecundario',
    'papel',
    'statusTituloEixo',
    'statusMaterial',
    'idArquivoMaterial',
    'nomeArquivoMaterial',
    'linkMaterialPublico',
    'versaoMaterial',
    'mensagemTituloEixo',
    'acoesMembro',
    'periodo',
    'rotuloSemestre',
    'cargaHoraria',
    'linkPastaDrive',
    'idPastaDrive'
  ]);
}

function portalMinhasJustificativasV2(token) {
  return portalExecutarMinhasJustificativasV2_(token, {
    id: 'minhasJustificativas',
    code: 'MINHAS_JUSTIFICATIVAS_V2',
    message: 'Minhas justificativas carregadas pelas views V2.',
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
    camposFaltas: [
      'idRegistroPresenca',
      'idAtividade',
      'idPessoa',
      'rga',
      'dataAtividade',
      'tituloPublico',
      'statusPresenca',
      'dataLimiteJustificativa',
      'statusPrazo',
      'envioForaDoPrazo',
      'podeEnviarJustificativa',
      'exigeCienciaForaPrazo',
      'mensagemPortal',
      'motivosDisponiveis'
    ],
    aliasesFaltas: {
      tituloPublico: ['tituloAtividade', 'TITULO_ATIVIDADE'],
      dataLimiteJustificativa: ['prazoJustificativa', 'DATA_LIMITE_JUSTIFICATIVA'],
      envioForaDoPrazo: ['foraDoPrazo', 'ENVIO_FORA_DO_PRAZO'],
      motivosDisponiveis: ['motivos', 'MOTIVOS_DISPONIVEIS']
    },
    camposJustificativas: [
      'idJustificativa',
      'idRegistroPresenca',
      'idAtividade',
      'idPessoa',
      'rga',
      'dataAtividade',
      'tituloPublico',
      'motivoCategoria',
      'statusJustificativa',
      'statusPublico',
      'decisaoAplicada',
      'enviadaEm',
      'dataLimiteJustificativa',
      'statusPrazo',
      'envioForaDoPrazo',
      'podeReenviarAjuste',
      'observacaoPublica',
      'mensagemPortal',
      'ultimaAtualizacao',
      'descricaoJustificativa',
      'possuiDocumentoComprobatorio',
      'linkDocumentoComprobatorio',
      'motivosDisponiveis'
    ],
    aliasesJustificativas: {
      tituloPublico: ['tituloAtividade', 'TITULO_ATIVIDADE'],
      motivoCategoria: ['motivoDeclarado', 'MOTIVO_DECLARADO'],
      statusJustificativa: ['statusAnalise', 'STATUS_ANALISE'],
      statusPublico: ['statusAnalise', 'STATUS_ANALISE'],
      decisaoAplicada: ['decisaoAplicadaNaPresenca', 'valorDepois', 'VALOR_DEPOIS'],
      enviadaEm: ['dataEnvio', 'DATA_ENVIO'],
      dataLimiteJustificativa: ['prazoJustificativa', 'DATA_LIMITE_JUSTIFICATIVA'],
      envioForaDoPrazo: ['foraDoPrazo', 'ENVIO_FORA_DO_PRAZO'],
      motivosDisponiveis: ['motivos', 'MOTIVOS_DISPONIVEIS']
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

function portalJustificativaEnviarV2(token, payloadJson) {
  return portalExecutarAcaoJustificativaAtividadesV2_(token, payloadJson, {
    id: 'justificativaEnviar',
    code: 'JUSTIFICATIVA_ENVIADA',
    message: 'Justificativa enviada para analise.',
    funcoes: [
      'atividadesV2_portalEnviarJustificativa',
      'atividadesV2_portalEnviarJustificativa_',
      'atividadesV2_portalRegistrarJustificativa',
      'atividadesV2_portalRegistrarJustificativa_'
    ],
    requerDiretoria: false,
    camposObrigatorios: ['idAtividade', 'motivoDeclarado', 'descricaoJustificativa']
  });
}

function portalJustificativaAnalisarV2(token, payloadJson) {
  return portalExecutarAcaoJustificativaAtividadesV2_(token, payloadJson, {
    id: 'justificativaAnalisar',
    code: 'JUSTIFICATIVA_ANALISADA',
    message: 'Analise da justificativa registrada.',
    funcoes: [
      'atividadesV2_portalAnalisarJustificativa',
      'atividadesV2_portalAnalisarJustificativa_'
    ],
    requerDiretoria: true,
    permissoes: [
      'justificativas:analisar',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ],
    camposObrigatorios: ['idJustificativa', 'decisao']
  });
}

function portalJustificativasPendenciasDiretoriaV2(token) {
  return portalExecutarConsultaJustificativaAtividadesV2_(token, {
    id: 'justificativasPendenciasDiretoria',
    code: 'JUSTIFICATIVAS_PENDENCIAS_DIRETORIA',
    message: 'Justificativas pendentes carregadas para gestao.',
    funcoes: [
      'atividadesV2_portalListarJustificativasPendentesDiretoria',
      'atividadesV2_portalListarPendenciasJustificativasDiretoria',
      'atividadesV2_portalListarJustificativasDiretoria',
      'atividadesV2_portalGetJustificativasPendentesDiretoria'
    ],
    requerDiretoria: true,
    permissoes: [
      'justificativas:analisar',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ]
  });
}

function portalJustificativasConfigV2(token) {
  return portalExecutarConsultaJustificativaAtividadesV2_(token, {
    id: 'justificativasConfig',
    code: 'JUSTIFICATIVAS_CONFIG_V2',
    message: 'Configuracao de justificativas carregada.',
    funcoes: [
      'atividadesV2_portalGetJustificativasConfig',
      'atividadesV2_portalGetJustificativasConfig_'
    ],
    requerDiretoria: false,
    normalizar: portalNormalizarConfigJustificativasV2_
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

function portalApresentacoesListarEixosV2(token) {
  return portalExecutarConsultaApresentacaoAtividadesV2_(token, {
    id: 'apresentacoesListarEixos',
    code: 'APRESENTACOES_EIXOS_V2',
    message: 'Eixos tematicos carregados pelo modulo Atividades.',
    funcao: 'atividadesV2_portalListarEixosTematicos',
    requerDiretoria: false
  });
}

function portalApresentacaoEnviarTituloEixoV2(token, payloadJson) {
  return portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, {
    id: 'apresentacaoEnviarTituloEixo',
    code: 'APRESENTACAO_TITULO_EIXO_ENVIADO',
    message: 'Titulo e eixos enviados para revisao.',
    funcao: 'atividadesV2_portalEnviarTituloEixoApresentacao',
    requerDiretoria: false,
    camposObrigatorios: ['idApresentacao', 'tituloApresentacao', 'eixoTematicoPrincipal']
  });
}

function portalApresentacaoRegistrarMaterialV2(token, payloadJson) {
  return portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, {
    id: 'apresentacaoRegistrarMaterial',
    code: 'APRESENTACAO_MATERIAL_REGISTRADO',
    message: 'Material de apresentacao enviado para revisao.',
    funcao: 'atividadesV2_portalRegistrarMaterialApresentacao',
    requerDiretoria: false,
    camposObrigatorios: ['idApresentacao']
  });
}

function portalApresentacoesPendenciasDiretoriaV2(token) {
  return portalExecutarConsultaApresentacaoAtividadesV2_(token, {
    id: 'apresentacoesPendenciasDiretoria',
    code: 'APRESENTACOES_PENDENCIAS_DIRETORIA',
    message: 'Pendencias de apresentacoes carregadas para diretoria.',
    funcao: 'atividadesV2_portalListarPendenciasApresentacoesDiretoria',
    requerDiretoria: true,
    permissoes: [
      'apresentacoes:gerir',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ]
  });
}

function portalApresentacaoRevisarTituloEixoV2(token, payloadJson) {
  return portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, {
    id: 'apresentacaoRevisarTituloEixo',
    code: 'APRESENTACAO_TITULO_EIXO_REVISADO',
    message: 'Revisao de titulo e eixos registrada.',
    funcao: 'atividadesV2_portalRevisarTituloEixoApresentacao',
    requerDiretoria: true,
    permissoes: [
      'apresentacoes:gerir',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ],
    camposObrigatorios: ['idApresentacao', 'decisao']
  });
}

function portalApresentacaoReprovarTituloEixoV2(token, payloadJson) {
  return portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, {
    id: 'apresentacaoReprovarTituloEixo',
    code: 'APRESENTACAO_TITULO_EIXO_REPROVADO',
    message: 'Proposta de titulo e eixos reprovada.',
    funcao: 'atividadesV2_portalReprovarTituloEixoApresentacao',
    requerDiretoria: true,
    permissoes: [
      'apresentacoes:gerir',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ],
    camposObrigatorios: ['idApresentacao', 'decisao', 'observacaoPublica']
  });
}

function portalApresentacaoRevisarMaterialV2(token, payloadJson) {
  return portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, {
    id: 'apresentacaoRevisarMaterial',
    code: 'APRESENTACAO_MATERIAL_REVISADO',
    message: 'Revisao de material registrada.',
    funcao: 'atividadesV2_portalRevisarMaterialApresentacao',
    requerDiretoria: true,
    permissoes: [
      'apresentacoes:gerir',
      'diretoria:pendencias',
      'atividades:gerir',
      'sistema:admin'
    ],
    camposObrigatorios: ['idApresentacao', 'decisao']
  });
}

function portalExecutarConsultaApresentacaoAtividadesV2_(token, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var resposta = portalChamarAtividadesPacoteApresentacoesV2_(config.funcao, null, contextoAtividades);

  return portalNormalizarRespostaAcaoApresentacaoV2_(resposta, config, inicio);
}

function portalExecutarAcaoApresentacaoAtividadesV2_(token, payloadJson, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var payload = portalLerPayloadJson_(payloadJson);

  if (!payload.ok) {
    return payload.resposta;
  }

  var dadosPayload = portalNormalizarPayloadApresentacaoV2_(payload.data);
  var validacao = portalValidarPayloadApresentacaoV2_(dadosPayload, config.camposObrigatorios || []);

  if (!validacao.ok) {
    return validacao.resposta;
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var resposta = portalChamarAtividadesPacoteApresentacoesV2_(config.funcao, dadosPayload, contextoAtividades);

  return portalNormalizarRespostaAcaoApresentacaoV2_(resposta, config, inicio);
}

function portalNormalizarPayloadApresentacaoV2_(payload) {
  var dados = Object.assign({}, payload || {});

  delete dados.acao;
  delete dados.token;
  delete dados.payload;

  return dados;
}

function portalValidarPayloadApresentacaoV2_(payload, camposObrigatorios) {
  var ausentes = (camposObrigatorios || []).filter(function validar(campo) {
    return payload[campo] === undefined || payload[campo] === null || payload[campo] === '';
  });

  if (ausentes.length) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'PAYLOAD_INCOMPLETO',
        'Informe os dados obrigatorios da apresentacao.',
        {
          campos: ausentes
        }
      )
    };
  }

  return {
    ok: true
  };
}

function portalChamarAtividadesPacoteApresentacoesV2_(nomeFuncao, payload, contexto) {
  var funcoesGlobais = portalFuncoesGlobaisApresentacoesV2_();
  var funcaoGlobal = funcoesGlobais[nomeFuncao] ||
    (typeof globalThis !== 'undefined' ? globalThis[nomeFuncao] : null);

  try {
    if (typeof funcaoGlobal === 'function') {
      return payload === null
        ? funcaoGlobal(contexto)
        : funcaoGlobal(payload, contexto);
    }

    if (
      typeof GEAPA_ATIVIDADES !== 'undefined' &&
      typeof GEAPA_ATIVIDADES[nomeFuncao] === 'function'
    ) {
      return payload === null
        ? GEAPA_ATIVIDADES[nomeFuncao](contexto)
        : GEAPA_ATIVIDADES[nomeFuncao](payload, contexto);
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-APRESENTACOES-V2 ' + JSON.stringify({
      funcao: nomeFuncao,
      erro: erro && erro.message ? erro.message : String(erro)
    }));

    return {
      ok: false,
      errorCode: 'ERRO_APRESENTACOES_V2',
      message: 'Nao foi possivel executar a acao de apresentacao.'
    };
  }

  return null;
}

function portalFuncoesGlobaisApresentacoesV2_() {
  var funcoes = {};

  if (typeof atividadesV2_portalListarEixosTematicos === 'function') {
    funcoes.atividadesV2_portalListarEixosTematicos = atividadesV2_portalListarEixosTematicos;
  }

  if (typeof atividadesV2_portalEnviarTituloEixoApresentacao === 'function') {
    funcoes.atividadesV2_portalEnviarTituloEixoApresentacao = atividadesV2_portalEnviarTituloEixoApresentacao;
  }

  if (typeof atividadesV2_portalRevisarTituloEixoApresentacao === 'function') {
    funcoes.atividadesV2_portalRevisarTituloEixoApresentacao = atividadesV2_portalRevisarTituloEixoApresentacao;
  }

  if (typeof atividadesV2_portalReprovarTituloEixoApresentacao === 'function') {
    funcoes.atividadesV2_portalReprovarTituloEixoApresentacao = atividadesV2_portalReprovarTituloEixoApresentacao;
  }

  if (typeof atividadesV2_portalRegistrarMaterialApresentacao === 'function') {
    funcoes.atividadesV2_portalRegistrarMaterialApresentacao = atividadesV2_portalRegistrarMaterialApresentacao;
  }

  if (typeof atividadesV2_portalRevisarMaterialApresentacao === 'function') {
    funcoes.atividadesV2_portalRevisarMaterialApresentacao = atividadesV2_portalRevisarMaterialApresentacao;
  }

  if (typeof atividadesV2_portalListarPendenciasApresentacoesDiretoria === 'function') {
    funcoes.atividadesV2_portalListarPendenciasApresentacoesDiretoria = atividadesV2_portalListarPendenciasApresentacoesDiretoria;
  }

  return funcoes;
}

function portalNormalizarRespostaAcaoApresentacaoV2_(resposta, config, inicio) {
  if (!resposta) {
    return portalRespostaErro_(
      'APRESENTACOES_V2_INDISPONIVEIS',
      'A integracao de apresentacoes V2 ainda nao esta disponivel.',
      {},
      portalMetaViewsV2_('geapa-atividades-indisponivel', inicio)
    );
  }

  if (resposta.ok === false) {
    return portalRespostaErro_(
      resposta.code || resposta.errorCode || 'ERRO_APRESENTACOES_V2',
      resposta.message || 'Nao foi possivel executar a acao de apresentacao.',
      {},
      portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
    );
  }

  return portalRespostaOk_(
    config.code,
    resposta.message || config.message,
    resposta.data || resposta.dados || resposta || {},
    portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
  );
}

function portalExecutarMinhaFrequenciaAtividadesV2_(token, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var resposta = portalChamarAtividadesJustificativasV2_(config.funcoes, null, contextoAtividades);
  var normalizada = portalNormalizarMinhaFrequenciaV2_(resposta, contexto, inicio);

  return normalizada;
}

function portalExecutarConsultaJustificativaAtividadesV2_(token, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var resposta = portalChamarAtividadesJustificativasV2_(config.funcoes, null, contextoAtividades);

  if (typeof config.normalizar === 'function') {
    return config.normalizar(resposta, config, inicio);
  }

  return portalNormalizarRespostaAcaoJustificativaV2_(resposta, config, inicio);
}

function portalExecutarAcaoJustificativaAtividadesV2_(token, payloadJson, config) {
  var inicio = portalAgoraViewsV2Ms_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var payload = portalLerPayloadJson_(payloadJson);

  if (!payload.ok) {
    return payload.resposta;
  }

  var dadosPayload = portalNormalizarPayloadApresentacaoV2_(payload.data);
  var validacao = portalValidarPayloadApresentacaoV2_(dadosPayload, config.camposObrigatorios || []);

  if (!validacao.ok) {
    return validacao.resposta;
  }

  var contextoAtividades = portalMontarContextoAtividadesReadonlyV2_(contexto);
  var resposta = portalChamarAtividadesJustificativasV2_(config.funcoes, dadosPayload, contextoAtividades);

  if (resposta && resposta.ok !== false) {
    portalInvalidarCachesJustificativasV2_(contexto);
  }

  return portalNormalizarRespostaAcaoJustificativaV2_(resposta, config, inicio);
}

function portalChamarAtividadesJustificativasV2_(nomesFuncoes, payload, contexto) {
  var nomes = Array.isArray(nomesFuncoes) ? nomesFuncoes : [nomesFuncoes];
  var funcoesGlobais = portalFuncoesGlobaisJustificativasV2_();

  for (var i = 0; i < nomes.length; i++) {
    var nomeFuncao = nomes[i];
    var funcaoGlobal = funcoesGlobais[nomeFuncao] ||
      (typeof globalThis !== 'undefined' ? globalThis[nomeFuncao] : null);

    try {
      if (typeof funcaoGlobal === 'function') {
        return payload === null
          ? funcaoGlobal(contexto)
          : funcaoGlobal(payload, contexto);
      }

      if (
        typeof GEAPA_ATIVIDADES !== 'undefined' &&
        typeof GEAPA_ATIVIDADES[nomeFuncao] === 'function'
      ) {
        return payload === null
          ? GEAPA_ATIVIDADES[nomeFuncao](contexto)
          : GEAPA_ATIVIDADES[nomeFuncao](payload, contexto);
      }
    } catch (erro) {
      Logger.log('GEAPA-PORTAL-JUSTIFICATIVAS-V2 ' + JSON.stringify({
        funcao: nomeFuncao,
        erro: erro && erro.message ? erro.message : String(erro)
      }));

      return {
        ok: false,
        errorCode: 'ERRO_JUSTIFICATIVAS_V2',
        message: 'Nao foi possivel executar a acao de justificativa.'
      };
    }
  }

  return null;
}

function portalFuncoesGlobaisJustificativasV2_() {
  var funcoes = {};

  [
    'atividadesV2_portalEnviarJustificativa',
    'atividadesV2_portalEnviarJustificativa_',
    'atividadesV2_portalRegistrarJustificativa',
    'atividadesV2_portalRegistrarJustificativa_',
    'atividadesV2_portalAnalisarJustificativa',
    'atividadesV2_portalAnalisarJustificativa_',
    'atividadesV2_portalGetJustificativasConfig',
    'atividadesV2_portalGetJustificativasConfig_',
    'atividadesV2_portalListarJustificativasPendentesDiretoria',
    'atividadesV2_portalListarPendenciasJustificativasDiretoria',
    'atividadesV2_portalListarJustificativasDiretoria',
    'atividadesV2_portalGetJustificativasPendentesDiretoria'
  ].forEach(function mapear(nomeFuncao) {
    if (typeof globalThis !== 'undefined' && typeof globalThis[nomeFuncao] === 'function') {
      funcoes[nomeFuncao] = globalThis[nomeFuncao];
    }
  });

  return funcoes;
}

function portalNormalizarRespostaAcaoJustificativaV2_(resposta, config, inicio) {
  if (!resposta) {
    return portalRespostaErro_(
      'JUSTIFICATIVAS_V2_INDISPONIVEIS',
      'A integracao de justificativas V2 ainda nao esta disponivel.',
      {},
      portalMetaViewsV2_('geapa-atividades-indisponivel', inicio)
    );
  }

  if (resposta.ok === false) {
    return portalRespostaErro_(
      resposta.code || resposta.errorCode || 'ERRO_JUSTIFICATIVAS_V2',
      resposta.message || 'Nao foi possivel executar a acao de justificativa.',
      {},
      portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
    );
  }

  return portalRespostaOk_(
    config.code,
    resposta.message || config.message,
    resposta.data || resposta.dados || resposta || {},
    portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
  );
}

function portalApiGetPainelDiretoriaV2(token) {
  var inicio = portalAgoraViewsV2Ms_();
  var config = portalPainelDiretoriaV2Config_();
  var contexto = portalMontarContextoViewsV2_(token, config);

  if (!contexto.ok) {
    return contexto.resposta;
  }

  var cacheKey = portalCacheKey_('viewsV2r1:painelDiretoriaV2', contexto.identificadorSessao);
  var cache = portalLerJsonCacheViewsV2_(cacheKey);

  if (cache) {
    return portalRespostaOk_(
      'PAINEL_DIRETORIA_V2_CACHE',
      'Painel da diretoria carregado em cache temporario.',
      cache,
      portalMetaViewsV2_('cache', inicio)
    );
  }

  var pendencias = portalPainelDiretoriaV2LerFonte_(portalPainelDiretoriaV2PendenciasConfig_(), contexto);
  var statusViews = portalPainelDiretoriaV2LerFonte_(portalPainelDiretoriaV2StatusConfig_(), contexto);
  var painel = portalMontarPainelDiretoriaV2_(
    pendencias.ok ? pendencias.data : null,
    statusViews.ok ? statusViews.data : null,
    {
      pendencias: pendencias,
      statusViews: statusViews
    }
  );

  portalSalvarJsonCacheViewsV2_(cacheKey, painel);

  return portalRespostaOk_(
    'PAINEL_DIRETORIA_V2',
    'Painel da diretoria V2 carregado em modo somente leitura.',
    painel,
    portalMetaViewsV2_('views-v2-agregado', inicio)
  );
}

function portalPainelDiretoriaV2Config_() {
  return {
    id: 'painelDiretoriaV2',
    requerDiretoria: true,
    permissoes: [
      'diretoria:painel_v2',
      'diretoria:pendencias',
      'sistema:status_v2',
      'sistema:admin',
      'atividades:gerir',
      'membros:ler',
      'justificativas:analisar'
    ]
  };
}

function portalPainelDiretoriaV2PendenciasConfig_() {
  return {
    id: 'painelDiretoriaV2Pendencias',
    code: 'PAINEL_DIRETORIA_PENDENCIAS_V2',
    message: 'Pendencias V2 carregadas para o painel da diretoria.',
    listaCampo: 'pendencias',
    listaChaves: ['pendencias', 'pendenciasDiretoria', 'registros', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_PENDENCIAS_DIRETORIA'
    ],
    requerDiretoria: true,
    permissoes: portalPainelDiretoriaV2Config_().permissoes,
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
  };
}

function portalPainelDiretoriaV2StatusConfig_() {
  return {
    id: 'painelDiretoriaV2Status',
    code: 'PAINEL_DIRETORIA_STATUS_V2',
    message: 'Status das views V2 carregado para o painel da diretoria.',
    listaCampo: 'views',
    listaChaves: ['views', 'statusViews', 'status', 'itens'],
    resumoChaves: ['resumo', 'totais'],
    destino: 'atividades',
    registryKeys: [
      'ATIVIDADES_V2_PORTAL_STATUS',
      'ATIVIDADES_V2_PORTAL_STATUS_ATIVIDADES'
    ],
    requerDiretoria: true,
    permissoes: portalPainelDiretoriaV2Config_().permissoes,
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
  };
}

function portalPainelDiretoriaV2LerFonte_(config, contexto) {
  var resposta = portalChamarContratoViewsV2_(config, contexto);

  if (!resposta) {
    resposta = portalLerViewV2PorRegistry_(config);
  }

  return portalNormalizarRespostaViewsV2_(resposta, config, contexto);
}

function portalMontarPainelDiretoriaV2_(dadosPendencias, dadosStatus, fontes) {
  var pendencias = dadosPendencias && Array.isArray(dadosPendencias.pendencias)
    ? dadosPendencias.pendencias
    : [];
  var views = dadosStatus && Array.isArray(dadosStatus.views)
    ? dadosStatus.views
    : [];
  var blocosPendencias = portalPainelDiretoriaV2BlocosBase_();
  var blocosStatus = portalPainelDiretoriaV2MontarBlocosStatus_(views);
  var ultimaAtualizacao = portalPainelDiretoriaV2UltimaAtualizacao_(pendencias, views, dadosPendencias, dadosStatus);
  var avisos = portalPainelDiretoriaV2AvisosFontes_(fontes);

  pendencias.forEach(function distribuir(item) {
    var bloco = portalPainelDiretoriaV2EscolherBloco_(item);
    blocosPendencias[bloco].itens.push(portalPainelDiretoriaV2SanitizarPendencia_(item));
  });

  var blocos = Object.keys(blocosPendencias).map(function montar(chave) {
    return portalPainelDiretoriaV2FinalizarBloco_(blocosPendencias[chave]);
  }).concat(blocosStatus);

  return {
    ultimaAtualizacao: ultimaAtualizacao || new Date().toISOString(),
    somenteLeitura: true,
    niveis: ['ERRO', 'ALERTA', 'INFO'],
    resumo: portalPainelDiretoriaV2Resumo_(blocos),
    avisos: avisos,
    viewsDesatualizadas: blocos.some(function verificar(bloco) {
      return bloco.desatualizado === true;
    }),
    blocos: blocos
  };
}

function portalPainelDiretoriaV2BlocosBase_() {
  return {
    atividadesSemChamada: portalPainelDiretoriaV2CriarBloco_('atividadesSemChamada', 'Atividades sem chamada', 'INFO'),
    apresentacoesPendentes: portalPainelDiretoriaV2CriarBloco_('apresentacoesPendentes', 'Apresentacoes com pendencia', 'INFO'),
    justificativasPendentes: portalPainelDiretoriaV2CriarBloco_('justificativasPendentes', 'Justificativas pendentes', 'INFO'),
    membrosFrequenciaCritica: portalPainelDiretoriaV2CriarBloco_('membrosFrequenciaCritica', 'Membros com frequencia critica', 'INFO'),
    inconsistenciasCadastrais: portalPainelDiretoriaV2CriarBloco_('inconsistenciasCadastrais', 'Inconsistencias cadastrais', 'INFO'),
    errosCargosFuncoes: portalPainelDiretoriaV2CriarBloco_('errosCargosFuncoes', 'Erros de cargos/funcoes', 'INFO')
  };
}

function portalPainelDiretoriaV2CriarBloco_(id, titulo, nivelPadrao) {
  return {
    id: id,
    titulo: titulo,
    nivel: nivelPadrao || 'INFO',
    total: 0,
    itens: [],
    ultimaAtualizacao: '',
    desatualizado: false
  };
}

function portalPainelDiretoriaV2EscolherBloco_(item) {
  var texto = portalPainelDiretoriaV2TextoBusca_(item);

  if (portalPainelDiretoriaV2Contem_(texto, ['CHAMADA', 'PRESENCA', 'PRESENÇA'])) {
    return 'atividadesSemChamada';
  }

  if (portalPainelDiretoriaV2Contem_(texto, ['APRESENTACAO', 'APRESENTAÇÃO', 'BANCA', 'SEMINARIO', 'SEMINÁRIO'])) {
    return 'apresentacoesPendentes';
  }

  if (portalPainelDiretoriaV2Contem_(texto, ['JUSTIFICATIVA', 'ABONO'])) {
    return 'justificativasPendentes';
  }

  if (portalPainelDiretoriaV2Contem_(texto, ['FREQUENCIA', 'FREQUÊNCIA', 'FALTA', 'ASSIDUIDADE'])) {
    return 'membrosFrequenciaCritica';
  }

  if (portalPainelDiretoriaV2Contem_(texto, ['CARGO', 'FUNCAO', 'FUNÇÃO', 'VIGENCIA', 'VIGÊNCIA', 'DIRETORIA'])) {
    return 'errosCargosFuncoes';
  }

  return 'inconsistenciasCadastrais';
}

function portalPainelDiretoriaV2TextoBusca_(item) {
  return [
    item.tipo,
    item.titulo,
    item.descricaoPublica,
    item.status,
    item.severidade,
    item.responsavelGrupo
  ].join(' ').toUpperCase();
}

function portalPainelDiretoriaV2Contem_(texto, termos) {
  return termos.some(function contem(termo) {
    return texto.indexOf(termo) >= 0;
  });
}

function portalPainelDiretoriaV2SanitizarPendencia_(item) {
  return {
    id: String(item.idPendencia || '').slice(0, 80),
    tipo: String(item.tipo || 'Pendencia').slice(0, 80),
    titulo: String(item.titulo || item.tipo || 'Pendencia').slice(0, 140),
    descricao: String(item.descricaoPublica || '').slice(0, 220),
    status: String(item.status || '').slice(0, 60),
    nivel: portalPainelDiretoriaV2Nivel_(item),
    responsavelGrupo: String(item.responsavelGrupo || '').slice(0, 80),
    prazo: String(item.prazo || '').slice(0, 40),
    atualizadaEm: String(item.atualizadaEm || item.criadaEm || '').slice(0, 40)
  };
}

function portalPainelDiretoriaV2Nivel_(item) {
  var texto = [
    item.severidade,
    item.status,
    item.mensagem,
    item.descricaoPublica,
    item.ok === false ? 'ERRO' : ''
  ].join(' ').toUpperCase();

  if (portalPainelDiretoriaV2Contem_(texto, ['ERRO', 'CRITIC', 'CRÍTIC', 'ALTA', 'VENCID', 'FALHA', 'INCONSISTENTE'])) {
    return 'ERRO';
  }

  if (portalPainelDiretoriaV2Contem_(texto, ['ALERTA', 'MEDIA', 'MÉDIA', 'PENDENTE', 'ATENCAO', 'ATENÇÃO', 'BAIXA'])) {
    return 'ALERTA';
  }

  return 'INFO';
}

function portalPainelDiretoriaV2FinalizarBloco_(bloco) {
  bloco.total = bloco.itens.length;
  bloco.itens.forEach(function consolidar(item) {
    bloco.nivel = portalPainelDiretoriaV2PiorNivel_(bloco.nivel, item.nivel);
    bloco.ultimaAtualizacao = portalPainelDiretoriaV2MaiorData_(bloco.ultimaAtualizacao, item.atualizadaEm);
  });
  bloco.itens = bloco.itens.slice(0, 12);
  bloco.resumo = bloco.total === 0 ? 'Nenhuma ocorrencia encontrada.' : bloco.total + ' ocorrencia(s) em aberto.';
  return bloco;
}

function portalPainelDiretoriaV2MontarBlocosStatus_(views) {
  var jobs = portalPainelDiretoriaV2CriarBloco_('ultimaExecucaoJobs', 'Ultima execucao dos jobs', 'INFO');
  var status = portalPainelDiretoriaV2CriarBloco_('statusViewsPortal', 'Status das views do portal', 'INFO');

  views.forEach(function incluir(view) {
    var item = portalPainelDiretoriaV2SanitizarStatusView_(view);
    jobs.itens.push({
      id: item.id,
      tipo: 'Job/View',
      titulo: item.titulo,
      descricao: item.ultimaAtualizacao ? 'Atualizada em ' + item.ultimaAtualizacao : item.mensagem,
      status: item.status,
      nivel: item.nivel,
      atualizadaEm: item.ultimaAtualizacao
    });
    status.itens.push(item);
  });

  jobs = portalPainelDiretoriaV2FinalizarBloco_(jobs);
  status = portalPainelDiretoriaV2FinalizarBloco_(status);
  jobs.desatualizado = portalPainelDiretoriaV2TemViewDesatualizada_(views);
  status.desatualizado = jobs.desatualizado;
  jobs.nivel = jobs.desatualizado ? portalPainelDiretoriaV2PiorNivel_(jobs.nivel, 'ALERTA') : jobs.nivel;
  status.nivel = status.desatualizado ? portalPainelDiretoriaV2PiorNivel_(status.nivel, 'ALERTA') : status.nivel;
  jobs.resumo = jobs.desatualizado ? 'Ha jobs ou views com atualizacao antiga.' : jobs.resumo;
  status.resumo = status.desatualizado ? 'Ha views possivelmente desatualizadas.' : status.resumo;
  return [jobs, status];
}

function portalPainelDiretoriaV2SanitizarStatusView_(view) {
  var nivel = portalPainelDiretoriaV2Nivel_(view);
  var atualizadaEm = String(view.atualizadaEm || view.ultimaAtualizacao || '').slice(0, 40);

  if (portalPainelDiretoriaV2ViewDesatualizada_(view)) {
    nivel = portalPainelDiretoriaV2PiorNivel_(nivel, 'ALERTA');
  }

  return {
    id: String(view.view || view.nome || '').slice(0, 80),
    tipo: 'View',
    titulo: String(view.nome || view.view || 'View V2').slice(0, 120),
    descricao: String(view.mensagem || view.origem || '').slice(0, 220),
    status: String(view.status || (view.ok === false ? 'ERRO' : 'OK')).slice(0, 60),
    nivel: nivel,
    linhas: view.linhas,
    origem: String(view.origem || '').slice(0, 80),
    atualizadaEm: atualizadaEm,
    ultimaAtualizacao: atualizadaEm
  };
}

function portalPainelDiretoriaV2TemViewDesatualizada_(views) {
  return (views || []).some(function verificar(view) {
    return portalPainelDiretoriaV2ViewDesatualizada_(view);
  });
}

function portalPainelDiretoriaV2ViewDesatualizada_(view) {
  var valor = view.atualizadaEm || view.ultimaAtualizacao || '';
  var ts = portalPainelDiretoriaV2Timestamp_(valor);

  if (!ts) {
    return true;
  }

  return portalAgoraViewsV2Ms_() - ts > 24 * 60 * 60 * 1000;
}

function portalPainelDiretoriaV2Timestamp_(valor) {
  var texto = String(valor || '').trim();
  var partes;
  var dt;

  if (!texto) {
    return 0;
  }

  dt = new Date(texto);
  if (!isNaN(dt.getTime())) {
    return dt.getTime();
  }

  partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (partes) {
    dt = new Date(
      Number(partes[3]),
      Number(partes[2]) - 1,
      Number(partes[1]),
      Number(partes[4] || 0),
      Number(partes[5] || 0)
    );
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  return 0;
}

function portalPainelDiretoriaV2MaiorData_(atual, candidata) {
  var tsAtual = portalPainelDiretoriaV2Timestamp_(atual);
  var tsCandidata = portalPainelDiretoriaV2Timestamp_(candidata);

  return tsCandidata > tsAtual ? candidata : atual;
}

function portalPainelDiretoriaV2UltimaAtualizacao_(pendencias, views, dadosPendencias, dadosStatus) {
  var ultima = '';

  ultima = portalPainelDiretoriaV2MaiorData_(ultima, dadosPendencias && dadosPendencias.ultimaAtualizacao);
  ultima = portalPainelDiretoriaV2MaiorData_(ultima, dadosStatus && dadosStatus.ultimaAtualizacao);
  (pendencias || []).forEach(function olhar(item) {
    ultima = portalPainelDiretoriaV2MaiorData_(ultima, item.atualizadaEm || item.criadaEm);
  });
  (views || []).forEach(function olhar(view) {
    ultima = portalPainelDiretoriaV2MaiorData_(ultima, view.atualizadaEm || view.ultimaAtualizacao);
  });

  return ultima;
}

function portalPainelDiretoriaV2PiorNivel_(atual, novo) {
  var ordem = {
    INFO: 1,
    ALERTA: 2,
    ERRO: 3
  };

  return (ordem[novo] || 1) > (ordem[atual] || 1) ? novo : atual;
}

function portalPainelDiretoriaV2Resumo_(blocos) {
  return (blocos || []).reduce(function resumir(acc, bloco) {
    acc.total += Number(bloco.total || 0);
    acc[bloco.nivel] += Number(bloco.total || 0);
    if (bloco.desatualizado) {
      acc.viewsDesatualizadas += 1;
    }
    return acc;
  }, {
    total: 0,
    ERRO: 0,
    ALERTA: 0,
    INFO: 0,
    viewsDesatualizadas: 0
  });
}

function portalPainelDiretoriaV2AvisosFontes_(fontes) {
  var avisos = [];

  if (fontes && fontes.pendencias && fontes.pendencias.ok === false) {
    avisos.push({
      nivel: 'ALERTA',
      mensagem: 'Pendencias V2 indisponiveis no momento.'
    });
  }

  if (fontes && fontes.statusViews && fontes.statusViews.ok === false) {
    avisos.push({
      nivel: 'ALERTA',
      mensagem: 'Status das views V2 indisponivel no momento.'
    });
  }

  return avisos;
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

function portalExecutarMinhasJustificativasV2_(token, config) {
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
      'Justificativas V2 carregadas em cache temporario.',
      cache,
      portalMetaViewsV2_('cache', inicio)
    );
  }

  var resposta = portalChamarContratoViewsV2_(config, contexto);

  if (!resposta) {
    resposta = portalLerViewV2PorRegistry_(config);
  }

  var normalizada = portalNormalizarMinhasJustificativasV2_(resposta, config, contexto);

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

  if (typeof atividadesV2_portalGetMinhasJustificativas === 'function') {
    funcoes.atividadesV2_portalGetMinhasJustificativas = atividadesV2_portalGetMinhasJustificativas;
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

function portalNormalizarMinhaFrequenciaV2_(resposta, contexto, inicio) {
  if (!resposta) {
    return portalRespostaErro_(
      'FREQUENCIA_V2_INDISPONIVEL',
      'A integracao de frequencia V2 ainda nao esta disponivel.',
      {},
      portalMetaViewsV2_('geapa-atividades-indisponivel', inicio)
    );
  }

  if (resposta.ok === false) {
    return portalRespostaErro_(
      resposta.code || resposta.errorCode || 'ERRO_FREQUENCIA_V2',
      resposta.message || 'Nao foi possivel consultar sua frequencia.',
      {},
      portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
    );
  }

  var bruto = resposta.data || resposta.dados || resposta;
  var registros = portalSanitizarRegistrosFrequenciaV2_(
    portalExtrairListaViewsV2_(bruto, ['registros', 'frequencia', 'itens'])
  );
  var ciclos = Array.isArray(bruto.ciclos)
    ? bruto.ciclos.map(portalSanitizarCicloFrequenciaV2_)
    : [];

  if (!ciclos.length && registros.length) {
    ciclos = [{
      ciclo: bruto.cicloAtual || '',
      rotuloCiclo: bruto.rotuloCiclo || bruto.cicloAtual || 'Todos os registros',
      resumo: portalSanitizarResumoFrequenciaV2_(bruto.resumoGeral || bruto.resumo || bruto.totais || {}),
      registros: registros
    }];
  }

  return portalRespostaOk_(
    'MINHA_FREQUENCIA_V2',
    resposta.message || 'Minha frequencia carregada pelo modulo Atividades.',
    {
      sessao: portalResumoSessaoViewsV2_(contexto),
      resumoGeral: portalSanitizarResumoFrequenciaV2_(bruto.resumoGeral || bruto.resumo || bruto.totais || {}),
      cicloAtual: portalObterCampoFlexViewsV2_(bruto, ['cicloAtual', 'ciclo', 'periodoAtual']),
      ciclos: ciclos,
      registros: registros,
      ultimaAtualizacao: portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt']) ||
        portalObterUltimaAtualizacaoListaViewsV2_(registros)
    },
    portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
  );
}

function portalSanitizarCicloFrequenciaV2_(ciclo) {
  var dados = ciclo || {};
  return {
    ciclo: portalObterCampoFlexViewsV2_(dados, ['ciclo', 'idCiclo', 'periodo']) || '',
    rotuloCiclo: portalObterCampoFlexViewsV2_(dados, ['rotuloCiclo', 'rotuloSemestre', 'periodoLetivo', 'ciclo']) || '',
    ano: portalObterCampoFlexViewsV2_(dados, ['ano', 'anoLetivo']) || '',
    semestre: portalObterCampoFlexViewsV2_(dados, ['semestre', 'semestreLetivo']) || '',
    resumo: portalSanitizarResumoFrequenciaV2_(dados.resumo || dados.resumoGeral || dados.totais || {}),
    registros: portalSanitizarRegistrosFrequenciaV2_(
      Array.isArray(dados.registros) ? dados.registros : portalExtrairListaViewsV2_(dados, ['atividades', 'itens'])
    )
  };
}

function portalSanitizarResumoFrequenciaV2_(resumo) {
  return portalSanitizarObjetoBasicoViewsV2_(resumo || {}, [
    'total',
    'totalAtividades',
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
    'mensagemPortal'
  ]);
}

function portalSanitizarRegistrosFrequenciaV2_(registros) {
  return (registros || []).map(function sanitizar(item) {
    return portalSanitizarObjetoBasicoViewsV2_(item || {}, [
      'idRegistroPresenca',
      'idAtividade',
      'dataAtividade',
      'tituloAtividade',
      'tituloPublico',
      'rotuloSemestre',
      'statusPresenca',
      'statusPresencaRotulo',
      'idJustificativa',
      'statusJustificativa',
      'podeEnviarJustificativa',
      'podeVerJustificativa',
      'podeComplementarJustificativa',
      'acaoJustificativa',
      'mensagemPortal',
      'dataLimiteJustificativa',
      'prazoJustificativa',
      'envioForaDoPrazo',
      'exigeCienciaForaPrazo'
    ]);
  });
}

function portalNormalizarConfigJustificativasV2_(resposta, config, inicio) {
  if (!resposta) {
    return portalRespostaErro_(
      'JUSTIFICATIVAS_CONFIG_INDISPONIVEL',
      'A configuracao de justificativas V2 ainda nao esta disponivel.',
      {},
      portalMetaViewsV2_('geapa-atividades-indisponivel', inicio)
    );
  }

  if (resposta.ok === false) {
    return portalRespostaErro_(
      resposta.code || resposta.errorCode || 'ERRO_JUSTIFICATIVAS_CONFIG',
      resposta.message || 'Nao foi possivel carregar a configuracao de justificativas.',
      {},
      portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
    );
  }

  return portalRespostaOk_(
    config.code,
    resposta.message || config.message,
    portalSanitizarConfigJustificativasV2_(resposta.data || resposta.dados || resposta || {}),
    portalMetaViewsV2_(resposta.origem || 'geapa-atividades', inicio)
  );
}

function portalSanitizarConfigJustificativasV2_(config) {
  var dados = config || {};
  return {
    motivos: portalSanitizarMotivosJustificativaV2_(dados.motivos || dados.motivosDisponiveis || dados.motivosPadronizados),
    upload: portalSanitizarUploadJustificativasV2_(dados.upload || dados.regrasUpload || dados.documentoComprobatorio || dados),
    regras: portalSanitizarObjetoBasicoViewsV2_(dados.regras || dados, [
      'descricaoMinimaOutro',
      'exigeDescricaoOutro',
      'permiteLinkDocumento',
      'permiteUploadDocumento'
    ]),
    ultimaAtualizacao: portalObterCampoFlexViewsV2_(dados, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt'])
  };
}

function portalSanitizarMotivosJustificativaV2_(motivos) {
  var lista = Array.isArray(motivos) ? motivos : [];
  return lista.map(function sanitizar(motivo) {
    if (typeof motivo === 'string') {
      return {
        valor: motivo,
        rotulo: motivo
      };
    }

    return portalSanitizarObjetoBasicoViewsV2_(motivo || {}, [
      'valor',
      'codigo',
      'rotulo',
      'label',
      'descricao',
      'descricaoResumida'
    ]);
  }).filter(function filtrar(motivo) {
    return motivo.valor || motivo.codigo;
  });
}

function portalSanitizarUploadJustificativasV2_(upload) {
  var dados = upload || {};
  return {
    formatosAceitos: portalGarantirListaStringsV2_(dados.formatosAceitos || dados.extensoesAceitas || ['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX']),
    mimeTypesAceitos: portalGarantirListaStringsV2_(dados.mimeTypesAceitos || dados.mimesAceitos || []),
    tamanhoMaximoBytes: Number(dados.tamanhoMaximoBytes || dados.limiteBytes || dados.maxBytes || 10 * 1024 * 1024)
  };
}

function portalGarantirListaStringsV2_(valor) {
  if (Array.isArray(valor)) {
    return valor.map(function texto(item) {
      return String(item || '').trim();
    }).filter(Boolean);
  }

  return String(valor || '')
    .split(/[;,]/)
    .map(function texto(item) {
      return item.trim();
    })
    .filter(Boolean);
}

function portalNormalizarMinhasJustificativasV2_(resposta, config, contexto) {
  if (!resposta) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        'JUSTIFICATIVAS_V2_INDISPONIVEIS',
        'A integracao de justificativas V2 ainda nao esta disponivel.',
        {}
      )
    };
  }

  if (resposta.ok === false) {
    return {
      ok: false,
      resposta: portalRespostaErro_(
        resposta.code || resposta.errorCode || 'ERRO_JUSTIFICATIVAS_V2',
        resposta.message || 'Nao foi possivel consultar suas justificativas.',
        {}
      )
    };
  }

  var bruto = resposta.data || resposta.dados || resposta;
  var faltasBrutas = portalExtrairListaViewsV2_(bruto, [
    'faltasJustificaveis',
    'faltas',
    'faltasPendentes'
  ]);
  var justificativasBrutas = portalExtrairListaViewsV2_(bruto, [
    'justificativas',
    'minhasJustificativas',
    'registros',
    'itens'
  ]);
  var faltas = portalFiltrarListaPropriaViewsV2_(faltasBrutas, contexto).map(function sanitizarFalta(item) {
    return portalSanitizarItemViewsV2_(item, config.camposFaltas, config.aliasesFaltas);
  });
  var justificativas = portalFiltrarListaPropriaViewsV2_(justificativasBrutas, contexto).map(function sanitizarJustificativa(item) {
    return portalSanitizarItemViewsV2_(item, config.camposJustificativas, config.aliasesJustificativas);
  });
  var atualizacao = portalObterCampoFlexViewsV2_(bruto, ['ultimaAtualizacao', 'atualizadoEm', 'updatedAt']) ||
    portalObterUltimaAtualizacaoListaViewsV2_(justificativas) ||
    portalObterUltimaAtualizacaoListaViewsV2_(faltas);

  return {
    ok: true,
    origem: (resposta.meta && resposta.meta.origem) || resposta.origem || 'geapa-atividades',
    data: {
      sessao: portalResumoSessaoViewsV2_(contexto),
      resumo: portalExtrairResumoViewsV2_(bruto, config.resumoChaves),
      ultimaAtualizacao: atualizacao,
      faltasJustificaveis: faltas,
      justificativas: justificativas
    }
  };
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
    'podeVerDetalhes',
    'ciclo',
    'ano',
    'anoAtividade',
    'anoLetivo',
    'semestre',
    'semestreAtividade',
    'semestreLetivo',
    'rotuloSemestre',
    'periodoLetivo',
    'cicloSemestre',
    'eixoTematicoPrincipal',
    'eixoTematicoSecundario',
    'nomePessoaPrincipalPublico',
    'papelPessoaPrincipal',
    'tipoPessoaPrincipal',
    'qtdApresentacoes',
    'resumoApresentacoesPublico',
    'possuiApresentacoes',
    'podeJustificarAusenciaFutura',
    'justificativaPreviaEnviada',
    'idJustificativaPrevia',
    'statusJustificativaPrevia',
    'motivoJustificativaPreviaIndisponivel',
    'mensagemJustificativaPrevia'
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

function portalInvalidarCachesJustificativasV2_(contexto) {
  var identificador = contexto && contexto.identificadorSessao;
  var contextoAtividades = contexto ? portalMontarContextoAtividadesReadonlyV2_(contexto) : {};
  var perfilAtividades = contextoAtividades.perfil || 'MEMBRO';

  if (!identificador) {
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
