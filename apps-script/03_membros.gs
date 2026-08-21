/**
 * Adaptador inicial de membros do Portal GEAPA.
 *
 * Nesta etapa, os membros sao carregados de uma propriedade privada do Apps
 * Script. Futuramente, esta camada devera chamar o GEAPA-CORE para consultar
 * as fontes oficiais, sem expor planilhas ao front-end.
 */

/**
 * Busca um membro por e-mail ou RGA.
 *
 * @param {string} emailOuRga Identificador informado no portal.
 * @return {Object|null} Membro encontrado ou nulo.
 */
function portalBuscarMembroPorEmailOuRga_(emailOuRga) {
  var identificador = portalNormalizarIdentificador_(emailOuRga);
  var membroCore = portalBuscarMembroViaGeapaCore_(identificador);

  if (membroCore) {
    return membroCore;
  }

  return portalBuscarMembroTestePorIdentificador_(identificador);
}

/**
 * Diagnostica a origem de um cadastro sem expor dados completos.
 *
 * Esta funcao foi feita para testes no editor do Apps Script. Ela ajuda a
 * descobrir se o cadastro veio do GEAPA-CORE, do fallback de teste ou se nao
 * foi encontrado. O retorno evita e-mail completo e nao inclui dados sensiveis.
 *
 * @param {string} emailOuRga E-mail ou RGA usado no teste.
 * @return {Object} Diagnostico seguro para manutencao.
 */
function portalDiagnosticarBuscaMembro_(emailOuRga) {
  var identificador = portalNormalizarIdentificador_(emailOuRga);

  if (!identificador) {
    return {
      ok: false,
      code: 'IDENTIFICADOR_OBRIGATORIO',
      message: 'Informe um e-mail ou RGA para diagnosticar o cadastro.'
    };
  }

  var resultado = {
    ok: false,
    code: 'MEMBRO_NAO_ENCONTRADO',
    message: 'Nenhum cadastro foi encontrado para o identificador informado.',
    identificadorInformado: portalMascararIdentificador_(identificador),
    origem: 'nao-encontrado',
    encontrado: false,
    emailMascarado: '',
    rgaMascarado: '',
    modoAcesso: '',
    whitelistTesteAplicada: false,
    emailNaListaTeste: false,
    liberadoParaTeste: false,
    envioEmailHabilitado: false
  };

  try {
    var membro = portalBuscarMembroPorEmailOuRga_(identificador);
    var config = portalGetAuthRuntimeConfig_();

    resultado.envioEmailHabilitado = config.envioEmailHabilitado;
    resultado.modoAcesso = config.modoAcesso || '';
    resultado.whitelistTesteAplicada = portalModoAcessoTeste_(config);

    if (!membro) {
      return resultado;
    }

    resultado.ok = true;
    resultado.code = 'MEMBRO_ENCONTRADO';
    resultado.message = 'Cadastro encontrado para o identificador informado.';
    resultado.origem = membro.origem || 'desconhecida';
    resultado.encontrado = true;
    resultado.emailMascarado = portalMascararEmail_(membro.emailCadastrado);
    resultado.rgaMascarado = portalMascararRga_(membro.rga);
    resultado.emailNaListaTeste = portalEmailPermitidoParaTeste_(
      membro.emailCadastrado,
      config.emailsTeste
    );
    resultado.liberadoParaTeste = resultado.whitelistTesteAplicada
      ? resultado.emailNaListaTeste
      : true;

    return resultado;
  } catch (erro) {
    resultado.code = 'ERRO_DIAGNOSTICO';
    resultado.message = 'Ocorreu erro ao diagnosticar o cadastro.';
    resultado.erro = erro && erro.message ? erro.message : String(erro);
    return resultado;
  }
}

/**
 * Busca um membro a partir do identificador salvo na sessao.
 *
 * @param {string} identificadorSessao Identificador salvo no cache.
 * @return {Object|null} Membro encontrado ou nulo.
 */
function portalBuscarMembroPorIdentificadorSessao_(identificadorSessao) {
  return portalBuscarMembroPorEmailOuRga_(identificadorSessao);
}

