/**
 * Placeholders do fluxo de autenticacao por codigo temporario.
 *
 * A V1 nao implementa autenticacao real. As funcoes abaixo existem para
 * documentar o contrato futuro entre o frontend e o Apps Script.
 */

/**
 * Solicita um codigo temporario para o e-mail cadastrado do membro.
 *
 * Futuramente:
 * - aceitar e-mail ou RGA;
 * - localizar o cadastro oficial via GEAPA-CORE;
 * - gerar codigo temporario;
 * - enviar o codigo ao e-mail cadastrado;
 * - armazenar somente dados temporarios e com expiracao.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @return {Object} Resultado simulado da solicitacao.
 */
function portalSolicitarCodigo(emailOuRga) {
  return {
    ok: true,
    modo: 'placeholder',
    mensagem: 'Solicitacao simulada. Nenhum e-mail foi enviado.',
    identificadorRecebido: emailOuRga || ''
  };
}

/**
 * Valida um codigo temporario informado pelo membro.
 *
 * Futuramente:
 * - conferir se o codigo existe;
 * - validar expiracao;
 * - validar quantidade de tentativas;
 * - emitir token temporario para consulta segura.
 *
 * @param {string} emailOuRga E-mail ou RGA usado na solicitacao.
 * @param {string} codigo Codigo recebido por e-mail.
 * @return {Object} Resultado simulado da validacao.
 */
function portalValidarCodigo(emailOuRga, codigo) {
  return {
    ok: true,
    modo: 'placeholder',
    mensagem: 'Validacao simulada. Nenhum codigo real foi conferido.',
    token: 'sessao-simulada-sem-valor-real',
    identificadorRecebido: emailOuRga || '',
    codigoRecebido: codigo || ''
  };
}
