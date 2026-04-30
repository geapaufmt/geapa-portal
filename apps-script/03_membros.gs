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
 * Quando o GEAPA-CORE expuser uma funcao global compativel, o portal passara a
 * usa-la automaticamente. Enquanto ela nao existir, o retorno fica nulo e o
 * fluxo segue para o cadastro de teste.
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
    return null;
  }

  var membro = geapaCoreBuscarMembroParaPortal(identificador);

  if (!membro) {
    return null;
  }

  return portalNormalizarMembro_(membro, 'geapa-core');
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