/**
 * Resolve a sessao oficial do usuario atual no GEAPA-CORE.
 *
 * O Portal apenas consome o resultado: vinculo, cargo, perfil e permissoes sao
 * decididos pelo CORE. Se o resolvedor ainda nao estiver disponivel, retorna
 * nulo para manter os fallbacks atuais.
 *
 * @param {string|Object} entrada E-mail, RGA, ID_PESSOA ou objeto aceito pelo CORE.
 * @param {Object=} opts Opcoes tecnicas nao sensiveis.
 * @return {Object|null} Sessao canonica segura.
 */
var __portal_sessao_core_execution_memo = {};

function portalResolverSessaoAtualViaGeapaCore_(entrada, opts) {
  var inicio = portalAgoraMs_();
  var opcoesCore = portalMontarOpcoesCore_((opts && opts.origem) || 'resolverSessao', opts || {});
  var memoKey = portalMontarChaveSessaoCoreCache_(entrada);
  if (memoKey && __portal_sessao_core_execution_memo[memoKey]) {
    portalTraceEtapa_('sessaoCore.memoExecucao', inicio, 'HIT', 'memoria-execucao');
    return __portal_sessao_core_execution_memo[memoKey];
  }
  var cache = portalLerSessaoCoreCache_(entrada);

  if (cache) {
    if (memoKey) __portal_sessao_core_execution_memo[memoKey] = cache;
    portalTraceEtapa_('sessaoCore.cache', inicio, 'HIT', 'CacheService');
    return cache;
  }

  var resposta = null;

  try {
    resposta = portalChamarResolverSessaoGeapaCoreGlobal_(entrada, opcoesCore);

    if (!resposta) {
      resposta = portalChamarResolverSessaoGeapaCoreLibrary_(entrada, opcoesCore);
    }
  } catch (erro) {
    var errorCode = String(erro && erro.code || erro && erro.message || 'CORE_SESSAO_ERRO_INTERNO')
      .trim().slice(0, 100);
    Logger.log('GEAPA-PORTAL-SESSAO-CORE ' + JSON.stringify({
      traceId: portalTraceIdAtual_(),
      ambiente: portalResolverAmbienteDadosV2_(),
      etapa: 'corePortalResolverUsuarioAtual',
      errorCode: errorCode
    }));
    var erroSessao = {
      ok: false,
      autenticado: false,
      portalAtivo: false,
      motivoBloqueio: errorCode,
      mensagemBloqueio: 'Nao foi possivel validar o acesso nas bases do ambiente solicitado.',
      failedStage: 'corePortalResolverUsuarioAtual'
    };
    if (memoKey) __portal_sessao_core_execution_memo[memoKey] = erroSessao;
    portalTraceEtapa_('sessaoCore.resolver', inicio, errorCode, 'GEAPA_CORE');
    return erroSessao;
  }

  if (!resposta) {
    var contratoAusente = {
      ok: false,
      autenticado: false,
      portalAtivo: false,
      motivoBloqueio: 'CORE_CONTRATO_SESSAO_INDISPONIVEL',
      mensagemBloqueio: 'O contrato de sessao do GEAPA-CORE nao esta disponivel.',
      failedStage: 'resolverContratoCore'
    };
    if (memoKey) __portal_sessao_core_execution_memo[memoKey] = contratoAusente;
    portalTraceEtapa_('sessaoCore.resolver', inicio, contratoAusente.motivoBloqueio, 'GEAPA_CORE');
    return contratoAusente;
  }

  var sessao = portalNormalizarSessaoPortalCore_(resposta);

  if (sessao && sessao.ok !== false && sessao.autenticado !== false) {
    portalSalvarSessaoCoreCache_(entrada, sessao);
  }
  if (memoKey && sessao) __portal_sessao_core_execution_memo[memoKey] = sessao;
  portalTraceEtapa_(
    'sessaoCore.resolver',
    inicio,
    sessao && sessao.ok !== false ? 'OK' : String(sessao && sessao.motivoBloqueio || 'NAO_RESOLVIDA'),
    'GEAPA_CORE'
  );

  return sessao;
}

/**
 * Le sessao resolvida do cache curto do Apps Script.
 *
 * @param {string|Object} entrada Entrada aceita pelo resolvedor.
 * @return {Object|null} Sessao em cache.
 */
