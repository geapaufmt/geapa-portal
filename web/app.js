/**
 * Cliente inicial do Portal GEAPA.
 *
 * Este arquivo roda no GitHub Pages, portanto deve ser tratado como publico.
 * Nao colocar dados reais, IDs sensiveis, tokens, chaves ou regras criticas de
 * autorizacao aqui. Toda validacao real devera acontecer no Apps Script.
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxf-vC0VFALa45AlT1ycKJcL44EB6LiCFBwVy3LIPvrWGxyd5_1U2XKRM03_7rsh-k/exec';
const SESSION_STORAGE_KEY = 'geapaPortal.sessionToken';

(function iniciarPortalGeapa() {
  if (typeof document === 'undefined') {
    return;
  }

  const form = document.getElementById('acesso-form');
  const app = document.getElementById('portal-app');
  const telaAcesso = document.getElementById('tela-acesso');
  const telaSituacao = document.getElementById('tela-situacao');
  const emailOuRga = document.getElementById('email-ou-rga');
  const codigo = document.getElementById('codigo-acesso');
  const botaoSolicitar = document.getElementById('solicitar-codigo');
  const botaoSair = document.getElementById('sair');
  const status = document.getElementById('mensagem-status');
  const situacao = document.getElementById('minha-situacao');

  if (!form || !app || !telaAcesso || !telaSituacao || !emailOuRga || !codigo || !botaoSolicitar || !botaoSair || !status || !situacao) {
    return;
  }

  botaoSolicitar.addEventListener('click', async function aoSolicitarCodigo() {
    const identificador = emailOuRga.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para receber o código.');
      emailOuRga.focus();
      return;
    }

    botaoSolicitar.disabled = true;
    atualizarStatus(status, 'Solicitando código...');

    try {
      const resposta = await solicitarCodigo(identificador);
      atualizarStatus(status, obterMensagem(resposta));
      codigo.focus();
    } catch (erro) {
      atualizarStatus(status, erro.message);
    } finally {
      botaoSolicitar.disabled = false;
    }
  });

  form.addEventListener('submit', async function aoEntrar(event) {
    event.preventDefault();

    const identificador = emailOuRga.value.trim();
    const codigoInformado = codigo.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para continuar.');
      emailOuRga.focus();
      return;
    }

    if (!codigoInformado) {
      atualizarStatus(status, 'Informe o código de acesso.');
      codigo.focus();
      return;
    }

    atualizarStatus(status, 'Validando código...');
    alternarFormularioOcupado(form, true);

    try {
      const validacao = await validarCodigo(identificador, codigoInformado);
      atualizarStatus(status, obterMensagem(validacao));

      if (validacao.ok) {
        const sessionToken = obterSessionToken(validacao);
        salvarSessaoLocal(sessionToken);
        mostrarTelaSituacao(app, telaAcesso, telaSituacao);
        renderizarCarregandoSituacao(situacao);

        try {
          const minhaSituacao = await carregarMinhaSituacao(sessionToken);
          renderizarMinhaSituacao(situacao, minhaSituacao);
        } catch (erroSituacao) {
          limparSessaoLocal();
          renderizarErroSituacao(situacao, erroSituacao.message);
        }
      }
    } catch (erro) {
      atualizarStatus(status, erro.message);
    } finally {
      alternarFormularioOcupado(form, false);
    }
  });

  botaoSair.addEventListener('click', function aoSair() {
    limparSessaoLocal();
    form.reset();
    situacao.innerHTML = [
      '<p class="empty-state">',
      'Depois da entrada, esta área mostrará a primeira versão da tela "Minha situação".',
      '</p>'
    ].join('');
    atualizarStatus(status, 'Sessão encerrada neste navegador.');
    mostrarTelaAcesso(app, telaAcesso, telaSituacao);
    emailOuRga.focus();
  });

  restaurarSessaoSalva(app, telaAcesso, telaSituacao, situacao, status);
})();

/**
 * Solicita codigo temporario ao Apps Script.
 *
 * Nesta etapa, o Apps Script envia e-mail apenas para cadastros liberados para
 * teste.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @return {Promise<{ok: boolean, mensagem: string}>}
 */
function solicitarCodigo(emailOuRga) {
  return chamarApi('solicitarCodigo', {
    emailOuRga: emailOuRga
  });
}

/**
 * Valida codigo temporario no Apps Script.
 *
 * Nesta etapa, o Apps Script valida codigos temporarios de teste.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @param {string} codigo Codigo digitado na tela.
 * @return {Promise<{ok: boolean, mensagem: string, token: string}>}
 */
