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
    return portalRespostaOk_(
      'MINHA_SITUACAO_CACHE',
      'Minha situação carregada em cache temporário.',
      {
        tokenRecebido: token || '',
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
        situacao: situacaoCore
      },
      portalMetaDesempenho_('geapa-core', inicio)
    );
  }

  var membro = portalBuscarMembroPorIdentificadorSessao_(identificadorSessao);

  if (!membro) {
    return portalRespostaErro_(
      'MEMBRO_SESSAO_NAO_ENCONTRADO',
      'Não foi possível localizar o cadastro de teste da sessão.',
      {}
    );
  }

  var situacaoParcial = portalMontarMinhaSituacaoParcial_(membro);
  portalSalvarMinhaSituacaoCache_(identificadorSessao, situacaoParcial);

  return portalRespostaOk_(
    'MINHA_SITUACAO_PARCIAL',
    'Dados cadastrais carregados. Os demais blocos ainda estão em preparação.',
    {
      tokenRecebido: token || '',
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
 * @return {Object} Dados parciais da situacao.
 */
function portalMontarMinhaSituacaoParcial_(membro) {
  return {
    rga: membro.rga || 'RGA-SIMULADO',
    nomeExibicao: membro.nomeExibicao || 'Membro GEAPA',
    situacaoGeral: membro.situacaoGeral || 'Cadastro localizado',
    vinculo: membro.vinculo || 'Membro em acompanhamento',
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
 * @return {Object|null} Situacao normalizada ou nulo.
 */
function portalNormalizarMinhaSituacaoCore_(resposta) {
  if (!resposta || resposta.ok !== true || !resposta.membro) {
    return null;
  }

  var membro = portalNormalizarMembro_(resposta.membro, 'GEAPA_CORE');
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
  var chave = portalCacheKey_('minhaSituacao', identificadorSessao);
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
    var chave = portalCacheKey_('minhaSituacao', identificadorSessao);
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
