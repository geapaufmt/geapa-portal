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
    eixosExpiraEm: 0,
    eixosPromise: null,
    cache: {}
  };
  var TTL_CACHE_PRIVADO_MS = 60000;
  var TTL_CACHE_EIXOS_MS = 20 * 60 * 1000;

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
    definicao.idRota = idRota;
    estado.itensPorId = {};

    var cacheKey = obterCacheKey(definicao.endpoint);
    var cache = lerCachePortal(cacheKey);

    if (cache) {
      renderizarBase(container, definicao, montarConteudo(definicao, cache.data || {}, true));
      buscarTela(definicao, container, cacheKey, true);
      return;
    }

    renderizarBase(container, definicao, '<p class="empty-state readonly-skeleton">Carregando dados da view V2...</p>');
    ui.mostrarLoading('Carregando view V2...');
    buscarTela(definicao, container, cacheKey, false);
  }

  function buscarTela(definicao, container, cacheKey, emSegundoPlano) {
    api.apiGet(definicao.endpoint, {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar a view V2.');
        }

        salvarCachePortal(cacheKey, resposta.data || {}, TTL_CACHE_PRIVADO_MS);
        if (definicao.idRota && estado.rotaAtual !== definicao.idRota) {
          return;
        }
        renderizarBase(container, definicao, montarConteudo(definicao, resposta.data || {}));
      })
      .catch(function tratarErro(erro) {
        if (emSegundoPlano) {
          return;
        }

        renderizarBase(
          container,
          definicao,
          '<p class="empty-state readonly-error">' + ui.escaparHtml(erro.message || 'Erro controlado ao carregar a view V2.') + '</p>'
        );
      })
      .then(function finalizar() {
        if (!emSegundoPlano) {
          ui.ocultarLoading();
        }
      });
  }

  function obterCacheKey(endpoint) {
    return 'portal-v2-readonly:' + String(endpoint || '');
  }

  function lerCachePortal(chave) {
    var entrada = estado.cache[chave];

    if (!entrada || entrada.expiraEm <= Date.now()) {
      delete estado.cache[chave];
      return null;
    }

    return entrada;
  }

  function salvarCachePortal(chave, data, ttlMs) {
    estado.cache[chave] = {
      data: data,
      expiraEm: Date.now() + ttlMs
    };
  }

  function invalidarCachePortal(chaves) {
    (chaves || []).forEach(function remover(chave) {
      delete estado.cache[obterCacheKey(chave)];
    });
  }

  function invalidarCacheApresentacoes() {
    invalidarCachePortal([
      '/v2/minhas-apresentacoes',
      '/v2/apresentacoes/pendencias',
      '/v2/pendencias-diretoria',
      '/v2/painel-diretoria'
    ]);
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

  function montarConteudo(definicao, data, emCache) {
    var itens = Array.isArray(data[definicao.listaCampo]) ? data[definicao.listaCampo] : [];
    var resumo = data.resumo || {};
    var ultimaAtualizacao = data.ultimaAtualizacao || '';

    indexarItensPorId(itens);

    return [
      montarResumo(resumo, itens.length, ultimaAtualizacao),
      emCache ? '<p class="updated-at">Atualizando em segundo plano...</p>' : '',
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
          item.mensagemTituloEixo ? '<p class="presentation-pendency-text">' + ui.escaparHtml(item.mensagemTituloEixo) + '</p>' : '',
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
    var agrupadas = agruparPendenciasPorApresentacao(itens);

    agrupadas.forEach(function indexarGrupo(item) {
      var id = String(item.idApresentacao || item.idPendencia || item.idAtividade || '').trim();
      if (id) {
        estado.itensPorId[id] = item;
      }
    });

    return [
      '<div class="presentation-actions-list">',
      agrupadas.map(function montar(item) {
        var id = String(item.idApresentacao || '').trim();
        var acoesGestao = obterAcoesGestao(item);
        var tituloAtividade = item.tituloAtividade || item.tituloPublico || item.atividade || item.idAtividade || 'Atividade';
        var titulo = item.tituloApresentacao || item.tema || item.titulo || 'Titulo ainda nao informado';
        var apresentador = item.nomeApresentador ||
          item.responsavelSugerido ||
          item.responsavel ||
          item.nomePessoaPrincipal ||
          item.nomePessoaPrincipalPublico ||
          item.apresentador ||
          'Apresentador ainda nao definido';
        var statusTitulo = obterStatusTituloEixo(item);
        var statusMaterial = obterStatusMaterial(item);
        var podeRevisarTitulo = statusPermiteRevisaoTitulo(statusTitulo);
        var podeRejeitarTitulo = statusPermiteRejeicaoTitulo(statusTitulo);
        var podeRevisarMaterial = statusPermiteRevisaoMaterial(statusMaterial);
        var acoesTitulo = [
          acoesGestao.podeAprovarTituloEixo === true && podeRevisarTitulo
            ? botaoAcao('revisar-titulo-aprovar', id, 'Aprovar titulo/eixos', 'primary')
            : '',
          acaoGestaoAtiva(acoesGestao, ['podeEditarAprovarTituloEixo', 'podeEditarEAprovarTituloEixo']) && podeRevisarTitulo
            ? botaoAcao('revisar-titulo-editar-aprovar', id, 'Editar e aprovar', 'secondary')
            : '',
          acoesGestao.podeSolicitarAjusteTituloEixo === true && podeRevisarTitulo
            ? botaoAcao('revisar-titulo-ajuste', id, 'Solicitar ajuste', 'warning')
            : '',
          acaoGestaoAtiva(acoesGestao, ['podeReprovarTituloEixo', 'podeRejeitarPropostaTema']) && podeRejeitarTitulo
            ? botaoAcao('revisar-titulo-reprovar', id, 'Rejeitar proposta de tema', 'warning')
            : ''
        ].join('');
        var acoesMaterial = [
          acoesGestao.podeAprovarMaterial === true && podeRevisarMaterial
            ? botaoAcao('revisar-material-aprovar', id, 'Aprovar material', 'primary')
            : '',
          acoesGestao.podeSolicitarAjusteMaterial === true && podeRevisarMaterial
            ? botaoAcao('revisar-material-ajuste', id, 'Solicitar ajuste', 'warning')
            : '',
          acoesGestao.podeDispensarMaterial === true
            ? botaoAcao('revisar-material-dispensar', id, 'Dispensar material', 'warning')
            : ''
        ].join('');
        var estadoTitulo = !acoesTitulo && statusEhPendente(statusTitulo)
          ? '<span class="presentation-action-note">Aguardando envio pelo apresentador</span>'
          : '';
        var estadoMaterial = !acoesMaterial && statusEhPendente(statusMaterial)
          ? '<span class="presentation-action-note">Aguardando envio de material</span>'
          : '';
        var material = renderizarLinkMaterialGestao(item);
        var blocosContrato = montarBlocosContratoPendencia(item);

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          (item.gravidade || item.severidade) ? '<span>' + ui.escaparHtml(formatarValor(item.gravidade || item.severidade)) + '</span>' : '',
          montarTiposPendencia(item),
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
          montarDescricoesPendencia(item),
          item.acaoRecomendada ? '<p class="presentation-pendency-action">Acao recomendada: ' + ui.escaparHtml(item.acaoRecomendada) + '</p>' : '',
          blocosContrato,
          material ? '<div class="presentation-resource-row"><div><strong>Material da apresentacao</strong>' + material + '</div></div>' : '',
          acoesTitulo || acoesMaterial || estadoTitulo || estadoMaterial
            ? '<div class="presentation-card-actions">' + acoesTitulo + acoesMaterial + estadoTitulo + estadoMaterial + '</div>'
            : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function agruparPendenciasPorApresentacao(itens) {
    var mapa = {};
    var lista = [];

    (itens || []).forEach(function agrupar(item) {
      var chave = String(item.idApresentacao || item.idPendencia || item.idAtividade || '').trim();
      var atual;

      if (!chave || !mapa[chave]) {
        atual = Object.assign({}, item);
        atual.tiposPendencia = [];
        atual.descricoesPendencia = [];
        mapa[chave || String(lista.length)] = atual;
        lista.push(atual);
      } else {
        atual = mapa[chave];
        mesclarPendenciaApresentacao(atual, item);
      }

      adicionarUnico(atual.tiposPendencia, item.tipoPendencia || item.tipo);
      adicionarUnico(atual.descricoesPendencia, item.descricaoPendencia);
    });

    return lista;
  }

  function mesclarPendenciaApresentacao(destino, item) {
    [
      'gravidade',
      'severidade',
      'dataAtividade',
      'rotuloSemestre',
      'statusApresentacao',
      'tituloAtividade',
      'tituloPublico',
      'tituloApresentacao',
      'nomeApresentador',
      'responsavelSugerido',
      'eixoTematicoPrincipal',
      'eixoTematicoSecundario',
      'statusTituloEixo',
      'statusMaterial',
      'nomeArquivoMaterial',
      'linkMaterialPublico',
      'idArquivoMaterial',
      'acaoRecomendada'
    ].forEach(function copiar(campo) {
      if (!destino[campo] && item[campo]) {
        destino[campo] = item[campo];
      }
    });

    destino.acoesGestao = mesclarAcoesGestao(destino.acoesGestao, item.acoesGestao);
  }

  function adicionarUnico(lista, valor) {
    var texto = String(valor || '').trim();

    if (texto && lista.indexOf(texto) < 0) {
      lista.push(texto);
    }
  }

  function mesclarAcoesGestao(a, b) {
    var base = Object.assign({}, a || {});
    var extra = b || {};

    if (typeof extra === 'string' && extra.trim()) {
      try {
        extra = JSON.parse(extra);
      } catch (erro) {
        extra = {};
      }
    }

    Object.keys(extra || {}).forEach(function copiar(chave) {
      base[chave] = base[chave] === true || extra[chave] === true;
    });

    return base;
  }

  function montarTiposPendencia(item) {
    var tipos = Array.isArray((item || {}).tiposPendencia) && item.tiposPendencia.length
      ? item.tiposPendencia
      : [item.tipoPendencia || item.tipo].filter(Boolean);

    return tipos.map(function montar(tipo) {
      return '<span>' + ui.escaparHtml(formatarValor(tipo)) + '</span>';
    }).join('');
  }

  function montarDescricoesPendencia(item) {
    var descricoes = Array.isArray((item || {}).descricoesPendencia) && item.descricoesPendencia.length
      ? item.descricoesPendencia
      : [item.descricaoPendencia].filter(Boolean);

    return descricoes.map(function montar(descricao) {
      return '<p class="presentation-pendency-text">' + ui.escaparHtml(descricao) + '</p>';
    }).join('');
  }

  function montarBlocosContratoPendencia(item) {
    var blocos = [
      montarBlocoContrato('Titulo/eixos', (item || {}).blocoTituloEixos, [
        ['statusTituloEixo', 'Status'],
        ['tituloApresentacao', 'Titulo'],
        ['eixoTematicoPrincipal', 'Eixo principal'],
        ['eixoTematicoSecundario', 'Eixo secundario'],
        ['descricaoPendencia', 'Pendencia'],
        ['acaoRecomendada', 'Acao recomendada']
      ]),
      montarBlocoContrato('Material', (item || {}).blocoMaterial, [
        ['statusMaterial', 'Status'],
        ['nomeArquivoMaterial', 'Arquivo'],
        ['versaoMaterial', 'Versao'],
        ['descricaoPendencia', 'Pendencia'],
        ['acaoRecomendada', 'Acao recomendada']
      ]),
      montarListaInternaPendencias((item || {}).pendenciasInternas)
    ].filter(Boolean);

    return blocos.length
      ? '<div class="presentation-contract-blocks">' + blocos.join('') + '</div>'
      : '';
  }

  function montarBlocoContrato(titulo, bloco, campos) {
    if (!bloco || typeof bloco !== 'object' || Array.isArray(bloco)) {
      return '';
    }

    var linhas = (campos || []).map(function montar(campo) {
      var valor = bloco[campo[0]];

      if (valor === undefined || valor === null || valor === '') {
        return '';
      }

      return '<span><strong>' + ui.escaparHtml(campo[1]) + ':</strong> ' + ui.escaparHtml(formatarValor(valor)) + '</span>';
    }).filter(Boolean);

    return linhas.length
      ? '<section><h4>' + ui.escaparHtml(titulo) + '</h4>' + linhas.join('') + '</section>'
      : '';
  }

  function montarListaInternaPendencias(pendencias) {
    if (!Array.isArray(pendencias) || !pendencias.length) {
      return '';
    }

    return [
      '<section>',
      '<h4>Pendencias internas</h4>',
      pendencias.slice(0, 6).map(function montar(pendencia) {
        return '<span>' + ui.escaparHtml(formatarPendenciaInterna(pendencia)) + '</span>';
      }).join(''),
      '</section>'
    ].join('');
  }

  function formatarPendenciaInterna(pendencia) {
    if (!pendencia || typeof pendencia !== 'object' || Array.isArray(pendencia)) {
      return formatarValor(pendencia);
    }

    return formatarValor(
      pendencia.descricao ||
      pendencia.descricaoPendencia ||
      pendencia.tipoPendencia ||
      pendencia.tipo ||
      pendencia.codigo ||
      ''
    );
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

  function obterStatusTituloEixo(item) {
    return normalizarStatusFluxo((item || {}).statusTituloEixo || (item || {}).statusEixoTematico);
  }

  function obterStatusMaterial(item) {
    return normalizarStatusFluxo((item || {}).statusMaterial || (item || {}).statusEnvioMaterial);
  }

  function normalizarStatusFluxo(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function statusEhPendente(status) {
    return status === 'PENDENTE' || status === 'NAO_ENVIADO' || status === 'NAO_INFORMADO';
  }

  function statusPermiteRevisaoTitulo(status) {
    if (!status) {
      return true;
    }

    return ['ENVIADO', 'RECEBIDO', 'EM_ANALISE'].indexOf(status) >= 0;
  }

  function statusPermiteRejeicaoTitulo(status) {
    if (!status) {
      return true;
    }

    return ['ENVIADO', 'RECEBIDO', 'EM_ANALISE'].indexOf(status) >= 0;
  }

  function statusPermiteRevisaoMaterial(status) {
    if (!status) {
      return true;
    }

    return ['RECEBIDO', 'REENVIADO', 'EM_ANALISE'].indexOf(status) >= 0;
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

    if (url) {
      return [
        '<span class="muted-inline">' + ui.escaparHtml(rotulo + versao) + '</span>',
        '<a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir material</a>'
      ].join('');
    }

    if ((item || {}).nomeArquivoMaterial) {
      return '<span class="muted-inline">' + ui.escaparHtml(rotulo + versao) + '</span>';
    }

    return '<span class="muted-inline">Material ainda nao enviado</span>';
  }

  function renderizarPastaAtividade(item, acoesMembro) {
    var url = normalizarUrlPublica((item || {}).linkPastaDrive) ||
      montarUrlDriveFolderPorId((item || {}).idPastaDrive);

    return url
      ? '<a class="activity-folder-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Pasta geral da atividade</a>'
      : '';
  }

  function renderizarLinkMaterialGestao(item) {
    var url = normalizarUrlPublica((item || {}).linkMaterialPublico) ||
      montarUrlDrivePorId((item || {}).idArquivoMaterial);
    var rotulo = (item || {}).nomeArquivoMaterial || 'Abrir material';

    return url
      ? '<span class="muted-inline">' + ui.escaparHtml(rotulo) + '</span><a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir material</a>'
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
      'podeEditarAprovarTituloEixo',
      'podeEditarEAprovarTituloEixo',
      'podeSolicitarAjusteTituloEixo',
      'podeReprovarTituloEixo',
      'podeRejeitarPropostaTema',
      'podeAprovarMaterial',
      'podeSolicitarAjusteMaterial',
      'podeDispensarMaterial'
    ]);
  }

  function acaoGestaoAtiva(acoes, chaves) {
    return (chaves || []).some(function testar(chave) {
      return (acoes || {})[chave] === true;
    });
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

    if (acao === 'revisar-titulo-editar-aprovar') {
      abrirModalEditarAprovarTituloEixo(id);
      return;
    }

    if (acao === 'revisar-titulo-ajuste') {
      abrirModalRevisao(id, 'titulo', 'SOLICITAR_AJUSTE');
      return;
    }

    if (acao === 'revisar-titulo-reprovar') {
      abrirModalRevisao(id, 'titulo', 'REPROVAR', true);
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

    if (form.getAttribute('data-portal-v2-form') === 'editar-aprovar-titulo-eixo') {
      salvarEditarAprovarTituloEixo(form);
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

  function abrirModalEditarAprovarTituloEixo(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Editar e aprovar titulo/eixos', '<p class="empty-state">Carregando eixos tematicos...</p>');
    carregarEixos()
      .then(function renderizar(eixos) {
        atualizarModalConteudo([
          '<form class="readonly-form" data-portal-v2-form="editar-aprovar-titulo-eixo">',
          '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
          '<label>Titulo',
          '<input name="tituloApresentacao" required value="' + ui.escaparHtml(obterTituloApresentacao(item)) + '">',
          '</label>',
          montarSelectEixo('eixoTematicoPrincipal', 'Eixo tematico principal', eixos, item.eixoTematicoPrincipal, true),
          montarSelectEixo('eixoTematicoSecundario', 'Eixo tematico secundario', eixos, item.eixoTematicoSecundario, false),
          '<label>Observacoes',
          '<textarea name="observacaoInterna" rows="4"></textarea>',
          '</label>',
          '<div class="presentation-card-actions">',
          '<button type="submit">Salvar e aprovar</button>',
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

  function abrirModalRevisao(id, tipo, decisao, observacaoObrigatoria) {
    abrirModalBase('Revisao de apresentacao', [
      '<form class="readonly-form" data-portal-v2-form="revisao" data-tipo-revisao="' + ui.escaparHtml(tipo) + '" data-decisao="' + ui.escaparHtml(decisao) + '" data-observacao-obrigatoria="' + (observacaoObrigatoria ? 'true' : 'false') + '">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      observacaoObrigatoria ? '<p class="simulation-warning">Esta acao rejeita apenas a proposta de titulo/eixos e mantem a apresentacao ativa. Informe uma justificativa para o membro.</p>' : '',
      '<label>Observacao publica',
      '<textarea name="observacaoPublica" rows="4" ' + (observacaoObrigatoria ? 'required' : '') + '></textarea>',
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
    if (estado.eixos && estado.eixosExpiraEm > Date.now()) {
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
        estado.eixosExpiraEm = Date.now() + TTL_CACHE_EIXOS_MS;
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

  function salvarEditarAprovarTituloEixo(form) {
    var dados = new FormData(form);

    executarPostApresentacao('/v2/apresentacoes/titulo-eixo/revisar', {
      idApresentacao: dados.get('idApresentacao'),
      decisao: 'EDITAR_E_APROVAR',
      tituloApresentacao: dados.get('tituloApresentacao'),
      eixoTematicoPrincipal: dados.get('eixoTematicoPrincipal'),
      eixoTematicoSecundario: dados.get('eixoTematicoSecundario'),
      observacaoPublica: '',
      observacaoInterna: dados.get('observacaoInterna') || ''
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
    var observacaoObrigatoria = form.getAttribute('data-observacao-obrigatoria') === 'true';
    var observacaoPublica = String(dados.get('observacaoPublica') || '').trim();
    var observacaoInterna = String(dados.get('observacaoInterna') || '').trim();

    if (observacaoObrigatoria && !observacaoPublica && !observacaoInterna) {
      mostrarErroModal('Informe uma observacao para concluir esta acao.');
      return;
    }

    if (tipo === 'titulo') {
      enviarRevisaoTitulo(
        dados.get('idApresentacao'),
        decisao,
        observacaoPublica,
        observacaoInterna
      );
      return;
    }

    enviarRevisaoMaterial(
      dados.get('idApresentacao'),
      decisao,
      observacaoPublica,
      observacaoInterna
    );
  }

  function enviarRevisaoTitulo(id, decisao, observacaoPublica, observacaoInterna) {
    var route = decisao === 'REPROVAR'
      ? '/v2/apresentacoes/titulo-eixo/reprovar'
      : '/v2/apresentacoes/titulo-eixo/revisar';

    executarPostApresentacao(route, {
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
        invalidarCacheApresentacoes();
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

  function montarUrlDriveFolderPorId(valor) {
    var id = String(valor || '').trim();

    if (!id || !/^[a-zA-Z0-9_-]{10,}$/.test(id)) {
      return '';
    }

    return 'https://drive.google.com/drive/folders/' + encodeURIComponent(id);
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
