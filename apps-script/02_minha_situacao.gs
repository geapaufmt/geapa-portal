/**
 * Tela "Minha situacao no GEAPA".
 *
 * Nesta fase, o portal ja usa o cadastro localizado pelo GEAPA-CORE ou pelo
 * fallback de teste para exibir dados cadastrais basicos do proprio membro.
 * Frequencia, pendencias, certificados e historico ainda permanecem como
 * placeholders ate que o contrato definitivo seja criado no GEAPA-CORE.
 */

/**
 * Retorna a situacao do membro autenticado por token temporario.
 *
 * Futuramente:
 * - validar o token;
 * - descobrir o membro associado ao token;
 * - consultar dados oficiais via GEAPA-CORE;
 * - retornar apenas informacoes do proprio membro.
 *
 * @param {string} token Token temporario recebido apos validar codigo.
 * @return {Object} Situacao parcial do membro.
 */
function portalMinhaSituacao(token) {
  var inicio = portalAgoraMs_();
  var tokenNormalizado = String(token || '').trim();

  if (!tokenNormalizado) {
    return portalRespostaErro_(
      'SESSAO_OBRIGATORIA',
      'Informe a sessão temporária para consultar a situação.',
      {}
    );
  }

  if (!portalSessaoTemporariaValida_(tokenNormalizado)) {
    return portalRespostaErro_(
      'SESSAO_INVALIDA_OU_EXPIRADA',
      'Sessão inválida ou expirada. Entre novamente.',
      {}
    );
  }

  var identificadorSessao = portalGetIdentificadorSessao_(tokenNormalizado);
  var situacaoCache = portalLerMinhaSituacaoCache_(identificadorSessao);

  if (situacaoCache) {
    var sessaoCache = portalExtrairSessaoMinhaSituacao_(situacaoCache) ||
      portalResolverSessaoAtualViaGeapaCore_(identificadorSessao, {
        origem: 'minhaSituacao-cache'
      });

    if (sessaoCache && !situacaoCache.sessao) {
      situacaoCache.sessao = sessaoCache;
    }

    return portalRespostaOk_(
      'MINHA_SITUACAO_CACHE',
      'Minha situação carregada em cache temporário.',
      {
        tokenRecebido: token || '',
        sessao: sessaoCache,
        situacao: situacaoCache
      },
      portalMetaDesempenho_('cache', inicio)
    );
  }

  var situacaoCore = portalBuscarMinhaSituacaoViaGeapaCore_(identificadorSessao);

  if (situacaoCore) {
    portalSalvarMinhaSituacaoCache_(identificadorSessao, situacaoCore);
    return portalRespostaOk_(
      'MINHA_SITUACAO_CORE',
      'Minha situação carregada pelo GEAPA-CORE.',
      {
        tokenRecebido: token || '',
        sessao: portalExtrairSessaoMinhaSituacao_(situacaoCore),
        situacao: situacaoCore
      },
      portalMetaDesempenho_('geapa-core', inicio)
    );
  }

  var membro = portalBuscarMembroPorIdentificadorSessao_(identificadorSessao);
  var sessaoFallback = portalResolverSessaoAtualViaGeapaCore_(identificadorSessao, {
    origem: 'minhaSituacao-fallback'
  });

  if (!membro) {
    return portalRespostaErro_(
      'MEMBRO_SESSAO_NAO_ENCONTRADO',
      'Não foi possível localizar o cadastro de teste da sessão.',
      {}
    );
  }

  var situacaoParcial = portalMontarMinhaSituacaoParcial_(membro, sessaoFallback);
  portalSalvarMinhaSituacaoCache_(identificadorSessao, situacaoParcial);

  return portalRespostaOk_(
    'MINHA_SITUACAO_PARCIAL',
    'Dados cadastrais carregados. Os demais blocos ainda estão em preparação.',
    {
      tokenRecebido: token || '',
      sessao: portalExtrairSessaoMinhaSituacao_(situacaoParcial),
      situacao: situacaoParcial
    },
    portalMetaDesempenho_('fallback-local', inicio)
  );
}

