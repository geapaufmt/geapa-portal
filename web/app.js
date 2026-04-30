/**
 * Cliente inicial do Portal GEAPA.
 *
 * Este arquivo roda no GitHub Pages, portanto deve ser tratado como publico.
 * Nao colocar dados reais, IDs sensiveis, tokens, chaves ou regras criticas de
 * autorizacao aqui. Toda validacao real devera acontecer no Apps Script.
 */

const API_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';

(function iniciarPortalGeapa() {
  if (typeof document === 'undefined') {
    return;
  }

  const form = document.getElementById('acesso-form');
  const emailOuRga = document.getElementById('email-ou-rga');
  const codigo = document.getElementById('codigo-acesso');
  const botaoSolicitar = document.getElementById('solicitar-codigo');
  const status = document.getElementById('mensagem-status');
  const situacao = document.getElementById('minha-situacao');

  if (!form || !emailOuRga || !codigo || !botaoSolicitar || !status || !situacao) {
    return;
  }

  botaoSolicitar.addEventListener('click', function aoSolicitarCodigo() {
    const identificador = emailOuRga.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para receber o codigo simulado.');
      emailOuRga.focus();
      return;
    }

    const resposta = solicitarCodigo(identificador);
    atualizarStatus(status, resposta.mensagem);
    codigo.focus();
  });

  form.addEventListener('submit', function aoEntrar(event) {
    event.preventDefault();

    const identificador = emailOuRga.value.trim();
    const codigoInformado = codigo.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para continuar.');
      emailOuRga.focus();
      return;
    }

    if (!codigoInformado) {
      atualizarStatus(status, 'Informe o codigo de acesso simulado.');
      codigo.focus();
      return;
    }

    const validacao = validarCodigo(identificador, codigoInformado);
    atualizarStatus(status, validacao.mensagem);

    if (validacao.ok) {
      const minhaSituacao = carregarMinhaSituacao(validacao.token);
      renderizarMinhaSituacao(situacao, minhaSituacao);
    }
  });
})();

/**
 * Simula a solicitacao de codigo temporario.
 *
 * Futuramente esta funcao devera chamar o Apps Script:
 * fetch(API_URL, { method: 'POST', body: JSON.stringify({ acao: 'solicitarCodigo', emailOuRga }) })
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @return {{ok: boolean, mensagem: string}}
 */
function solicitarCodigo(emailOuRga) {
  return {
    ok: true,
    mensagem: 'Codigo simulado solicitado para "' + emailOuRga + '". Nenhum e-mail foi enviado.'
  };
}

/**
 * Simula a validacao do codigo temporario.
 *
 * Futuramente esta funcao devera chamar o Apps Script:
 * fetch(API_URL, { method: 'POST', body: JSON.stringify({ acao: 'validarCodigo', emailOuRga, codigo }) })
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @param {string} codigo Codigo digitado na tela.
 * @return {{ok: boolean, mensagem: string, token: string}}
 */
function validarCodigo(emailOuRga, codigo) {
  return {
    ok: true,
    mensagem: 'Entrada simulada concluida. Dados reais ainda nao foram consultados.',
    token: 'sessao-simulada-sem-valor-real',
    identificador: emailOuRga,
    codigo: codigo
  };
}

/**
 * Simula o carregamento da tela "Minha situacao".
 *
 * Futuramente esta funcao devera chamar o Apps Script:
 * fetch(API_URL, { method: 'POST', body: JSON.stringify({ acao: 'minhaSituacao', token }) })
 *
 * @param {string} token Token temporario retornado pelo backend.
 * @return {Object} Dados simulados para renderizacao local.
 */
function carregarMinhaSituacao(token) {
  return {
    modo: 'simulacao',
    tokenRecebido: token,
    nomeExibicao: 'Membro GEAPA',
    situacaoGeral: 'Simulada',
    resumo: 'Esta previa mostra apenas a estrutura visual da futura consulta individual.',
    itens: [
      'Nenhuma planilha oficial foi consultada.',
      'Nenhum dado real de membro esta no GitHub Pages.',
      'A consulta real sera filtrada pelo Apps Script.'
    ]
  };
}

/**
 * Renderiza a area simulada de "Minha situacao".
 *
 * @param {HTMLElement} container Elemento que recebera a tela simulada.
 * @param {Object} dados Dados simulados retornados por carregarMinhaSituacao.
 */
function renderizarMinhaSituacao(container, dados) {
  container.innerHTML = [
    '<div class="situation-summary">',
    '<p class="simulation-title">' + escaparHtml(dados.nomeExibicao) + '</p>',
    '<p><strong>Situacao:</strong> ' + escaparHtml(dados.situacaoGeral) + '</p>',
    '<p>' + escaparHtml(dados.resumo) + '</p>',
    '</div>',
    '<ul class="simulation-list">',
    dados.itens.map(function montarItem(item) {
      return '<li>' + escaparHtml(item) + '</li>';
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Atualiza a mensagem de status acessivel da tela.
 *
 * @param {HTMLElement} status Elemento de status.
 * @param {string} mensagem Mensagem a exibir.
 */
function atualizarStatus(status, mensagem) {
  status.textContent = mensagem;
}

/**
 * Escapa texto antes de inserir HTML gerado por simulacao.
 *
 * @param {string} valor Texto recebido da interface.
 * @return {string} Texto seguro para HTML.
 */
function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