function validarCodigo(emailOuRga, codigo) {
  return chamarApi('validarCodigo', {
    emailOuRga: emailOuRga,
    codigo: codigo
  });
}

/**
 * Carrega a tela "Minha situacao" pelo Apps Script.
 *
 * Nesta etapa, o backend devolve dados cadastrais basicos e blocos
 * complementares ainda em preparacao.
 *
 * @param {string} token Token temporario retornado pelo backend.
 * @return {Promise<Object>} Dados parciais para renderizacao local.
 */
async function carregarMinhaSituacao(token) {
  const resposta = await chamarApi('minhaSituacao', {
    token: token
  });

  return normalizarMinhaSituacao(resposta);
}

/**
 * Chama o Apps Script usando formulario simples.
 *
 * Nao adicionar chaves, tokens fixos ou IDs sensiveis neste cliente publico.
 * A autorizacao real deve continuar no Apps Script.
 *
 * @param {string} acao Nome da acao no backend.
 * @param {Object} dados Parametros da acao.
 * @return {Promise<Object>} Resposta JSON do Apps Script.
 */
async function chamarApi(acao, dados) {
  const corpo = new URLSearchParams();
  corpo.set('acao', acao);

  Object.keys(dados || {}).forEach(function adicionarCampo(chave) {
    corpo.set(chave, dados[chave]);
  });

  const resposta = await fetch(API_URL, {
    method: 'POST',
    body: corpo
  });

  if (!resposta.ok) {
    throw new Error('Não foi possível falar com a API do Portal GEAPA.');
  }

  const payload = await resposta.json();

  if (!payload.ok) {
    throw new Error(obterMensagem(payload) || 'A API retornou uma resposta inesperada.');
  }

  return payload;
}

/**
 * Adapta a resposta parcial do Apps Script para a interface.
 *
 * @param {Object} resposta Resposta da acao minhaSituacao.
 * @return {Object} Dados prontos para renderizacao.
 */
function normalizarMinhaSituacao(resposta) {
  const dados = (resposta.data && resposta.data.situacao) || resposta.dados || {};
  const pendencias = Array.isArray(dados.pendencias) ? dados.pendencias : [];
  const participacao = dados.participacao || {};

  return {
    modo: (resposta.meta && resposta.meta.modo) || resposta.modo || 'placeholder',
    nomeExibicao: dados.nomeExibicao || 'Membro GEAPA',
    situacaoGeral: dados.situacaoGeral || 'Simulada',
    vinculo: dados.vinculo || 'Vínculo em preparação',
    rga: dados.rga || 'RGA-SIMULADO',
    dadosCadastraisReais: Boolean(dados.dadosCadastraisReais),
    blocosComplementares: dados.blocosComplementares || 'em-preparacao',
    ultimaAtualizacao: dados.ultimaAtualizacao || dados.atualizadoEm || '',
    resumo: dados.resumo || {},
    pendencias: pendencias,
    participacao: {
      frequenciaGeral: participacao.frequenciaGeral || '',
      atividadesRecentes: Array.isArray(participacao.atividadesRecentes)
        ? participacao.atividadesRecentes
        : [],
      apresentacoes: normalizarApresentacoes(participacao.apresentacoes)
    },
    certificados: dados.certificados || [],
    avisos: dados.avisos || [
      'Os dados cadastrais básicos são carregados pelo backend do portal.',
      'Nenhum dado real de membro está no GitHub Pages.',
      'Frequência, pendências, certificados e histórico ainda serão integrados.'
    ]
  };
}

/**
 * Obtem mensagem considerando o contrato novo e o legado.
 *
 * @param {Object} resposta Resposta da API.
 * @return {string} Mensagem da resposta.
 */
function obterMensagem(resposta) {
  return resposta.message || resposta.mensagem || '';
}

/**
 * Obtem token de sessao considerando o contrato novo e o legado.
 *
 * @param {Object} resposta Resposta da API.
 * @return {string} Token temporario placeholder.
 */
function obterSessionToken(resposta) {
  return (resposta.data && resposta.data.sessionToken) || resposta.token || '';
}

/**
 * Renderiza a area "Minha situacao".
 *
 * @param {HTMLElement} container Elemento que recebera a tela.
 * @param {Object} dados Dados parciais retornados por carregarMinhaSituacao.
 */
