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
 * Busca um membro a partir do identificador salvo na sessao.
 *
 * @param {string} identificadorSessao Identificador salvo no cache.
 * @return {Object|null} Membro encontrado ou nulo.
 */
function portalBuscarMembroPorIdentificadorSessao_(identificadorSessao) {
  return portalBuscarMembroPorEmailOuRga_(identificadorSessao);
}

/**
 * Ponto de integracao previsto com GEAPA-CORE.
 *
 * Quando o GEAPA-CORE estiver disponivel no mesmo projeto ou como biblioteca
 * Apps Script, o portal passara a usa-lo automaticamente. Enquanto ele nao
 * existir, o retorno fica nulo e o fluxo segue para o cadastro de teste.
 *
 * Contrato esperado da funcao futura:
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