function portalLerSessaoCoreCache_(entrada) {
  var chave = portalMontarChaveSessaoCoreCache_(entrada);
  var bruto = chave ? CacheService.getScriptCache().get(chave) : '';

  if (!bruto) {
    return null;
  }

  try {
    return portalNormalizarSessaoPortalCore_(JSON.parse(bruto));
  } catch (erro) {
    return null;
  }
}

/**
 * Salva sessao resolvida em cache curto.
 *
 * @param {string|Object} entrada Entrada aceita pelo resolvedor.
 * @param {Object} sessao Sessao canonica segura.
 */
function portalSalvarSessaoCoreCache_(entrada, sessao) {
  var chave = portalMontarChaveSessaoCoreCache_(entrada);
  var segundos = PORTAL_CONFIG.cacheSessaoCoreSegundos || 0;

  if (!chave || !segundos || !sessao) {
    return;
  }

  try {
    CacheService.getScriptCache().put(chave, JSON.stringify(sessao), segundos);
  } catch (erro) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

/**
 * Monta chave opaca para cache da sessao CORE.
 *
 * @param {string|Object} entrada Entrada aceita pelo resolvedor.
 * @return {string} Chave de cache.
 */
function portalMontarChaveSessaoCoreCache_(entrada) {
  var identificador = portalExtrairIdentificadorSessaoCore_(entrada);

  if (!identificador) {
    return '';
  }

  return portalCacheKey_('sessaoCoreV2', identificador);
}

/**
 * Extrai identificador seguro de entrada simples ou objeto.
 *
 * @param {string|Object} entrada Entrada aceita pelo resolvedor.
 * @return {string} Identificador normalizado.
 */
function portalExtrairIdentificadorSessaoCore_(entrada) {
  if (!entrada || typeof entrada !== 'object') {
    return portalNormalizarIdentificador_(entrada);
  }

  return portalNormalizarIdentificador_(
    entrada.email ||
    entrada.rga ||
    entrada.idPessoa ||
    entrada.identificador ||
    entrada.emailOuRga ||
    ''
  );
}

/**
 * Busca a tela "Minha situacao" usando o contrato oficial do GEAPA-CORE.
 *
 * Se a funcao ainda nao existir no core ou se o membro nao for encontrado por
 * esse caminho, retorna nulo para que o portal mantenha o fallback parcial.
 *
 * @param {string} identificadorSessao Identificador associado a sessao.
 * @return {Object|null} Situacao normalizada para o front-end.
 */
function portalBuscarMinhaSituacaoViaGeapaCore_(identificadorSessao) {
  var identificador = portalNormalizarIdentificador_(identificadorSessao);

  if (!identificador) {
    return null;
  }

  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, {
    origem: 'minhaSituacao'
  });
  if (!sessao || sessao.ok === false || sessao.autenticado === false) {
    return {
      ok: false,
      errorCode: String(sessao && sessao.motivoBloqueio || 'CORE_SESSAO_NAO_RESOLVIDA'),
      message: String(sessao && sessao.mensagemBloqueio || 'Nao foi possivel resolver a sessao no Core.'),
      failedStage: String(sessao && sessao.failedStage || 'sessaoCore')
    };
  }
  var opcoesCore = portalMontarOpcoesCore_('minhaSituacao', {
    sessao: sessao,
    allowLegacyFallback: false
  });
  var resposta = portalChamarMinhaSituacaoGeapaCoreGlobal_(identificador, opcoesCore);

  if (!resposta) {
    resposta = portalChamarMinhaSituacaoGeapaCoreLibrary_(identificador, opcoesCore);
  }

  if (resposta && resposta.ok === false) return resposta;
  return portalNormalizarMinhaSituacaoCore_(resposta, sessao);
}

/**
 * Busca o perfil cadastral do proprio usuario via contrato oficial do GEAPA-CORE.
 *
 * @param {string} identificadorSessao Identificador associado a sessao.
 * @return {Object|null} Perfil retornado pelo Core ou nulo.
 */