function renderizarMinhaSituacao(container, dados) {
  const atividades = dados.participacao.atividadesRecentes || [];
  const apresentacoes = dados.participacao.apresentacoes || {};
  const rotuloOrigem = dados.dadosCadastraisReais
    ? 'Dados cadastrais carregados'
    : 'Dados de teste carregados';
  const notaOrigem = dados.blocosComplementares === 'geapa-core'
    ? rotuloOrigem + ' pelo GEAPA-CORE. Pendências cadastrais podem aparecer quando houver algo a regularizar.'
    : rotuloOrigem + '. Os blocos complementares ainda estão em preparação.';

  container.innerHTML = [
    '<div class="member-header">',
    '<div>',
    '<p class="simulation-title">' + escaparHtml(dados.nomeExibicao) + '</p>',
    '<p class="member-subtitle">' + escaparHtml(dados.vinculo) + '</p>',
    '</div>',
    '<span class="status-pill">' + escaparHtml(dados.situacaoGeral) + '</span>',
    '</div>',
    '<p class="section-note">' + escaparHtml(notaOrigem) + '</p>',
    '<dl class="summary-grid">',
    montarResumoItem('RGA', dados.rga),
    montarResumoItem('Frequência', dados.resumo.frequencia || dados.participacao.frequenciaGeral || 'Em preparação'),
    montarResumoItem('Pendências', String(dados.resumo.pendenciasAbertas || dados.pendencias.length || 0)),
    montarResumoItem('Apresentações', formatarQuantidadeApresentacoes(apresentacoes.quantidadeRealizadas)),
    montarResumoItem('Certificados', String(dados.resumo.certificadosDisponiveis || dados.certificados.length || 0)),
    '</dl>',
    '<div class="situation-section">',
    '<h3>Pendências</h3>',
    montarPendencias(dados.pendencias),
    '</div>',
    '<div class="situation-section">',
    '<h3>Participação</h3>',
    montarApresentacoes(apresentacoes),
    '<p class="section-note">' + escaparHtml(dados.participacao.frequenciaGeral || 'Participação e frequência ainda serão integradas.') + '</p>',
    montarAtividades(atividades),
    '</div>',
    '<div class="situation-section">',
    '<h3>Certificados</h3>',
    montarCertificados(dados.certificados),
    '</div>',
    '<div class="situation-section">',
    '<h3>Avisos</h3>',
    montarListaOuVazio(dados.avisos, 'Nenhum aviso registrado nesta etapa.'),
    '</div>',
    dados.ultimaAtualizacao
      ? '<p class="updated-at">Atualizado em: ' + escaparHtml(formatarData(dados.ultimaAtualizacao)) + '</p>'
      : ''
  ].join('');
}

/**
 * Mostra um estado de carregamento para a tela de situação.
 *
 * @param {HTMLElement} container Area da tela Minha situação.
 */
function renderizarCarregandoSituacao(container) {
  container.innerHTML = [
    '<p class="simulation-title">Carregando Minha situação</p>',
    '<p class="empty-state">Buscando dados no backend do Portal GEAPA.</p>'
  ].join('');
}

/**
 * Mostra erro dentro da tela de situação.
 *
 * @param {HTMLElement} container Area da tela Minha situação.
 * @param {string} mensagem Mensagem de erro.
 */
function renderizarErroSituacao(container, mensagem) {
  container.innerHTML = [
    '<p class="simulation-title">Não foi possível carregar Minha situação</p>',
    '<p class="empty-state">' + escaparHtml(mensagem || 'Tente sair e entrar novamente.') + '</p>'
  ].join('');
}

/**
 * Monta um item do resumo principal.
 *
 * @param {string} rotulo Rotulo do campo.
 * @param {string} valor Valor do campo.
 * @return {string} HTML do item.
 */
function montarResumoItem(rotulo, valor) {
  return [
    '<div class="summary-item">',
    '<dt>' + escaparHtml(rotulo) + '</dt>',
    '<dd>' + escaparHtml(valor || '-') + '</dd>',
    '</div>'
  ].join('');
}

/**
 * Normaliza o bloco de apresentacoes retornado pelo GEAPA-CORE.
 *
 * @param {Object} apresentacoes Dados brutos de apresentacoes.
 * @return {Object} Dados normalizados.
 */
function normalizarApresentacoes(apresentacoes) {
  const dados = apresentacoes || {};

  return {
    periodoUltimaApresentacao: String(dados.periodoUltimaApresentacao || '').trim(),
    quantidadeRealizadas: normalizarNumeroNaoNegativo(dados.quantidadeRealizadas)
  };
}

