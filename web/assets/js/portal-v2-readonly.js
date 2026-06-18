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
      tipo: 'minhas-apresentacoes',
      vazio: 'Nenhuma apresentacao disponivel para este usuario.',
      colunas: [
        ['dataAtividade', 'Data'],
        ['rotuloSemestre', 'Semestre', 'texto', ['periodo']],
        ['tema', 'Tema', 'texto', ['titulo']],
        ['eixoTematicoPrincipal', 'Eixos', 'eixos', ['eixoTematicoSecundario']],
        ['statusApresentacao', 'Status'],
        ['linkPastaDrive', 'Pasta', 'link', ['idPastaDrive']]
      ]
    },
    'admin-apresentacoes': {
      titulo: 'Pendencias de apresentacoes',
      marcador: 'Gestao do GEAPA',
      intro: 'Revisao de titulos, eixos e materiais permitida pelo backend.',
      endpoint: '/v2/apresentacoes/pendencias',
      listaCampo: 'pendencias',
      tipo: 'pendencias-apresentacoes',
      vazio: 'Nenhuma pendencia de apresentacao disponivel.'
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
  var estado = {
    rotaAtual: '',
    itensPorId: {},
    eixos: null,
    eixosPromise: null
  };

  function iniciar() {
    if (!api || !ui || !navigation) {
      return;
    }

    document.addEventListener('click', tratarCliqueReadonly);
    document.addEventListener('submit', tratarSubmitReadonly);
    document.addEventListener('change', tratarChangeReadonly);

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

    estado.rotaAtual = idRota;
    estado.itensPorId = {};
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

    indexarItensPorId(itens);

    return [
      montarResumo(resumo, itens.length, ultimaAtualizacao),
      itens.length && definicao.tipo === 'minhas-apresentacoes'
        ? montarMinhasApresentacoes(itens)
        : '',
      itens.length && definicao.tipo === 'pendencias-apresentacoes'
        ? montarPendenciasApresentacoes(itens)
        : '',
      itens.length && !definicao.tipo
        ? montarTabela(definicao, itens)
        : '',
      itens.length
        ? ''
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

  function indexarItensPorId(itens) {
    estado.itensPorId = {};

    (itens || []).forEach(function guardar(item, indice) {
      var id = obterIdItem(item) || String(indice);

      estado.itensPorId[id] = item;
    });
  }

  function obterIdItem(item) {
    return String((item || {}).idApresentacao || (item || {}).idPendencia || (item || {}).idAtividade || '').trim();
  }

  function montarMinhasApresentacoes(itens) {
    return [
      '<div class="presentation-actions-list">',
      itens.map(function montar(item) {
        var id = obterIdItem(item);
        var acoesMembro = obterAcoesMembro(item);
        var eixos = renderizarEixos(item);
        var material = renderizarMaterialApresentacao(item, acoesMembro);
        var pasta = renderizarPastaAtividade(item, acoesMembro);
        var recursos = montarRecursosApresentacao(material, pasta);
        var acoes = montarAcoesMinhasApresentacoes(item, id, acoesMembro);

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          '<span>' + ui.escaparHtml(formatarValor(item.dataAtividade)) + '</span>',
          item.rotuloSemestre ? '<span>' + ui.escaparHtml(formatarValor(item.rotuloSemestre)) + '</span>' : '',
          item.statusApresentacao ? '<span>' + ui.escaparHtml(formatarValor(item.statusApresentacao)) + '</span>' : '',
          '</div>',
          '<div class="presentation-action-main">',
          '<div>',
          '<h3>' + ui.escaparHtml(formatarValor(obterTituloApresentacao(item))) + '</h3>',
          eixos ? '<p>' + eixos + '</p>' : '',
          '</div>',
          '<div class="presentation-status-stack">',
          item.statusTituloEixo ? '<small>Titulo/eixos: ' + ui.escaparHtml(formatarValor(item.statusTituloEixo)) + '</small>' : '',
          item.statusMaterial ? '<small>Material: ' + ui.escaparHtml(formatarValor(item.statusMaterial)) + '</small>' : '',
          '</div>',
          '</div>',
          recursos,
          acoes ? '<div class="presentation-card-actions">' + acoes + '</div>' : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarAcoesMinhasApresentacoes(item, id, acoesMembro) {
    var botoes = [];
    var temTituloOuEixo = Boolean(item.tema || item.titulo || item.eixoTematicoPrincipal || item.eixoTematicoSecundario);
    var acoes = acoesMembro || {};

    if (acoes.podeEditarTituloEixo === true) {
      botoes.push(botaoAcao('titulo-eixo', id, temTituloOuEixo ? 'Editar titulo/eixos' : 'Informar titulo/eixos', 'secondary'));
    }

    if (acoes.podeEnviarMaterial === true) {
      botoes.push(botaoAcao('material', id, 'Enviar material', 'primary'));
    } else if (acoes.podeReenviarMaterial === true) {
      botoes.push(botaoAcao('material', id, 'Reenviar material', 'primary'));
    }

    return botoes.join('');
  }

  function montarPendenciasApresentacoes(itens) {
    return [
      '<div class="presentation-actions-list">',
      itens.map(function montar(item) {
        var id = String(item.idApresentacao || '').trim();
        var acoesGestao = obterAcoesGestao(item);
        var tituloAtividade = item.tituloAtividade || item.tituloPublico || item.atividade || item.idAtividade || 'Atividade';
        var titulo = item.tituloApresentacao || item.tema || item.titulo || 'Titulo ainda nao informado';
        var apresentador = item.nomeApresentador || item.apresentador || item.nomePessoaPrincipalPublico || 'Apresentador ainda nao definido';
        var acoesTitulo = [
          acoesGestao.podeAprovarTituloEixo === true
            ? botaoAcao('revisar-titulo-aprovar', id, 'Aprovar titulo/eixos', 'primary')
            : '',
          acoesGestao.podeSolicitarAjusteTituloEixo === true
            ? botaoAcao('revisar-titulo-ajuste', id, 'Solicitar ajuste', 'warning')
            : ''
        ].join('');
        var acoesMaterial = [
          acoesGestao.podeAprovarMaterial === true
            ? botaoAcao('revisar-material-aprovar', id, 'Aprovar material', 'primary')
            : '',
          acoesGestao.podeSolicitarAjusteMaterial === true
            ? botaoAcao('revisar-material-ajuste', id, 'Solicitar ajuste', 'warning')
            : '',
          acoesGestao.podeDispensarMaterial === true
            ? botaoAcao('revisar-material-dispensar', id, 'Dispensar material', 'warning')
            : ''
        ].join('');
        var material = renderizarLinkMaterialGestao(item);

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          item.gravidade ? '<span>' + ui.escaparHtml(formatarValor(item.gravidade)) + '</span>' : '',
          item.tipoPendencia ? '<span>' + ui.escaparHtml(formatarValor(item.tipoPendencia)) + '</span>' : '',
          '</div>',
          '<div class="presentation-action-main">',
          '<div>',
          '<small>' + ui.escaparHtml(formatarValor(item.dataAtividade)) + (item.rotuloSemestre ? ' | ' + ui.escaparHtml(formatarValor(item.rotuloSemestre)) : '') + '</small>',
          '<p>Atividade: ' + ui.escaparHtml(formatarValor(tituloAtividade)) + '</p>',
          '<h3>' + ui.escaparHtml(formatarValor(titulo)) + '</h3>',
          apresentador ? '<p>' + ui.escaparHtml(apresentador) + '</p>' : '',
          renderizarEixos(item) ? '<p>' + renderizarEixos(item) + '</p>' : '',
          '</div>',
          '<div class="presentation-status-stack">',
          item.statusTituloEixo ? '<small>Titulo/eixos: ' + ui.escaparHtml(formatarValor(item.statusTituloEixo)) + '</small>' : '',
          item.statusMaterial ? '<small>Material: ' + ui.escaparHtml(formatarValor(item.statusMaterial)) + '</small>' : '',
          '</div>',
          '</div>',
          item.descricaoPendencia ? '<p class="presentation-pendency-text">' + ui.escaparHtml(item.descricaoPendencia) + '</p>' : '',
          item.acaoRecomendada ? '<p class="presentation-pendency-action">Acao recomendada: ' + ui.escaparHtml(item.acaoRecomendada) + '</p>' : '',
          material ? '<div class="presentation-resource-row"><div><strong>Material da apresentacao</strong>' + material + '</div></div>' : '',
          acoesTitulo || acoesMaterial ? '<div class="presentation-card-actions">' + acoesTitulo + acoesMaterial + '</div>' : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function botaoAcao(acao, id, texto, variante) {
    var classe = variante === 'primary'
      ? 'compact-button presentation-action-primary'
      : variante === 'warning'
        ? 'compact-button presentation-action-warning'
        : 'secondary-button compact-button';

    if (!id) {
      return '';
    }

    return [
      '<button class="' + ui.escaparHtml(classe) + '" type="button" data-portal-v2-action="',
      ui.escaparHtml(acao),
      '" data-id-apresentacao="',
      ui.escaparHtml(id),
      '">',
      ui.escaparHtml(texto),
      '</button>'
    ].join('');
  }

  function obterTituloApresentacao(item) {
    return (item || {}).tituloApresentacao ||
      (item || {}).tema ||
      (item || {}).titulo ||
      (item || {}).tituloPublico ||
      'Titulo ainda nao informado';
  }

  function montarRecursosApresentacao(material, pasta) {
    var blocos = [];

    if (material) {
      blocos.push('<div><strong>Material da apresentacao</strong>' + material + '</div>');
    }

    if (pasta) {
      blocos.push('<div><strong>Pasta da atividade</strong>' + pasta + '</div>');
    }

    return blocos.length
      ? '<div class="presentation-resource-row">' + blocos.join('') + '</div>'
      : '';
  }

  function renderizarMaterialApresentacao(item, acoesMembro) {
    var acoes = acoesMembro || {};
    var url = normalizarUrlPublica((item || {}).linkMaterialPublico) ||
      montarUrlDrivePorId((item || {}).idArquivoMaterial);
    var rotulo = (item || {}).nomeArquivoMaterial || 'Abrir material';
    var versao = (item || {}).versaoMaterial ? ' v' + formatarValor((item || {}).versaoMaterial) : '';

    if (acoes.podeAbrirMaterial === true && url) {
      return '<a class="secondary-button compact-button" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">' + ui.escaparHtml(rotulo + versao) + '</a>';
    }

    if ((item || {}).nomeArquivoMaterial) {
      return '<span class="muted-inline">' + ui.escaparHtml(rotulo + versao) + '</span>';
    }

    return '';
  }

  function renderizarPastaAtividade(item, acoesMembro) {
    var acoes = acoesMembro || {};
    var url = normalizarUrlPublica((item || {}).linkPastaDrive) ||
      montarUrlDrivePorId((item || {}).idPastaDrive);

    return acoes.podeAbrirPastaAtividade === true && url
      ? '<a class="activity-folder-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Pasta geral da atividade</a>'
      : '';
  }

  function renderizarLinkMaterialGestao(item) {
    var url = normalizarUrlPublica((item || {}).linkMaterialPublico) ||
      montarUrlDrivePorId((item || {}).idArquivoMaterial);
    var rotulo = (item || {}).nomeArquivoMaterial || 'Abrir material';

    return url
      ? '<a class="secondary-button compact-button" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">' + ui.escaparHtml(rotulo) + '</a>'
      : ((item || {}).nomeArquivoMaterial ? '<span class="muted-inline">' + ui.escaparHtml((item || {}).nomeArquivoMaterial) + '</span>' : '');
  }

  function obterAcoesMembro(item) {
    return normalizarObjetoAcoes((item || {}).acoesMembro, [
      'podeEditarTituloEixo',
      'podeEnviarMaterial',
      'podeReenviarMaterial',
      'podeAbrirMaterial',
      'podeAbrirPastaAtividade'
    ]);
  }

  function obterAcoesGestao(item) {
    return normalizarObjetoAcoes((item || {}).acoesGestao, [
      'podeAprovarTituloEixo',
      'podeSolicitarAjusteTituloEixo',
      'podeAprovarMaterial',
      'podeSolicitarAjusteMaterial',
      'podeDispensarMaterial'
    ]);
  }

  function normalizarObjetoAcoes(valor, chaves) {
    var origem = valor || {};
    var saida = {};

    if (typeof origem === 'string' && origem.trim()) {
      try {
        origem = JSON.parse(origem);
      } catch (erro) {
        origem = {};
      }
    }

    if (!origem || typeof origem !== 'object' || Array.isArray(origem)) {
      origem = {};
    }

    (chaves || []).forEach(function copiar(chave) {
      saida[chave] = origem[chave] === true;
    });

    return saida;
  }

  function tratarCliqueReadonly(evento) {
    var alvo = evento.target && evento.target.closest('[data-portal-v2-action]');
    var acao;
    var id;

    if (!alvo) {
      return;
    }

    acao = alvo.getAttribute('data-portal-v2-action');
    id = alvo.getAttribute('data-id-apresentacao') || '';

    if (acao === 'fechar-modal') {
      fecharModal();
      return;
    }

    if (acao === 'titulo-eixo') {
      abrirModalTituloEixo(id);
      return;
    }

    if (acao === 'material') {
      abrirModalMaterial(id);
      return;
    }

    if (acao === 'revisar-titulo-aprovar') {
      enviarRevisaoTitulo(id, 'APROVAR', '', '');
      return;
    }

    if (acao === 'revisar-titulo-ajuste') {
      abrirModalRevisao(id, 'titulo', 'SOLICITAR_AJUSTE');
      return;
    }

    if (acao === 'revisar-material-aprovar') {
      enviarRevisaoMaterial(id, 'APROVAR', '', '');
      return;
    }

    if (acao === 'revisar-material-ajuste') {
      abrirModalRevisao(id, 'material', 'SOLICITAR_AJUSTE');
      return;
    }

    if (acao === 'revisar-material-dispensar') {
      abrirModalRevisao(id, 'material', 'DISPENSAR');
    }
  }

  function tratarSubmitReadonly(evento) {
    var form = evento.target;

    if (!form || !form.matches('[data-portal-v2-form]')) {
      return;
    }

    evento.preventDefault();

    if (form.getAttribute('data-portal-v2-form') === 'titulo-eixo') {
      salvarTituloEixo(form);
      return;
    }

    if (form.getAttribute('data-portal-v2-form') === 'material') {
      salvarMaterial(form);
      return;
    }

    if (form.getAttribute('data-portal-v2-form') === 'revisao') {
      salvarRevisao(form);
    }
  }

  function tratarChangeReadonly(evento) {
    var alvo = evento.target;

    if (!alvo || !alvo.matches('[data-eixo-select]')) {
      return;
    }

    atualizarAjudaEixo(alvo);
  }

  function abrirModalTituloEixo(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Titulo e eixos', '<p class="empty-state">Carregando eixos tematicos...</p>');
    carregarEixos()
      .then(function renderizar(eixos) {
        atualizarModalConteudo([
          '<form class="readonly-form" data-portal-v2-form="titulo-eixo">',
          '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
          '<label>Titulo',
          '<input name="tituloApresentacao" required value="' + ui.escaparHtml(item.tema || item.titulo || '') + '">',
          '</label>',
          montarSelectEixo('eixoTematicoPrincipal', 'Eixo tematico principal', eixos, item.eixoTematicoPrincipal, true),
          montarSelectEixo('eixoTematicoSecundario', 'Eixo tematico secundario', eixos, item.eixoTematicoSecundario, false),
          '<label>Observacoes',
          '<textarea name="observacoes" rows="4"></textarea>',
          '</label>',
          '<div class="presentation-card-actions">',
          '<button type="submit">Salvar</button>',
          '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
          '</div>',
          '</form>'
        ].join(''));
      })
      .catch(function falhar(erro) {
        atualizarModalConteudo('<p class="empty-state readonly-error">' + ui.escaparHtml(erro.message || 'Nao foi possivel carregar os eixos.') + '</p>');
      });
  }

  function abrirModalMaterial(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Material da apresentacao', [
      '<form class="readonly-form" data-portal-v2-form="material">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      '<label>Arquivo',
      '<input name="arquivo" type="file" required accept=".pdf,.ppt,.pptx,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation">',
      '</label>',
      '<label>Observacoes',
      '<textarea name="observacoes" rows="4"></textarea>',
      '</label>',
      '<p class="muted-inline">Formatos aceitos: PDF, PPT, PPTX e ODP.</p>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Enviar</button>',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
      '</div>',
      '</form>'
    ].join(''));
  }

  function abrirModalRevisao(id, tipo, decisao) {
    abrirModalBase('Revisao de apresentacao', [
      '<form class="readonly-form" data-portal-v2-form="revisao" data-tipo-revisao="' + ui.escaparHtml(tipo) + '" data-decisao="' + ui.escaparHtml(decisao) + '">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      '<label>Observacao publica',
      '<textarea name="observacaoPublica" rows="4"></textarea>',
      '</label>',
      '<label>Observacao interna',
      '<textarea name="observacaoInterna" rows="4"></textarea>',
      '</label>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Confirmar</button>',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
      '</div>',
      '</form>'
    ].join(''));
  }

  function carregarEixos() {
    if (estado.eixos) {
      return Promise.resolve(estado.eixos);
    }

    if (estado.eixosPromise) {
      return estado.eixosPromise;
    }

    estado.eixosPromise = api.apiGet('/v2/apresentacoes/eixos', {})
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar eixos tematicos.');
        }

        estado.eixos = extrairListaEixos(resposta.data || {});
        return estado.eixos;
      })
      .finally(function limpar() {
        estado.eixosPromise = null;
      });

    return estado.eixosPromise;
  }

  function extrairListaEixos(data) {
    return Array.isArray(data.eixos)
      ? data.eixos
      : Array.isArray(data.registros)
        ? data.registros
        : Array.isArray(data.itens)
          ? data.itens
          : [];
  }

  function montarSelectEixo(nome, rotulo, eixos, valorAtual, obrigatorio) {
    return [
      '<label>',
      ui.escaparHtml(rotulo),
      '<select name="' + ui.escaparHtml(nome) + '" ' + (obrigatorio ? 'required ' : '') + 'data-eixo-select>',
      '<option value="">Selecionar</option>',
      (eixos || []).map(function opcao(eixo) {
        var valor = obterValorEixo(eixo);
        var texto = eixo.rotuloFormulario || valor;
        var selecionado = String(valor || '') === String(valorAtual || '') ? ' selected' : '';

        return '<option value="' + ui.escaparHtml(valor) + '"' + selecionado + '>' + ui.escaparHtml(texto) + '</option>';
      }).join(''),
      '</select>',
      '<small class="eixo-help" data-eixo-ajuda></small>',
      '</label>'
    ].join('');
  }

  function obterValorEixo(eixo) {
    return String((eixo || {}).valor || (eixo || {}).codigo || (eixo || {}).id || (eixo || {}).rotuloFormulario || '').trim();
  }

  function atualizarAjudaEixo(select) {
    var valor = select.value;
    var label = select.closest('label');
    var ajuda = label && label.querySelector('[data-eixo-ajuda]');
    var eixo = (estado.eixos || []).filter(function comparar(item) {
      return obterValorEixo(item) === valor;
    })[0];

    if (!ajuda) {
      return;
    }

    ajuda.textContent = eixo ? obterAjudaEixo(eixo) : '';
  }

  function obterAjudaEixo(eixo) {
    var ajuda = eixo.descricaoResumida || eixo.palavrasChave || eixo.exemplosTemas || '';

    if (Array.isArray(ajuda)) {
      return ajuda.join(', ');
    }

    return String(ajuda || '');
  }

  function salvarTituloEixo(form) {
    var dados = new FormData(form);

    executarPostApresentacao('/v2/apresentacoes/titulo-eixo/enviar', {
      idApresentacao: dados.get('idApresentacao'),
      tituloApresentacao: dados.get('tituloApresentacao'),
      eixoTematicoPrincipal: dados.get('eixoTematicoPrincipal'),
      eixoTematicoSecundario: dados.get('eixoTematicoSecundario'),
      observacoes: dados.get('observacoes')
    });
  }

  function salvarMaterial(form) {
    var dados = new FormData(form);
    var arquivo = dados.get('arquivo');

    if (!arquivo || !arquivo.name) {
      mostrarErroModal('Selecione um arquivo.');
      return;
    }

    if (!arquivoPermitido(arquivo)) {
      mostrarErroModal('Formato nao permitido. Use PDF, PPT, PPTX ou ODP.');
      return;
    }

    ui.mostrarLoading('Lendo arquivo...');
    lerArquivoBase64(arquivo)
      .then(function enviar(conteudoBase64) {
        return executarPostApresentacao('/v2/apresentacoes/material/registrar', {
          idApresentacao: dados.get('idApresentacao'),
          nomeArquivoOriginal: arquivo.name,
          mimeType: arquivo.type || '',
          conteudoBase64: conteudoBase64,
          observacoes: dados.get('observacoes')
        }, true);
      })
      .catch(function falhar(erro) {
        ui.ocultarLoading();
        mostrarErroModal(erro.message || 'Nao foi possivel ler o arquivo.');
      });
  }

  function salvarRevisao(form) {
    var dados = new FormData(form);
    var tipo = form.getAttribute('data-tipo-revisao');
    var decisao = form.getAttribute('data-decisao');

    if (tipo === 'titulo') {
      enviarRevisaoTitulo(
        dados.get('idApresentacao'),
        decisao,
        dados.get('observacaoPublica'),
        dados.get('observacaoInterna')
      );
      return;
    }

    enviarRevisaoMaterial(
      dados.get('idApresentacao'),
      decisao,
      dados.get('observacaoPublica'),
      dados.get('observacaoInterna')
    );
  }

  function enviarRevisaoTitulo(id, decisao, observacaoPublica, observacaoInterna) {
    executarPostApresentacao('/v2/apresentacoes/titulo-eixo/revisar', {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    });
  }

  function enviarRevisaoMaterial(id, decisao, observacaoPublica, observacaoInterna) {
    executarPostApresentacao('/v2/apresentacoes/material/revisar', {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    });
  }

  function executarPostApresentacao(route, payload, loadingAtivo) {
    if (!loadingAtivo) {
      ui.mostrarLoading('Salvando apresentacao...');
    }

    return api.apiPost(route, {
      payload: JSON.stringify(payload)
    })
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel salvar a apresentacao.');
        }

        fecharModal();
        carregarTela(estado.rotaAtual || 'minhas-apresentacoes');
      })
      .catch(function falhar(erro) {
        mostrarErroModal(erro.message || 'Erro controlado ao salvar.');
      })
      .then(function finalizar() {
        ui.ocultarLoading();
      });
  }

  function arquivoPermitido(arquivo) {
    var nome = String((arquivo && arquivo.name) || '').toLowerCase();
    var tipo = String((arquivo && arquivo.type) || '').toLowerCase();

    return /\.(pdf|ppt|pptx|odp)$/.test(nome) ||
      [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.presentation'
      ].indexOf(tipo) >= 0;
  }

  function lerArquivoBase64(arquivo) {
    return new Promise(function criar(resolve, reject) {
      var leitor = new FileReader();

      leitor.onload = function aoCarregar() {
        resolve(String(leitor.result || '').split(',').pop() || '');
      };
      leitor.onerror = function aoErro() {
        reject(new Error('Nao foi possivel ler o arquivo.'));
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function abrirModalBase(titulo, corpo) {
    fecharModal();
    document.body.classList.add('modal-open');
    document.body.insertAdjacentHTML('beforeend', [
      '<div class="modal-backdrop readonly-modal" role="dialog" aria-modal="true">',
      '<section class="modal-panel">',
      '<div class="modal-topbar">',
      '<h3>' + ui.escaparHtml(titulo) + '</h3>',
      '<button class="secondary-button compact-button" type="button" data-portal-v2-action="fechar-modal">Fechar</button>',
      '</div>',
      '<div data-readonly-modal-content>',
      corpo,
      '</div>',
      '</section>',
      '</div>'
    ].join(''));
  }

  function atualizarModalConteudo(corpo) {
    var alvo = document.querySelector('[data-readonly-modal-content]');

    if (alvo) {
      alvo.innerHTML = corpo;
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-eixo-select]'), atualizarAjudaEixo);
    }
  }

  function mostrarErroModal(mensagem) {
    var alvo = document.querySelector('[data-readonly-modal-content]');

    if (!alvo) {
      return;
    }

    alvo.insertAdjacentHTML(
      'afterbegin',
      '<p class="empty-state readonly-error">' + ui.escaparHtml(mensagem) + '</p>'
    );
  }

  function fecharModal() {
    var modal = document.querySelector('.readonly-modal');

    if (modal) {
      modal.remove();
    }

    document.body.classList.remove('modal-open');
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

    if (tipo === 'eixos') {
      return renderizarEixos(item);
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

  function renderizarEixos(item) {
    if ((item || {}).eixos) {
      return ui.escaparHtml(formatarValor((item || {}).eixos));
    }

    var eixoPrincipal = (item || {}).eixoTematicoPrincipal || '';
    var eixoSecundario = (item || {}).eixoTematicoSecundario || '';
    var eixos = [eixoPrincipal, eixoSecundario].filter(Boolean).join(' / ');

    return ui.escaparHtml(formatarValor(eixos));
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