/**
 * Funcao de debug para desenvolvimento inicial por RGA.
 *
 * Esta funcao retorna dados simulados, sem consultar planilhas e sem expor
 * dados reais. Ela podera ser removida ou protegida antes da publicacao.
 *
 * @param {string} rga RGA usado apenas para simular a consulta.
 * @return {Object} Dados simulados da situacao do membro.
 */
function portalDebugMinhaSituacaoPorRga(rga) {
  return portalMontarMinhaSituacaoParcial_({
    rga: rga || 'RGA-SIMULADO',
    nomeExibicao: 'Membro GEAPA',
    situacaoGeral: 'Em simulação',
    vinculo: 'Membro em acompanhamento'
  });
}

/**
 * Monta a primeira versao da tela "Minha situacao".
 *
 * Campos cadastrais basicos podem vir do GEAPA-CORE. Os demais blocos ainda
 * ficam com textos de preparacao para evitar expor dados reais antes do
 * contrato definitivo.
 *
 * @param {Object} membro Membro normalizado.
 * @param {Object=} sessao Sessao oficial resolvida pelo GEAPA-CORE.
 * @return {Object} Dados parciais da situacao.
 */
function portalMontarMinhaSituacaoParcial_(membro, sessao) {
  var usuario = portalMontarUsuarioDeSessao_(sessao, membro) ||
    portalMontarUsuarioBasico_(membro);

  return {
    rga: membro.rga || 'RGA-SIMULADO',
    nomeExibicao: membro.nomeExibicao || 'Membro GEAPA',
    situacaoGeral: membro.situacaoGeral || 'Cadastro localizado',
    vinculo: membro.vinculo || 'Membro em acompanhamento',
    sessao: sessao || null,
    usuario: usuario,
    dadosCadastraisReais: membro.origem !== 'teste',
    blocosComplementares: 'em-preparacao',
    ultimaAtualizacao: new Date().toISOString(),
    resumo: {
      frequencia: 'Em preparação',
      pendenciasAbertas: 0,
      certificadosDisponiveis: 0
    },
    pendencias: [],
    participacao: {
      frequenciaGeral: 'Participação e frequência serão integradas em uma próxima etapa.',
      atividadesRecentes: []
    },
    certificados: [],
    avisos: [
      'Os dados cadastrais básicos já são carregados pelo backend do portal.',
      'Frequência, pendências, certificados e histórico ainda não foram integrados.',
      'Nenhum dado oficial é acessado diretamente pelo GitHub Pages.'
    ]
  };
}

/**
 * Normaliza o contrato da tela "Minha situacao" retornado pelo GEAPA-CORE.
 *
 * O GEAPA-CORE retorna um objeto com `membro` e `minhaSituacao`. O portal
 * transforma esse contrato no formato unico consumido pelo front-end, sem
 * repassar e-mail cadastrado nem detalhes tecnicos.
 *
 * @param {Object} resposta Resposta da funcao do GEAPA-CORE.
 * @param {Object=} sessaoResolvida Sessao oficial ja resolvida pelo CORE.
 * @return {Object|null} Situacao normalizada ou nulo.
 */