/**
 * Tenta restaurar a sessao temporaria ao atualizar a pagina.
 *
 * A sessao fica apenas no sessionStorage do navegador e continua dependendo da
 * validade definida no Apps Script. Ao expirar, o membro precisa entrar de novo.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situacao.
 * @param {HTMLElement} situacao Container da tela Minha situacao.
 * @param {HTMLElement} status Elemento de status.
 */
async function restaurarSessaoSalva(app, telaAcesso, telaSituacao, situacao, status) {
  const token = lerSessaoLocal();

  if (!token) {
    return;
  }

  mostrarTelaSituacao(app, telaAcesso, telaSituacao);
  renderizarCarregandoSituacao(situacao);

  try {
    const minhaSituacao = await carregarMinhaSituacao(token);
    renderizarMinhaSituacao(situacao, minhaSituacao);
    atualizarStatus(status, 'Sessão restaurada neste navegador.');
  } catch (erro) {
    limparSessaoLocal();
    mostrarTelaAcesso(app, telaAcesso, telaSituacao);
    atualizarStatus(status, 'Sua sessão expirou. Entre novamente para continuar.');
  }
}

/**
 * Salva token temporario somente para a aba atual do navegador.
 *
 * @param {string} token Token temporario retornado pelo backend.
 */
function salvarSessaoLocal(token) {
  if (!token) {
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch (erro) {
    // Se o navegador bloquear storage, o portal continua funcionando sem restauracao.
  }
}

/**
 * Le token temporario salvo para a aba atual.
 *
 * @return {string} Token salvo ou vazio.
 */
function lerSessaoLocal() {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch (erro) {
    return '';
  }
}

/**
 * Remove token temporario salvo no navegador.
 */
function limparSessaoLocal() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (erro) {
    // Nada a fazer: storage indisponivel nao deve quebrar o portal.
  }
}

/**
 * Monta pendencias cadastrais ou administrativas retornadas pelo GEAPA-CORE.
 *
 * @param {Array<string|Object>} pendencias Pendencias retornadas pela API.
 * @return {string} HTML das pendencias.
 */