function portalBuscarMeuPerfilViaGeapaCore_(identificadorSessao) {
  var identificador = portalNormalizarIdentificador_(identificadorSessao);
  var resposta;

  if (!identificador) {
    return null;
  }

  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, { origem: 'meuPerfil' });
  if (!sessao || sessao.ok === false || sessao.autenticado === false) return null;
  var options = portalMontarOpcoesCore_('meuPerfil', { sessao: sessao });
  resposta = portalChamarMeuPerfilGeapaCoreGlobal_(identificador, options);

  if (!resposta) {
    resposta = portalChamarMeuPerfilGeapaCoreLibrary_(identificador, options);
  }

  return resposta && resposta.ok === true ? resposta : null;
}

/** Indica se a sessao oficial possui a permissao canonica para ler membros. */
function portalAdminMembrosSessaoAutorizada_(sessao) {
  return !!(
    sessao &&
    sessao.ok !== false &&
    sessao.autenticado === true &&
    sessao.portalAtivo !== false &&
    corePortalRequirePermission_(sessao, 'membros:ler')
  );
}

/** Converte o filtro recebido pelo Web App em objeto sem aceitar codigo executavel. */
function portalAdminMembrosLerFiltros_(value) {
  if (!value) return { ok: true, data: {} };
  if (typeof value === 'object') return { ok: true, data: value };
  try {
    var parsed = JSON.parse(String(value));
    return { ok: true, data: parsed && typeof parsed === 'object' ? parsed : {} };
  } catch (err) {
    return { ok: false, data: {} };
  }
}

/** Chama o contrato administrativo quando o Core estiver copiado no mesmo projeto. */
function portalAdminMembrosChamarCoreGlobal_(filtros, contexto) {
  if (typeof geapaCoreListarMembrosAdministracaoPortal !== 'function') return null;
  return geapaCoreListarMembrosAdministracaoPortal(filtros || {}, contexto || {});
}

/** Chama o contrato administrativo pela Library oficial do GEAPA-CORE. */
function portalAdminMembrosChamarCoreLibrary_(filtros, contexto) {
  var libs = portalListarBibliotecasGeapaCore_();
  for (var i = 0; i < libs.length; i++) {
    var api = libs[i].api;
    if (api && typeof api.geapaCoreListarMembrosAdministracaoPortal === 'function') {
      return api.geapaCoreListarMembrosAdministracaoPortal(filtros || {}, contexto || {});
    }
  }
  return null;
}

/**
 * Lista membros para a area administrativa, validando token, sessao oficial e permissao.
 * O Portal nao le planilhas e nao repassa permissao declarada pelo navegador ao Core.
 */
function portalAdminMembrosListar(token, filtrosJson) {
  var tokenNormalizado = String(token || '').trim();
  if (!tokenNormalizado) {
    return portalRespostaErro_('SESSAO_OBRIGATORIA', 'Entre no portal para consultar membros.', {});
  }
  if (!portalSessaoTemporariaValida_(tokenNormalizado)) {
    return portalRespostaErro_('SESSAO_INVALIDA_OU_EXPIRADA', 'Sessao invalida ou expirada. Entre novamente.', {});
  }
  var filtros = portalAdminMembrosLerFiltros_(filtrosJson);
  if (!filtros.ok) {
    return portalRespostaErro_('FILTROS_INVALIDOS', 'Os filtros informados sao invalidos.', {});
  }
  var identificador = portalGetIdentificadorSessao_(tokenNormalizado);
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, { origem: 'adminMembrosListar' });
  if (!portalAdminMembrosSessaoAutorizada_(sessao)) {
    Logger.log('[portal-geapa][admin-members] ' + JSON.stringify({ ok: false, code: 'ACESSO_NEGADO' }));
    return portalRespostaErro_('ACESSO_NEGADO', 'Seu perfil nao possui permissao para consultar membros.', {});
  }
  var contexto = {
    idPessoa: String(sessao.idPessoa || '').trim(),
    sessao: sessao,
    ambiente: portalResolverAmbienteDadosV2_(),
    traceId: portalTraceIdAtual_()
  };
  var resposta = portalAdminMembrosChamarCoreGlobal_(filtros.data, contexto) ||
    portalAdminMembrosChamarCoreLibrary_(filtros.data, contexto);
  if (!resposta) {
    return portalRespostaErro_('MEMBROS_ADMIN_INDISPONIVEIS', 'A consulta administrativa de membros ainda nao esta disponivel.', {});
  }
  if (resposta.ok !== true) {
    return portalRespostaErro_(
      resposta.errorCode || resposta.code || 'MEMBROS_ADMIN_INDISPONIVEIS',
      resposta.message || 'Nao foi possivel consultar os membros.',
      {}
    );
  }
  var data = resposta.data || {};
  Logger.log('[portal-geapa][admin-members] ' + JSON.stringify({
    ok: true,
    totalItens: data.paginacao ? Number(data.paginacao.totalItens || 0) : 0,
    pagina: data.paginacao ? Number(data.paginacao.pagina || 0) : 0
  }));
  return portalRespostaOk_('MEMBROS_ADMIN_LISTADOS', 'Membros carregados.', data, {
    membrosAdmin: { fonte: 'GEAPA_CORE', somenteLeitura: true }
  });
}