function portalNormalizarMinhaSituacaoCore_(resposta, sessaoResolvida) {
  if (!resposta || resposta.ok !== true || !resposta.membro) {
    return null;
  }

  var membro = portalNormalizarMembro_(resposta.membro, 'GEAPA_CORE');
  var sessao = portalNormalizarSessaoPortalCore_(resposta.sessao) ||
    sessaoResolvida ||
    null;
  var usuario = portalMontarUsuarioDeSessao_(sessao, membro) ||
    portalNormalizarUsuarioCore_(resposta.usuario) ||
    portalMontarUsuarioBasico_(membro);

  if (!sessao) {
    usuario = portalAplicarAutorizacaoPortalCore_(usuario, membro);
  }

  var situacao = resposta.minhaSituacao || {};
  var resumo = situacao.resumo || {};
  var participacao = situacao.participacao || {};
  var diretoria = situacao.diretoria || {};
  var avisos = situacao.avisos || [];

  if (!avisos.length) {
    avisos = [
      'Dados carregados pelo GEAPA-CORE.',
      'Frequência, pendências, certificados e histórico serão exibidos conforme forem integrados ao core.'
    ];
  }

  return {
    rga: membro.rga,
    nomeExibicao: membro.nomeExibicao,
    situacaoGeral: membro.situacaoGeral || 'Cadastro localizado',
    vinculo: membro.vinculo || 'Membro em acompanhamento',
    sessao: sessao,
    usuario: usuario,
    dadosCadastraisReais: true,
    blocosComplementares: 'geapa-core',
    ultimaAtualizacao: new Date().toISOString(),
    resumo: {
      frequencia: resumo.frequencia || 'Em preparação',
      pendenciasAbertas: Number(resumo.pendenciasAbertas || 0),
      certificadosDisponiveis: Number(resumo.certificadosDisponiveis || 0)
    },
    pendencias: Array.isArray(situacao.pendencias) ? situacao.pendencias : [],
    participacao: {
      frequenciaGeral: participacao.frequenciaGeral || 'Participação e frequência serão integradas em uma próxima etapa.',
      atividadesRecentes: Array.isArray(participacao.atividadesRecentes)
        ? participacao.atividadesRecentes
        : [],
      apresentacoes: portalNormalizarApresentacoesCore_(participacao.apresentacoes)
    },
    diretoria: portalNormalizarDiretoriaCore_(diretoria),
    certificados: Array.isArray(situacao.certificados) ? situacao.certificados : [],
    avisos: avisos
  };
}

/**
 * Monta o contrato minimo de usuario para fallback local.
 *
 * Mesmo no fallback, o usuario autenticado deve ser tratado como MEMBRO para
 * que o front-end nao precise inventar perfil.
 *
 * @param {Object} membro Membro normalizado.
 * @return {Object} Usuario seguro para a interface.
 */
function portalMontarUsuarioBasico_(membro) {
  var dados = membro || {};

  return {
    id: String(dados.id || dados.rga || dados.emailCadastrado || '').trim(),
    idPessoa: String(dados.idPessoa || dados.id || '').trim(),
    nomeExibicao: String(dados.nomeExibicao || 'Membro GEAPA').trim(),
    email: String(dados.emailCadastrado || dados.email || '').trim(),
    rga: String(dados.rga || '').trim(),
    perfilPrincipal: 'MEMBRO',
    perfis: ['MEMBRO'],
    perfisPortal: ['MEMBRO'],
    portalAtivo: true,
    tipoVinculoAtual: '',
    statusVinculoAtual: '',
    cargoFuncaoAtual: '',
    cargosAtuais: [],
    permissoes: portalPermissoesUsuarioVazias_()
  };
}

/**
 * Adapta a sessao oficial para o bloco legado `usuario`.
 *
 * Este bloco existe para compatibilidade visual. Ele nao decide perfil nem
 * permissao: apenas reapresenta o que veio de `data.sessao`.
 *
 * @param {Object|null} sessao Sessao canonica do CORE.
 * @param {Object=} membro Membro legado usado como fallback de identidade.
 * @return {Object|null} Usuario legado seguro.
 */
function portalMontarUsuarioDeSessao_(sessao, membro) {
  if (!sessao) {
    return null;
  }

  var dadosMembro = membro || {};
  var perfis = Array.isArray(sessao.perfisPortal) && sessao.perfisPortal.length
    ? sessao.perfisPortal
    : [sessao.perfilPortalEfetivo || 'MEMBRO'];

  return {
    id: String(sessao.idPessoa || dadosMembro.id || dadosMembro.rga || '').trim(),
    idPessoa: String(sessao.idPessoa || dadosMembro.id || '').trim(),
    nomeExibicao: String(sessao.nomeExibicao || dadosMembro.nomeExibicao || 'Membro GEAPA').trim(),
    email: String(sessao.email || dadosMembro.emailCadastrado || '').trim(),
    rga: String(sessao.rga || dadosMembro.rga || '').trim(),
    perfilPrincipal: portalNormalizarPerfilUsuario_(sessao.perfilPortalEfetivo || perfis[0] || 'MEMBRO'),
    perfilPortalEfetivo: portalNormalizarPerfilUsuario_(sessao.perfilPortalEfetivo || perfis[0] || 'MEMBRO'),
    perfis: portalUnicos_(perfis.map(portalNormalizarPerfilUsuario_)),
    perfisPortal: portalUnicos_(perfis.map(portalNormalizarPerfilUsuario_)),
    portalAtivo: sessao.portalAtivo !== false,
    tipoVinculoAtual: String(sessao.tipoVinculoAtual || '').trim(),
    statusVinculoAtual: String(sessao.statusVinculoAtual || '').trim(),
    cargoFuncaoAtual: String(sessao.cargoFuncaoAtual || '').trim(),
    cargosAtuais: Array.isArray(sessao.cargosAtuais)
      ? sessao.cargosAtuais.map(portalNormalizarCargoUsuario_)
      : [],
    permissoes: portalMontarPermissoesUsuarioDeSessao_(sessao)
  };
}

