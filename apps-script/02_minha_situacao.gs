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
  var situacaoCore = portalBuscarMinhaSituacaoViaGeapaCore_(identificadorSessao);

  if (situacaoCore) {
    return portalRespostaOk_(
      'MINHA_SITUACAO_CORE',
      'Minha situação carregada pelo GEAPA-CORE.',
      {
        tokenRecebido: token || '',
        situacao: situacaoCore
      }
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

  return portalRespostaOk_(
    'MINHA_SITUACAO_PARCIAL',
    'Dados cadastrais carregados. Os demais blocos ainda estão em preparação.',
    {
      tokenRecebido: token || '',
      situacao: portalMontarMinhaSituacaoParcial_(membro)
    }
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