/**
 * Tenta chamar o resolvedor de sessao quando ele estiver copiado no projeto.
 *
 * @param {string|Object} entrada Entrada aceita pelo GEAPA-CORE.
 * @param {Object=} opts Opcoes tecnicas.
 * @return {Object|null} Resposta bruta do CORE.
 */
function portalChamarResolverSessaoGeapaCoreGlobal_(entrada, opts) {
  if (typeof corePortalResolverUsuarioAtual !== 'function') {
    return null;
  }

  return corePortalResolverUsuarioAtual(entrada, opts || {});
}

/**
 * Tenta chamar a funcao global quando ela estiver copiada no mesmo projeto.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta do GEAPA-CORE ou nulo.
 */
function portalChamarMinhaSituacaoGeapaCoreGlobal_(identificador, options) {
  if (typeof geapaCoreBuscarMinhaSituacaoParaPortal !== 'function') {
    return null;
  }

  return geapaCoreBuscarMinhaSituacaoParaPortal(identificador, options || {});
}

/**
 * Tenta chamar a funcao global de "Meu perfil" quando ela estiver copiada.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta do GEAPA-CORE ou nulo.
 */
function portalChamarMeuPerfilGeapaCoreGlobal_(identificador, options) {
  if (typeof geapaCoreBuscarMeuPerfilParaPortal !== 'function') {
    return null;
  }

  return geapaCoreBuscarMeuPerfilParaPortal(identificador, options || {});
}

/**
 * Tenta chamar o contrato de "Minha situacao" quando o GEAPA-CORE estiver como
 * biblioteca Apps Script.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta do GEAPA-CORE ou nulo.
 */
function portalChamarMinhaSituacaoGeapaCoreLibrary_(identificador, options) {
  var libs = portalListarBibliotecasGeapaCore_();

  for (var i = 0; i < libs.length; i++) {
    var resposta = portalChamarMinhaSituacaoCoreLibrary_(libs[i].api, identificador, options);

    if (resposta) {
      return resposta;
    }
  }

  return null;
}

/**
 * Tenta chamar o contrato de "Meu perfil" quando o GEAPA-CORE estiver como Library.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta do GEAPA-CORE ou nulo.
 */
function portalChamarMeuPerfilGeapaCoreLibrary_(identificador, options) {
  var libs = portalListarBibliotecasGeapaCore_();

  for (var i = 0; i < libs.length; i++) {
    var resposta = portalChamarMeuPerfilCoreLibrary_(libs[i].api, identificador, options);

    if (resposta && resposta.ok === true) {
      return resposta;
    }
  }

  return null;
}

/**
 * Tenta chamar o resolvedor de sessao quando o GEAPA-CORE estiver como Library.
 *
 * @param {string|Object} entrada Entrada aceita pelo GEAPA-CORE.
 * @param {Object=} opts Opcoes tecnicas.
 * @return {Object|null} Resposta bruta do CORE.
 */
function portalChamarResolverSessaoGeapaCoreLibrary_(entrada, opts) {
  var libs = portalListarBibliotecasGeapaCore_();

  for (var i = 0; i < libs.length; i++) {
    var resposta = portalChamarResolverSessaoCoreLibrary_(libs[i].api, entrada, opts);

    if (resposta) {
      return resposta;
    }
  }

  return null;
}