/**
 * Normaliza o bloco usuario retornado pelo GEAPA-CORE.
 *
 * O bloco pode conter e-mail do proprio usuario, mas a interface usa apenas
 * perfil, cargos e permissoes para montar navegacao. Dados de terceiros nunca
 * devem passar por este contrato.
 *
 * @param {Object} usuario Bloco bruto do Core.
 * @return {Object|null} Usuario normalizado.
 */
function portalNormalizarUsuarioCore_(usuario) {
  if (!usuario) {
    return null;
  }

  var perfis = Array.isArray(usuario.perfis) && usuario.perfis.length
    ? usuario.perfis.map(portalNormalizarPerfilUsuario_)
    : ['MEMBRO'];
  var cargos = Array.isArray(usuario.cargosAtuais)
    ? usuario.cargosAtuais.map(portalNormalizarCargoUsuario_)
    : [];

  return {
    id: String(usuario.id || usuario.rga || '').trim(),
    idPessoa: String(usuario.idPessoa || usuario.id || '').trim(),
    nomeExibicao: String(usuario.nomeExibicao || 'Membro GEAPA').trim(),
    email: String(usuario.email || '').trim(),
    rga: String(usuario.rga || '').trim(),
    perfilPrincipal: portalNormalizarPerfilUsuario_(usuario.perfilPrincipal || perfis[0] || 'MEMBRO'),
    perfis: portalUnicos_(perfis),
    perfisPortal: portalUnicos_(perfis),
    portalAtivo: usuario.portalAtivo !== false,
    tipoVinculoAtual: String(usuario.tipoVinculoAtual || '').trim(),
    statusVinculoAtual: String(usuario.statusVinculoAtual || '').trim(),
    cargoFuncaoAtual: String(usuario.cargoFuncaoAtual || '').trim(),
    cargosAtuais: cargos,
    permissoes: portalNormalizarPermissoesUsuario_(usuario.permissoes)
  };
}

/**
 * Normaliza perfis conhecidos do portal.
 *
 * @param {*} perfil Perfil bruto.
 * @return {string} Perfil seguro.
 */
function portalNormalizarPerfilUsuario_(perfil) {
  var normalizado = String(perfil || 'MEMBRO')
    .trim()
    .toUpperCase();
  var permitidos = [
    'VISITANTE',
    'PARTICIPANTE_EXTERNO',
    'EXTERNO',
    'COLABORADOR',
    'EGRESSO',
    'MEMBRO',
    'DIRETORIA',
    'PRESIDENCIA',
    'SECRETARIA',
    'COMUNICACAO',
    'CONSELHO',
    'ASSESSORIA',
    'ADMIN',
    'ADMIN_TECNICO'
  ];

  return permitidos.indexOf(normalizado) >= 0 ? normalizado : 'MEMBRO';
}

/**
 * Normaliza um cargo atual do usuario.
 *
 * @param {Object} cargo Cargo retornado pelo Core.
 * @return {Object} Cargo seguro para a interface.
 */
function portalNormalizarCargoUsuario_(cargo) {
  var dados = cargo || {};

  return {
    cargoKey: String(dados.cargoKey || '').trim(),
    cargoNome: String(dados.cargoNome || '').trim(),
    grupoCargo: String(dados.grupoCargo || '').trim(),
    fonte: String(dados.fonte || '').trim(),
    idDiretoria: String(dados.idDiretoria || '').trim(),
    dataInicio: String(dados.dataInicio || '').trim(),
    dataFimPrevista: String(dados.dataFimPrevista || '').trim()
  };
}

