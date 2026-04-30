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
  var situacao = portalMinhaSituacao(validar.token);
  var debug = portalDebugMinhaSituacaoPorRga('RGA-TESTE');

  var resultado = {
    ok: Boolean(
      solicitar.ok &&
      validar.ok &&
      situacao.ok &&
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