/**
 * Ponto de integracao legado com GEAPA-CORE.
 *
 * O resolvedor oficial `corePortalResolverUsuarioAtual` e tentado primeiro.
 * Este contrato antigo continua como compatibilidade enquanto as telas ainda
 * dependem de e-mail/RGA para fluxos legados.
 *
 * Contrato legado:
 * geapaCoreBuscarMembroParaPortal(emailOuRga) => {
 *   id: string,
 *   nomeExibicao: string,
 *   emailCadastrado: string,
 *   rga: string,
 *   situacaoGeral: string,
 *   vinculo: string
 * }
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Membro normalizado ou nulo.
 */
function portalBuscarMembroViaGeapaCore_(identificador) {
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, {
    origem: 'buscarMembro'
  });

  if (sessao && sessao.ok !== false && sessao.portalAtivo !== false) {
    return portalMontarMembroDeSessaoPortal_(sessao, 'GEAPA_CORE.session');
  }

  if (sessao && (
    sessao.ok === false ||
    sessao.autenticado === false ||
    sessao.portalAtivo === false
  )) {
    return null;
  }

  if (typeof geapaCoreBuscarMembroParaPortal !== 'function') {
    return portalBuscarMembroViaGeapaCoreLibrary_(identificador);
  }

  var membro = geapaCoreBuscarMembroParaPortal(identificador);

  if (!membro) {
    return null;
  }

  return portalNormalizarMembro_(membro, 'geapa-core');
}

/**
 * Tenta consultar o GEAPA-CORE quando ele estiver instalado como Library.
 *
 * Identificadores de biblioteca aceitos nesta fase:
 * - GEAPA_CORE
 * - GEAPACORE
 * - GEAPA_CORE_LIB
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Membro normalizado ou nulo.
 */
function portalBuscarMembroViaGeapaCoreLibrary_(identificador) {
  var libs = portalListarBibliotecasGeapaCore_();

  for (var i = 0; i < libs.length; i++) {
    var lib = libs[i];
    var membro = portalChamarBuscaMembroCoreLibrary_(lib.api, identificador);

    if (membro) {
      return portalNormalizarMembro_(membro, lib.nome);
    }
  }

  return null;
}

/**
 * Lista os identificadores de biblioteca do GEAPA-CORE aceitos pelo portal.
 *
 * @return {Object[]} Bibliotecas disponiveis.
 */
function portalListarBibliotecasGeapaCore_() {
  var libs = [];

  if (typeof GEAPA_CORE !== 'undefined') {
    libs.push({
      nome: 'GEAPA_CORE',
      api: GEAPA_CORE
    });
  }

  if (typeof GEAPACORE !== 'undefined') {
    libs.push({
      nome: 'GEAPACORE',
      api: GEAPACORE
    });
  }

  if (typeof GEAPA_CORE_LIB !== 'undefined') {
    libs.push({
      nome: 'GEAPA_CORE_LIB',
      api: GEAPA_CORE_LIB
    });
  }

  return libs;
}

/**
 * Chama os formatos aceitos para a biblioteca do GEAPA-CORE.
 *
 * @param {Object} api Objeto global da biblioteca.
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Membro retornado pela biblioteca.
 */
function portalChamarBuscaMembroCoreLibrary_(api, identificador) {
  if (!api) {
    return null;
  }

  if (typeof api.geapaCoreBuscarMembroParaPortal === 'function') {
    return api.geapaCoreBuscarMembroParaPortal(identificador);
  }

  if (
    api.portal &&
    typeof api.portal.buscarMembroParaPortal === 'function'
  ) {
    return api.portal.buscarMembroParaPortal(identificador);
  }

  return null;
}

/**
 * Chama os formatos aceitos do contrato "Minha situacao" no GEAPA-CORE.
 *
 * @param {Object} api Objeto global da biblioteca.
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta retornada pela biblioteca.
 */
function portalChamarMinhaSituacaoCoreLibrary_(api, identificador, options) {
  if (!api) {
    return null;
  }

  if (typeof api.geapaCoreBuscarMinhaSituacaoParaPortal === 'function') {
    return api.geapaCoreBuscarMinhaSituacaoParaPortal(identificador, options || {});
  }

  if (
    api.portal &&
    typeof api.portal.buscarMinhaSituacaoParaPortal === 'function'
  ) {
    return api.portal.buscarMinhaSituacaoParaPortal(identificador, options || {});
  }

  return null;
}

