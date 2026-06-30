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
      tipo: 'minha-frequencia',
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
        ['linkPastaDrive', 'Pasta', 'link']
      ]
    },
    'admin-apresentacoes': {
      titulo: 'Pendencias de apresentacoes',
      marcador: 'Gestao do GEAPA',
      intro: 'Revisao de titulos, eixos, slides e fotos permitida pelo backend.',
      endpoint: '/v2/apresentacoes/pendencias',
      listaCampo: 'pendencias',
      tipo: 'pendencias-apresentacoes',
      vazio: 'Nenhuma pendencia de apresentacao disponivel.'
    },
    justificativas: {
      titulo: 'Minhas justificativas',
      marcador: 'Meu vinculo',
      intro: 'Faltas justificaveis e acompanhamento de justificativas enviadas.',
      endpoint: '/v2/minhas-justificativas',
      listaCampo: 'justificativas',
      tipo: 'minhas-justificativas',
      vazio: 'Nenhuma justificativa disponivel para este usuario.',
      colunas: [
        ['dataAtividade', 'Data'],
        ['tituloPublico', 'Atividade'],
        ['motivoCategoria', 'Motivo'],
        ['statusJustificativa', 'Status'],
        ['enviadaEm', 'Enviada em']
      ]
    },
    'admin-justificativas': {
      titulo: 'Justificativas',
      marcador: 'Gestao do GEAPA',
      intro: 'Analise de justificativas de falta permitida pelo backend.',
      endpoint: '/v2/justificativas/pendencias',
      listaCampo: 'justificativas',
      tipo: 'pendencias-justificativas',
      vazio: 'Nenhuma justificativa pendente de analise.'
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
    justificativasConfig: null,
    justificativasConfigExpiraEm: 0,
    justificativasConfigPromise: null,
    frequenciaCicloSelecionado: '',
    feedbackPersistente: null,
    cache: {}
  };
  var TTL_CACHE_PRIVADO_MS = 60000;
  var TTL_CACHE_EIXOS_MS = 20 * 60 * 1000;
  var MOTIVOS_JUSTIFICATIVA_PADRAO = [
    { valor: 'SAUDE', rotulo: 'Saude' },
    { valor: 'COMPROMISSO_ACADEMICO', rotulo: 'Compromisso academico' },
    { valor: 'COMPROMISSO_PROFISSIONAL', rotulo: 'Compromisso profissional' },
    { valor: 'MOTIVO_PESSOAL_RELEVANTE', rotulo: 'Motivo pessoal relevante' },
    { valor: 'FORCA_MAIOR', rotulo: 'Forca maior' },
    { valor: 'OUTRO', rotulo: 'Outro' }
  ];
  var JUSTIFICATIVA_UPLOAD_PADRAO = {
    formatosAceitos: ['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX'],
    mimeTypesAceitos: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    tamanhoMaximoBytes: 10 * 1024 * 1024
  };

  function iniciar() {
    if (!api || !ui || !navigation) {
      return;
    }

    document.addEventListener('click', tratarCliqueReadonly);
    document.addEventListener('submit', tratarSubmitReadonly);
    document.addEventListener('change', tratarChangeReadonly);
    document.addEventListener('portal:justificativas-atualizadas', function atualizarJustificativas() {
      invalidarCacheJustificativas();
    });

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

  function invalidarCacheJustificativas() {
    invalidarCachePortal([
      '/v2/minhas-justificativas',
      '/v2/justificativas/pendencias',
      '/v2/minha-frequencia',
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
      '<div data-readonly-feedback class="portal-feedback-slot" hidden></div>',
      corpo
    ].join('');

    restaurarFeedbackPersistente(definicao.idRota);
  }

  function restaurarFeedbackPersistente(idRota) {
    var feedback = estado.feedbackPersistente;
    var alvo = document.querySelector('[data-readonly-feedback]');

    if (!alvo || !feedback || feedback.idRota !== idRota) {
      return;
    }

    ui.mostrarMensagemPersistente(alvo, feedback);
  }

  function montarConteudo(definicao, data, emCache) {
    if (definicao.tipo === 'minha-frequencia') {
      return montarMinhaFrequencia(data || {}, emCache, definicao);
    }

    var itens = definicao.tipo === 'minhas-justificativas'
      ? montarItensMinhasJustificativasData(data)
      : (Array.isArray(data[definicao.listaCampo]) ? data[definicao.listaCampo] : []);
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
      itens.length && definicao.tipo === 'minhas-justificativas'
        ? montarMinhasJustificativas(itens)
        : '',
      itens.length && definicao.tipo === 'pendencias-justificativas'
        ? montarPendenciasJustificativas(itens)
        : '',
      itens.length && !definicao.tipo
        ? montarTabela(definicao, itens)
        : '',
      itens.length
        ? ''
        : '<p class="empty-state readonly-empty">' + ui.escaparHtml(definicao.vazio) + '</p>'
    ].join('');
  }

  function montarItensMinhasJustificativasData(data) {
    var faltas = Array.isArray((data || {}).faltasJustificaveis) ? data.faltasJustificaveis : [];
    var justificativas = Array.isArray((data || {}).justificativas) ? data.justificativas : [];

    return faltas.map(function marcarFalta(item) {
      return Object.assign({ tipoJustificativaPortal: 'falta' }, item || {});
    }).concat(justificativas.map(function marcarJustificativa(item) {
      return Object.assign({ tipoJustificativaPortal: 'justificativa' }, item || {});
    }));
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

  function montarMinhaFrequencia(data, emCache, definicao) {
    var ciclos = normalizarCiclosFrequencia(data || {});
    var cicloAtual = selecionarCicloFrequencia(ciclos, data || {});
    var registros = cicloAtual ? cicloAtual.registros : normalizarRegistrosFrequencia((data || {}).registros);
    var resumo = cicloAtual && Object.keys(cicloAtual.resumo || {}).length
      ? cicloAtual.resumo
      : ((data || {}).resumoGeral || (data || {}).resumo || {});
    var payloadAntigo = detectarPayloadAntigoFrequencia(data || {}, ciclos, registros);

    indexarItensPorId(registros);

    return [
      montarResumoFrequencia(resumo, registros.length, (data || {}).ultimaAtualizacao),
      emCache ? '<p class="updated-at">Atualizando em segundo plano...</p>' : '',
      payloadAntigo ? montarAvisoFrequenciaDetalhadaIndisponivel(data || {}) : '',
      !payloadAntigo && ciclos.length > 1 ? montarFiltroCicloFrequencia(ciclos, cicloAtual) : '',
      !payloadAntigo && ciclos.length === 1 ? '<p class="updated-at">Ciclo: ' + ui.escaparHtml(cicloAtual.rotuloCiclo || cicloAtual.ciclo || 'Sem ciclo definido') + '</p>' : '',
      payloadAntigo
        ? ''
        : (registros.length
          ? montarRegistrosFrequencia(registros)
          : '<p class="empty-state readonly-empty">' + ui.escaparHtml(definicao.vazio) + '</p>')
    ].join('');
  }

  function normalizarCiclosFrequencia(data) {
    var ciclos = Array.isArray(data.ciclos) ? data.ciclos : [];

    if (!ciclos.length) {
      var registrosDetalhados = normalizarRegistrosFrequencia(data.registros);

      if (!registrosDetalhados.length) {
        return [];
      }

      return [{
        ciclo: data.cicloAtual || '',
        rotuloCiclo: data.cicloAtual || 'Todos os registros',
        resumo: data.resumoGeral || data.resumo || {},
        registros: registrosDetalhados
      }];
    }

    return ciclos.map(function normalizar(ciclo) {
      return Object.assign({}, ciclo || {}, {
        ciclo: String((ciclo || {}).ciclo || (ciclo || {}).rotuloCiclo || '').trim(),
        rotuloCiclo: String((ciclo || {}).rotuloCiclo || (ciclo || {}).rotuloSemestre || (ciclo || {}).ciclo || '').trim(),
        resumo: (ciclo || {}).resumo || {},
        registros: normalizarRegistrosFrequencia((ciclo || {}).registros)
      });
    }).filter(function manter(ciclo) {
      return ciclo.registros.length || ciclo.ciclo || ciclo.rotuloCiclo;
    });
  }

  function normalizarRegistrosFrequencia(registros) {
    return Array.isArray(registros)
      ? registros.filter(registroFrequenciaDetalhado)
      : [];
  }

  function registroFrequenciaDetalhado(registro) {
    return Boolean(
      registro &&
      registro.idAtividade &&
      registro.dataAtividade &&
      (registro.tituloAtividade || registro.tituloPublico)
    );
  }

  function detectarPayloadAntigoFrequencia(data, ciclos, registros) {
    var registrosBrutos = Array.isArray((data || {}).registros) ? data.registros : [];
    var semCiclosDetalhados = !Array.isArray((data || {}).ciclos) || !(data || {}).ciclos.length;
    var contrato = String((data || {}).contrato || '').trim();

    return (data || {}).payloadAntigoDetectado === true ||
      (semCiclosDetalhados && registrosBrutos.length > 0 && !registros.length) ||
      (contrato && contrato !== 'MINHA_FREQUENCIA_DETALHADA_V2' && !ciclos.length);
  }

  function montarAvisoFrequenciaDetalhadaIndisponivel(data) {
    var mensagem = data.aviso ||
      'A frequencia detalhada ainda nao foi carregada pelo backend. Atualize o backend/deploy da API.';

    return '<p class="empty-state readonly-error">' + ui.escaparHtml(mensagem) + '</p>';
  }

  function selecionarCicloFrequencia(ciclos, data) {
    var alvo = estado.frequenciaCicloSelecionado || (data || {}).cicloAtual || '';
    var selecionado = ciclos.filter(function comparar(ciclo) {
      return String(ciclo.ciclo || ciclo.rotuloCiclo || '') === String(alvo || '');
    })[0];

    return selecionado || ciclos[0] || null;
  }

  function montarFiltroCicloFrequencia(ciclos, cicloAtual) {
    var valorAtual = String((cicloAtual || {}).ciclo || (cicloAtual || {}).rotuloCiclo || '');

    return [
      '<div class="readonly-filters">',
      '<label>Ciclo ou semestre',
      '<select data-frequencia-ciclo>',
      ciclos.map(function montar(ciclo) {
        var valor = String(ciclo.ciclo || ciclo.rotuloCiclo || '');
        var rotulo = ciclo.rotuloCiclo || ciclo.ciclo || 'Sem ciclo definido';
        var selecionado = valor === valorAtual ? ' selected' : '';

        return '<option value="' + ui.escaparHtml(valor) + '"' + selecionado + '>' + ui.escaparHtml(rotulo) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '</div>'
    ].join('');
  }

  function montarResumoFrequencia(resumo, totalRegistros, ultimaAtualizacao) {
    var dados = resumo || {};
    var partes = [
      ['Registros', dados.totalAtividades || dados.total || totalRegistros]
    ];

    [
      ['Presencas', dados.totalPresencas],
      ['Faltas', dados.totalFaltas],
      ['Justificadas', dados.totalJustificadas],
      ['Abonadas', dados.totalAbonadas],
      ['Faltas liquidas', dados.faltasLiquidas],
      ['Frequencia', dados.percentualFrequencia],
      ['Situacao', dados.situacaoDisciplinar]
    ].forEach(function adicionar(item) {
      if (item[1] !== undefined && item[1] !== null && item[1] !== '') {
        partes.push(item);
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
      dados.mensagemPortal ? '<p class="status-message">' + ui.escaparHtml(dados.mensagemPortal) + '</p>' : '',
      ultimaAtualizacao
        ? '<p class="updated-at">Atualizado em: ' + ui.escaparHtml(formatarValor(ultimaAtualizacao)) + '</p>'
        : ''
    ].join('');
  }

  function montarRegistrosFrequencia(registros) {
    return [
      '<div class="presentation-actions-list">',
      registros.map(function montar(registro) {
        var id = obterIdItem(registro);
        var titulo = registro.tituloAtividade || registro.tituloPublico || registro.idAtividade || 'Atividade';
        var status = registro.statusPresencaRotulo || registro.statusPresenca || 'Registro';
        var acao = montarAcaoJustificativaFrequencia(registro, id);

        estado.itensPorId[id] = registro;

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          '<span>' + ui.escaparHtml(formatarDataCurtaPendencia(registro.dataAtividade) || formatarValor(registro.dataAtividade)) + '</span>',
          registro.rotuloSemestre ? '<span>' + ui.escaparHtml(formatarValor(registro.rotuloSemestre)) + '</span>' : '',
          '<span>' + ui.escaparHtml(formatarValor(status)) + '</span>',
          '</div>',
          '<div class="presentation-action-main"><div>',
          '<h3>' + ui.escaparHtml(formatarValor(titulo)) + '</h3>',
          registro.statusJustificativa ? '<p>Justificativa: ' + ui.escaparHtml(formatarValor(registro.statusJustificativa)) + '</p>' : '',
          registro.mensagemPortal ? '<p>' + ui.escaparHtml(registro.mensagemPortal) + '</p>' : '',
          '</div></div>',
          acao ? '<div class="presentation-card-actions">' + acao + '</div>' : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarAcaoJustificativaFrequencia(registro, id) {
    var acao = String((registro || {}).acaoJustificativa || '').toUpperCase();
    var podeEnviar = (registro || {}).podeEnviarJustificativa === true ||
      (registro || {}).podeComplementarJustificativa === true ||
      acao === 'ENVIAR_JUSTIFICATIVA' ||
      acao === 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO' ||
      acao === 'COMPLEMENTAR_JUSTIFICATIVA';

    if (!podeEnviar) {
      return '';
    }

    if ((registro || {}).podeComplementarJustificativa === true || acao === 'COMPLEMENTAR_JUSTIFICATIVA') {
      return botaoAcao('justificativa-enviar', id, 'Complementar justificativa', 'primary');
    }

    if (acao === 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO') {
      return botaoAcao('justificativa-enviar', id, 'Enviar justificativa fora do prazo', 'primary');
    }

    return botaoAcao('justificativa-enviar', id, 'Enviar justificativa', 'primary');
  }

  function indexarItensPorId(itens) {
    estado.itensPorId = {};

    (itens || []).forEach(function guardar(item, indice) {
      var id = obterIdItem(item) || String(indice);

      estado.itensPorId[id] = item;
    });
  }

  function obterIdItem(item) {
    return String((item || {}).idApresentacao || (item || {}).idJustificativa || (item || {}).idRegistroPresenca || (item || {}).idPendencia || (item || {}).idAtividade || '').trim();
  }

  function montarMinhasApresentacoes(itens) {
    return [
      '<div class="presentation-actions-list">',
      itens.map(function montar(item) {
        var id = obterIdItem(item);
        var acoesMembro = obterAcoesMembro(item);
        var eixos = renderizarEixos(item);
        var material = renderizarMaterialApresentacao(item, acoesMembro);
        var foto = renderizarFotoReuniao(item, acoesMembro);
        var pasta = renderizarPastaAtividade(item, acoesMembro);
        var recursos = montarRecursosApresentacao(material, foto, pasta);
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
          item.statusMaterial ? '<small>Slide: ' + ui.escaparHtml(formatarValor(item.statusMaterial)) + '</small>' : '',
          item.statusFotoReuniao ? '<small>Foto da reuniao: ' + ui.escaparHtml(formatarValor(item.statusFotoReuniao)) + '</small>' : '',
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
      botoes.push(botaoAcao('material', id, 'Enviar slide', 'primary'));
    } else if (acoes.podeReenviarMaterial === true) {
      botoes.push(botaoAcao('material', id, 'Reenviar slide', 'primary'));
    }

    if (acoes.podeEnviarFotoReuniao === true) {
      botoes.push(botaoAcao('foto-reuniao', id, 'Enviar foto da reuniao', 'primary'));
    } else if (acoes.podeReenviarFotoReuniao === true) {
      botoes.push(botaoAcao('foto-reuniao', id, 'Reenviar foto da reuniao', 'primary'));
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
        var titulo = obterTituloPendenciaApresentacao(item);
        var apresentador = item.nomeApresentador ||
          item.responsavelSugerido ||
          item.responsavel ||
          item.nomePessoaPrincipal ||
          item.nomePessoaPrincipalPublico ||
          item.apresentador ||
          'Apresentador ainda nao definido';
        var statusTitulo = obterStatusTituloEixo(item);
        var statusMaterial = obterStatusMaterial(item);
        var statusFoto = obterStatusFotoReuniao(item);
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
            ? botaoAcao('revisar-material-aprovar', id, 'Aprovar slide', 'primary')
            : '',
          acoesGestao.podeSolicitarAjusteMaterial === true && podeRevisarMaterial
            ? botaoAcao('revisar-material-ajuste', id, 'Solicitar ajuste do slide', 'warning')
            : '',
          acoesGestao.podeDispensarMaterial === true
            ? botaoAcao('revisar-material-dispensar', id, 'Dispensar slide', 'warning')
            : ''
        ].join('');
        var acoesFoto = [
          acoesGestao.podeEnviarFotoReuniao === true
            ? botaoAcao('foto-reuniao', id, statusFoto === 'AJUSTE_SOLICITADO' ? 'Reenviar foto' : 'Enviar foto da reuniao', 'primary')
            : '',
          acoesGestao.podeAprovarFotoReuniao === true && statusPermiteRevisaoFoto(statusFoto)
            ? botaoAcao('revisar-foto-aprovar', id, 'Aprovar foto', 'primary')
            : '',
          acoesGestao.podeSolicitarAjusteFotoReuniao === true && statusPermiteRevisaoFoto(statusFoto)
            ? botaoAcao('revisar-foto-ajuste', id, 'Solicitar ajuste da foto', 'warning')
            : '',
          acoesGestao.podeDispensarFotoReuniao === true
            ? botaoAcao('revisar-foto-dispensar', id, 'Dispensar foto', 'warning')
            : ''
        ].join('');
        var acoes = acoesTitulo + acoesMaterial + acoesFoto;
        var material = renderizarLinkMaterialGestao(item);
        var foto = renderizarFotoReuniao(item);
        var badges = montarBadgesPendencia(item, statusTitulo, statusMaterial, statusFoto);
        var resumoPendencias = montarResumoPendencias(item, statusTitulo, statusMaterial, statusFoto);
        var dataPeriodo = montarDataPeriodoPendencia(item);
        var eixos = obterEixosTexto(item);

        return [
          '<article class="presentation-action-card">',
          badges ? '<div class="presentation-card-topline">' + badges + '</div>' : '',
          '<div class="presentation-action-main">',
          '<div>',
          dataPeriodo ? '<small>' + ui.escaparHtml(dataPeriodo) + '</small>' : '',
          '<p>Atividade: ' + ui.escaparHtml(formatarValor(tituloAtividade)) + '</p>',
          '<h3>' + ui.escaparHtml(titulo) + '</h3>',
          apresentador ? '<p>Apresentador: ' + ui.escaparHtml(apresentador) + '</p>' : '',
          '<p>Eixos: ' + ui.escaparHtml(eixos || 'ainda nao informados') + '</p>',
          '</div>',
          '</div>',
          resumoPendencias,
          material || foto ? '<div class="presentation-resource-row">' +
            (material ? '<div><strong>Slide/material da apresentacao</strong>' + material + '</div>' : '') +
            (foto ? '<div><strong>Foto da reuniao</strong>' + foto + '</div>' : '') +
            '</div>' : '',
          acoes
            ? '<div class="presentation-card-actions">' + acoes + '</div>'
            : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarMinhasJustificativas(itens) {
    return [
      '<div class="presentation-actions-list">',
      itens.map(function montar(item) {
        var id = obterIdItem(item);
        var status = obterStatusJustificativa(item);
        var foraPrazo = justificativaForaPrazo(item);
        var podeReenviar = item.podeReenviarAjuste === true || item.podeReenviarJustificativa === true;
        var podeEnviar = item.podeEnviarJustificativa === true || podeReenviar;
        var titulo = item.tituloPublico || item.tituloAtividade || item.atividade || 'Atividade';
        var data = formatarDataCurtaPendencia(item.dataAtividade);
        var prazo = formatarDataCurtaPendencia(item.dataLimiteJustificativa || item.prazoJustificativa);
        var motivo = item.motivoCategoria || item.motivoDeclarado;
        var envio = item.enviadaEm || item.dataEnvio;
        var decisao = item.decisaoAplicada || item.decisaoAplicadaNaPresenca || item.valorDepois;
        var acao = podeEnviar
          ? botaoAcao('justificativa-enviar', id, podeReenviar ? 'Reenviar justificativa' : (foraPrazo ? 'Enviar justificativa fora do prazo' : 'Enviar justificativa'), 'primary')
          : '';

        estado.itensPorId[id] = item;

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          '<span>' + ui.escaparHtml(formatarValor(status || item.statusPresenca || 'FALTA')) + '</span>',
          foraPrazo ? '<span>FORA DO PRAZO</span>' : '',
          '</div>',
          '<div class="presentation-action-main"><div>',
          data ? '<small>' + ui.escaparHtml(data) + '</small>' : '',
          '<h3>' + ui.escaparHtml(formatarValor(titulo)) + '</h3>',
          motivo ? '<p>Motivo: ' + ui.escaparHtml(motivo) + '</p>' : '',
          prazo ? '<p>Prazo para justificar: ' + ui.escaparHtml(foraPrazo ? 'encerrado em ' + prazo : 'ate ' + prazo) + '</p>' : '',
          envio ? '<p>Enviada em: ' + ui.escaparHtml(formatarDataCurtaPendencia(envio)) + '</p>' : '',
          decisao ? '<p>Decisao: ' + ui.escaparHtml(formatarValor(decisao)) + '</p>' : '',
          item.observacaoPublica ? '<p>Observacao: ' + ui.escaparHtml(item.observacaoPublica) + '</p>' : '',
          item.mensagemPortal ? '<p>' + ui.escaparHtml(item.mensagemPortal) + '</p>' : '',
          foraPrazo && podeEnviar ? '<p>Voce ainda pode enviar a justificativa, mas ela ficara marcada como fora do prazo e dependera de analise.</p>' : '',
          '</div></div>',
          acao ? '<div class="presentation-card-actions">' + acao + '</div>' : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarPendenciasJustificativas(itens) {
    return [
      '<div class="presentation-actions-list">',
      itens.map(function montar(item) {
        var id = obterIdItem(item);
        var acoes = obterAcoesGestaoJustificativa(item);
        var foraPrazo = justificativaForaPrazo(item);
        var status = obterStatusJustificativa(item);
        var documento = normalizarUrlPublica(item.linkDocumentoComprobatorio || item.linkDocumento);
        var motivo = item.motivoCategoria || item.motivoDeclarado;
        var prazo = item.dataLimiteJustificativa || item.prazoJustificativa;
        var envio = item.enviadaEm || item.dataEnvio;
        var botoes = [
          acoes.podeDeferir ? botaoAcao('justificativa-deferir', id, 'Deferir', 'primary') : '',
          acoes.podeAbonar ? botaoAcao('justificativa-abonar', id, 'Abonar', 'primary') : '',
          acoes.podeIndeferir ? botaoAcao('justificativa-indeferir', id, 'Indeferir', 'warning') : '',
          acoes.podeSolicitarAjuste ? botaoAcao('justificativa-ajuste', id, 'Solicitar ajuste', 'warning') : ''
        ].join('');

        estado.itensPorId[id] = item;

        return [
          '<article class="presentation-action-card">',
          '<div class="presentation-card-topline">',
          '<span>' + ui.escaparHtml(formatarValor(status || 'ENVIADA')) + '</span>',
          foraPrazo ? '<span>FORA DO PRAZO</span>' : '',
          '</div>',
          '<div class="presentation-action-main"><div>',
          '<small>' + ui.escaparHtml(formatarDataCurtaPendencia(item.dataAtividade)) + '</small>',
          '<h3>' + ui.escaparHtml(formatarValor(item.tituloPublico || item.tituloAtividade || 'Atividade')) + '</h3>',
          '<p>Membro: ' + ui.escaparHtml(formatarValor(item.nomeMembro || item.nomePessoa || item.nomeParticipante || item.nome)) + '</p>',
          motivo ? '<p>Motivo: ' + ui.escaparHtml(motivo) + '</p>' : '',
          item.descricaoJustificativa ? '<p>Descricao: ' + ui.escaparHtml(item.descricaoJustificativa) + '</p>' : '',
          prazo ? '<p>Prazo limite: ' + ui.escaparHtml(formatarDataCurtaPendencia(prazo)) + '</p>' : '',
          envio ? '<p>Enviada em: ' + ui.escaparHtml(formatarDataCurtaPendencia(envio)) + '</p>' : '',
          item.mensagemPortal ? '<p>' + ui.escaparHtml(item.mensagemPortal) + '</p>' : '',
          documento ? '<p><a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(documento) + '" target="_blank" rel="noopener noreferrer">Abrir comprovante</a></p>' : '',
          '</div></div>',
          botoes ? '<div class="presentation-card-actions">' + botoes + '</div>' : '',
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
      mesclarListaUnica(atual.tiposPendencia, item.badges);
      mesclarListaUnica(atual.descricoesPendencia, item.pendenciasResumo);
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
      'statusFotoReuniao',
      'fotoReuniaoObrigatoria',
      'nomeArquivoFotoReuniao',
      'linkFotoReuniao',
      'acaoRecomendada',
      'blocoTituloEixos',
      'blocoMaterial',
      'blocoFotoReuniao',
      'badges',
      'pendenciasResumo',
      'detalhesTecnicos',
      'pendenciasInternas'
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

  function mesclarListaUnica(lista, valores) {
    if (!Array.isArray(valores)) {
      adicionarUnico(lista, valores);
      return;
    }

    valores.forEach(function adicionar(valor) {
      adicionarUnico(lista, valor);
    });
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

  function montarBadgesPendencia(item, statusTitulo, statusMaterial, statusFoto) {
    var badges = [];

    adicionarUnico(badges, item.gravidade || item.severidade);
    mesclarListaUnica(badges, item.badges);

    if (!Array.isArray(item.badges) || !item.badges.length) {
      mesclarListaUnica(badges, item.tiposPendencia);
    }

    if (statusTitulo) {
      adicionarUnico(badges, 'Titulo/eixos ' + rotuloStatusFluxo(statusTitulo));
    }

    if (statusMaterial) {
      adicionarUnico(badges, 'Slide ' + rotuloStatusFluxo(statusMaterial));
    }

    if (statusFoto && statusFoto !== 'NAO_SE_APLICA') {
      adicionarUnico(badges, 'Foto ' + rotuloStatusFoto(statusFoto));
    }

    return badges
      .map(limparBadgePendencia)
      .filter(Boolean)
      .filter(function unico(valor, indice, lista) {
        return lista.indexOf(valor) === indice;
      })
      .map(function montar(badge) {
        return '<span>' + ui.escaparHtml(badge) + '</span>';
      }).join('');
  }

  function limparBadgePendencia(valor) {
    var texto = String(valor || '').trim();

    if (!texto || pareceTextoTecnicoData(texto)) {
      return '';
    }

    texto = texto
      .replace(/\|/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return texto.toUpperCase() === texto
      ? texto
      : texto.replace(/^./, function primeira(letra) {
        return letra.toUpperCase();
      });
  }

  function rotuloStatusFoto(status) {
    var rotulos = {
      RECEBIDO: 'recebida',
      REENVIADO: 'reenviada',
      APROVADO: 'aprovada',
      AJUSTE_SOLICITADO: 'com ajuste solicitado',
      DISPENSADO: 'dispensada',
      HISTORICO: 'historica'
    };

    return rotulos[status] || rotuloStatusFluxo(status);
  }

  function montarResumoPendencias(item, statusTitulo, statusMaterial, statusFoto) {
    var resumo = [];
    var resumoBackend = Array.isArray((item || {}).pendenciasResumo)
      ? item.pendenciasResumo
      : [];

    resumoBackend.forEach(function adicionar(texto) {
      adicionarResumoHumano(resumo, texto);
    });

    if (!resumo.length) {
      montarDescricoesHumanasPendencia(item).forEach(function adicionar(texto) {
        adicionarResumoHumano(resumo, texto);
      });
    }

    if (!resumo.length || statusEhPendente(statusTitulo)) {
      if (statusEhPendente(statusTitulo)) {
        adicionarUnico(resumo, 'Aguardando envio do titulo/eixos pelo apresentador.');
      }
    }

    if (statusMaterial === 'PENDENTE' || statusMaterial === 'NAO_ENVIADO' || statusMaterial === 'NAO_INFORMADO') {
      adicionarUnico(resumo, 'Slide/material ainda nao enviado.');
    }

    if (statusPermiteRevisaoTitulo(statusTitulo)) {
      adicionarUnico(resumo, 'Revisar titulo/eixos enviados.');
    }

    if (statusPermiteRevisaoMaterial(statusMaterial)) {
      adicionarUnico(resumo, 'Revisar slide/material enviado.');
    }

    statusFoto = String(statusFoto || (item || {}).statusFotoReuniao || '').toUpperCase();
    if (['PENDENTE', 'NAO_ENVIADO', 'NAO_INFORMADO', 'AJUSTE_SOLICITADO'].indexOf(statusFoto) >= 0) {
      adicionarUnico(resumo, statusFoto === 'AJUSTE_SOLICITADO' ? 'Aguardando nova foto da reuniao.' : 'Foto da reuniao ainda nao enviada.');
    } else if (['RECEBIDO', 'REENVIADO', 'EM_ANALISE'].indexOf(statusFoto) >= 0) {
      adicionarUnico(resumo, 'Revisar foto da reuniao enviada.');
    }

    return resumo.length
      ? '<div class="presentation-pendency-summary"><strong>Pendencias</strong><ul>' +
        resumo.slice(0, 5).map(function montar(texto) {
          return '<li>' + ui.escaparHtml(texto) + '</li>';
        }).join('') +
        '</ul></div>'
      : '';
  }

  function montarDescricoesHumanasPendencia(item) {
    var descricoes = Array.isArray((item || {}).descricoesPendencia) && item.descricoesPendencia.length
      ? item.descricoesPendencia
      : [item.descricaoPendencia].filter(Boolean);

    return descricoes.map(limparDescricaoPendencia).filter(Boolean);
  }

  function adicionarResumoHumano(lista, valor) {
    var texto = limparDescricaoPendencia(valor);

    if (texto) {
      adicionarUnico(lista, texto);
    }
  }

  function limparDescricaoPendencia(valor) {
    var texto = String(valor || '').trim();

    if (!texto || pareceTextoTecnicoData(texto)) {
      return '';
    }

    texto = texto
      .replace(/Status titulo\/eixo:\s*[^.]+\.?/gi, '')
      .replace(/Status material:\s*[^.]+\.?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (/^Aguardar ou solicitar titulo\/eixo/i.test(texto)) {
      return 'Aguardando envio do titulo/eixos pelo apresentador.';
    }

    if (/^Aguardar ou solicitar envio do material/i.test(texto)) {
      return 'Material ainda nao enviado.';
    }

    if (/titulo.*aguard/i.test(texto) || /revisar titulo/i.test(texto)) {
      return 'Revisar titulo/eixos enviados.';
    }

    return texto.replace(/^./, function primeira(letra) {
      return letra.toUpperCase();
    });
  }

  function obterTituloPendenciaApresentacao(item) {
    var titulo = String((item || {}).tituloApresentacao || (item || {}).tema || '').trim();

    return titulo || 'Titulo ainda nao informado';
  }

  function obterEixosTexto(item) {
    if ((item || {}).eixos) {
      return formatarValor((item || {}).eixos);
    }

    return [
      (item || {}).eixoTematicoPrincipal,
      (item || {}).eixoTematicoSecundario
    ].filter(Boolean).map(formatarValor).join(' / ');
  }

  function montarDataPeriodoPendencia(item) {
    var partes = [];
    var data = formatarDataCurtaPendencia((item || {}).dataAtividade);
    var horario = (item || {}).horarioCompleto || (item || {}).horario || '';
    var periodo = formatarPeriodoPendencia(item);

    adicionarUnico(partes, data);
    adicionarUnico(partes, horario && !pareceTextoTecnicoData(horario) ? horario : '');
    adicionarUnico(partes, periodo);

    return partes.join(' - ');
  }

  function formatarDataCurtaPendencia(valor) {
    var texto = String(valor || '').trim();
    var partesIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    var data;

    if (!texto) {
      return '';
    }

    if (partesIso) {
      return partesIso[3] + '/' + partesIso[2] + '/' + partesIso[1];
    }

    data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
      return pareceTextoTecnicoData(texto) ? '' : texto;
    }

    return data.toLocaleDateString('pt-BR');
  }

  function formatarPeriodoPendencia(item) {
    var rotulo = String((item || {}).rotuloSemestre || (item || {}).periodo || '').trim();
    var ano = String((item || {}).ano || '').trim();
    var semestre = String((item || {}).semestre || '').trim();

    if (rotulo && !pareceTextoTecnicoData(rotulo)) {
      return rotulo;
    }

    return ano && semestre ? ano + '/' + semestre : '';
  }

  function pareceTextoTecnicoData(valor) {
    return /\bGMT[+-]\d{4}\b/i.test(String(valor || '')) ||
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(String(valor || ''));
  }

  function rotuloStatusFluxo(status) {
    var mapa = {
      PENDENTE: 'pendente',
      NAO_ENVIADO: 'pendente',
      NAO_INFORMADO: 'pendente',
      ENVIADO: 'aguardando analise',
      RECEBIDO: 'aguardando analise',
      REENVIADO: 'aguardando analise',
      EM_ANALISE: 'em analise',
      APROVADO: 'aprovado',
      REPROVADO: 'reprovado',
      HISTORICO: 'historico',
      DISPENSADO: 'dispensado'
    };

    return mapa[status] || formatarValor(status).toLowerCase();
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

  function obterStatusFotoReuniao(item) {
    var bloco = (item || {}).blocoFotoReuniao || {};
    return normalizarStatusFluxo(
      (item || {}).statusFotoReuniao ||
      bloco.statusFotoReuniao ||
      bloco.status ||
      bloco.statusEntrega
    );
  }

  function obterStatusJustificativa(item) {
    return normalizarStatusFluxo(
      (item || {}).statusJustificativa ||
      (item || {}).statusPublico ||
      (item || {}).statusAnalise ||
      (item || {}).statusPresenca ||
      (item || {}).STATUS_ANALISE ||
      ''
    );
  }

  function justificativaForaPrazo(item) {
    var valor = (item || {}).envioForaDoPrazo !== undefined
      ? (item || {}).envioForaDoPrazo
      : ((item || {}).foraDoPrazo !== undefined
        ? (item || {}).foraDoPrazo
        : ((item || {}).statusPrazo !== undefined ? (item || {}).statusPrazo : (item || {}).classificacaoTemporal));
    var texto = normalizarStatusFluxo(valor);

    return valor === true || texto === 'SIM' || texto === 'FORA_DO_PRAZO' || texto === 'PRAZO_ENCERRADO';
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

  function statusPermiteRevisaoFoto(status) {
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

  function montarRecursosApresentacao(material, foto, pasta) {
    var blocos = [];

    if (material) {
      blocos.push('<div><strong>Slide/material da apresentacao</strong>' + material + '</div>');
    }

    if (foto) {
      blocos.push('<div><strong>Foto da reuniao</strong>' + foto + '</div>');
    }

    if (pasta) {
      blocos.push('<div><strong>Pasta da atividade</strong>' + pasta + '</div>');
    }

    return blocos.length
      ? '<div class="presentation-resource-row">' + blocos.join('') + '</div>'
      : '';
  }

  function renderizarMaterialApresentacao(item, acoesMembro) {
    var acoes = acoesMembro || null;
    var url = !acoes || acoes.podeAbrirMaterial === true
      ? normalizarUrlPublica((item || {}).linkMaterialPublico)
      : '';
    var rotulo = (item || {}).nomeArquivoMaterial || 'Abrir slide';
    var versaoValor = (item || {}).versaoMaterial ? formatarValor((item || {}).versaoMaterial) : '';
    var versao = versaoValor ? (/^v/i.test(versaoValor) ? ' ' + versaoValor : ' v' + versaoValor) : '';
    var estado = montarEstadoEntregavel('slide', (item || {}).statusMaterial);

    if (url) {
      return [
        '<span class="muted-inline">' + ui.escaparHtml(rotulo + versao) + '</span>',
        estado ? '<span class="muted-inline">' + ui.escaparHtml(estado) + '</span>' : '',
        '<a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir slide</a>'
      ].join('');
    }

    if ((item || {}).nomeArquivoMaterial) {
      return '<span class="muted-inline">' + ui.escaparHtml(rotulo + versao) + '</span>' +
        (estado ? '<span class="muted-inline">' + ui.escaparHtml(estado) + '</span>' : '');
    }

    return '<span class="muted-inline">' + ui.escaparHtml(estado || 'Slide ainda nao enviado.') + '</span>';
  }

  function renderizarFotoReuniao(item, acoesMembro) {
    var bloco = (item || {}).blocoFotoReuniao || {};
    var status = obterStatusFotoReuniao(item);
    var podeAbrir = !acoesMembro || acoesMembro.podeAbrirFotoReuniao === true;
    var url = podeAbrir
      ? normalizarUrlPublica((item || {}).linkFotoReuniao || bloco.linkFotoReuniao || bloco.linkArquivo)
      : '';
    var nome = (item || {}).nomeArquivoFotoReuniao || bloco.nomeArquivoFotoReuniao || bloco.nomeArquivo || 'Foto da reuniao';
    var obrigatoria = (item || {}).fotoReuniaoObrigatoria === true || bloco.fotoReuniaoObrigatoria === true || bloco.obrigatoria === true;
    var estado = montarEstadoEntregavel('foto', status);

    if (status === 'NAO_SE_APLICA' && !obrigatoria) {
      return '';
    }

    if (url) {
      return '<span class="muted-inline">' + ui.escaparHtml(nome) + '</span>' +
        (estado ? '<span class="muted-inline">' + ui.escaparHtml(estado) + '</span>' : '') +
        '<a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir foto</a>';
    }

    return obrigatoria || status
      ? '<span class="muted-inline">' + ui.escaparHtml(estado || 'Foto ainda nao enviada.') + '</span>'
      : '';
  }

  function montarEstadoEntregavel(tipo, status) {
    var nome = tipo === 'foto' ? 'Foto da reuniao' : 'Slide';
    var feminino = tipo === 'foto';
    var normalizado = String(status || '').trim().toUpperCase();
    var mensagens = {
      PENDENTE: nome + ' ainda nao enviad' + (feminino ? 'a' : 'o') + '.',
      NAO_ENVIADO: nome + ' ainda nao enviad' + (feminino ? 'a' : 'o') + '.',
      NAO_INFORMADO: nome + ' ainda nao enviad' + (feminino ? 'a' : 'o') + '.',
      RECEBIDO: nome + ' recebid' + (feminino ? 'a' : 'o') + ' e aguardando analise.',
      REENVIADO: nome + ' reenviad' + (feminino ? 'a' : 'o') + ' e aguardando analise.',
      EM_ANALISE: nome + ' em analise.',
      APROVADO: nome + ' aprovad' + (feminino ? 'a' : 'o') + '.',
      AJUSTE_SOLICITADO: 'Ajuste solicitado para ' + nome.toLowerCase() + '.',
      DISPENSADO: nome + ' dispensad' + (feminino ? 'a' : 'o') + '.',
      HISTORICO: nome + ' mantid' + (feminino ? 'a' : 'o') + ' como historico.'
    };

    return mensagens[normalizado] || (normalizado ? nome + ': ' + formatarValor(normalizado) + '.' : '');
  }

  function renderizarPastaAtividade(item, acoesMembro) {
    var url = normalizarUrlPublica((item || {}).linkPastaDrive);

    return url
      ? '<a class="activity-folder-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Pasta geral da atividade</a>'
      : '';
  }

  function renderizarLinkMaterialGestao(item) {
    var url = normalizarUrlPublica((item || {}).linkMaterialPublico);
    var rotulo = (item || {}).nomeArquivoMaterial || 'Abrir slide';
    var estado = montarEstadoEntregavel('slide', (item || {}).statusMaterial);

    return url
      ? '<span class="muted-inline">' + ui.escaparHtml(rotulo) + '</span>' +
        (estado ? '<span class="muted-inline">' + ui.escaparHtml(estado) + '</span>' : '') +
        '<a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir slide</a>'
      : '<span class="muted-inline">' + ui.escaparHtml(estado || (item || {}).nomeArquivoMaterial || 'Slide ainda nao enviado.') + '</span>';
  }

  function obterAcoesMembro(item) {
    return normalizarObjetoAcoes((item || {}).acoesMembro, [
      'podeEditarTituloEixo',
      'podeEnviarMaterial',
      'podeReenviarMaterial',
      'podeAbrirMaterial',
      'podeEnviarFotoReuniao',
      'podeReenviarFotoReuniao',
      'podeAbrirFotoReuniao',
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
      'podeDispensarMaterial',
      'podeEnviarFotoReuniao',
      'podeAprovarFotoReuniao',
      'podeSolicitarAjusteFotoReuniao',
      'podeDispensarFotoReuniao'
    ]);
  }

  function obterAcoesGestaoJustificativa(item) {
    return normalizarObjetoAcoes((item || {}).acoesGestao, [
      'podeDeferir',
      'podeAbonar',
      'podeIndeferir',
      'podeSolicitarAjuste'
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

    if (acao === 'foto-reuniao') {
      abrirModalFotoReuniao(id);
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
      abrirModalRevisao(id, 'material', 'SOLICITAR_AJUSTE', true);
      return;
    }

    if (acao === 'revisar-material-dispensar') {
      abrirModalRevisao(id, 'material', 'DISPENSAR', true);
      return;
    }

    if (acao === 'revisar-foto-aprovar') {
      enviarRevisaoFotoReuniao(id, 'APROVAR', '', '');
      return;
    }

    if (acao === 'revisar-foto-ajuste') {
      abrirModalRevisao(id, 'foto', 'SOLICITAR_AJUSTE', true);
      return;
    }

    if (acao === 'revisar-foto-dispensar') {
      abrirModalRevisao(id, 'foto', 'DISPENSAR', true);
      return;
    }

    if (acao === 'justificativa-enviar') {
      abrirModalJustificativa(id);
      return;
    }

    if (acao === 'justificativa-deferir') {
      abrirModalAnaliseJustificativa(id, 'DEFERIR', 'Deferir justificativa', false);
      return;
    }

    if (acao === 'justificativa-abonar') {
      abrirModalAnaliseJustificativa(id, 'ABONAR', 'Abonar justificativa', false);
      return;
    }

    if (acao === 'justificativa-indeferir') {
      abrirModalAnaliseJustificativa(id, 'INDEFERIR', 'Indeferir justificativa', true);
      return;
    }

    if (acao === 'justificativa-ajuste') {
      abrirModalAnaliseJustificativa(id, 'SOLICITAR_AJUSTE', 'Solicitar ajuste', true);
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

    if (form.getAttribute('data-portal-v2-form') === 'foto-reuniao') {
      salvarFotoReuniao(form);
      return;
    }

    if (form.getAttribute('data-portal-v2-form') === 'revisao') {
      salvarRevisao(form);
      return;
    }

    if (form.getAttribute('data-portal-v2-form') === 'justificativa-envio') {
      salvarJustificativa(form);
      return;
    }

    if (form.getAttribute('data-portal-v2-form') === 'justificativa-analise') {
      salvarAnaliseJustificativa(form);
    }
  }

  function tratarChangeReadonly(evento) {
    var alvo = evento.target;

    if (!alvo) {
      return;
    }

    if (alvo.matches('[data-eixo-select]')) {
      atualizarAjudaEixo(alvo);
      return;
    }

    if (alvo.matches('[data-frequencia-ciclo]')) {
      estado.frequenciaCicloSelecionado = alvo.value || '';
      carregarTela('frequencia');
    }
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

    abrirModalBase('Slide/material da apresentacao', [
      '<form class="readonly-form" data-portal-v2-form="material">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      '<label>Arquivo',
      '<input name="arquivo" type="file" required accept=".pdf,.ppt,.pptx,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation">',
      '</label>',
      '<label>Observacoes',
      '<textarea name="observacoes" rows="4"></textarea>',
      '</label>',
      '<p class="muted-inline">Envie o slide ou material que sera usado na sua apresentacao. Formatos: PDF, PPT, PPTX e ODP.</p>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Enviar</button>',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
      '</div>',
      '</form>'
    ].join(''));
  }

  function abrirModalFotoReuniao(id) {
    var item = estado.itensPorId[id];
    var status = String((item || {}).statusFotoReuniao || '').toUpperCase();
    var envioGestao = estado.rotaAtual === 'admin-apresentacoes';
    var acoes = envioGestao ? obterAcoesGestao(item) : obterAcoesMembro(item);
    var reenvio = envioGestao
      ? status === 'AJUSTE_SOLICITADO'
      : acoes.podeReenviarFotoReuniao === true;

    if (!item) return;
    abrirModalBase('Foto da reuniao', [
      '<form class="readonly-form" data-portal-v2-form="foto-reuniao" data-reenvio="' + (reenvio ? 'true' : 'false') + '" data-envio-gestao="' + (envioGestao ? 'true' : 'false') + '">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      '<label>Arquivo da foto',
      '<input name="arquivo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">',
      '</label>',
      '<label>Ou link do arquivo no Google Drive',
      '<input name="linkArquivo" type="url" placeholder="https://drive.google.com/file/d/...">',
      '</label>',
      '<label>Observacoes',
      '<textarea name="observacoes" rows="4"></textarea>',
      '</label>',
      '<p class="muted-inline">Use JPG, JPEG, PNG ou WEBP. Informe arquivo ou link de Drive.</p>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Enviar foto</button>',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
      '</div>',
      '</form>'
    ].join(''));
  }

  function abrirModalRevisao(id, tipo, decisao, observacaoObrigatoria) {
    abrirModalBase(obterTituloModalRevisao(tipo), [
      '<form class="readonly-form" data-portal-v2-form="revisao" data-tipo-revisao="' + ui.escaparHtml(tipo) + '" data-decisao="' + ui.escaparHtml(decisao) + '" data-observacao-obrigatoria="' + (observacaoObrigatoria ? 'true' : 'false') + '">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
      observacaoObrigatoria ? '<p class="simulation-warning">' + ui.escaparHtml(obterAvisoRevisao(tipo, decisao)) + '</p>' : '',
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

  function obterTituloModalRevisao(tipo) {
    if (tipo === 'foto') return 'Revisao da foto da reuniao';
    if (tipo === 'material') return 'Revisao do slide/material';
    return 'Revisao de titulo/eixos';
  }

  function obterAvisoRevisao(tipo, decisao) {
    if (tipo === 'titulo') {
      return 'Esta acao rejeita apenas a proposta de titulo/eixos e mantem a apresentacao ativa. Informe uma justificativa para o membro.';
    }
    if (decisao === 'DISPENSAR') {
      return 'A dispensa encerra esta pendencia sem exigir novo arquivo. Informe a justificativa da decisao.';
    }
    return 'O apresentador precisara enviar uma nova versao. Informe claramente o ajuste solicitado.';
  }

  function abrirModalJustificativa(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Enviar justificativa', '<p class="empty-state readonly-skeleton">Carregando configuracao de justificativas...</p>');
    carregarJustificativasConfig()
      .then(function renderizar(config) {
        renderizarModalJustificativa(item, id, config);
      })
      .catch(function renderizarFallback() {
        renderizarModalJustificativa(item, id, normalizarJustificativasConfig({}));
      });
  }

  function renderizarModalJustificativa(item, id, config) {
    var foraPrazo = justificativaForaPrazo(item);
    var exigeCiencia = item.exigeCienciaForaPrazo === true || foraPrazo;

    atualizarModalConteudo([
      '<form class="readonly-form" data-portal-v2-form="justificativa-envio" data-fora-prazo="' + (foraPrazo ? 'true' : 'false') + '" data-exige-ciencia-fora-prazo="' + (exigeCiencia ? 'true' : 'false') + '">',
      '<input type="hidden" name="idRegistroPresenca" value="' + ui.escaparHtml(item.idRegistroPresenca || id || '') + '">',
      '<input type="hidden" name="idAtividade" value="' + ui.escaparHtml(item.idAtividade || '') + '">',
      exigeCiencia ? '<p class="simulation-warning">Esta justificativa esta sendo enviada fora do prazo previsto. Ela sera registrada, mas a aceitacao dependera de analise da Diretoria/Secretaria.</p>' : '',
      montarCampoMotivoJustificativa(item, config),
      '<label>Descricao da justificativa',
      '<textarea name="descricaoJustificativa" rows="5" required>' + ui.escaparHtml(item.descricaoJustificativa || '') + '</textarea>',
      '</label>',
      '<label>Possui documento comprobatorio?',
      '<select name="possuiDocumentoComprobatorio">',
      '<option value="NAO">Nao</option>',
      '<option value="SIM">Sim</option>',
      '</select>',
      '</label>',
      montarCamposDocumentoJustificativa(config, item),
      '<label>Observacoes',
      '<textarea name="observacoes" rows="3"></textarea>',
      '</label>',
      exigeCiencia ? '<label class="checkbox-line"><input name="confirmouCienciaForaPrazo" type="checkbox" required> Estou ciente de que esta justificativa esta fora do prazo e podera ser indeferida.</label>' : '',
      '<div class="presentation-card-actions">',
      '<button type="submit">Enviar</button>',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
      '</div>',
      '</form>'
    ].join(''));
  }

  function montarCampoMotivoJustificativa(item, config) {
    var motivos = obterMotivosJustificativa(config);
    var atual = String((item || {}).motivoCategoria || (item || {}).motivoDeclarado || '').trim();

    return [
      '<label>Motivo',
      '<select name="motivoDeclarado" required>',
      '<option value="">Selecionar</option>',
      motivos.map(function montar(motivo) {
        var valor = String(motivo.valor || motivo.codigo || motivo.rotulo || motivo.label || motivo || '').trim();
        var rotulo = motivo.rotulo || motivo.label || valor;
        var selecionado = valor === atual ? ' selected' : '';
        return '<option value="' + ui.escaparHtml(valor) + '"' + selecionado + '>' + ui.escaparHtml(rotulo) + '</option>';
      }).join(''),
      '</select>',
      '</label>'
    ].join('');
  }

  function montarCamposDocumentoJustificativa(config, item) {
    var upload = obterUploadJustificativa(config);
    var formatos = obterFormatosJustificativa(upload);
    var accept = formatos.map(function montar(extensao) {
      return '.' + extensao.toLowerCase();
    }).join(',');
    var limiteMb = Math.round((upload.tamanhoMaximoBytes || JUSTIFICATIVA_UPLOAD_PADRAO.tamanhoMaximoBytes) / 1024 / 1024);

    return [
      '<label>Arquivo comprobatorio',
      '<input name="arquivoDocumentoComprobatorio" type="file" accept="' + ui.escaparHtml(accept) + '">',
      '</label>',
      '<label>Link do documento',
      '<input name="linkDocumentoComprobatorio" type="url" value="' + ui.escaparHtml((item || {}).linkDocumentoComprobatorio || '') + '">',
      '</label>',
      '<p class="muted-inline">Formatos aceitos: ' + ui.escaparHtml(formatos.join(', ')) + '. Limite: ' + ui.escaparHtml(limiteMb) + ' MB. Use arquivo ou link quando houver comprovante.</p>'
    ].join('');
  }

  function abrirModalAnaliseJustificativa(id, decisao, titulo, observacaoObrigatoria) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase(titulo, [
      '<form class="readonly-form" data-portal-v2-form="justificativa-analise" data-decisao="' + ui.escaparHtml(decisao) + '" data-observacao-obrigatoria="' + (observacaoObrigatoria ? 'true' : 'false') + '">',
      '<input type="hidden" name="idJustificativa" value="' + ui.escaparHtml(item.idJustificativa || id || '') + '">',
      observacaoObrigatoria ? '<p class="simulation-warning">Informe uma observacao para registrar esta decisao.</p>' : '',
      '<label>Observacao publica',
      '<textarea name="observacaoPublica" rows="4" ' + (observacaoObrigatoria ? 'required' : '') + '></textarea>',
      '</label>',
      '<label>Observacoes internas',
      '<textarea name="observacoesInternas" rows="4"></textarea>',
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

  function carregarJustificativasConfig() {
    if (estado.justificativasConfig && estado.justificativasConfigExpiraEm > Date.now()) {
      return Promise.resolve(estado.justificativasConfig);
    }

    if (estado.justificativasConfigPromise) {
      return estado.justificativasConfigPromise;
    }

    estado.justificativasConfigPromise = api.apiGet('/v2/justificativas/config', {})
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar configuracao de justificativas.');
        }

        estado.justificativasConfig = normalizarJustificativasConfig(resposta.data || {});
        estado.justificativasConfigExpiraEm = Date.now() + TTL_CACHE_EIXOS_MS;
        return estado.justificativasConfig;
      })
      .finally(function limpar() {
        estado.justificativasConfigPromise = null;
      });

    return estado.justificativasConfigPromise;
  }

  function normalizarJustificativasConfig(config) {
    var dados = config || {};
    var upload = Object.assign({}, JUSTIFICATIVA_UPLOAD_PADRAO, dados.upload || dados.regrasUpload || {});

    return {
      motivos: obterMotivosJustificativa(dados),
      upload: upload,
      regras: Object.assign({
        descricaoMinimaOutro: 20,
        permiteLinkDocumento: true,
        permiteUploadDocumento: true
      }, dados.regras || {})
    };
  }

  function obterMotivosJustificativa(config) {
    var motivos = (config && Array.isArray(config.motivos) && config.motivos.length)
      ? config.motivos
      : MOTIVOS_JUSTIFICATIVA_PADRAO;

    return motivos.map(function normalizar(motivo) {
      if (typeof motivo === 'string') {
        return {
          valor: motivo,
          rotulo: motivo
        };
      }

      return {
        valor: String((motivo || {}).valor || (motivo || {}).codigo || (motivo || {}).rotulo || '').trim(),
        rotulo: String((motivo || {}).rotulo || (motivo || {}).label || (motivo || {}).valor || (motivo || {}).codigo || '').trim(),
        descricao: String((motivo || {}).descricaoResumida || (motivo || {}).descricao || '').trim()
      };
    }).filter(function filtrar(motivo) {
      return motivo.valor;
    });
  }

  function obterUploadJustificativa(config) {
    return Object.assign({}, JUSTIFICATIVA_UPLOAD_PADRAO, (config || {}).upload || {});
  }

  function obterFormatosJustificativa(upload) {
    var formatos = Array.isArray((upload || {}).formatosAceitos)
      ? upload.formatosAceitos
      : JUSTIFICATIVA_UPLOAD_PADRAO.formatosAceitos;

    return formatos.map(function normalizar(formato) {
      return String(formato || '').replace(/^\./, '').toUpperCase();
    }).filter(Boolean);
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
    }, { form: form, acao: 'ENVIAR_TITULO_EIXO' });
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
    }, { form: form, acao: 'APROVAR_TITULO_EIXO' });
  }

  function salvarMaterial(form) {
    var dados = new FormData(form);
    var arquivo = dados.get('arquivo');

    if (!arquivo || !arquivo.name) {
      mostrarErroModal('Selecione um arquivo.', form, {
        arquivo: 'Selecione um arquivo.'
      });
      return;
    }

    if (!arquivoPermitido(arquivo)) {
      mostrarErroModal('Formato nao permitido. Use PDF, PPT, PPTX ou ODP.', form, {
        arquivo: 'Use um arquivo PDF, PPT, PPTX ou ODP.'
      });
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
        }, { loadingAtivo: true, form: form, acao: 'ENVIAR_MATERIAL' });
      })
      .catch(function falhar(erro) {
        ui.ocultarLoading();
        mostrarErroModal(erro.message || 'Nao foi possivel ler o arquivo.');
      });
  }

  function salvarFotoReuniao(form) {
    var dados = new FormData(form);
    var arquivo = dados.get('arquivo');
    var linkArquivo = String(dados.get('linkArquivo') || '').trim();
    if ((!arquivo || !arquivo.name) && !linkArquivo) {
      mostrarErroModal('Selecione uma foto ou informe um link do Google Drive.', form, {
        arquivo: 'Selecione uma foto ou use o campo de link.',
        linkArquivo: 'Informe um link do Google Drive se nao enviar um arquivo.'
      });
      return;
    }
    if (arquivo && arquivo.name && !arquivoFotoPermitido(arquivo)) {
      mostrarErroModal('Formato nao permitido. Use JPG, JPEG, PNG ou WEBP.', form, {
        arquivo: 'Use uma imagem JPG, JPEG, PNG ou WEBP.'
      });
      return;
    }
    ui.mostrarLoading('Lendo foto...');
    var contentPromise = arquivo && arquivo.name ? lerArquivoBase64(arquivo) : Promise.resolve('');
    contentPromise.then(function enviar(conteudoBase64) {
      return executarPostApresentacao('/v2/apresentacoes/foto/registrar', {
        idApresentacao: dados.get('idApresentacao'),
        nomeArquivoOriginal: arquivo && arquivo.name || '',
        mimeType: arquivo && arquivo.type || '',
        conteudoBase64: conteudoBase64,
        linkArquivo: linkArquivo,
        reenvio: form.getAttribute('data-reenvio') === 'true',
        observacoes: dados.get('observacoes') || ''
      }, {
        loadingAtivo: true,
        form: form,
        acao: form.getAttribute('data-envio-gestao') === 'true'
          ? 'ENVIAR_FOTO_REUNIAO_GESTAO'
          : 'ENVIAR_FOTO_REUNIAO'
      });
    }).catch(function falhar(erro) {
      ui.ocultarLoading();
      mostrarErroModal(erro.message || 'Nao foi possivel ler a foto.');
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
      mostrarErroModal('Informe uma observacao para concluir esta acao.', form, {
        observacaoPublica: 'Informe a orientacao que sera exibida ao membro.'
      });
      return;
    }

    if (tipo === 'titulo') {
      enviarRevisaoTitulo(
        dados.get('idApresentacao'),
        decisao,
        observacaoPublica,
        observacaoInterna,
        form
      );
      return;
    }

    if (tipo === 'foto') {
      enviarRevisaoFotoReuniao(
        dados.get('idApresentacao'),
        decisao,
        observacaoPublica,
        observacaoInterna,
        form
      );
      return;
    }

    enviarRevisaoMaterial(
      dados.get('idApresentacao'),
      decisao,
      observacaoPublica,
      observacaoInterna,
      form
    );
  }

  function salvarJustificativa(form) {
    var dados = new FormData(form);
    var exigeCiencia = form.getAttribute('data-exige-ciencia-fora-prazo') === 'true';
    var possuiDocumento = dados.get('possuiDocumentoComprobatorio') || 'NAO';
    var linkDocumento = String(dados.get('linkDocumentoComprobatorio') || '').trim();
    var motivo = String(dados.get('motivoDeclarado') || '').trim();
    var descricao = String(dados.get('descricaoJustificativa') || '').trim();
    var arquivo = dados.get('arquivoDocumentoComprobatorio');
    var config = estado.justificativasConfig || normalizarJustificativasConfig({});

    if (exigeCiencia && dados.get('confirmouCienciaForaPrazo') !== 'on') {
      mostrarErroModal('Confirme ciencia do envio fora do prazo.');
      return;
    }

    if (motivo === 'OUTRO' && descricao.length < obterDescricaoMinimaOutro(config)) {
      mostrarErroModal('Descreva melhor o motivo quando selecionar Outro.');
      return;
    }

    if (possuiDocumento === 'SIM' && (!arquivo || !arquivo.name) && !linkDocumento) {
      mostrarErroModal('Anexe um arquivo ou informe o link do documento comprobatorio.');
      return;
    }

    if (arquivo && arquivo.name && !arquivoJustificativaPermitido(arquivo, config)) {
      mostrarErroModal('Formato ou tamanho do comprovante nao permitido.');
      return;
    }

    montarPayloadDocumentoJustificativa(arquivo, config)
      .then(function enviar(documentoComprobatorio) {
        var payload = {
          idRegistroPresenca: dados.get('idRegistroPresenca'),
          idAtividade: dados.get('idAtividade'),
          motivoDeclarado: motivo,
          descricaoJustificativa: descricao,
          possuiDocumentoComprobatorio: possuiDocumento,
          linkDocumentoComprobatorio: linkDocumento,
          confirmouCienciaForaPrazo: exigeCiencia ? dados.get('confirmouCienciaForaPrazo') === 'on' : false,
          observacoes: dados.get('observacoes')
        };

        if (documentoComprobatorio) {
          payload.documentoComprobatorio = documentoComprobatorio;
        }

        return executarPostJustificativa('/v2/justificativas/enviar', payload);
      })
      .catch(function falhar(erro) {
        ui.ocultarLoading();
        mostrarErroModal(erro.message || 'Nao foi possivel preparar o comprovante.');
      });
  }

  function salvarAnaliseJustificativa(form) {
    var dados = new FormData(form);
    var decisao = form.getAttribute('data-decisao');
    var observacaoObrigatoria = form.getAttribute('data-observacao-obrigatoria') === 'true';
    var observacaoPublica = String(dados.get('observacaoPublica') || '').trim();
    var observacoesInternas = String(dados.get('observacoesInternas') || '').trim();

    if (observacaoObrigatoria && !observacaoPublica && !observacoesInternas) {
      mostrarErroModal('Informe uma observacao para concluir esta decisao.');
      return;
    }

    executarPostJustificativa('/v2/justificativas/analisar', {
      idJustificativa: dados.get('idJustificativa'),
      decisao: decisao,
      observacaoPublica: observacaoPublica,
      observacoesInternas: observacoesInternas
    });
  }

  function enviarRevisaoTitulo(id, decisao, observacaoPublica, observacaoInterna, form) {
    var route = decisao === 'REPROVAR'
      ? '/v2/apresentacoes/titulo-eixo/reprovar'
      : '/v2/apresentacoes/titulo-eixo/revisar';

    executarPostApresentacao(route, {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    }, {
      form: form,
      acao: decisao === 'APROVAR' || decisao === 'EDITAR_E_APROVAR'
        ? 'APROVAR_TITULO_EIXO'
        : (decisao === 'SOLICITAR_AJUSTE' ? 'AJUSTAR_TITULO_EIXO' : 'REPROVAR_TITULO_EIXO')
    });
  }

  function enviarRevisaoMaterial(id, decisao, observacaoPublica, observacaoInterna, form) {
    executarPostApresentacao('/v2/apresentacoes/material/revisar', {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    }, { form: form, acao: 'REVISAR_MATERIAL' });
  }

  function enviarRevisaoFotoReuniao(id, decisao, observacaoPublica, observacaoInterna, form) {
    var acao = decisao === 'APROVAR'
      ? 'APROVAR_FOTO_REUNIAO'
      : (decisao === 'DISPENSAR' ? 'DISPENSAR_FOTO_REUNIAO' : 'AJUSTAR_FOTO_REUNIAO');
    executarPostApresentacao('/v2/apresentacoes/foto/revisar', {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    }, { form: form, acao: acao });
  }

  function executarPostApresentacao(route, payload, opcoes) {
    var config = opcoes || {};
    var toastId;

    if (config.form) {
      ui.limparErrosCampos(config.form);
      var feedbackAnterior = document.querySelector('[data-readonly-modal-feedback]');
      if (feedbackAnterior) feedbackAnterior.remove();
    }

    toastId = ui.mostrarToast({
      type: 'pending',
      title: 'Processando apresentacao',
      message: obterMensagemPendenteApresentacao(config.acao),
      persistent: true
    });

    if (!config.loadingAtivo) {
      ui.mostrarLoading('Salvando apresentacao...');
    }

    return api.apiPost(route, {
      payload: JSON.stringify(payload)
    })
      .then(function tratar(resposta) {
        var feedback = ui.normalizarFeedbackResposta(resposta);

        if (!resposta.ok) {
          var erro = new Error(ui.obterMensagemErroAmigavel(
            feedback,
            'Nao foi possivel salvar a apresentacao. Tente novamente.'
          ));
          erro.fieldErrors = feedback.fieldErrors;
          erro.code = feedback.code;
          if (!Object.keys(erro.fieldErrors).length) {
            erro.fieldErrors = mapearErrosCamposApresentacao(config.acao, feedback.code);
          }
          throw erro;
        }

        var sucesso = montarFeedbackSucessoApresentacao(config.acao, payload, feedback);
        estado.feedbackPersistente = Object.assign({
          idRota: estado.rotaAtual || 'minhas-apresentacoes'
        }, sucesso);
        fecharModal();
        invalidarCacheApresentacoes();
        notificarApresentacoesAtualizadas(payload, feedback.data);
        carregarTela(estado.rotaAtual || 'minhas-apresentacoes');
        ui.atualizarToast(toastId, {
          type: sucesso.type,
          title: sucesso.title,
          message: sucesso.message
        });
      })
      .catch(function falhar(erro) {
        var mensagemErro = ui.obterMensagemErroAmigavel({
          message: erro.message,
          fieldErrors: erro.fieldErrors || {}
        }, 'Nao foi possivel concluir a acao. Tente novamente.');
        mostrarErroModal(
          mensagemErro,
          config.form,
          erro.fieldErrors || {}
        );
        ui.atualizarToast(toastId, {
          type: 'error',
          title: 'Acao nao concluida',
          message: mensagemErro
        });
      })
      .then(function finalizar() {
        ui.ocultarLoading();
      });
  }

  function obterMensagemPendenteApresentacao(acao) {
    if (acao === 'ENVIAR_TITULO_EIXO') {
      return 'Enviando titulo e eixo para analise...';
    }
    if (acao === 'APROVAR_TITULO_EIXO') {
      return 'Aprovando titulo e eixo...';
    }
    if (acao === 'AJUSTAR_TITULO_EIXO') {
      return 'Devolvendo titulo e eixo para ajuste...';
    }
    if (acao === 'REPROVAR_TITULO_EIXO') {
      return 'Registrando a reprovacao da proposta...';
    }
    if (acao === 'ENVIAR_MATERIAL') return 'Enviando slide/material da apresentacao...';
    if (acao === 'REVISAR_MATERIAL') return 'Registrando analise do slide/material...';
    if (acao === 'ENVIAR_FOTO_REUNIAO' || acao === 'ENVIAR_FOTO_REUNIAO_GESTAO') return 'Enviando foto da reuniao...';
    if (['APROVAR_FOTO_REUNIAO', 'AJUSTAR_FOTO_REUNIAO', 'DISPENSAR_FOTO_REUNIAO'].indexOf(acao) >= 0) return 'Registrando analise da foto da reuniao...';

    return 'Salvando alteracoes da apresentacao...';
  }

  function montarFeedbackSucessoApresentacao(acao, payload, feedback) {
    var mensagens = {
      ENVIAR_TITULO_EIXO: 'Titulo e eixo enviados com sucesso. A apresentacao ficara pendente de analise.',
      APROVAR_TITULO_EIXO: 'Titulo e eixo aprovados com sucesso.',
      AJUSTAR_TITULO_EIXO: 'Titulo e eixo devolvidos para ajuste.',
      REPROVAR_TITULO_EIXO: 'Titulo e eixo reprovados. O membro devera enviar uma nova proposta diferente.',
      ENVIAR_MATERIAL: 'Slide enviado com sucesso.',
      REVISAR_MATERIAL: 'Analise do slide registrada com sucesso.',
      ENVIAR_FOTO_REUNIAO: 'Foto da reuniao enviada com sucesso.',
      ENVIAR_FOTO_REUNIAO_GESTAO: 'Foto da reuniao registrada pela Secretaria.',
      APROVAR_FOTO_REUNIAO: 'Foto da reuniao aprovada com sucesso.',
      AJUSTAR_FOTO_REUNIAO: 'Foto da reuniao devolvida para ajuste.',
      DISPENSAR_FOTO_REUNIAO: 'Foto da reuniao dispensada com justificativa.'
    };
    var proximosPassos = {
      ENVIAR_TITULO_EIXO: 'Proxima acao: aguardar a analise da Diretoria ou Secretaria.',
      APROVAR_TITULO_EIXO: 'Status final: aprovado.',
      AJUSTAR_TITULO_EIXO: 'Proxima acao: o membro deve complementar e reenviar a proposta.',
      REPROVAR_TITULO_EIXO: 'Proxima acao: o membro deve informar uma nova proposta.',
      ENVIAR_MATERIAL: 'Proxima acao: aguardar a analise do slide/material.',
      REVISAR_MATERIAL: 'Status final atualizado pelo backend.',
      ENVIAR_FOTO_REUNIAO: 'Proxima acao: aguardar a analise da foto, quando aplicavel.',
      ENVIAR_FOTO_REUNIAO_GESTAO: 'Proxima acao: revisar a foto, quando aplicavel.',
      APROVAR_FOTO_REUNIAO: 'Status final: foto aprovada.',
      AJUSTAR_FOTO_REUNIAO: 'Proxima acao: o apresentador deve reenviar a foto.',
      DISPENSAR_FOTO_REUNIAO: 'Status final: entrega dispensada.'
    };
    var mensagemPadrao = mensagens[acao] || 'Apresentacao atualizada com sucesso.';
    var detalhes = [];

    if (payload && payload.idApresentacao) {
      detalhes.push('ID da apresentacao: ' + payload.idApresentacao);
    }
    if (feedback.message && feedback.message !== mensagemPadrao) {
      detalhes.push(feedback.message);
    }
    if (proximosPassos[acao]) {
      detalhes.push(proximosPassos[acao]);
    }
    feedback.warnings.forEach(function adicionar(aviso) {
      detalhes.push(typeof aviso === 'string' ? aviso : (aviso.message || aviso.mensagem || ''));
    });
    feedback.nextActions.forEach(function adicionar(acaoBackend) {
      detalhes.push(typeof acaoBackend === 'string'
        ? acaoBackend
        : (acaoBackend.message || acaoBackend.mensagem || acaoBackend.label || acaoBackend.acao || ''));
    });

    return {
      type: feedback.warnings.length ? 'warning' : 'success',
      title: 'Apresentacao atualizada',
      message: mensagemPadrao,
      details: detalhes.filter(Boolean)
    };
  }

  function mapearErrosCamposApresentacao(acao, code) {
    var codigo = String(code || '').toUpperCase();

    if (acao === 'ENVIAR_FOTO_REUNIAO' || acao === 'ENVIAR_FOTO_REUNIAO_GESTAO') {
      if (codigo === 'LINK_FOTO_INVALIDO') return { linkArquivo: 'Informe um link valido de arquivo do Google Drive.' };
      if (codigo === 'TIPO_FOTO_INVALIDO') return { arquivo: 'Use uma imagem JPG, JPEG, PNG ou WEBP.' };
      if (codigo === 'FOTO_REUNIAO_MUITO_GRANDE') return { arquivo: 'A foto excede o limite configurado pelo backend.' };
      if (codigo === 'FOTO_REUNIAO_OBRIGATORIA') {
        return {
          arquivo: 'Selecione uma foto ou use o campo de link.',
          linkArquivo: 'Informe um link se nao enviar um arquivo.'
        };
      }
    }

    if (codigo === 'OBSERVACAO_OBRIGATORIA') {
      return { observacaoPublica: 'Informe a justificativa ou orientacao desta decisao.' };
    }

    return {};
  }

  function notificarApresentacoesAtualizadas(payload, data) {
    try {
      document.dispatchEvent(new CustomEvent('portal:apresentacoes-atualizadas', {
        detail: {
          idApresentacao: (payload || {}).idApresentacao || (data || {}).idApresentacao || '',
          idAtividade: (data || {}).idAtividade || ''
        }
      }));
    } catch (erro) {
      // O evento apenas invalida caches locais mantidos por outras telas.
    }
  }

  function executarPostJustificativa(route, payload) {
    ui.mostrarLoading('Salvando justificativa...');

    return api.apiPost(route, {
      payload: JSON.stringify(payload)
    })
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel salvar a justificativa.');
        }

        fecharModal();
        invalidarCacheJustificativas();
        carregarTela(estado.rotaAtual || 'justificativas');
      })
      .catch(function falhar(erro) {
        mostrarErroModal(erro.message || 'Erro controlado ao salvar justificativa.');
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

  function arquivoFotoPermitido(arquivo) {
    var nome = String((arquivo && arquivo.name) || '').toLowerCase();
    var tipo = String((arquivo && arquivo.type) || '').toLowerCase();
    return /\.(jpg|jpeg|png|webp)$/.test(nome) || ['image/jpeg', 'image/png', 'image/webp'].indexOf(tipo) >= 0;
  }

  function arquivoJustificativaPermitido(arquivo, config) {
    var upload = obterUploadJustificativa(config);
    var nome = String((arquivo && arquivo.name) || '').toLowerCase();
    var tipo = String((arquivo && arquivo.type) || '').toLowerCase();
    var formatos = obterFormatosJustificativa(upload).map(function minusculo(formato) {
      return formato.toLowerCase();
    });
    var mimeTypes = Array.isArray(upload.mimeTypesAceitos) && upload.mimeTypesAceitos.length
      ? upload.mimeTypesAceitos.map(function minusculo(mime) {
        return String(mime || '').toLowerCase();
      })
      : JUSTIFICATIVA_UPLOAD_PADRAO.mimeTypesAceitos;
    var limite = Number(upload.tamanhoMaximoBytes || JUSTIFICATIVA_UPLOAD_PADRAO.tamanhoMaximoBytes);
    var extensaoOk = formatos.some(function comparar(formato) {
      return nome.endsWith('.' + formato);
    });
    var mimeOk = !tipo || tipo === 'application/octet-stream' || mimeTypes.indexOf(tipo) >= 0;

    return arquivo && arquivo.name && arquivo.size <= limite && extensaoOk && mimeOk;
  }

  function montarPayloadDocumentoJustificativa(arquivo, config) {
    if (!arquivo || !arquivo.name) {
      return Promise.resolve(null);
    }

    ui.mostrarLoading('Lendo comprovante...');
    return lerArquivoBase64(arquivo).then(function montar(conteudoBase64) {
      return {
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type || inferirMimeJustificativa(arquivo.name),
        conteudoBase64: conteudoBase64
      };
    });
  }

  function inferirMimeJustificativa(nomeArquivo) {
    var nome = String(nomeArquivo || '').toLowerCase();

    if (nome.endsWith('.pdf')) {
      return 'application/pdf';
    }
    if (nome.endsWith('.jpg') || nome.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (nome.endsWith('.png')) {
      return 'image/png';
    }
    if (nome.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (nome.endsWith('.doc')) {
      return 'application/msword';
    }

    return '';
  }

  function obterDescricaoMinimaOutro(config) {
    var regras = (config || {}).regras || {};
    var minimo = Number(regras.descricaoMinimaOutro || 20);

    return Number.isFinite(minimo) && minimo > 0 ? minimo : 20;
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

  function mostrarErroModal(mensagem, form, fieldErrors) {
    var alvo = document.querySelector('[data-readonly-modal-content]');

    if (!alvo) {
      estado.feedbackPersistente = {
        idRota: estado.rotaAtual,
        type: 'error',
        title: 'Acao nao concluida',
        message: mensagem
      };
      restaurarFeedbackPersistente(estado.rotaAtual);
      return;
    }

    var alerta = alvo.querySelector('[data-readonly-modal-feedback]');
    if (!alerta) {
      alerta = document.createElement('div');
      alerta.setAttribute('data-readonly-modal-feedback', 'true');
      alvo.insertBefore(alerta, alvo.firstChild);
    }
    ui.mostrarMensagemPersistente(alerta, {
      type: 'error',
      title: 'Revise os dados',
      message: mensagem
    });
    ui.aplicarErrosCampos(form, fieldErrors || {});
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
        normalizarUrlPublica(obterPrimeiroValorPorChaves(item, coluna[3] || []));

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

    return eixos ? ui.escaparHtml(formatarValor(eixos)) : '';
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
