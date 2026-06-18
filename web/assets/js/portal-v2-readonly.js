/**
 * Telas somente leitura das views V2 do Portal GEAPA.
 *
 * O front-end apenas chama a API do Apps Script e renderiza o que o backend ja
 * filtrou. Perfil e permissoes continuam vindo da sessao resolvida pelo CORE.
 */
(function configurarPortalV2Readonly(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var ROTAS = {
    frequencia: {
      titulo: 'Minha frequencia',
      marcador: 'Meu vinculo',
      intro: 'Consulta propria de presencas e faltas nas views V2.',
      endpoint: '/v2/minha-frequencia',
      listaCampo: 'registros',
      vazio: 'Nenhum registro de frequencia disponivel nesta etapa.',
      colunas: [
        ['ciclo', 'Ciclo'],
        ['percentualFrequencia', 'Frequencia'],
        ['faltasLiquidas', 'Faltas'],
        ['situacaoDisciplinar', 'Situacao'],
        ['elegivelCertificado', 'Certificado']
      ]
    },
    'minhas-apresentacoes': {
      titulo: 'Minhas apresentacoes',
      marcador: 'Meu vinculo',
      intro: 'Historico proprio de apresentacoes permitido pelo backend.',
      endpoint: '/v2/minhas-apresentacoes',
      listaCampo: 'apresentacoes',
      vazio: 'Nenhuma apresentacao disponivel para este usuario.',
      colunas: [
        ['dataAtividade', 'Data', 'dataPeriodo', ['rotuloSemestre', 'periodo']],
        ['tema', 'Apresentacao', 'temaEixos', ['titulo', 'eixoTematicoPrincipal', 'eixoTematicoSecundario']],
        ['statusApresentacao', 'Status'],
        ['linkPastaDrive', 'Pasta', 'link', ['idPastaDrive']]
      ]
    },
    justificativas: {
      titulo: 'Minhas justificativas',
      marcador: 'Meu vinculo',
      intro: 'Consulta propria de justificativas ja registradas nas views V2.',
      endpoint: '/v2/minhas-justificativas',
      listaCampo: 'justificativas',
      vazio: 'Nenhuma justificativa disponivel para este usuario.',
      colunas: [
        ['dataAtividade', 'Data'],
        ['tituloPublico', 'Atividade'],
        ['motivoCategoria', 'Motivo'],
        ['statusJustificativa', 'Status'],
        ['enviadaEm', 'Enviada em']
      ]
    },
    'pendencias-diretoria': {
      titulo: 'Pendencias da Diretoria',
      marcador: 'Gestao do GEAPA',
      intro: 'Pendencias consolidadas somente para perfis autorizados pelo backend.',
      endpoint: '/v2/pendencias-diretoria',
      listaCampo: 'pendencias',
      vazio: 'Nenhuma pendencia de diretoria disponivel nesta etapa.',
      colunas: [
        ['tipo', 'Tipo'],
        ['titulo', 'Titulo'],
        ['status', 'Status'],
        ['severidade', 'Severidade'],
        ['prazo', 'Prazo']
      ]
    },
    'status-v2': {
      titulo: 'Status do Sistema V2',
      marcador: 'Gestao do GEAPA',
      intro: 'Saude das views V2 que alimentam o Portal.',
      endpoint: '/v2/status-views',
      listaCampo: 'views',
      vazio: 'Nenhum status de view V2 disponivel nesta etapa.',
      colunas: [
        ['view', 'View'],
        ['status', 'Status'],
        ['atualizadaEm', 'Atualizada em'],
        ['mensagem', 'Mensagem']
      ]
    }
  };

  function iniciar() {
    if (!api || !ui || !navigation) {
      return;
    }

    document.addEventListener('portal:navigationchange', function aoNavegar(evento) {
      var rota = evento.detail && evento.detail.rota;

      if (rota && ROTAS[rota.id]) {
        carregarTela(rota.id);
      }
    });

    if (typeof navigation.getRotaAtual === 'function' && ROTAS[navigation.getRotaAtual()]) {
      carregarTela(navigation.getRotaAtual());
    }
  }

  function carregarTela(idRota) {
    var definicao = ROTAS[idRota];
    var container = document.getElementById('placeholder-content');

    if (!definicao || !container) {
      return;
    }

    renderizarBase(container, definicao, '<p class="empty-state">Carregando dados da view V2...</p>');
    ui.mostrarLoading('Carregando view V2...');

    api.apiGet(definicao.endpoint, {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar a view V2.');
        }

        renderizarBase(container, definicao, montarConteudo(definicao, resposta.data || {}));
      })
      .catch(function tratarErro(erro) {
        renderizarBase(
          container,
          definicao,
          '<p class="empty-state readonly-error">' + ui.escaparHtml(erro.message || 'Erro controlado ao carregar a view V2.') + '</p>'
        );
      })
      .then(function finalizar() {
        ui.ocultarLoading();
      });
  }

  function renderizarBase(container, definicao, corpo) {
    container.innerHTML = [
      '<p class="eyebrow">' + ui.escaparHtml(definicao.marcador) + '</p>',
      '<div class="public-content-heading">',
      '<h2>' + ui.escaparHtml(definicao.titulo) + '</h2>',
      '<p class="intro">' + ui.escaparHtml(definicao.intro) + '</p>',
      '</div>',
      corpo
    ].join('');
  }

  function montarConteudo(definicao, data) {
    var itens = Array.isArray(data[definicao.listaCampo]) ? data[definicao.listaCampo] : [];
    var resumo = data.resumo || {};
    var ultimaAtualizacao = data.ultimaAtualizacao || '';

    return [
      montarResumo(resumo, itens.length, ultimaAtualizacao),
      itens.length
        ? montarTabela(definicao, itens)
        : '<p class="empty-state readonly-empty">' + ui.escaparHtml(definicao.vazio) + '</p>'
    ].join('');
  }

  function montarResumo(resumo, totalLista, ultimaAtualizacao) {
    var total = resumo.total !== undefined ? resumo.total : totalLista;
    var partes = [
      ['Total', total]
    ];

    ['presentes', 'faltas', 'justificadas', 'pendentes', 'realizadas', 'percentualFrequencia'].forEach(function adicionar(chave) {
      if (resumo[chave] !== undefined && resumo[chave] !== null && resumo[chave] !== '') {
        partes.push([formatarRotulo(chave), resumo[chave]]);
      }
    });

    return [
      '<div class="readonly-summary">',
      partes.map(function montar(item) {
        return [
          '<div class="summary-item">',
          '<dt>' + ui.escaparHtml(item[0]) + '</dt>',
          '<dd>' + ui.escaparHtml(formatarValor(item[1])) + '</dd>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>',
      ultimaAtualizacao
        ? '<p class="updated-at">Atualizado em: ' + ui.escaparHtml(formatarValor(ultimaAtualizacao)) + '</p>'
        : ''
    ].join('');
  }

  function montarTabela(definicao, itens) {
    return [
      '<div class="readonly-table-wrap">',
      '<table class="readonly-table">',
      '<thead><tr>',
      definicao.colunas.map(function montarCabecalho(coluna) {
        return '<th scope="col">' + ui.escaparHtml(coluna[1]) + '</th>';
      }).join(''),
      '</tr></thead>',
      '<tbody>',
      itens.map(function montarLinha(item) {
        return [
          '<tr>',
          definicao.colunas.map(function montarCelula(coluna) {
            return '<td>' + renderizarValorTabela(obterValorColuna(item, coluna), coluna, item) + '</td>';
          }).join(''),
          '</tr>'
        ].join('');
      }).join(''),
      '</tbody>',
      '</table>',
      '</div>'
    ].join('');
  }

  function obterValorColuna(item, coluna) {
    var chaves = [coluna[0]].concat(coluna[3] || []);
    var dados = item || {};
    var valor;

    for (var i = 0; i < chaves.length; i++) {
      valor = dados[chaves[i]];

      if (valor !== undefined && valor !== null && valor !== '') {
        return valor;
      }
    }

    return '';
  }

  function renderizarValorTabela(valor, coluna, item) {
    var tipo = coluna && coluna[2];
    var texto = formatarValor(valor);
    var url;

    if (tipo === 'dataPeriodo') {
      return renderizarDataPeriodo(item, coluna);
    }

    if (tipo === 'temaEixos') {
      return renderizarTemaEixos(item, coluna);
    }

    if (tipo === 'link') {
      url = normalizarUrlPublica((item || {})[coluna[0]]) ||
        montarUrlDrivePorId((item || {})[coluna[0]]) ||
        montarUrlDrivePorId(obterPrimeiroValorPorChaves(item, coluna[3] || []));

      return url
        ? '<a href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir</a>'
        : '<span class="muted-inline">Nao disponivel</span>';
    }

    return ui.escaparHtml(texto);
  }

  function renderizarDataPeriodo(item, coluna) {
    var data = formatarValor((item || {})[coluna[0]]);
    var periodo = obterPrimeiroValorPorChaves(item, coluna[3] || []);

    return [
      '<span class="readonly-main-value">' + ui.escaparHtml(data) + '</span>',
      periodo
        ? '<small class="readonly-sub-value">' + ui.escaparHtml(formatarValor(periodo)) + '</small>'
        : ''
    ].join('');
  }

  function renderizarTemaEixos(item, coluna) {
    var titulo = obterValorColuna(item, coluna);
    var eixoPrincipal = (item || {}).eixoTematicoPrincipal || '';
    var eixoSecundario = (item || {}).eixoTematicoSecundario || '';
    var eixos = [eixoPrincipal, eixoSecundario].filter(Boolean).join(' / ');

    return [
      '<span class="readonly-main-value">' + ui.escaparHtml(formatarValor(titulo)) + '</span>',
      eixos
        ? '<small class="readonly-sub-value">' + ui.escaparHtml(eixos) + '</small>'
        : ''
    ].join('');
  }

  function obterPrimeiroValorPorChaves(item, chaves) {
    var dados = item || {};
    var valor;

    for (var i = 0; i < chaves.length; i++) {
      valor = dados[chaves[i]];

      if (valor !== undefined && valor !== null && valor !== '') {
        return valor;
      }
    }

    return '';
  }

  function normalizarUrlPublica(valor) {
    var texto = String(valor || '').trim();

    if (!texto || texto === '-') {
      return '';
    }

    if (/^https?:\/\//i.test(texto)) {
      return texto;
    }

    if (/^www\./i.test(texto)) {
      return 'https://' + texto;
    }

    if (/^drive\.google\.com\//i.test(texto)) {
      return 'https://' + texto;
    }

    return '';
  }

  function montarUrlDrivePorId(valor) {
    var id = String(valor || '').trim();

    if (!id || !/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
      return '';
    }

    return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
  }

  function formatarValor(valor) {
    if (valor === true) {
      return 'Sim';
    }

    if (valor === false) {
      return 'Nao';
    }

    if (valor === undefined || valor === null || valor === '') {
      return '-';
    }

    return String(valor).replace(/_/g, ' ');
  }

  function formatarRotulo(valor) {
    return String(valor || '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^./, function primeira(letra) {
        return letra.toUpperCase();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})(window);