/**
 * Retorna permissoes falsas para membro comum.
 *
 * @return {Object} Permissoes padrao.
 */
function portalPermissoesUsuarioVazias_() {
  return {
    podeVerAreaDiretoria: false,
    podeGerenciarAtividades: false,
    podeRegistrarChamada: false,
    podeEditarAtividade: false,
    podeAnalisarJustificativas: false,
    podeGerenciarCertificados: false,
    podeGerenciarComunicacao: false,
    podeGerenciarConfiguracoes: false
  };
}

/**
 * Normaliza permissoes booleanas do usuario.
 *
 * @param {Object} permissoes Permissoes brutas.
 * @return {Object} Permissoes seguras.
 */
function portalNormalizarPermissoesUsuario_(permissoes) {
  var base = portalPermissoesUsuarioVazias_();
  var dados = permissoes || {};
  var chaves = Object.keys(base);

  if (Array.isArray(permissoes)) {
    permissoes.forEach(function guardarPermissaoCanonica(permissao) {
      var chave = String(permissao || '').trim();
      if (chave) {
        base[chave] = true;
      }
    });

    return base;
  }

  for (var i = 0; i < chaves.length; i++) {
    base[chaves[i]] = dados[chaves[i]] === true;
  }

  Object.keys(dados).forEach(function copiarPermissaoCanonica(chave) {
    if (chaves.indexOf(chave) < 0) {
      base[chave] = dados[chave] === true;
    }
  });

  return base;
}

/**
 * Monta permissoes legadas e canonicas a partir da sessao oficial.
 *
 * @param {Object} sessao Sessao canonica do CORE.
 * @return {Object} Mapa de permissoes para compatibilidade visual.
 */
function portalMontarPermissoesUsuarioDeSessao_(sessao) {
  var lista = Array.isArray(sessao && sessao.permissoes) ? sessao.permissoes : [];
  var permissoes = portalNormalizarPermissoesPortalCore_(lista);

  lista.forEach(function copiarCanonica(permissao) {
    var chave = String(permissao || '').trim();
    if (chave) {
      permissoes[chave] = true;
    }
  });

  return permissoes;
}

/**
 * Aplica permissÃµes do novo controle PORTAL_* do GEAPA-CORE, quando
 * disponivel.
 *
 * Essa camada permite que `PERFIL_PORTAL = ADMIN` e permissoes como
 * `presencas:gerir` e `atividades:gerir` liberem a interface operacional do
 * portal, sem substituir a validacao real do backend.
 *
 * @param {Object} usuario Usuario ja normalizado.
 * @param {Object} membro Membro da sessao.
 * @return {Object} Usuario com perfis/permissoes enriquecidos.
 */
function portalAplicarAutorizacaoPortalCore_(usuario, membro) {
  var dados = usuario || portalMontarUsuarioBasico_(membro);
  var autorizacao = portalBuscarAutorizacaoPortalCore_(membro);

  if (!autorizacao || (autorizacao.authorized !== true && autorizacao.ok !== true)) {
    return dados;
  }

  var perfilPortal = portalNormalizarPerfilUsuario_(
    autorizacao.perfilPortal || autorizacao.perfil || ''
  );
  var permissoes = portalNormalizarPermissoesPortalCore_(
    autorizacao.permissions || autorizacao.permissoes || []
  );
  var perfis = Array.isArray(dados.perfis) ? dados.perfis.slice() : ['MEMBRO'];

  if (perfilPortal && perfis.indexOf(perfilPortal) < 0) {
    perfis.push(perfilPortal);
  }

  if (perfilPortal === 'ADMIN' && perfis.indexOf('ADMIN_TECNICO') < 0) {
    perfis.push('ADMIN_TECNICO');
  }

  return {
    id: dados.id,
    idPessoa: dados.idPessoa || dados.id || '',
    nomeExibicao: dados.nomeExibicao,
    email: dados.email || '',
    rga: dados.rga,
    perfilPrincipal: perfilPortal && perfilPortal !== 'MEMBRO'
      ? perfilPortal
      : dados.perfilPrincipal,
    perfis: portalUnicos_(perfis),
    perfisPortal: portalUnicos_(perfis),
    portalAtivo: dados.portalAtivo !== false,
    tipoVinculoAtual: dados.tipoVinculoAtual || '',
    statusVinculoAtual: dados.statusVinculoAtual || '',
    cargoFuncaoAtual: dados.cargoFuncaoAtual || '',
    cargosAtuais: dados.cargosAtuais || [],
    permissoes: portalMesclarPermissoesUsuario_(dados.permissoes, permissoes)
  };
}

