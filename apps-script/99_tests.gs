/**
 * Testes manuais iniciais do Portal GEAPA.
 *
 * Estes testes nao substituem uma suite formal. Eles existem para que futuras
 * manutencoes possam validar rapidamente os contratos no editor do Apps
 * Script.
 */

/**
 * Executa verificacoes simples dos contratos iniciais.
 *
 * @return {Object} Resultado agregado dos testes simulados.
 */
function portalRunTests() {
  var solicitar = portalSolicitarCodigo('membro@example.test');
  var validar = portalValidarCodigo('membro@example.test', '123456');
  var membroTeste = {
    emailCadastrado: 'membro@example.test',
    rga: 'RGA-TESTE',
    nomeExibicao: 'Membro GEAPA'
  };
  var sessao = portalCriarSessaoTemporaria_(membroTeste.emailCadastrado);
  var situacao = portalMinhaSituacao(sessao);
  var debug = portalDebugMinhaSituacaoPorRga('RGA-TESTE');

  var resultado = {
    ok: Boolean(
      !solicitar.ok &&
      !validar.ok &&
      !situacao.ok &&
      solicitar.code === 'ENVIO_EMAIL_DESABILITADO' &&
      validar.code === 'CODIGO_EXPIRADO_OU_INEXISTENTE' &&
      situacao.code === 'MEMBRO_SESSAO_NAO_ENCONTRADO' &&
      debug.rga === 'RGA-TESTE'
    ),
    modo: 'placeholder',
    resultados: {
      solicitar: solicitar,
      validar: validar,
      situacao: situacao,
      debug: debug
    }
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Teste pequeno para conferir somente a simulacao da tela "Minha situacao".
 *
 * @return {Object} Dados simulados por RGA.
 */
function portalRunDebugMinhaSituacaoTest() {
  var resultado = portalDebugMinhaSituacaoPorRga('RGA-TESTE');

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Diagnostica um cadastro configurado em Script Properties.
 *
 * Como o editor do Apps Script nao passa parametros pelo botao Executar,
 * informe o e-mail ou RGA de teste na propriedade privada:
 *
 * PORTAL_DIAGNOSTICO_IDENTIFICADOR
 *
 * Esta funcao nao deve ser chamada pelo front-end. Ela existe apenas para
 * manutencao e testes no editor do Apps Script.
 *
 * @return {Object} Diagnostico seguro do cadastro.
 */
function portalRunDiagnosticoCadastro() {
  var propriedades = PropertiesService.getScriptProperties();
  var identificador = propriedades.getProperty(
    PORTAL_CONFIG.propriedades.diagnosticoIdentificador
  );
  var resultado = portalDiagnosticarBuscaMembro_(identificador);

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Diagnostica diretamente um e-mail ou RGA recebido por chamada manual.
 *
 * Use esta funcao em testes programaticos. Para o botao Executar do editor,
 * prefira `portalRunDiagnosticoCadastro`.
 *
 * @param {string} emailOuRga E-mail ou RGA de teste.
 * @return {Object} Diagnostico seguro do cadastro.
 */
function portalDiagnosticarCadastro(emailOuRga) {
  var resultado = portalDiagnosticarBuscaMembro_(emailOuRga);

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Diagnostica a sessao oficial retornada pelo GEAPA-CORE para o Portal.
 *
 * Para usar pelo botao Executar do Apps Script, configure
 * `PORTAL_DIAGNOSTICO_IDENTIFICADOR` nas propriedades privadas. Esta funcao nao
 * deve ser exposta ao front-end.
 *
 * Cenarios manuais a validar com identificadores reais ou controlados:
 * MEMBRO, DIRETORIA, SECRETARIA, COMUNICACAO, CONSELHO, EGRESSO,
 * COLABORADOR, EXTERNO e ADMIN explicito.
 *
 * @return {Object} Diagnostico seguro da sessao.
 */
function portalRunDiagnosticoSessaoCore() {
  var propriedades = PropertiesService.getScriptProperties();
  var identificador = propriedades.getProperty(
    PORTAL_CONFIG.propriedades.diagnosticoIdentificador
  );
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, {
    origem: 'diagnostico-sessao'
  });
  var resultado = {
    ok: Boolean(sessao),
    identificadorInformado: portalMascararIdentificador_(identificador || ''),
    contrato: sessao ? {
      ok: sessao.ok,
      autenticado: sessao.autenticado,
      idPessoaPresente: Boolean(sessao.idPessoa),
      nomeExibicaoPresente: Boolean(sessao.nomeExibicao),
      emailPresente: Boolean(sessao.email),
      rgaPresente: Boolean(sessao.rga),
      perfilPortalEfetivo: sessao.perfilPortalEfetivo,
      perfisPortal: sessao.perfisPortal,
      permissoes: sessao.permissoes,
      possuiPermissaoPortalAcessar: Array.isArray(sessao.permissoes)
        ? sessao.permissoes.indexOf('portal:acessar') >= 0
        : false,
      portalAtivo: sessao.portalAtivo,
      modoAcesso: sessao.modoAcesso,
      tipoVinculoAtual: sessao.tipoVinculoAtual,
      statusVinculoAtual: sessao.statusVinculoAtual,
      cargoFuncaoAtual: sessao.cargoFuncaoAtual,
      quantidadeCargosAtuais: Array.isArray(sessao.cargosAtuais)
        ? sessao.cargosAtuais.length
        : 0,
      motivoBloqueio: sessao.motivoBloqueio,
      mensagemBloqueio: sessao.mensagemBloqueio
    } : null,
    cenariosManuais: [
      'MEMBRO',
      'DIRETORIA',
      'SECRETARIA',
      'COMUNICACAO',
      'CONSELHO',
      'EGRESSO',
      'COLABORADOR',
      'EXTERNO',
      'ADMIN explicito'
    ]
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Diagnostica a leitura do conteudo publico editorial pelo GEAPA-CORE.
 *
 * Esta funcao nao deve ser chamada pelo front-end. Ela existe para validar, no
 * editor do Apps Script, se o CORE publicou o contrato read-only do CMS.
 *
 * @return {Object} Diagnostico seguro do conteudo publico.
 */
function portalRunDiagnosticoConteudoPublico() {
  return portalConteudoPublicoDiagnostics();
}

/**
 * Confere que os endpoints V2 read-only exigem sessao antes de consultar dados.
 *
 * @return {Object} Resultado agregado dos testes de contrato.
 */
function portalRunTesteEndpointsReadOnlyV2() {
  var funcoes = {
    minhaFrequencia: portalMinhaFrequenciaV2,
    minhasApresentacoes: portalMinhasApresentacoesV2,
    minhasJustificativas: portalMinhasJustificativasV2,
    proximasAtividades: portalProximasAtividadesV2,
    historicoAtividades: portalHistoricoAtividadesV2,
    pendenciasDiretoria: portalPendenciasDiretoriaV2,
    painelDiretoriaV2: portalApiGetPainelDiretoriaV2,
    statusViewsV2: portalStatusViewsV2
  };
  var nomes = Object.keys(funcoes);
  var endpoints = {};
  var funcoesLocalizadas = {};

  nomes.forEach(function executar(nome) {
    funcoesLocalizadas[nome] = typeof funcoes[nome] === 'function';
    endpoints[nome] = funcoesLocalizadas[nome]
      ? funcoes[nome]('')
      : {
        ok: false,
        code: 'FUNCAO_NAO_LOCALIZADA',
        message: 'Funcao read-only V2 nao localizada: ' + nome
      };
  });

  var resultado = {
    ok: nomes.every(function validar(nome) {
      return funcoesLocalizadas[nome] === true &&
        endpoints[nome] &&
        endpoints[nome].ok === false &&
        endpoints[nome].code === 'SESSAO_OBRIGATORIA';
    }),
    modo: 'views-v2-readonly',
    checks: {
      todasFuncoesLocalizadas: nomes.every(function validar(nome) {
        return funcoesLocalizadas[nome] === true;
      }),
      visitanteSemTokenBloqueado: nomes.every(function validar(nome) {
        return endpoints[nome] &&
          endpoints[nome].ok === false &&
          endpoints[nome].code === 'SESSAO_OBRIGATORIA';
      }),
      somenteLeitura: true
    },
    funcoesLocalizadas: funcoesLocalizadas,
    endpoints: endpoints
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function portalRunViewsV2ReadonlyTests() {
  return portalRunTesteEndpointsReadOnlyV2();
}

function portalRunTesteAtividadesV2ApresentacoesVinculadas() {
  var funcoes = {
    atividadesListar: typeof portalListarAtividades === 'function',
    atividadeDetalhe: typeof portalDetalheAtividade === 'function',
    minhasApresentacoes: typeof portalMinhasApresentacoesV2 === 'function'
  };
  var checksManuais = [
    'card de atividade comum sem apresentacao',
    'card com uma apresentacao',
    'card com multiplas apresentacoes',
    'modal sem apresentacoes',
    'modal com uma apresentacao',
    'modal com multiplas apresentacoes',
    'historico com todas as atividades',
    'historico filtrando somente apresentacoes',
    'JSON valido em apresentacoesPublicas',
    'ausencia de dependencia ativa de view paralela de apresentacoes'
  ];
  var resultado = {
    ok: funcoes.atividadesListar &&
      funcoes.atividadeDetalhe &&
      funcoes.minhasApresentacoes,
    modo: 'atividades-v2-apresentacoes-vinculadas',
    funcoes: funcoes,
    contrato: {
      lista: [
        'eixoTematicoPrincipal',
        'eixoTematicoSecundario',
        'nomePessoaPrincipalPublico',
        'papelPessoaPrincipal',
        'tipoPessoaPrincipal',
        'qtdApresentacoes',
        'resumoApresentacoesPublico',
        'possuiApresentacoes',
        'ciclo',
        'ano',
        'semestre',
        'rotuloSemestre'
      ],
      detalhe: [
        'apresentacoesPublicas',
        'envolvidosPublicos',
        'qtdApresentacoes',
        'resumoApresentacoesPublico',
        'linkMaterialPublico',
        'linkAtaPublica',
        'linkFotosPublico'
      ]
    },
    checksManuais: checksManuais
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