/**
 * Chama os formatos aceitos do contrato "Meu perfil" no GEAPA-CORE.
 *
 * @param {Object} api Objeto global da biblioteca.
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Resposta retornada pela biblioteca.
 */
function portalChamarMeuPerfilCoreLibrary_(api, identificador, options) {
  if (!api) {
    return null;
  }

  if (typeof api.geapaCoreBuscarMeuPerfilParaPortal === 'function') {
    return api.geapaCoreBuscarMeuPerfilParaPortal(identificador, options || {});
  }

  if (
    api.portal &&
    typeof api.portal.buscarMeuPerfilParaPortal === 'function'
  ) {
    return api.portal.buscarMeuPerfilParaPortal(identificador, options || {});
  }

  return null;
}

/**
 * Chama os formatos aceitos do resolvedor de sessao no GEAPA-CORE.
 *
 * @param {Object} api Objeto global da biblioteca.
 * @param {string|Object} entrada Entrada aceita pelo GEAPA-CORE.
 * @param {Object=} opts Opcoes tecnicas.
 * @return {Object|null} Resposta retornada pela biblioteca.
 */
function portalChamarResolverSessaoCoreLibrary_(api, entrada, opts) {
  if (!api) {
    return null;
  }

  if (typeof api.corePortalResolverUsuarioAtual === 'function') {
    return api.corePortalResolverUsuarioAtual(entrada, opts || {});
  }

  if (
    api.portal &&
    typeof api.portal.resolverUsuarioAtual === 'function'
  ) {
    return api.portal.resolverUsuarioAtual(entrada, opts || {});
  }

  return null;
}

/**
 * Busca membro no cadastro privado de teste.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {Object|null} Membro encontrado ou nulo.
 */
function portalBuscarMembroTestePorIdentificador_(identificador) {
  var membros = portalListarMembrosTeste_();

  for (var i = 0; i < membros.length; i++) {
    var membro = portalNormalizarMembro_(membros[i], 'teste');

    if (
      membro.emailCadastrado === identificador ||
      membro.rgaNormalizado === identificador
    ) {
      return membro;
    }
  }

  return null;
}

/**
 * Le membros de teste das propriedades privadas.
 *
 * Propriedade esperada: PORTAL_MEMBROS_TESTE_JSON.
 *
 * @return {Object[]} Lista de membros de teste.
 */
function portalListarMembrosTeste_() {
  var propriedades = PropertiesService.getScriptProperties();
  var bruto = propriedades.getProperty(PORTAL_CONFIG.propriedades.membrosTeste);

  if (!bruto) {
    return [];
  }

  try {
    var membros = JSON.parse(bruto);
    return Array.isArray(membros) ? membros : [];
  } catch (erro) {
    throw new Error('Cadastro de membros de teste invalido.');
  }
}

/**
 * Normaliza um membro para o contrato interno do portal.
 *
 * @param {Object} membro Membro recebido do GEAPA-CORE ou do cadastro de teste.
 * @param {string} origem Origem dos dados.
 * @return {Object} Membro normalizado.
 */
function portalNormalizarMembro_(membro, origem) {
  var email = portalNormalizarIdentificador_(membro.emailCadastrado || membro.email || '');
  var rga = String(membro.rga || '').trim();

  return {
    id: String(membro.id || rga || email || 'membro-teste'),
    origem: origem || 'teste',
    nomeExibicao: String(membro.nomeExibicao || 'Membro GEAPA'),
    emailCadastrado: email,
    rga: rga || 'RGA-SIMULADO',
    rgaNormalizado: portalNormalizarIdentificador_(rga),
    situacaoGeral: String(membro.situacaoGeral || 'Em simulação'),
    vinculo: String(membro.vinculo || 'Membro em acompanhamento')
  };
}

/**
 * Normaliza a sessao canonica retornada pelo GEAPA-CORE.
 *
 * @param {Object} sessao Sessao bruta retornada pelo CORE.
 * @return {Object|null} Sessao segura para retornar em data.sessao.
 */