function portalBuscarAutorizacaoPortalCore_(membro) {
  var identificador = String((membro && (membro.emailCadastrado || membro.rga)) || '').trim();

  if (!identificador) {
    return null;
  }

  try {
    if (typeof corePortalAuthorizeEmail === 'function') {
      return corePortalAuthorizeEmail(identificador, {});
    }

    if (
      typeof GEAPA_CORE !== 'undefined' &&
      typeof GEAPA_CORE.corePortalAuthorizeEmail === 'function'
    ) {
      return GEAPA_CORE.corePortalAuthorizeEmail(identificador, {});
    }

    if (
      typeof GEAPA_CORE !== 'undefined' &&
      GEAPA_CORE.portal &&
      typeof GEAPA_CORE.portal.authorizeEmail === 'function'
    ) {
      return GEAPA_CORE.portal.authorizeEmail(identificador, {});
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-AUTHZ ' + JSON.stringify({
      etapa: 'corePortalAuthorizeEmail',
      erro: erro && erro.message ? erro.message : String(erro)
    }));
  }

  return null;
}

function portalNormalizarPermissoesPortalCore_(permissoes) {
  var base = portalPermissoesUsuarioVazias_();
  var lista = Array.isArray(permissoes) ? permissoes : [];
  var mapa = {};

  lista.forEach(function guardarPermissao(permissao) {
    mapa[String(permissao || '').trim().toLowerCase()] = true;
  });

  if (mapa['sistema:admin']) {
    Object.keys(base).forEach(function liberar(chave) {
      base[chave] = true;
    });
    return base;
  }

  if (mapa['atividades:gerir']) {
    base.podeGerenciarAtividades = true;
    base.podeEditarAtividade = true;
  }

  if (mapa['presencas:gerir']) {
    base.podeRegistrarChamada = true;
  }

  if (mapa['desligamentos:analisar']) {
    base.podeAnalisarJustificativas = true;
  }

  if (mapa['membros:ler'] || mapa['logs:ler'] || mapa['atividades:gerir']) {
    base.podeVerAreaDiretoria = true;
  }

  return base;
}

function portalMesclarPermissoesUsuario_(atual, extra) {
  var base = portalNormalizarPermissoesUsuario_(atual);
  var adicional = portalNormalizarPermissoesUsuario_(extra);

  Object.keys(base).forEach(function mesclar(chave) {
    base[chave] = base[chave] === true || adicional[chave] === true;
  });

  return base;
}

/**
 * Extrai a sessao oficial de uma resposta normalizada de "Minha situacao".
 *
 * @param {Object} situacao Situacao normalizada ou payload legado.
 * @return {Object|null} Sessao canonica segura.
 */
function portalExtrairSessaoMinhaSituacao_(situacao) {
  var dados = situacao || {};

  return portalNormalizarSessaoPortalCore_(
    dados.sessao ||
    dados.session ||
    dados.usuarioAtual ||
    null
  );
}

/**
 * Remove repeticoes mantendo a ordem original.
 *
 * @param {string[]} valores Lista de valores.
 * @return {string[]} Lista sem repeticoes.
 */
function portalUnicos_(valores) {
  var vistos = {};
  var saida = [];

  for (var i = 0; i < valores.length; i++) {
    var valor = String(valores[i] || '').trim();
    if (!valor || vistos[valor]) {
      continue;
    }

    vistos[valor] = true;
    saida.push(valor);
  }

  return saida.length ? saida : ['MEMBRO'];
}