function montarPendencias(pendencias) {
  if (!pendencias || !pendencias.length) {
    return '<p class="empty-state">Nenhuma pendência cadastral aberta.</p>';
  }

  return [
    '<ul class="pendency-list">',
    pendencias.map(function montarPendencia(pendencia) {
      if (typeof pendencia === 'string') {
        return '<li class="pendency-card">' + escaparHtml(pendencia) + '</li>';
      }

      const severidade = normalizarSeveridade(pendencia.severidade);
      const tipo = pendencia.tipo ? formatarRotuloCurto(pendencia.tipo) : 'Pendência';
      const status = pendencia.status ? formatarRotuloCurto(pendencia.status) : 'Pendente';

      return [
        '<li class="pendency-card severity-' + escaparHtml(severidade) + '">',
        '<div class="pendency-heading">',
        '<span>' + escaparHtml(pendencia.titulo || 'Pendência cadastral') + '</span>',
        '<small>' + escaparHtml(tipo + ' · ' + status) + '</small>',
        '</div>',
        pendencia.descricao
          ? '<p>' + escaparHtml(pendencia.descricao) + '</p>'
          : '',
        '<small class="severity-label">Severidade: ' + escaparHtml(formatarRotuloCurto(severidade)) + '</small>',
        '</li>'
      ].join('');
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta o bloco de apresentacoes na secao de participacao.
 *
 * @param {Object} apresentacoes Dados normalizados de apresentacoes.
 * @return {string} HTML do bloco.
 */
function montarApresentacoes(apresentacoes) {
  const possuiAtual = apresentacoes.periodoUltimaApresentacao || apresentacoes.quantidadeRealizadas > 0;

  if (!possuiAtual) {
    return '<p class="empty-state">Nenhuma apresentação registrada até o momento.</p>';
  }

  return [
    '<div class="presentation-list">',
    montarCartaoApresentacao(
      'Apresentações registradas',
      apresentacoes.quantidadeRealizadas,
      apresentacoes.periodoUltimaApresentacao
    ),
    '</div>'
  ].join('');
}

/**
 * Monta um cartao de resumo de apresentacoes.
 *
 * @param {string} titulo Titulo do cartao.
 * @param {number} quantidade Quantidade de apresentacoes.
 * @param {string} periodo Periodo da ultima apresentacao.
 * @return {string} HTML do cartao.
 */
function montarCartaoApresentacao(titulo, quantidade, periodo) {
  return [
    '<div class="presentation-card">',
    '<span>' + escaparHtml(titulo) + '</span>',
    '<strong>' + escaparHtml(formatarQuantidadeApresentacoes(quantidade)) + '</strong>',
    '<small>Último período: ' + escaparHtml(periodo || 'Não registrado') + '</small>',
    '</div>'
  ].join('');
}

/**
 * Monta lista simples ou mensagem vazia.
 *
 * @param {string[]} itens Itens a exibir.
 * @param {string} vazio Mensagem de estado vazio.
 * @return {string} HTML da lista.
 */
function montarListaOuVazio(itens, vazio) {
  if (!itens || !itens.length) {
    return '<p class="empty-state">' + escaparHtml(vazio) + '</p>';
  }

  return [
    '<ul class="detail-list">',
    itens.map(function montarItem(item) {
      return '<li>' + escaparHtml(item) + '</li>';
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta atividades recentes.
 *
 * @param {Object[]} atividades Atividades retornadas pela API.
 * @return {string} HTML das atividades.
 */
function montarAtividades(atividades) {
  if (!atividades.length) {
    return '<p class="empty-state">Atividades recentes ainda não foram integradas.</p>';
  }

  return [
    '<ul class="activity-list">',
    atividades.map(function montarAtividade(atividade) {
      return [
        '<li>',
        '<span>' + escaparHtml(atividade.titulo || 'Atividade') + '</span>',
        '<small>' + escaparHtml((atividade.data || '-') + ' · ' + (atividade.status || 'Simulada')) + '</small>',
        '</li>'
      ].join('');
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta lista de certificados.
 *
 * @param {Object[]} certificados Certificados retornados pela API.
 * @return {string} HTML dos certificados.
 */
function montarCertificados(certificados) {
  if (!certificados.length) {
    return '<p class="empty-state">Certificados ainda não foram integrados.</p>';
  }

  return [
    '<ul class="detail-list">',
    certificados.map(function montarCertificado(certificado) {
      return '<li>' + escaparHtml(certificado.titulo || 'Certificado') + ' — ' + escaparHtml(certificado.status || 'Simulado') + '</li>';
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Normaliza numero nao negativo vindo da API.
 *
 * @param {number|string} valor Valor retornado pelo backend.
 * @return {number} Numero seguro para exibicao.
 */
function normalizarNumeroNaoNegativo(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

/**
 * Formata quantidade de apresentacoes com pluralizacao simples.
 *
 * @param {number|string} quantidade Quantidade retornada pelo backend.
 * @return {string} Texto formatado.
 */
function formatarQuantidadeApresentacoes(quantidade) {
  const numero = normalizarNumeroNaoNegativo(quantidade);
  const rotulo = numero === 1 ? 'apresentação' : 'apresentações';

  return numero + ' ' + rotulo;
}

/**
 * Normaliza severidade recebida pelo backend para classes CSS conhecidas.
 *
 * @param {string} valor Severidade retornada pela API.
 * @return {string} Severidade normalizada.
 */
function normalizarSeveridade(valor) {
  const normalizada = String(valor || 'baixa').toLowerCase();

  if (['baixa', 'media', 'alta'].indexOf(normalizada) === -1) {
    return 'baixa';
  }

  return normalizada;
}

/**
 * Formata rotulos curtos vindos do contrato da API.
 *
 * @param {string} valor Valor em formato tecnico.
 * @return {string} Rotulo legivel.
 */
function formatarRotuloCurto(valor) {
  const texto = String(valor || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();

  if (!texto) {
    return '';
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Formata data ISO para pt-BR quando possivel.
 *
 * @param {string} valor Data recebida da API.
 * @return {string} Data formatada.
 */
function formatarData(valor) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString('pt-BR');
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
 * Bloqueia ou libera os campos enquanto uma chamada esta em andamento.
 *
 * @param {HTMLFormElement} form Formulario de acesso.
 * @param {boolean} ocupado Estado de carregamento.
 */
function alternarFormularioOcupado(form, ocupado) {
  Array.prototype.forEach.call(form.elements, function alternarCampo(campo) {
    campo.disabled = ocupado;
  });
}

/**
 * Mostra a tela de situação após a entrada.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situação.
 */
function mostrarTelaSituacao(app, telaAcesso, telaSituacao) {
  app.classList.remove('view-login');
  app.classList.add('view-situacao');
  telaAcesso.hidden = true;
  telaSituacao.hidden = false;
}

/**
 * Volta para a tela de acesso.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situação.
 */
function mostrarTelaAcesso(app, telaAcesso, telaSituacao) {
  app.classList.remove('view-situacao');
  app.classList.add('view-login');
  telaSituacao.hidden = true;
  telaAcesso.hidden = false;
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