function portalNormalizarSessaoPortalCore_(sessao) {
  if (!sessao) {
    return null;
  }

  var ok = sessao.ok !== false;
  var autenticado = ok && sessao.autenticado !== false;
  var perfilBruto = sessao.perfilPortalEfetivo ||
    sessao.perfilPrincipal ||
    sessao.perfilPortal ||
    (autenticado ? 'MEMBRO' : 'VISITANTE');
  var perfilPrincipal = portalNormalizarPerfilUsuario_(
    perfilBruto
  );
  var perfis = portalNormalizarPerfisSessaoPortal_(
    sessao.perfisPortal ||
    sessao.perfis ||
    [perfilPrincipal]
  );
  var permissoes = portalNormalizarListaPermissoesSessaoPortal_(
    sessao.permissoes ||
    sessao.permissions ||
    sessao.permissoesEfetivas
  );

  return {
    ok: ok,
    autenticado: autenticado,
    idPessoa: String(sessao.idPessoa || sessao.id || '').trim(),
    nomeExibicao: String(sessao.nomeExibicao || sessao.nome || 'Membro GEAPA').trim(),
    email: portalNormalizarIdentificador_(sessao.email || sessao.emailCadastrado || ''),
    rga: String(sessao.rga || '').trim(),
    perfilPortalEfetivo: perfilPrincipal,
    perfisPortal: perfis,
    permissoes: permissoes,
    portalAtivo: ok && sessao.portalAtivo !== false,
    modoAcesso: String(sessao.modoAcesso || sessao.portalModoAcesso || '').trim(),
    tipoVinculoAtual: String(sessao.tipoVinculoAtual || '').trim(),
    statusVinculoAtual: String(sessao.statusVinculoAtual || '').trim(),
    cargoFuncaoAtual: String(sessao.cargoFuncaoAtual || '').trim(),
    cargosAtuais: Array.isArray(sessao.cargosAtuais)
      ? sessao.cargosAtuais.map(portalNormalizarCargoUsuario_)
      : [],
    motivoBloqueio: String(sessao.motivoBloqueio || '').trim(),
    mensagemBloqueio: String(sessao.mensagemBloqueio || '').trim()
  };
}

/**
 * Monta um membro legado a partir da sessao oficial.
 *
 * Isto nao recalcula regra institucional; apenas adapta identidade segura do
 * CORE para fluxos antigos que ainda esperam e-mail/RGA.
 *
 * @param {Object} sessao Sessao canonica.
 * @param {string} origem Origem tecnica.
 * @return {Object|null} Membro normalizado.
 */
function portalMontarMembroDeSessaoPortal_(sessao, origem) {
  if (!sessao || (!sessao.email && !sessao.rga && !sessao.idPessoa)) {
    return null;
  }

  return portalNormalizarMembro_(
    {
      id: sessao.idPessoa || sessao.rga || sessao.email,
      nomeExibicao: sessao.nomeExibicao,
      emailCadastrado: sessao.email,
      rga: sessao.rga,
      situacaoGeral: sessao.statusVinculoAtual || '',
      vinculo: sessao.tipoVinculoAtual || ''
    },
    origem || 'GEAPA_CORE.session'
  );
}

/**
 * Normaliza lista de perfis da sessao sem inferir perfil institucional.
 *
 * @param {*} perfis Lista bruta.
 * @return {string[]} Perfis seguros.
 */
function portalNormalizarPerfisSessaoPortal_(perfis) {
  var lista = Array.isArray(perfis) ? perfis : [];
  var normalizados = [];

  for (var i = 0; i < lista.length; i++) {
    normalizados.push(portalNormalizarPerfilUsuario_(lista[i]));
  }

  return portalUnicos_(normalizados);
}

/**
 * Normaliza permissoes canonicas vindas do CORE.
 *
 * @param {*} permissoes Lista ou mapa de permissoes.
 * @return {string[]} Lista canonica segura.
 */
function portalNormalizarListaPermissoesSessaoPortal_(permissoes) {
  var mapa = {};

  if (Array.isArray(permissoes)) {
    permissoes.forEach(function guardarPermissao(permissao) {
      var chave = String(permissao || '').trim();
      if (chave) {
        mapa[chave] = true;
      }
    });
  } else {
    Object.keys(permissoes || {}).forEach(function copiarPermissao(chave) {
      if (permissoes[chave] === true && String(chave || '').trim()) {
        mapa[String(chave).trim()] = true;
      }
    });
  }

  return Object.keys(mapa);
}
