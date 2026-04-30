/**
 * Configuracoes iniciais do Portal GEAPA.
 *
 * Este arquivo deve concentrar constantes sem dados sensiveis. IDs reais de
 * planilhas, chaves privadas e enderecos sensiveis nao devem ser versionados.
 */

var PORTAL_CONFIG = {
  nomePortal: 'Portal GEAPA',
  versaoContrato: 'v1-placeholder',
  ambiente: 'desenvolvimento',

  /**
   * URL futura do frontend publicado.
   * Manter vazio enquanto o portal nao estiver publicado.
   */
  urlFrontend: '',

  /**
   * Tempo futuro de validade do codigo temporario, em minutos.
   * Ainda nao usado na V1.
   */
  validadeCodigoMinutos: 10
};

/**
 * Retorna uma copia simples das configuracoes publicas do portal.
 * Nao incluir segredos neste retorno.
 */
function portalGetConfigPublica() {
  return {
    nomePortal: PORTAL_CONFIG.nomePortal,
    versaoContrato: PORTAL_CONFIG.versaoContrato,
    ambiente: PORTAL_CONFIG.ambiente
  };
}
