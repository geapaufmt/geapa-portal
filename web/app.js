/**
 * Simulacoes iniciais do Portal GEAPA.
 *
 * Este arquivo ainda nao faz chamadas para API. Ele apenas demonstra o fluxo
 * esperado da interface para orientar o desenvolvimento futuro.
 */

(function iniciarPortalGeapa() {
  if (typeof document === 'undefined') {
    return;
  }

  var form = document.getElementById('codigo-form');
  var input = document.getElementById('email-ou-rga');
  var status = document.getElementById('mensagem-status');
  var situacao = document.getElementById('minha-situacao');

  if (!form || !input || !status || !situacao) {
    return;
  }

  form.addEventListener('submit', function aoSolicitarCodigo(event) {
    event.preventDefault();

    var emailOuRga = input.value.trim();

    if (!emailOuRga) {
      status.textContent = 'Informe um e-mail ou RGA para continuar.';
      input.focus();
      return;
    }

    var resposta = portalSimularSolicitacaoCodigo(emailOuRga);
    status.textContent = resposta.mensagem;

    portalRenderizarMinhaSituacaoSimulada(situacao, emailOuRga);
  });
})();

/**
 * Simula a solicitacao de codigo temporario.
 *
 * Futuramente esta funcao devera chamar o Web App do Apps Script.
 *
 * @param {string} emailOuRga E-mail ou RGA informado na tela.
 * @return {{ok: boolean, mensagem: string}}
 */
function portalSimularSolicitacaoCodigo(emailOuRga) {
  return {
    ok: true,
    mensagem: 'Solicitacao simulada para "' + emailOuRga + '". Nenhum e-mail foi enviado.'
  };
}

/**
 * Renderiza uma previa visual da area "Minha situacao".
 *
 * A tela final so deve exibir dados reais depois de autenticacao e consulta
 * segura ao backend.
 *
 * @param {HTMLElement} container Area que recebera a simulacao.
 * @param {string} emailOuRga Identificador informado pelo membro.
 */
function portalRenderizarMinhaSituacaoSimulada(container, emailOuRga) {
  container.innerHTML = [
    '<p class="simulation-title">Previa simulada</p>',
    '<ul class="simulation-list">',
    '<li>Identificador informado: ' + portalEscaparHtml(emailOuRga) + '</li>',
    '<li>Autenticacao real ainda nao implementada.</li>',
    '<li>Dados oficiais ainda nao consultados.</li>',
    '</ul>'
  ].join('');
}

/**
 * Escapa texto antes de inserir HTML gerado por simulacao.
 *
 * @param {string} valor Texto recebido da interface.
 * @return {string} Texto seguro para HTML.
 */
function portalEscaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
