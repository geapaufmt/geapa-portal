/**
 * Placeholders da tela "Minha situacao no GEAPA".
 *
 * Este arquivo nao acessa planilhas oficiais. Os dados retornados sao
 * simulados e servem apenas para orientar o contrato inicial do portal.
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
 * @return {Object} Situacao simulada do membro.
 */
function portalMinhaSituacao(token) {
  return {
    ok: true,
    modo: 'placeholder',
    tokenRecebido: token || '',
    dados: portalDebugMinhaSituacaoPorRga('RGA-SIMULADO')
  };
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
  return {
    rga: rga || 'RGA-SIMULADO',
    nomeExibicao: 'Membro GEAPA',
    situacaoGeral: 'Em simulacao',
    vinculo: 'Placeholder',
    pendencias: [
      'Nenhuma pendencia real consultada nesta V1.'
    ],
    avisos: [
      'Dados simulados para desenvolvimento inicial do portal.'
    ],
    atualizadoEm: new Date().toISOString()
  };
}
