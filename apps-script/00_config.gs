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
   * Tempo de validade do codigo temporario, em minutos.
   */
  validadeCodigoMinutos: 10,

  /**
   * Limite de tentativas para validar um codigo antes de bloquear a sessao
   * temporaria. Usado apenas no fluxo de teste inicial.
   */
  maxTentativasCodigo: 5,

  /**
   * Intervalo minimo entre duas solicitacoes de codigo para o mesmo e-mail.
   */
  intervaloSolicitacaoSegundos: 60,

  /**
   * Propriedades configuradas no Apps Script, fora do repositorio.
   */
  propriedades: {
    envioEmailHabilitado: 'PORTAL_ENVIO_EMAIL_HABILITADO',
    emailsTeste: 'PORTAL_EMAILS_TESTE',
    membrosTeste: 'PORTAL_MEMBROS_TESTE_JSON',
    codigoSalt: 'PORTAL_CODIGO_SALT'
  }
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