/**
 * Normaliza o bloco de apresentacoes retornado pelo GEAPA-CORE.
 *
 * @param {Object} apresentacoes Bloco bruto do core.
 * @return {Object} Bloco seguro para o front-end.
 */
function portalNormalizarApresentacoesCore_(apresentacoes) {
  var dados = apresentacoes || {};

  return {
    periodoUltimaApresentacao: String(dados.periodoUltimaApresentacao || '').trim(),
    quantidadeRealizadas: portalNormalizarNumeroNaoNegativo_(dados.quantidadeRealizadas)
  };
}

/**
 * Normaliza o bloco orientativo de elegibilidade para Diretoria.
 *
 * @param {Object} diretoria Bloco bruto do core.
 * @return {Object} Bloco seguro para o front-end.
 */
function portalNormalizarDiretoriaCore_(diretoria) {
  var dados = diretoria || {};

  return {
    statusElegibilidade: String(dados.statusElegibilidade || '').trim(),
    diasComputados: portalNormalizarNumeroNaoNegativo_(dados.diasComputados),
    limiteDias: portalNormalizarNumeroNaoNegativo_(dados.limiteDias),
    saldoDias: portalNormalizarNumeroNaoNegativo_(dados.saldoDias),
    dataLimiteEstimada: String(dados.dataLimiteEstimada || '').trim()
  };
}

/**
 * Garante numero nao negativo para campos numericos do portal.
 *
 * @param {*} valor Valor recebido do core.
 * @return {number} Numero seguro.
 */
function portalNormalizarNumeroNaoNegativo_(valor) {
  var numero = Number(valor);

  if (!isFinite(numero) || isNaN(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

/**
 * Valida se a sessao temporaria existe no cache.
 *
 * @param {string} token Token temporario.
 * @return {boolean} Resultado da validacao.
 */
function portalSessaoTemporariaValida_(token) {
  var chave = portalCacheKey_('sessao', token);
  return Boolean(CacheService.getScriptCache().get(chave));
}

/**
 * Le a ultima resposta segura da tela "Minha situacao" em cache temporario.
 *
 * O cache fica apenas no Apps Script, nunca no GitHub Pages. A chave usa hash
 * do identificador da sessao e o valor expira rapidamente.
 *
 * @param {string} identificadorSessao Identificador associado a sessao.
 * @return {Object|null} Situacao em cache ou nulo.
 */
function portalLerMinhaSituacaoCache_(identificadorSessao) {
  var chave = portalCacheKey_('minhaSituacaoV2', identificadorSessao);
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

/**
 * Salva a tela "Minha situacao" em cache curto.
 *
 * Se o payload crescer alem do limite do CacheService, o portal apenas segue
 * sem cache para nao impedir o acesso do membro.
 *
 * @param {string} identificadorSessao Identificador associado a sessao.
 * @param {Object} situacao Situacao normalizada e ja filtrada.
 */
function portalSalvarMinhaSituacaoCache_(identificadorSessao, situacao) {
  if (!PORTAL_CONFIG.cacheMinhaSituacaoSegundos || !identificadorSessao || !situacao) {
    return;
  }

  try {
    var chave = portalCacheKey_('minhaSituacaoV2', identificadorSessao);
    CacheService.getScriptCache().put(
      chave,
      JSON.stringify(situacao),
      PORTAL_CONFIG.cacheMinhaSituacaoSegundos
    );
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

/**
 * Monta metadados de desempenho nao sensiveis.
 *
 * @param {string} origem Origem da resposta.
 * @param {number} inicioMs Momento inicial da execucao.
 * @return {Object} Metadados extras para a API.
 */
function portalMetaDesempenho_(origem, inicioMs) {
  return {
    desempenho: {
      origemDados: origem,
      tempoMs: Math.max(portalAgoraMs_() - inicioMs, 0),
      cacheMinhaSituacaoSegundos: PORTAL_CONFIG.cacheMinhaSituacaoSegundos
    }
  };
}

/**
 * Retorna timestamp em milissegundos.
 *
 * @return {number} Timestamp atual.
 */
function portalAgoraMs_() {
  return new Date().getTime();
}
