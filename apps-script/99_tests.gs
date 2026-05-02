/**
 * Testes manuais iniciais do Portal GEAPA.
 *
 * Estes testes nao substituem uma suite formal. Eles existem para que futuras
 * manutencoes possam validar rapidamente os placeholders no editor do Apps
 * Script enquanto a arquitetura definitiva nao estiver pronta.
 */

/**
 * Executa verificacoes simples dos contratos placeholder.
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
