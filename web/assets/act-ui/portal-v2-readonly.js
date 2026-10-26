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
  var decisionJournal = global.PortalGeapaPresentationDecisionJournal;
  var portalConfig = global.PortalGeapaConfig || {};
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
    frequenciaFiltroSelecionado: 'TODOS',
    frequenciaDataAtual: null,
    frequenciaDadosEmCache: false,
    feedbackPersistente: null,
    cache: {}
  };
  var TTL_CACHE_PRIVADO_MS = 60000;
  var TTL_CACHE_EIXOS_MS = 20 * 60 * 1000;
  var requestIdsDecisoesPendentes = Object.create(null);
  var restauracaoDiarioDecisoesIniciada_ = false;
  var restauracaoDiarioDecisoesTentativas_ = 0;
  var ultimoIdModalEditarAprovarDev_ = '';
  var geracaoModal_ = 0;
  var DECISION_JOURNAL_BROWSER_SESSION_KEY =
    'geapaPortal.presentationDecisionActorScope.v1';
  var ID_APRESENTACAO_TECNICO_PATTERN = /^(?:APR-(?:\d{4}|\d{4}-[12]-\d{4}(?:-\d{2})?)|APU_[A-Za-z0-9_-]{1,48})$/;
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
    // Technical UI ceiling; the Core still enforces the activity's file policy.
    tamanhoMaximoBytes: 50 * 1024 * 1024
  };

  document.addEventListener('portal:act-session-cleared',function(){estado.cache={};estado.itensPorId={};estado.apresentacoesTodas=false;estado.frequenciaDataAtual=null;estado.feedbackPersistente=null;estado.eixos=null;estado.justificativasConfig=null;geracaoModal_++;var el=document.getElementById('placeholder-content');if(el&&ROTAS[estado.rotaAtual])el.textContent='';estado.rotaAtual='';});
  function iniciar() {
    if (!api || !ui || !navigation) {
      return;
    }

    if (global.__PortalGeapaV2ReadonlyInitialized === true) {
      return;
    }
    global.__PortalGeapaV2ReadonlyInitialized = true;

    if (diagnosticoModalDevLocalAtivo_() && global.document && global.document.documentElement) {
      global.document.documentElement.setAttribute(
        'data-geapa-portal-v2-build',
        'presentation-decision-journal-v1'
      );
    }

    registrarDiagnosticoDiarioDecisoesDevLocal_();
    restaurarDiarioDecisoesApresentacoesDev_();

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

      if (rota && rota.id === 'frequencia' && evento.detail.motivo === 'justificativas-redirecionadas') {
        ui.mostrarToast({
          type: 'info',
          title: 'Justificativas integradas',
          message: 'As justificativas agora estao disponiveis em Minha frequencia.'
        });
      }
    });

    if (typeof navigation.getRotaAtual === 'function' && ROTAS[navigation.getRotaAtual()]) {
      carregarTela(navigation.getRotaAtual());
    }
  }

  var paginaJustificativas = {cursor:null, anteriores:[], proxima:null};
  var paginaApresentacoesSelf = {cursor:null, anteriores:[], proxima:null};
  function reiniciarPaginaApresentacoesSelf(){paginaApresentacoesSelf={cursor:null,anteriores:[],proxima:null};}
  document.addEventListener('portal:act-session-cleared',reiniciarPaginaApresentacoesSelf);
  var leituraTelaGeracao = 0;
  function reiniciarPaginaJustificativas() {paginaJustificativas={cursor:null,anteriores:[],proxima:null};}
  document.addEventListener('portal:act-session-cleared',function(){reiniciarPaginaJustificativas();leituraTelaGeracao++;});
  function carregarTela(idRota, timingHooks) {
    var definicao = ROTAS[idRota]&&Object.assign({},ROTAS[idRota]); if(definicao&&idRota==='admin-apresentacoes'&&estado.apresentacoesTodas)definicao.titulo='Apresentações';
    var container = document.getElementById('placeholder-content');

    if (!definicao || !container) {
      return Promise.resolve(false);
    }

    var managementTiming = idRota === 'admin-apresentacoes'
      ? criarTimingLeituraGestaoApresentacoesDev_()
      : null;
    if(idRota==='admin-justificativas'&&estado.rotaAtual!==idRota)reiniciarPaginaJustificativas();
    estado.rotaAtual = idRota;
    definicao.idRota = idRota;
    definicao.leituraGeracao=++leituraTelaGeracao;
    if(idRota==='admin-justificativas')definicao.cursor=paginaJustificativas.cursor;
    if(idRota==='minhas-apresentacoes')definicao.cursor=paginaApresentacoesSelf.cursor;
    estado.itensPorId = {};

    var cacheKey = obterCacheKey(definicao.endpoint+(definicao.idRota==='admin-apresentacoes'&&estado.apresentacoesTodas?'?todas=1':''));
    if(idRota==='admin-justificativas')cacheKey+='?cursor='+JSON.stringify(definicao.cursor);
    if(idRota==='minhas-apresentacoes')cacheKey+='?cursor='+JSON.stringify(definicao.cursor);
    var cache = lerCachePortal(cacheKey);

    if (cache) {
      renderizarBase(container, definicao, montarConteudo(definicao, cache.data || {}, true));
      return buscarTela(definicao, container, cacheKey, true, timingHooks, managementTiming);
    }

    renderizarBase(container, definicao, montarLoadingLocalReadonly('Carregando dados da view V2...'));
    ui.mostrarLoading('Carregando view V2...');
    return buscarTela(definicao, container, cacheKey, false, timingHooks, managementTiming);
  }

  function buscarTela(definicao, container, cacheKey, emSegundoPlano, timingHooks, managementTiming) {
    var hooks = timingHooks || {};
    var params = managementTiming ? { correlationId: managementTiming.correlationId } : {}; if(definicao.idRota==='admin-apresentacoes'&&estado.apresentacoesTodas)params.incluirSemPendencias=true;
    if(definicao.idRota==='admin-justificativas'&&definicao.cursor)params.cursor=definicao.cursor;
    if(definicao.idRota==='minhas-apresentacoes'&&definicao.cursor)params.cursor=definicao.cursor;
    return api.apiGet(definicao.endpoint, params)
      .then(function tratarResposta(resposta) {
        if(definicao.leituraGeracao!==leituraTelaGeracao)return;
        importarTimingLeituraGestaoApresentacoesDev_(managementTiming, resposta);
        if (typeof hooks.onResponse === 'function') hooks.onResponse();
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar a view V2.');
        }

        salvarCachePortal(cacheKey, resposta.data || {}, TTL_CACHE_PRIVADO_MS);
        if (definicao.idRota && estado.rotaAtual !== definicao.idRota) {
          return;
        }
        renderizarBase(container, definicao, montarConteudo(definicao, resposta.data || {}));
        marcarTimingLeituraGestaoApresentacoesDev_(managementTiming, 'G15', 'RENDER_CONCLUIDO');
        publicarTimingLeituraGestaoApresentacoesDev_(managementTiming);
        if (typeof hooks.onRendered === 'function') hooks.onRendered();
        return true;
      })
      .catch(function tratarErro(erro) {
        if(definicao.leituraGeracao!==leituraTelaGeracao)return;
        publicarTimingLeituraGestaoApresentacoesDev_(managementTiming);
        if (emSegundoPlano&&!['admin-justificativas','minhas-apresentacoes'].includes(definicao.idRota)) {
          return;
        }

        renderizarBase(
          container,
          definicao,
          '<p class="empty-state readonly-error">' + ui.escaparHtml(erro.message || 'Erro controlado ao carregar a view V2.') + '</p>'+(definicao.idRota==='admin-justificativas'?'<button type="button" data-portal-v2-action="justificativas-primeira">Atualizar lista</button>':definicao.idRota==='minhas-apresentacoes'?'<button type="button" data-portal-v2-action="apresentacoes-self-primeira">Atualizar lista</button>':'')
        );
        if (typeof hooks.onError === 'function') hooks.onError(erro);
        return false;
      })
      .then(function finalizar() {
        // Each foreground request owns one increment, including stale responses.
        // Rendering remains generation-fenced; the shared loader is reference-counted.
        if (!emSegundoPlano) {
          ui.ocultarLoading();
        }
      });
  }

  function criarTimingLeituraGestaoApresentacoesDev_() {
    if (String(portalConfig.ENVIRONMENT || '').trim().toUpperCase() !== 'DEV') return null;
    var timing = {
      correlationId: 'GESTAO-READ-' + Date.now() + '-' +
        Math.random().toString(36).slice(2, 10).toUpperCase(),
      marks: [],
      backend: null,
      sources: null
    };
    marcarTimingLeituraGestaoApresentacoesDev_(timing, 'G0', 'FRONTEND_INICIOU_CHAMADA');
    return timing;
  }

  function marcarTimingLeituraGestaoApresentacoesDev_(timing, code, label) {
    if (!timing) return;
    timing.marks.push({ code: code, label: label, at: new Date().toISOString() });
  }

  function importarTimingLeituraGestaoApresentacoesDev_(timing, resposta) {
    if (!timing) return;
    var transport = resposta && resposta.meta && resposta.meta.devClientTransportTiming;
    (transport && transport.marks || []).forEach(function(mark) {
      if (['G13', 'G14', 'FT'].indexOf(String(mark.code || '')) < 0) return;
      timing.marks.push({ code: mark.code, label: mark.label, at: mark.at });
    });
    timing.backend = resposta && resposta.meta && resposta.meta.trace || null;
    timing.sources = resposta && resposta.data && resposta.data.managementReadTiming || null;
  }

  function publicarTimingLeituraGestaoApresentacoesDev_(timing) {
    if (!timing || timing.published || !global.console || typeof global.console.info !== 'function') return;
    timing.published = true;
    var snapshot = {
      correlationId: timing.correlationId,
      marks: timing.marks.slice(),
      backend: timing.backend,
      sources: timing.sources
    };
    global.__PortalGeapaDevPresentationManagementTimings =
      global.__PortalGeapaDevPresentationManagementTimings || [];
    global.__PortalGeapaDevPresentationManagementTimings.push(snapshot);
    if (global.__PortalGeapaDevPresentationManagementTimings.length > 10) {
      global.__PortalGeapaDevPresentationManagementTimings.shift();
    }
    if (global.document && global.document.documentElement) {
      global.document.documentElement.setAttribute(
        'data-geapa-presentation-management-timing',
        JSON.stringify(snapshot)
      );
    }
    global.console.info('GEAPA-PRESENTATIONS-MANAGEMENT-DEV-TIMING ' + JSON.stringify(snapshot));
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
      var prefixo=obterCacheKey(chave);
      Object.keys(estado.cache).forEach(function(k){if(k===prefixo||k.indexOf(prefixo+'?')===0)delete estado.cache[k];});
    });
  }

  function invalidarCacheApresentacoes() {
    reiniciarPaginaApresentacoesSelf();
    leituraTelaGeracao++;
    invalidarCachePortal([
      '/v2/minhas-apresentacoes',
      '/v2/apresentacoes/pendencias',
      '/v2/pendencias-diretoria',
      '/v2/painel-diretoria'
    ]);
  }

  function invalidarCacheJustificativas() {
    reiniciarPaginaJustificativas();
    leituraTelaGeracao++;
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
      '<header class="portal-page-header">',
      '<div class="portal-page-heading public-content-heading">',
      '<p class="portal-page-eyebrow eyebrow">' + ui.escaparHtml(definicao.marcador) + '</p>',
      '<h2 class="portal-page-title">' + ui.escaparHtml(definicao.titulo) + '</h2>',
      '<p class="portal-page-description intro">' + ui.escaparHtml(definicao.intro) + '</p>',
      '</div>',
      '</header>',
      definicao.idRota==='admin-apresentacoes'?'<p><button type="button" class="secondary-button" data-portal-v2-action="alternar-todas-apresentacoes">'+(estado.apresentacoesTodas?'Ver somente pendências':'Ver todas as apresentações')+'</button></p>':'',
      definicao.idRota==='admin-apresentacoes'?'<p><button type="button" class="secondary-button" data-portal-v2-action="planejamento">Ciclos e sessões</button></p>':'',
      '<div data-readonly-feedback class="portal-feedback-slot" hidden></div>',
      corpo
    ].join('');

    if (typeof ui.hidratarLoadersLocais === 'function') {
      ui.hidratarLoadersLocais(container);
    }
    restaurarFeedbackPersistente(definicao.idRota);
  }

  function montarLoadingLocalReadonly(mensagem) {
    if (typeof ui.montarLoadingLocal === 'function') {
      return ui.montarLoadingLocal(mensagem);
    }

    return '<p class="empty-state readonly-skeleton">' + ui.escaparHtml(mensagem) + '</p>';
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

    var itens = Array.isArray(data[definicao.listaCampo]) ? data[definicao.listaCampo] : [];
    var resumo = data.resumo || {};
    var ultimaAtualizacao = data.ultimaAtualizacao || '';

    indexarItensPorId(itens);

    return [
      montarResumo(resumo, itens.length, ultimaAtualizacao,!!data.pagination),
      emCache ? '<p class="updated-at">Atualizando em segundo plano...</p>' : '',
      itens.length && definicao.tipo === 'minhas-apresentacoes'
        ? montarMinhasApresentacoes(itens)
        : '',
      itens.length && definicao.tipo === 'pendencias-apresentacoes'
        ? montarPendenciasApresentacoes(itens)
        : '',
      itens.length && definicao.tipo === 'pendencias-justificativas'
        ? montarPendenciasJustificativas(itens)
        : '',
      definicao.tipo==='pendencias-justificativas'?montarPaginacaoJustificativas(data.pagination):'',
      definicao.tipo==='minhas-apresentacoes'?montarPaginacaoApresentacoesSelf(data.pagination):'',
      itens.length && !definicao.tipo
        ? montarTabela(definicao, itens)
        : '',
      itens.length
        ? ''
        : '<p class="empty-state readonly-empty">' + ui.escaparHtml(definicao.vazio) + '</p>'
    ].join('');
  }

  function montarPaginacaoJustificativas(pagination) {
    if(!pagination)return '';
    paginaJustificativas.proxima=pagination.nextCursor||null;
    return '<nav class="presentation-card-actions" aria-label="Páginas de justificativas">'+
      '<button type="button" class="secondary-button" data-portal-v2-action="justificativas-anterior"'+(!paginaJustificativas.anteriores.length?' disabled':'')+'>Anterior</button>'+
      '<span>Página '+(paginaJustificativas.anteriores.length+1)+'</span>'+
      '<button type="button" class="secondary-button" data-portal-v2-action="justificativas-proxima"'+(!paginaJustificativas.proxima?' disabled':'')+'>Próxima</button>'+
      '<button type="button" class="secondary-button" data-portal-v2-action="justificativas-primeira">Atualizar lista</button></nav>';
  }
  function montarPaginacaoApresentacoesSelf(pagination){
    if(!pagination)return '';
    paginaApresentacoesSelf.proxima=pagination.nextCursor||null;
    return '<nav class="presentation-card-actions" aria-label="Páginas de minhas apresentações">'+
      '<button type="button" class="secondary-button" data-portal-v2-action="apresentacoes-self-anterior"'+(!paginaApresentacoesSelf.anteriores.length?' disabled':'')+'>Anterior</button>'+
      '<span>Página '+(paginaApresentacoesSelf.anteriores.length+1)+'</span>'+
      '<button type="button" class="secondary-button" data-portal-v2-action="apresentacoes-self-proxima"'+(!paginaApresentacoesSelf.proxima?' disabled':'')+'>Próxima</button>'+
      '<button type="button" class="secondary-button" data-portal-v2-action="apresentacoes-self-primeira">Atualizar lista</button></nav>';
  }
  function montarResumo(resumo, totalLista, ultimaAtualizacao,pagina) {
    var total = resumo.total !== undefined ? resumo.total : totalLista;
    var partes = [
      [pagina?'Nesta página':'Total', total]
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
    var pendencias = payloadAntigo ? [] : registros.filter(ehPendenciaJustificativaFrequencia);
    var registrosFiltrados = payloadAntigo ? [] : filtrarRegistrosFrequencia(registros, estado.frequenciaFiltroSelecionado);

    estado.frequenciaDataAtual = data || {};
    estado.frequenciaDadosEmCache = emCache === true;
    indexarItensPorId(registros);

    return [
      '<section class="frequency-section" aria-labelledby="frequencia-resumo-titulo">',
      '<h2 id="frequencia-resumo-titulo">Resumo do ciclo</h2>',
      montarResumoFrequencia(resumo, registros.length, (data || {}).ultimaAtualizacao),
      emCache ? '<p class="updated-at">Atualizando em segundo plano...</p>' : '',
      payloadAntigo ? montarAvisoFrequenciaDetalhadaIndisponivel(data || {}) : '',
      !payloadAntigo && ciclos.length > 1 ? montarFiltroCicloFrequencia(ciclos, cicloAtual) : '',
      !payloadAntigo && ciclos.length === 1 ? '<p class="updated-at">Ciclo: ' + ui.escaparHtml(cicloAtual.rotuloCiclo || cicloAtual.ciclo || 'Sem ciclo definido') + '</p>' : '',
      '</section>',
      pendencias.length ? montarBlocoPendenciasFrequencia(pendencias) : '',
      payloadAntigo ? '' : montarHistoricoFrequencia(registros, registrosFiltrados, definicao)
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
      '<label>Ciclo',
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
      registros.map(function montar(registro) { return montarCardFrequencia(registro, false); }).join(''),
      '</div>'
    ].join('');
  }

  function montarCardFrequencia(registro, destaquePendencia) {
    var id = obterIdItem(registro);
    var titulo = registro.tituloAtividade || registro.tituloPublico || registro.idAtividade || 'Atividade';
    var status = registro.statusPresencaRotulo || registro.statusPresenca || 'Registro';
    var acao = montarAcaoJustificativaFrequencia(registro, id);
    var permiteExibirPrazo = !ehPresencaFrequencia(registro) && temJustificativaFrequencia(registro);
    var prazo = permiteExibirPrazo
      ? formatarDataCurtaPendencia(registro.dataLimiteJustificativa || registro.prazoJustificativa)
      : '';
    var foraPrazo = permiteExibirPrazo && justificativaForaPrazo(registro);

    estado.itensPorId[id] = registro;

    return [
      '<article class="presentation-action-card', destaquePendencia ? ' frequency-pendency-card' : '', '">',
      '<div class="presentation-card-topline">',
      '<span>' + ui.escaparHtml(formatarDataCurtaPendencia(registro.dataAtividade) || formatarValor(registro.dataAtividade)) + '</span>',
      '<span>' + ui.escaparHtml(formatarValor(status)) + '</span>',
      foraPrazo ? '<span>FORA DO PRAZO</span>' : '',
      '</div>',
      '<div class="presentation-action-main"><div>',
      '<h3>' + ui.escaparHtml(formatarValor(titulo)) + '</h3>',
      registro.statusJustificativa ? '<p>Justificativa: ' + ui.escaparHtml(formatarValor(registro.statusJustificativa)) + '</p>' : '',
      prazo ? '<p>Prazo para justificar: ' + ui.escaparHtml(foraPrazo ? 'encerrado em ' + prazo : 'até ' + prazo) + '</p>' : '',
      registro.mensagemPrazoExtraordinario ? '<p>'+ui.escaparHtml(registro.mensagemPrazoExtraordinario)+'</p>' : '',
      registro.mensagemPortal ? '<p>' + ui.escaparHtml(registro.mensagemPortal) + '</p>' : '',
      '</div></div>',
      acao ? '<div class="presentation-card-actions">' + acao + '</div>' : '',
      '</article>'
    ].join('');
  }

  function montarBlocoPendenciasFrequencia(pendencias) {
    return [
      '<section class="frequency-section frequency-pendencies" aria-labelledby="frequencia-pendencias-titulo">',
      '<div class="frequency-section-heading">',
      '<h2 id="frequencia-pendencias-titulo">Pendências</h2>',
      '<span>' + ui.escaparHtml(pendencias.length) + '</span>',
      '</div>',
      '<div class="presentation-actions-list">',
      pendencias.map(function montar(item) { return montarCardFrequencia(item, true); }).join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function montarHistoricoFrequencia(registros, registrosFiltrados, definicao) {
    return [
      '<section class="frequency-section" aria-labelledby="frequencia-historico-titulo">',
      '<h2 id="frequencia-historico-titulo">Histórico de frequência</h2>',
      montarFiltrosHistoricoFrequencia(),
      registros.length
        ? (registrosFiltrados.length
          ? montarRegistrosFrequencia(registrosFiltrados)
          : '<p class="empty-state readonly-empty">Nenhum registro corresponde ao filtro selecionado.</p>')
        : '<p class="empty-state readonly-empty">' + ui.escaparHtml(definicao.vazio) + '</p>',
      '</section>'
    ].join('');
  }

  function montarFiltrosHistoricoFrequencia() {
    var filtros = [
      ['TODOS', 'Todos'],
      ['PRESENCAS', 'Presenças'],
      ['FALTAS', 'Faltas'],
      ['JUSTIFICATIVAS', 'Justificativas'],
      ['PENDENCIAS', 'Pendências']
    ];

    return [
      '<div class="frequency-history-filters" role="group" aria-label="Filtrar histórico de frequência">',
      filtros.map(function montar(filtro) {
        var ativo = estado.frequenciaFiltroSelecionado === filtro[0];
        return '<button type="button" data-frequencia-filtro="' + filtro[0] + '" class="' + (ativo ? 'is-active' : '') + '" aria-pressed="' + (ativo ? 'true' : 'false') + '">' + ui.escaparHtml(filtro[1]) + '</button>';
      }).join(''),
      '</div>'
    ].join('');
  }

  function filtrarRegistrosFrequencia(registros, filtro) {
    var chave = String(filtro || 'TODOS').toUpperCase();
    if (chave === 'PRESENCAS') return registros.filter(ehPresencaFrequencia);
    if (chave === 'FALTAS') return registros.filter(ehFaltaFrequencia);
    if (chave === 'JUSTIFICATIVAS') return registros.filter(temJustificativaFrequencia);
    if (chave === 'PENDENCIAS') return registros.filter(ehPendenciaJustificativaFrequencia);
    return registros.slice();
  }

  function ehPresencaFrequencia(registro) {
    var status = normalizarStatusFluxo((registro || {}).statusPresenca || (registro || {}).codigoPresenca);
    return ['P', 'R', 'PRESENTE', 'PRESENTE_PRESENCIAL', 'PRESENTE_REMOTO'].indexOf(status) >= 0;
  }

  function ehFaltaFrequencia(registro) {
    var status = normalizarStatusFluxo((registro || {}).statusPresenca || (registro || {}).codigoPresenca);
    return ['F', 'J', 'A', 'FALTA', 'JUSTIFICADA', 'ABONADA', 'FALTA_JUSTIFICADA', 'FALTA_ABONADA'].indexOf(status) >= 0;
  }

  function temJustificativaFrequencia(registro) {
    var item = registro || {};
    return Boolean(
      item.idJustificativa ||
      item.statusJustificativa ||
      item.acaoJustificativa ||
      item.idJustificativaPrevia ||
      item.statusJustificativaPrevia ||
      item.acaoJustificativaPrevia
    );
  }

  function ehPendenciaJustificativaFrequencia(registro) {
    var item = registro || {};
    var acao = normalizarStatusFluxo(item.acaoJustificativa || item.acaoJustificativaPrevia);
    var status = normalizarStatusFluxo(item.statusJustificativa || item.statusJustificativaPrevia);
    var acoesPendentes = ['ENVIAR_JUSTIFICATIVA', 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO', 'COMPLEMENTAR_JUSTIFICATIVA'];

    if (acoesPendentes.indexOf(acao) >= 0) return true;
    if (status === 'AJUSTE_SOLICITADO') return true;
    var previaPendente = item.justificativaPreviaPendente === true || normalizarStatusFluxo(item.justificativaPreviaPendente) === 'SIM';
    return previaPendente || status === 'PREVIA';
  }

  function montarAcaoJustificativaFrequencia(registro, id) {
    var acao = String((registro || {}).acaoJustificativa || '').toUpperCase();
    var podeEnviar = (registro || {}).podeEnviarJustificativa === true ||
      (registro || {}).podeComplementarJustificativa === true ||
      acao === 'ENVIAR_JUSTIFICATIVA' ||
      acao === 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO' ||
      acao === 'COMPLEMENTAR_JUSTIFICATIVA';

    if (podeEnviar && ((registro || {}).podeComplementarJustificativa === true || acao === 'COMPLEMENTAR_JUSTIFICATIVA')) {
      return botaoAcao('justificativa-enviar', id, 'Complementar justificativa', 'primary');
    }

    if (podeEnviar && acao === 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO') {
      return botaoAcao('justificativa-enviar', id, 'Enviar justificativa fora do prazo', 'primary');
    }

    if (podeEnviar) {
      return botaoAcao('justificativa-enviar', id, 'Enviar justificativa', 'primary');
    }

    if ((registro || {}).podeVerJustificativa === true || temJustificativaFrequencia(registro)) {
      return botaoAcao('justificativa-ver', id, 'Ver justificativa', 'secondary');
    }

    return '';
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
        var material = renderizarMaterialApresentacao(item, acoesMembro) + renderizarHistoricoMaterial(item);
        var foto = renderizarFotoReuniao(item, acoesMembro);
    if(foto && item.mensagemFotoReuniao)foto += '<p class="presentation-pendency-text">'+ui.escaparHtml(item.mensagemFotoReuniao)+'</p>';
        var pasta = renderizarPastaAtividade(item, acoesMembro);
        var recursos = montarRecursosApresentacao(material, foto, pasta);
        var acoes = (item.canonicalThemeWithdrawalAvailable?botaoAcao('retirar-tema',id,'Retirar proposta de tema','secondary'):'') + montarAcoesMinhasApresentacoes(item, id, acoesMembro) + (item.canonicalFinalizationAvailable?botaoAcao('finalizacao',id,'Título final e divulgação','secondary'):'') + (item.canonicalCompatibilityAvailable?botaoAcao('compatibilidade',id,'Compatibilidade temática','secondary'):'') +  (item.canonicalCalendarAvailable?botaoAcao('agenda',id,'Agenda da apresentação','secondary'):'') + (item.canonicalDynamicAvailable?botaoAcao('dinamica',id,'Dinâmica e histórico','secondary'):'');

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
        var acoes = (item.canonicalMaterialityAvailable?botaoAcao('classificar-tema',id,'Classificar alteração do tema','secondary'):'') + (item.canonicalFinalizationAvailable?botaoAcao('finalizacao',id,'Título final e divulgação','secondary'):'') + (item.canonicalCalendarAvailable?botaoAcao('agenda',id,'Agenda da apresentação','secondary'):'') + (item.canonicalCompatibilityAvailable?botaoAcao('compatibilidade',id,'Compatibilidade temática','secondary'):'') + (item.canonicalDynamicAvailable?botaoAcao('dinamica',id,'Dinâmica e histórico','secondary'):'') + acoesTitulo + acoesMaterial + acoesFoto + (item.canonicalRealizationAvailable?botaoAcao('realizacao',id,'Realização e histórico','secondary'):'');
        var material = renderizarLinkMaterialGestao(item) + renderizarHistoricoMaterial(item);
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
          item.canonicalProofAvailable ? '<p>'+linkComprovanteCanonico(item)+'</p>' : documento ? '<p><a class="secondary-button compact-button presentation-material-link" href="' + ui.escaparHtml(documento) + '" target="_blank" rel="noopener noreferrer">Abrir comprovante</a></p>' : '',
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
      (item || {}).eixoTematicoPrincipalRotulo || (item || {}).eixoTematicoPrincipal,
      (item || {}).eixoTematicoSecundarioRotulo || (item || {}).eixoTematicoSecundario
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
    var acao = normalizarStatusFluxo((item || {}).acaoJustificativa);
    if (acao === 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO') {
      return true;
    }
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

  var historicosMaterial={},historicoMaterialGeneration=0;
  document.addEventListener('portal:act-session-cleared',function(){historicosMaterial={};historicoMaterialGeneration++;});
  function renderizarHistoricoMaterial(item){return item.canonicalMaterialBasis?'<details data-material-history="'+ui.escaparHtml(item.idApresentacao)+'"><summary>Histórico do material</summary><div data-material-history-panel></div></details>':'';}
  document.addEventListener('click',function(event){var more=event.target.closest('[data-material-history-more]'),summary=event.target.closest('[data-material-history] > summary'),holder=(more||summary)&&event.target.closest('[data-material-history]');if(!holder)return;if(more)event.preventDefault();var id=holder.getAttribute('data-material-history');if(summary&&holder.open)return;carregarHistoricoMaterial(holder,id,!!more);});
  function carregarHistoricoMaterial(holder,id,more){
    var panel=holder.querySelector('[data-material-history-panel]'),previous=more?historicosMaterial[id]:null,gen=historicoMaterialGeneration;if(holder.dataset.loading==='1')return;holder.dataset.loading='1';panel.textContent='Carregando histórico...';
    api.apiGet('/v2/apresentacoes/material/historico',Object.assign({idApresentacao:id},previous&&previous.proximos?{cursors:previous.proximos}:{})).then(function(answer){if(gen!==historicoMaterialGeneration||!holder.isConnected)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar o histórico.');var entries={},labels={MATERIAL_ENVIADO:'Material enviado',MATERIAL_REENVIADO:'Material reenviado',MATERIAL_ANALISADO:'Material analisado',RECEBIMENTO_DEFINITIVO:'Recebimento definitivo',OPORTUNIDADE_CORRECAO:'Oportunidade de correção',MATERIAL_REGULARIZADO:'Material regularizado'},outcomes={VALID:'Válido',CORRECTABLE_DEFECT:'Correção solicitada',INVALID:'Inválido',INSUFFICIENT_EVIDENCE:'Evidência insuficiente',AWAITING_NOTICE:'Aguardando ciência',OPEN:'Aberta',ANSWERED:'Respondida',CLOSED:'Encerrada',EXPIRED:'Prazo encerrado',EXCEPTION:'Regularização excepcional',VALID_RECEIPTS:'Recebimentos válidos'};
      (previous&&previous.itens||[]).concat(answer.data.itens).forEach(function(v){entries[v.id]=v;});var rows=Object.values(entries).sort(function(a,b){return b.data.localeCompare(a.data)||a.id.localeCompare(b.id)});historicosMaterial[id]={itens:rows,proximos:answer.data.proximos};
      panel.innerHTML=rows.length?'<ol>'+rows.map(function(v){var date=v.data?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba',dateStyle:'short',timeStyle:'short'}).format(new Date(v.data)):'Data não informada',extra=[outcomes[v.resultado]||outcomes[v.estado]||outcomes[v.fundamento]||'',v.descricao||'',v.prazo?'Prazo: '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba'}).format(new Date(v.prazo)):''].filter(Boolean).join(' — ');return '<li><strong>'+ui.escaparHtml(labels[v.tipo]||'Registro de material')+'</strong> · '+ui.escaparHtml(date)+(extra?'<p>'+ui.escaparHtml(extra)+'</p>':'')+'</li>';}).join('')+'</ol>':'<p>Nenhum registro de material.</p>';if(answer.data.proximos)panel.innerHTML+='<button type="button" class="secondary-button" data-material-history-more>Carregar mais</button>';
    }).catch(function(error){if(gen===historicoMaterialGeneration&&holder.isConnected)panel.textContent=error.message||'Não foi possível carregar o histórico.';}).finally(function(){holder.dataset.loading='0';});
  }
  function linkMaterialCanonico(item) {return '<span class="muted-inline">' + ui.escaparHtml([montarEstadoEntregavel('slide',item.statusMaterial),item.mensagemMaterial||'',item.prazoCorrecao?'Prazo autorizado: '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba'}).format(new Date(item.prazoCorrecao)):'' ].filter(Boolean).join(' ')) + '</span><a class="secondary-button compact-button presentation-material-link" href="#" data-portal-v2-action="abrir-material-canonico" data-id-apresentacao="' + ui.escaparHtml(item.idApresentacao) + '" target="_blank" rel="noopener noreferrer">Abrir slide</a>';}
  var arquivosAbertos=[];
  document.addEventListener('portal:act-session-cleared',function(){arquivosAbertos.forEach(function(url){URL.revokeObjectURL(url)});arquivosAbertos=[];});
  function linkComprovanteCanonico(item){return '<a class="secondary-button compact-button presentation-material-link" href="#" data-portal-v2-action="abrir-comprovante-canonico" data-id-apresentacao="'+ui.escaparHtml(item.idJustificativa)+'" target="_blank" rel="noopener noreferrer">Abrir comprovante</a>';}
  function abrirComprovanteCanonico(id){var janela=global.open('about:blank','_blank');if(!janela){ui.mostrarToast({type:'error',title:'Abrir comprovante',message:'Permita abrir a nova aba para visualizar o comprovante.'});return;}janela.opener=null;janela.document.title='Abrir comprovante';janela.document.body.textContent='Carregando comprovante...';api.apiGet('/v2/justificativas/documento/arquivo',{idJustificativa:id}).then(function(answer){if(!answer.ok)throw Error(answer.message||'Não foi possível consultar o comprovante.');var d=answer.data,bytes=Uint8Array.from(atob(d.contentBase64),function(c){return c.charCodeAt(0)}),url=URL.createObjectURL(new Blob([bytes],{type:d.mime}));arquivosAbertos.push(url);janela.location.replace(url);}).catch(function(e){janela.close();ui.mostrarToast({type:'error',title:'Abrir comprovante',message:e.message});});}
  function linkFotoCanonica(item){return '<a class="secondary-button compact-button presentation-material-link" href="#" data-portal-v2-action="abrir-foto-canonica" data-id-apresentacao="'+ui.escaparHtml(item.idApresentacao)+'" target="_blank" rel="noopener noreferrer">Abrir foto</a>';}
  function abrirFotoCanonica(id){var janela=global.open('about:blank','_blank');if(!janela){ui.mostrarToast({type:'error',title:'Abrir foto',message:'Permita abrir a nova aba para visualizar a foto.'});return;}janela.opener=null;janela.document.title='Foto da reunião';janela.document.body.textContent='Carregando foto...';api.apiGet('/v2/apresentacoes/foto/arquivo',{idApresentacao:id}).then(function(answer){if(!answer.ok)throw Error(answer.message||'Não foi possível consultar a foto.');var d=answer.data,bytes=Uint8Array.from(atob(d.contentBase64),function(c){return c.charCodeAt(0)}),url=URL.createObjectURL(new Blob([bytes],{type:d.mime}));arquivosAbertos.push(url);janela.location.replace(url);}).catch(function(e){janela.close();ui.mostrarToast({type:'error',title:'Abrir foto',message:e.message});});}
  function abrirMaterialCanonico(id) {
    var janela=global.open('about:blank','_blank'),generation=geracaoModal_;
    if(!janela){ui.mostrarToast({type:'error',title:'Abrir slide',message:'Permita abrir a nova aba para visualizar o slide.'});return;}
    janela.opener=null;janela.document.title='Abrir slide';janela.document.body.textContent='Carregando slide...';
    api.apiGet('/v2/apresentacoes/material/arquivo',{idApresentacao:id}).then(function(answer){
      if(generation!==geracaoModal_||!answer.ok)throw Error(answer.message||'O acesso mudou. Atualize antes de abrir o slide.');
      var d=answer.data,bytes=Uint8Array.from(atob(d.contentBase64),function(c){return c.charCodeAt(0)}),url=URL.createObjectURL(new Blob([bytes],{type:d.mime}));arquivosAbertos.push(url);janela.location.replace(url);
    }).catch(function(error){janela.close();ui.mostrarToast({type:'error',title:'Abrir slide',message:error.message||'Não foi possível abrir o arquivo.'});});
  }
  function renderizarMaterialApresentacao(item, acoesMembro) {
    if(item.canonicalMaterialFile&&acoesMembro&&acoesMembro.podeAbrirMaterial)return linkMaterialCanonico(item);
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
    if(item.canonicalPhotoFile&&(!acoesMembro||acoesMembro.podeAbrirFotoReuniao))return '<span class="muted-inline">'+ui.escaparHtml(montarEstadoEntregavel('foto',obterStatusFotoReuniao(item)))+'</span>'+linkFotoCanonica(item);
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

  function renderizarLinkMaterialGestao(item) { if(item.canonicalMaterialFile)return linkMaterialCanonico(item);
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
    var filtroFrequencia = evento.target && evento.target.closest('[data-frequencia-filtro]');
    var alvo = evento.target && evento.target.closest('[data-portal-v2-action]');
    var acao;
    var id;

    if (filtroFrequencia) {
      estado.frequenciaFiltroSelecionado = filtroFrequencia.getAttribute('data-frequencia-filtro') || 'TODOS';
      renderizarMinhaFrequenciaAtual();
      return;
    }

    if (!alvo) {
      return;
    }

    acao = alvo.getAttribute('data-portal-v2-action');
    id = alvo.getAttribute('data-id-apresentacao') || '';

    if(/^apresentacoes-self-(anterior|proxima|primeira)$/.test(acao)){
      evento.preventDefault();
      if(acao==='apresentacoes-self-proxima'){if(!paginaApresentacoesSelf.proxima)return;paginaApresentacoesSelf.anteriores.push(paginaApresentacoesSelf.cursor);paginaApresentacoesSelf.cursor=paginaApresentacoesSelf.proxima;}
      else if(acao==='apresentacoes-self-anterior'){if(!paginaApresentacoesSelf.anteriores.length)return;paginaApresentacoesSelf.cursor=paginaApresentacoesSelf.anteriores.pop();}
      else invalidarCacheApresentacoes();
      paginaApresentacoesSelf.proxima=null;carregarTela('minhas-apresentacoes');return;
    }

    if(/^justificativas-(anterior|proxima|primeira)$/.test(acao)) {
      evento.preventDefault();
      if(acao==='justificativas-proxima'){if(!paginaJustificativas.proxima)return;paginaJustificativas.anteriores.push(paginaJustificativas.cursor);paginaJustificativas.cursor=paginaJustificativas.proxima;}
      else if(acao==='justificativas-anterior'){if(!paginaJustificativas.anteriores.length)return;paginaJustificativas.cursor=paginaJustificativas.anteriores.pop();}
      else invalidarCacheJustificativas();
      paginaJustificativas.proxima=null;
      carregarTela('admin-justificativas');return;
    }

    if (acao === 'alternar-todas-apresentacoes') {estado.apresentacoesTodas=!estado.apresentacoesTodas;carregarTela('admin-apresentacoes');return;}
    if (acao === 'planejamento') {abrirPlanejamento();return;}
    if (acao === 'abrir-comprovante-canonico') {evento.preventDefault();abrirComprovanteCanonico(id);return;}
    if (acao === 'abrir-foto-canonica') {evento.preventDefault();abrirFotoCanonica(id);return;}
    if (acao === 'abrir-material-canonico') {evento.preventDefault();abrirMaterialCanonico(id);return;}
    if (acao === 'fechar-modal') {
      fecharModal();
      return;
    }

    if (acao === 'retirar-tema' || acao === 'classificar-tema') {abrirAcaoTema(id,acao);return;}
    if (acao === 'reorganizacao') {abrirReorganizacao(id);return;}
    if (acao === 'compatibilidade') {abrirCompatibilidade(id);return;}
    if (acao === 'finalizacao') {abrirFinalizacao(id);return;}
    if (acao === 'agenda') {abrirAgendaApresentacao(id);return;}
    if (acao === 'dinamica') {abrirDinamica(id);return;}
    if (acao === 'realizacao') {abrirRealizacao(id);return;}
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

    if (acao === 'justificativa-ver') {
      abrirModalVisualizarJustificativa(id);
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

    if (form.getAttribute('data-portal-v2-form') === 'finalizacao') {
      var d=new FormData(form),action=String(d.get('acao')),payload={idApresentacao:String(d.get('idApresentacao')),acao:action,presentationRevision:Number(d.get('presentationRevision')),unitRevision:Number(d.get('unitRevision'))};
      if(action==='TITULO')payload.titulo=String(d.get('titulo'));if(action==='RETIRAR')payload.motivo=String(d.get('motivo'));
      if(action==='CONFERIR'){payload.checks={};form.querySelectorAll('[data-check-key]').forEach(function(input){payload.checks[input.dataset.checkKey]=input.checked;});}
      executarPostApresentacao('/v2/apresentacoes/finalizacao',payload,{form:form,acao:'REGISTRAR_FINALIZACAO'});return;
    }
    if (form.getAttribute('data-portal-v2-form') === 'agenda') {
      var d=new FormData(form),action=String(d.get('acao')),payload={idApresentacao:String(d.get('idApresentacao')),acao:action,unitRevision:Number(d.get('unitRevision'))};
      if(action==='AGENDAR'){var option=form.querySelector('select[name="sessionId"]').selectedOptions[0];payload.sessionId=String(d.get('sessionId'));payload.sessionRevision=Number(option.dataset.revision);}
      else payload.motivo=String(d.get('motivo')||'');
      executarPostApresentacao('/v2/apresentacoes/agenda',payload,{form:form,acao:'REGISTRAR_AGENDA'});return;
    }
    if (form.getAttribute('data-portal-v2-form') === 'dinamica') {
      var d=new FormData(form),action=String(d.get('acao')),payload={idApresentacao:String(d.get('idApresentacao')),acao:action,unitRevision:Number(d.get('unitRevision'))};
      if(action==='SOLICITAR')payload.elementos=Array.from({length:9},function(_,i){return String(d.get('elemento'+i)||'')});
      else {payload.motivo=String(d.get('motivo')||'');if(action==='DECIDIR'){payload.proposalRevision=Number(d.get('proposalRevision'));payload.decisao=String(d.get('decisao'));payload.confirmouMateriais=d.get('confirmouMateriais')==='on';}}
      executarPostApresentacao('/v2/apresentacoes/dinamica',payload,{form:form,acao:'REGISTRAR_DINAMICA'});return;
    }
    if (form.getAttribute('data-portal-v2-form') === 'realizacao') {
      var d=new FormData(form);executarPostApresentacao('/v2/apresentacoes/realizacao',{idApresentacao:String(d.get('idApresentacao')),presentationRevision:Number(d.get('presentationRevision')),dataOcorrencia:String(d.get('dataOcorrencia')),conducaoIndividual:d.get('conducaoIndividual')==='on',fundamento:String(d.get('fundamento'))},{form:form,acao:'RECONHECER_REALIZACAO'});return;
    }
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
      estado.frequenciaFiltroSelecionado = 'TODOS';
      renderizarMinhaFrequenciaAtual();
    }
  }

  function renderizarMinhaFrequenciaAtual() {
    var container = document.getElementById('placeholder-content');
    var definicao = ROTAS.frequencia;
    if (!container || !estado.frequenciaDataAtual) return;
    renderizarBase(
      container,
      definicao,
      montarMinhaFrequencia(estado.frequenciaDataAtual, estado.frequenciaDadosEmCache, definicao)
    );
  }

  function abrirAcaoTema(id,action) {
    var item=estado.itensPorId[id],withdraw=action==='retirar-tema';
    if(!item||!(withdraw?item.canonicalThemeWithdrawalAvailable:item.canonicalMaterialityAvailable))return;
    var esc=ui.escaparHtml;
    abrirModalBase(withdraw?'Retirar proposta de tema':'Classificar alteração do tema',
      '<form class="readonly-form" data-theme-action-form><input type="hidden" name="idApresentacao" value="'+esc(id)+'"><input type="hidden" name="action" value="'+(withdraw?'retirar':'natureza')+'">'+
      (withdraw?'<p>Esta ação retira a proposta em análise. Não cancela a atividade nem apaga o histórico.</p>':
        '<p>A classificação operacional não aprova o tema nem avalia mérito acadêmico.</p><label>Natureza da alteração<select name="materialidade" required><option value="">Selecione</option><option value="EDITORIAL">Ajuste editorial</option><option value="NON_MATERIAL_COMPLEMENT">Complementação sem mudança substancial</option><option value="SUBSTANTIAL">Mudança substancial</option></select></label>')+
      '<label>Motivo<textarea name="motivo" required maxlength="2000"></textarea></label><button type="submit">'+(withdraw?'Retirar proposta':'Registrar classificação')+'</button></form>');
  }
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form.matches('[data-theme-action-form]'))return;event.preventDefault();
    var fd=new FormData(form),action=String(fd.get('action')),payload={idApresentacao:String(fd.get('idApresentacao')),motivo:String(fd.get('motivo'))};
    if(action==='natureza')payload.materialidade=String(fd.get('materialidade'));
    executarPostApresentacao('/v2/apresentacoes/titulo-eixo/'+action,payload,{form:form,acao:action==='retirar'?'RETIRAR_TEMA':'CLASSIFICAR_TEMA'});
  });
  function abrirModalTituloEixo(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Titulo e eixos', '<p class="empty-state">Carregando eixos tematicos...</p>');
    carregarEixos(id)
      .then(function renderizar(eixos) {
        atualizarModalConteudo([
          '<form class="readonly-form" data-portal-v2-form="titulo-eixo">',
          '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(id) + '">',
          '<label>Titulo',
          '<input name="tituloApresentacao" required value="' + ui.escaparHtml(item.tema || item.titulo || '') + '">',
          '</label>',
          montarSelectEixo('eixoTematicoPrincipal', 'Eixo tematico principal', eixos, item.eixoTematicoPrincipal, true),
          montarSelectEixo('eixoTematicoSecundario', 'Eixo tematico secundario', eixos, item.eixoTematicoSecundario, false),
          '<label>' + (item.canonicalBasis ? 'Resumo do tema' : 'Observacoes'),
          '<textarea name="observacoes" rows="4" ' + (item.canonicalBasis ? 'required ' : '') + '>' + ui.escaparHtml(item.resumoTema || '') + '</textarea>',
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
    var idApresentacao = validarIdApresentacaoFrontend(id);
    var item;
    var geracaoModal;

    if (!idApresentacao) {
      return;
    }

    item = estado.itensPorId[idApresentacao];

    if (!item) {
      return;
    }

    geracaoModal = abrirModalBase(
      'Editar e aprovar titulo/eixos',
      '<p class="empty-state">Carregando eixos tematicos...</p>'
    );
    carregarEixos(idApresentacao)
      .then(function renderizar(eixos) {
        var renderizado = atualizarModalConteudo([
          '<form class="readonly-form" data-portal-v2-form="editar-aprovar-titulo-eixo">',
          '<input type="hidden" name="idApresentacao" value="">',
          '<label>Titulo',
          '<input name="tituloApresentacao" required value="' + ui.escaparHtml(obterTituloApresentacao(item)) + '">',
          '</label>',
          montarSelectEixo('eixoTematicoPrincipal', 'Eixo tematico principal', eixos, item.eixoTematicoPrincipal, true),
          montarSelectEixo('eixoTematicoSecundario', 'Eixo tematico secundario', eixos, item.eixoTematicoSecundario, false),
          item.canonicalBasis ? '<label>Natureza da alteração<select name="materialidade" required><option value="">Selecionar</option><option value="EDITORIAL">Ajuste editorial</option><option value="NON_MATERIAL_COMPLEMENT">Complementação sem mudança substancial</option><option value="SUBSTANTIAL">Mudança substancial do tema</option></select></label>' : '',
          '<label>' + (item.canonicalBasis ? 'Motivo da edição (interno)' : 'Observacoes'),
          '<textarea name="observacaoInterna" rows="4" ' + (item.canonicalBasis ? 'required' : '') + '></textarea>',
          '</label>',
          '<div class="presentation-card-actions">',
          '<button type="submit">Salvar e aprovar</button>',
          '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button>',
          '</div>',
          '</form>'
        ].join(''), {
          formName: 'editar-aprovar-titulo-eixo',
          idApresentacao: idApresentacao,
          geracaoModal: geracaoModal
        });
        if (renderizado) {
          registrarDiagnosticoModalEditarAprovarDev_(idApresentacao);
        }
      })
      .catch(function falhar(erro) {
        atualizarModalConteudo(
          '<p class="empty-state readonly-error">' + ui.escaparHtml(erro.message || 'Nao foi possivel carregar os eixos.') + '</p>',
          { geracaoModal: geracaoModal }
        );
      });
  }

  var reorganizationData=null,reorganizationId='';
  function abrirReorganizacao(id,cursors){
    abrirModalBase('Remarcação / troca','<p>Carregando propostas e sessões...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/reorganizacao',Object.assign({idApresentacao:id},cursors||{})).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar as propostas.');var d=answer.data;reorganizationData=d;reorganizationId=id;
      function esc(v){return ui.escaparHtml(String(v||''));}function day(v){return v?v.split('-').reverse().join('/'):'Sem data';}
      function hidden(action){return '<input type="hidden" name="action" value="'+action+'">';}
      var html='<p>A proposta mantém as datas atuais até a confirmação. Uma troca é confirmada por inteiro.</p>';
      if(d.podePropor){html+='<details><summary>Propor remarcação ou troca</summary><form class="readonly-form" data-reorganization-form>'+hidden('PROPOSE')+'<label>Tipo<select name="mode"><option value="ADMINISTRATIVE">Reorganização administrativa</option><option value="VOLUNTARY">Troca voluntária com consentimento</option>'+(d.podeCompor?'<option value="JOINT">Composição compartilhada com consentimento</option>':'')+'</select></label>';
        d.unidades.forEach(function(u){html+='<fieldset data-reorganization-unit="'+esc(u.id)+'"><legend><label><input type="checkbox" name="moveUnit" value="'+esc(u.id)+'"'+(id==='APU_'+u.id?' checked':'')+'>'+esc(u.nome)+'</label></legend><p>Data atual: '+esc(day(u.data))+'</p><label>Nova sessão<select name="destination"><option value="">Selecione</option>'+d.sessoes.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(day(s.data)+' — '+s.titulo+' ('+s.ocupadas+'/'+s.capacidade+')')+'</option>'}).join('')+'</select></label></fieldset>'});
        html+='<label>Validade da proposta (horário de Cuiabá)<input type="datetime-local" name="deadline" step="1" required></label><label>Motivo<textarea name="reason" maxlength="2000" required></textarea></label><p>A troca voluntária depende da janela configurada e da concordância dos envolvidos. A decisão administrativa exige fundamento.</p><button type="submit">Registrar proposta</button></form></details>';
      }
      html+='<h3>Propostas e histórico</h3>';if(!d.propostas.length)html+='<p>Nenhuma proposta desta apresentação nesta página.</p>';
      d.propostas.forEach(function(f){html+='<section><h4>'+esc(f.tipo==='JOINT_PROPOSAL'?'Composição compartilhada':f.modo==='VOLUNTARY'?'Troca voluntária':'Reorganização administrativa')+' — '+esc({OPEN:'Aguardando confirmação',CONFIRMED:'Confirmada',EXPIRED:'Expirada'}[f.estado]||f.estado)+'</h4><p>'+esc(f.motivo)+'</p><ul>'+f.movimentos.map(function(m){var u=f.afetados.find(function(v){return v.id===m.unitId});return '<li>'+esc((u?u.nome:'Participante')+' → '+day(m.data))+'</li>'}).join('')+'</ul>';
        if(f.modo==='VOLUNTARY')html+='<ul>'+f.afetados.map(function(u){return '<li>'+esc(u.nome+' — '+({ACCEPT:'Concordou',DECLINE:'Não concordou',PENDING:'Aguardando manifestação'}[u.consentimento]||u.consentimento))+'</li>'}).join('')+'</ul>';
        if(f.podeConsentir)html+='<form data-reorganization-form>'+hidden('CONSENT')+'<input type="hidden" name="flowId" value="'+esc(f.id)+'"><label>Sua manifestação<select name="choice" required><option value="">Selecione</option><option value="ACCEPT">Concordo com a proposta</option><option value="DECLINE">Não concordo com a proposta</option></select></label><button type="submit">Registrar manifestação</button></form>';
        if(f.podeConfirmar)html+='<form class="readonly-form" data-reorganization-form>'+hidden(f.tipo==='JOINT_PROPOSAL'?'COMPOSE':'CONFIRM')+'<input type="hidden" name="flowId" value="'+esc(f.id)+'"><label>Fundamento da confirmação<textarea name="reason" required maxlength="2000"></textarea></label><button type="submit">'+(f.tipo==='JOINT_PROPOSAL'?'Confirmar composição compartilhada':'Confirmar remarcação / troca')+'</button></form>';html+='</section>';
      });
      if(d.proximaPaginaUnidades)html+='<button type="button" id="reorganization-more-units">Outras apresentações</button>';if(d.proximaPaginaPropostas)html+='<button type="button" id="reorganization-more-flows">Outras propostas</button>';abrirModalBase('Remarcação / troca',html);
      var moreUnits=document.getElementById('reorganization-more-units'),moreFlows=document.getElementById('reorganization-more-flows');if(moreUnits)moreUnits.onclick=function(){abrirReorganizacao(id,{unitCursor:d.proximaPaginaUnidades})};if(moreFlows)moreFlows.onclick=function(){abrirReorganizacao(id,{flowCursor:d.proximaPaginaPropostas})};
    }).catch(function(e){if(generation===geracaoModal_)abrirModalBase('Remarcação / troca','<p>'+ui.escaparHtml(e.message)+'</p>')});
  }
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form.matches('[data-reorganization-form]'))return;event.preventDefault();var fd=new FormData(form),action=String(fd.get('action')),d=reorganizationData,id=reorganizationId,generation=geracaoModal_,payload={idApresentacao:id,unitRevision:d.unitRevision,action:action};
    if(action==='PROPOSE'){payload.moves=Array.from(form.querySelectorAll('input[name="moveUnit"]:checked')).map(function(cb){var u=d.unidades.find(function(v){return v.id===cb.value}),sid=cb.closest('fieldset').querySelector('select').value,s=d.sessoes.find(function(v){return v.id===sid});return {unitId:u.id,unitRevision:u.revision,sessionId:sid,sessionRevision:s?s.revision:0}});Object.assign(payload,{mode:String(fd.get('mode')),deadline:Date.parse(String(fd.get('deadline'))+'-04:00'),reason:String(fd.get('reason'))});if(payload.mode==='JOINT'){payload.action='JOINT';payload.mode='VOLUNTARY';}}
    else{var f=d.propostas.find(function(v){return v.id===String(fd.get('flowId'))});Object.assign(payload,{flowId:f.id,flowRevision:f.revision});if(action==='CONSENT')Object.assign(payload,{choice:String(fd.get('choice')),proposalRevision:f.proposalRevision});else payload.reason=String(fd.get('reason'));}
    var button=form.querySelector('button[type="submit"]');button.disabled=true;api.apiPost('/v2/apresentacoes/reorganizacao',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível registrar a operação.');invalidarCacheApresentacoes();abrirReorganizacao(id);}).catch(function(e){if(generation===geracaoModal_){var feedback=form.querySelector('[role="alert"]');if(!feedback){feedback=document.createElement('p');feedback.setAttribute('role','alert');form.append(feedback);}feedback.textContent=e.message;button.disabled=false;}});
  });
  function abrirCompatibilidade(id,cursor){
    abrirModalBase('Compatibilidade temática','<p>Carregando avaliação...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/compatibilidade',Object.assign({idApresentacao:id},cursor?{cursor:cursor}:{})).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível consultar a avaliação.');var d=answer.data,labels={COMPATIBLE:'Compatibilidade reconhecida',INCOMPATIBLE:'Reorganização necessária',REORGANIZATION_REQUIRED:'Reorganização necessária',IN_ANALYSIS:'Em análise',WAITING_INFORMATION:'Aguardando informação',ADJUSTMENT_REQUESTED:'Ajuste solicitado'};
      function esc(v){return ui.escaparHtml(String(v||''));}var html='<p>A avaliação considera os conteúdos da dupla. Uma decisão não altera temas nem agendamentos automaticamente.</p>';
      if(d.solicitacao)html+='<p>Sua solicitação: '+esc(d.solicitacao.motivo)+' — '+esc(d.solicitacao.estado==='ANSWERED'?'Respondida':'Registrada')+'</p>';
      if(d.guia)html+='<section><h3>Critérios do ciclo</h3><p>'+esc(d.guia)+'</p></section>';d.conteudos.forEach(function(v){html+='<section><h3>'+esc(v.titulo||'Tema ainda não informado')+'</h3><p>'+esc(v.resumo)+'</p></section>'});
      if(d.podeRegistrar||d.podeSolicitar){html+='<form class="readonly-form" data-compatibility-form><input type="hidden" name="idApresentacao" value="'+esc(id)+'"><input type="hidden" name="unitRevision" value="'+d.unitRevision+'"><input type="hidden" name="sessionRevision" value="'+d.sessionRevision+'"><input type="hidden" name="basisDigest" value="'+esc(d.basisDigest)+'"><input type="hidden" name="action" value="'+(d.podeRegistrar?'DECIDE':'REQUEST')+'">';
        if(d.podeRegistrar)html+='<label>Resultado da análise<select name="outcome" required><option value="">Selecione</option>'+['IN_ANALYSIS','WAITING_INFORMATION','ADJUSTMENT_REQUESTED','COMPATIBLE','REORGANIZATION_REQUIRED'].map(function(k){return '<option value="'+k+'">'+labels[k]+'</option>'}).join('')+'</select></label>';
        html+='<label>'+(d.podeRegistrar?'Fundamento ou informação necessária':'Motivo da solicitação')+'<textarea name="reason" required maxlength="2000"></textarea></label><button type="submit">'+(d.podeRegistrar?'Registrar avaliação':'Solicitar análise')+'</button></form>';
      }
      html+='<h3>Histórico</h3>'+(d.historico.length?'<ol>'+d.historico.map(function(v){return '<li><strong>'+esc(labels[v.resultado]||v.resultado)+'</strong> — '+esc(v.atual?'Base atual':'Base anterior; exige nova conferência')+'<p>'+esc(v.motivo)+'</p></li>'}).join('')+'</ol>':'<p>Ainda não analisada.</p>');if(d.proximaPagina)html+='<button type="button" id="compatibility-more">Avaliações anteriores</button>';abrirModalBase('Compatibilidade temática',html);var more=document.getElementById('compatibility-more');if(more)more.onclick=function(){abrirCompatibilidade(id,d.proximaPagina)};
    }).catch(function(e){if(generation===geracaoModal_)abrirModalBase('Compatibilidade temática','<p>'+ui.escaparHtml(e.message)+'</p>')});
  }
  document.addEventListener('submit',function(event){var form=event.target;if(!form.matches('[data-compatibility-form]'))return;event.preventDefault();var fd=new FormData(form),payload={idApresentacao:String(fd.get('idApresentacao')),unitRevision:Number(fd.get('unitRevision')),sessionRevision:Number(fd.get('sessionRevision')),action:String(fd.get('action')),reason:String(fd.get('reason'))};if(payload.action==='DECIDE'){payload.outcome=String(fd.get('outcome'));payload.basisDigest=String(fd.get('basisDigest'));}executarPostApresentacao('/v2/apresentacoes/compatibilidade',payload,{form:form,acao:'REGISTRAR_COMPATIBILIDADE'});});
  var planningData=null,planningCycle='';
  document.addEventListener('portal:act-session-cleared',function(){planningData=null;planningCycle='';});
  function planningOption(value,label,selected){return '<option value="'+ui.escaparHtml(value)+'"'+(selected?' selected':'')+'>'+ui.escaparHtml(label)+'</option>';}
  function abrirPlanejamento(cycleId){
    abrirModalBase('Ciclos e sessões','<p>Carregando planejamento...</p>');var generation=geracaoModal_;
    api.apiGet('/admin/apresentacoes/planejamento',cycleId?{cycleId:cycleId}:{}).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível consultar o planejamento.');planningData=answer.data;planningCycle=cycleId||'';
      var d=planningData,html='';
      if(!cycleId){
        html='<p>O ciclo reúne as configurações e sessões aprovadas. Uma sessão utiliza a data da atividade vinculada.</p><ul>'+d.cycles.map(function(c){return '<li>'+ui.escaparHtml(c.label+' — '+c.start+' a '+c.end+' — '+c.status)+' <button type="button" class="secondary-button" data-planning-cycle="'+ui.escaparHtml(c.id)+'">Gerir sessões</button></li>';}).join('')+'</ul>';
        if(d.canCreateCycle&&d.policies.length)html+='<form data-planning-form="CYCLE" class="readonly-form"><h3>Novo ciclo</h3><label>Nome<input name="label" required maxlength="120"></label><label>Primeiro dia<input name="start" type="date" required></label><label>Último dia<input name="end" type="date" required></label><label>Base institucional<select name="policyId" required><option value="">Selecionar</option>'+d.policies.map(function(p){return planningOption(p.id,p.label,false)}).join('')+'</select></label><label>Motivo<textarea name="reason" required maxlength="2000"></textarea></label><p>O ciclo será criado em rascunho. A abertura exige configuração e capacidade aprovadas.</p><button type="submit">Criar ciclo</button></form>';
        else html+='<p>Para criar um ciclo, são necessárias uma base institucional habilitada e autorização administrativa que cubra os ciclos futuros.</p>';
      }else{
        html='<button type="button" class="secondary-button" data-planning-back>Voltar aos ciclos</button><h3>'+ui.escaparHtml(d.cycle.label)+'</h3><p>'+ui.escaparHtml(d.cycle.start+' a '+d.cycle.end+' — '+d.cycle.status)+'</p>';
        if(!d.config)html+='<p>O ciclo ainda precisa de configuração aprovada antes de receber sessões.</p>';
        else html+='<button type="button" data-planning-session="">Adicionar sessão</button>';
        html+=(d.config&&d.config.parameters.quota?'<p><button type="button" data-planning-quota>Cotas e fila temática</button></p>':'');html+='<p><button type="button" data-planning-theme-policies>Temas, eixos e prazo de análise</button></p>';html+='<p><button type="button" data-material-policies>Materiais e prazos</button> <button type="button" data-publication-policies>Conferência e divulgação</button></p>';html+=planningConfigHtml(d);if(d.preagenda&&d.preagenda.length){html+='<h3>Pré-agenda histórica</h3>';d.preagenda.forEach(function(v){html+='<p>'+ui.escaparHtml(v.activityId+' — '+v.presentationId)+'</p>';if(v.canRecognize)html+='<form data-planning-form="PREAGENDA" data-presentation-id="'+ui.escaparHtml(v.presentationId)+'" class="readonly-form"><label>Motivo do reconhecimento<textarea name="reason" required maxlength="2000"></textarea></label><p>Reconhece somente a pré-agenda e as decisões individuais já aprovadas. Não cria obrigação, apresentação, sessão ou realização.</p><button type="submit">Reconhecer pré-agenda aprovada</button></form>';else html+='<p>'+ui.escaparHtml(v.state==='RECOGNIZED'?'Pré-agenda reconhecida.':'Aguarda decisão institucional específica para esta apresentação.')+'</p>';});}if(d.continuity&&d.continuity.length){html+='<h3>Continuidade das apresentações importadas</h3>';var reasons={CYCLE_OPEN_DECISION_REQUIRED:'O ciclo aguarda abertura institucional.',PLANNING_CONFIG_APPROVAL_REQUIRED:'A configuração atual aprova somente o catálogo de eixos.',APPROVED_CURRENT_CONFIG_REQUIRED:'Falta configuração operacional aprovada.',APPROVED_MATERIAL_TEMPLATE_REQUIRED:'Falta política de material aprovada.',CURRENT_CAPACITY_ASSESSMENT_REQUIRED:'Falta avaliação atual de capacidade.',CANONICAL_SESSION_REQUIRED:'Falta sessão canônica vinculada.',FUTURE_SCHEDULED_ACTIVITY_REQUIRED:'A atividade precisa estar agendada para uma data futura.'};d.continuity.forEach(function(v){html+='<p>'+ui.escaparHtml(v.activityId+' — '+v.presentationId)+'</p>';if(v.canConnect)html+='<form data-planning-form="CONTINUITY" data-presentation-id="'+ui.escaparHtml(v.presentationId)+'" class="readonly-form"><label>Planejamento já aprovado<select name="unitId" required>'+v.units.map(function(u){return planningOption(u.id,u.id,false)}).join('')+'</select></label><label>Motivo da vinculação<textarea name="reason" required maxlength="2000"></textarea></label><p>Preserva o ID, os arquivos e a conferência. Não aprova planejamento, tema ou realização.</p><button type="submit">Vincular apresentação existente</button></form>';else html+='<p>'+ui.escaparHtml((v.blockers||[]).map(function(k){return reasons[k]||'Referência institucional pendente.'}).join(' ')||'Aguarda alocação, tema aprovado e autorização operacional.')+'</p>';});}if(d.canRefreshCapacity)html+='<form data-planning-form="CAPACITY" class="readonly-form"><input type="hidden" name="reason" value="Atualizar avaliação técnica do planejamento aprovado"><button type="submit">Atualizar avaliação de capacidade</button></form>';if(d.incidenceConfigured)html+='<p><button type="button" data-planning-incidence>Conferir obrigações do ciclo</button></p><div id="planning-incidence"></div>';if(d.cycle.status==='DRAFT'&&d.config&&!d.canOpen)html+='<p>'+ui.escaparHtml(d.openingUnavailableReason||'A abertura do ciclo ainda não está disponível.')+'</p><button type="button" disabled>Abrir ciclo</button>';if(d.canOpen)html+='<form data-cycle-opening class="readonly-form"><label>Motivo da abertura<textarea name="reason" required maxlength="2000"></textarea></label><p>A abertura exige a base institucional aprovada, vínculos válidos e capacidade suficiente. O ciclo ficará disponível conforme suas configurações aprovadas.</p><button type="submit">Abrir ciclo</button></form>';html+='<ul>'+d.sessions.map(function(s){return '<li>'+ui.escaparHtml(s.date+' — '+s.occupied+'/'+s.capacity+' — '+s.destination)+' <button type="button" class="secondary-button" data-planning-session="'+ui.escaparHtml(s.id)+'">Configurar sessão</button></li>';}).join('')+'</ul><div id="planning-session-editor"></div>';
      }
      abrirModalBase('Ciclos e sessões',html);
      document.querySelectorAll('[data-planning-cycle]').forEach(function(button){button.addEventListener('click',function(){abrirPlanejamento(button.dataset.planningCycle)})});
      document.querySelectorAll('[data-planning-session]').forEach(function(button){button.addEventListener('click',function(){editarSessaoPlanejamento(button.dataset.planningSession)})});
      var quota=document.querySelector('[data-planning-quota]');if(quota)quota.onclick=function(){abrirCotas(planningCycle)};
      var themes=document.querySelector('[data-planning-theme-policies]');if(themes)themes.onclick=function(){abrirRegrasTematicas(planningCycle)};
      var materialPolicies=document.querySelector('[data-material-policies]');if(materialPolicies)materialPolicies.onclick=function(){abrirDefinicoesEntrega(planningCycle,'MATERIAL')};
      var publicationPolicies=document.querySelector('[data-publication-policies]');if(publicationPolicies)publicationPolicies.onclick=function(){abrirDefinicoesEntrega(planningCycle,'PUBLICATION')};
      var incidenceButton=document.querySelector('[data-planning-incidence]');if(incidenceButton)incidenceButton.addEventListener('click',abrirIncidencia);
      var back=document.querySelector('[data-planning-back]');if(back)back.addEventListener('click',function(){abrirPlanejamento()});
    }).catch(function(e){if(generation===geracaoModal_)abrirModalBase('Ciclos e sessões','<p>'+ui.escaparHtml(e.message)+'</p>')});
  }
  var incidenceData=null;
  document.addEventListener('portal:act-session-cleared',function(){incidenceData=null;});
  function abrirIncidencia(){
    var target=document.getElementById('planning-incidence'),generation=geracaoModal_;if(!target)return;target.textContent='Conferindo os fatos de Membros e as obrigações do ciclo...';
    api.apiGet('/admin/apresentacoes/incidencia',{cycleId:planningCycle}).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível conferir as obrigações.');incidenceData=answer.data;
      var labels={INCIDENT:'Obrigação neste ciclo',DEFERRED:'Incidência no ciclo seguinte',NOT_INCIDENT:'Sem incidência neste ciclo',REVIEW_REQUIRED:'Revisão institucional necessária'};
      target.innerHTML='<h4>Obrigações ordinárias</h4><p>As datas e os vínculos vêm de Membros. Obrigações existentes são preservadas; retorno, retificação e histórico insuficiente exigem revisão.</p><ul>'+incidenceData.items.map(function(i){return '<li>'+ui.escaparHtml(i.name+' — '+labels[i.disposition]+(i.effectiveCivilDate?' — efetivação '+i.effectiveCivilDate:''))+(i.disposition==='INCIDENT'&&!i.obligationRef?'<form data-incidence-form="EVALUATE_PERSON" data-person="'+ui.escaparHtml(i.personRef.id)+'"><label>Fundamento da confirmação<textarea name="reason" required maxlength="2000"></textarea></label><button type="submit">Confirmar obrigação</button></form>':'')+'</li>';}).join('')+'</ul>'+(incidenceData.ready?'<form data-incidence-form="COVERAGE_APPROVE"><label>Fundamento da conferência da população<textarea name="reason" required maxlength="2000"></textarea></label><button type="submit">Aprovar população conferida</button></form>':'<p>A aprovação ficará disponível quando todas as incidências estiverem resolvidas e as obrigações registradas.</p>');
    }).catch(function(e){if(generation===geracaoModal_)target.textContent=e.message;});
  }
  document.addEventListener('submit',function(event){
    var form=event.target,opening=form.matches('[data-cycle-opening]');if(!opening&&!form.matches('[data-incidence-form]'))return;event.preventDefault();
    var data=new FormData(form),kind=opening?'OPEN':form.dataset.incidenceForm,cycle=planningCycle,generation=geracaoModal_,payload={kind:kind,cycleId:cycle,cycleRevision:opening?planningData.cycle.revision:incidenceData.cycleRevision,reason:String(data.get('reason')||'')};
    if(kind==='EVALUATE_PERSON'){var item=incidenceData.items.find(function(i){return i.personRef.id===form.dataset.person});if(!item)return;payload.personId=item.personRef.id;payload.personRevision=item.personRevision;}
    var button=form.querySelector('button[type="submit"]');button.disabled=true;
    api.apiPost(opening?'/admin/apresentacoes/planejamento/salvar':'/admin/apresentacoes/incidencia/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível confirmar.');invalidarCacheApresentacoes();if(opening)abrirPlanejamento(cycle);else{abrirIncidencia();var result=document.getElementById('planning-incidence-result')||document.createElement('p');result.id='planning-incidence-result';result.setAttribute('role','status');result.textContent=kind==='COVERAGE_APPROVE'?'População conferida e aprovada.':'Obrigação confirmada.';document.getElementById('planning-incidence').before(result);}}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  function planningConfigHtml(d){
    var info=d.configuration,p=info.parameters;if(!p)return '<p>A base institucional ainda precisa definir os parâmetros iniciais deste ciclo.</p>';
    function localTime(ms){return ms?new Date(ms-4*3600000).toISOString().slice(0,19):'';}
    function number(key,label,min,fallback){var value=p[key]===undefined?(fallback===undefined?'':fallback):p[key];return '<label>'+label+'<input type="number" name="'+key+'" min="'+min+'" step="1" value="'+ui.escaparHtml(String(value))+'" required></label>';}
    var html='<details><summary>Configuração do ciclo</summary><form data-cycle-config-form="RECORD" class="readonly-form"><label>Formação da agenda<select name="calendarMode">'+planningOption('BOARD_INITIAL','Alocação pela Diretoria',p.calendarMode==='BOARD_INITIAL')+planningOption('MEMBER_SELF_SCHEDULE','Agendamento pelo membro',p.calendarMode==='MEMBER_SELF_SCHEDULE')+'</select></label>';
    html+='<label>Base do planejamento<select name="planningMode">'+planningOption('INCIDENCE','Incidência institucional aprovada',(p.planningMode||'INCIDENCE')==='INCIDENCE')+planningOption('RECOGNIZED_PREAGENDA','Pré-agenda histórica reconhecida',p.planningMode==='RECOGNIZED_PREAGENDA')+'</select></label><label>Decisão de pré-agenda aprovada<select name="preAgendaPolicyId"><option value="">Selecione quando aplicável</option>'+((d.preAgendaPolicyOptions||[]).map(function(v){return planningOption(v.id,v.label,p.preAgendaPolicyRef&&p.preAgendaPolicyRef.id===v.id)}).join(''))+'</select></label><p>Estas opções pertencem somente a este ciclo. Não aprovam regras de uma minuta.</p>';
    [['shared','Permitir sessões compartilhadas'],['quota','Habilitar cota temática'],['early','Permitir solicitação temática antecipada'],['dynamic','Habilitar dinâmicas']].forEach(function(v){html+='<label><input name="'+v[0]+'" type="checkbox"'+(p[v[0]]?' checked':'')+'>'+v[1]+'</label>';});
    html+=number('dynamicLimit','Limite de dinâmicas',0)+number('newDateMinimumDays','Antecedência de nova data (dias)',30,30)+number('thematicMinimumDays','Antecedência do tema (dias)',20,20)+number('titleMinimumDays','Antecedência do título final (dias)',10,10);
    html+='<label>Agendamento pelo membro: abertura<input name="selfSchedulingOpensAt" type="datetime-local" step="1" value="'+localTime(p.selfSchedulingWindow&&p.selfSchedulingWindow.opensAt)+'"></label><label>Agendamento pelo membro: encerramento<input name="selfSchedulingEndsAt" type="datetime-local" step="1" value="'+localTime(p.selfSchedulingWindow&&p.selfSchedulingWindow.endsAtExclusive)+'"></label><label>Reorganização voluntária: abertura<input name="reorganizationOpensAt" type="datetime-local" step="1" value="'+localTime(p.reorganizationWindow&&p.reorganizationWindow.opensAt)+'"></label><label>Reorganização voluntária: encerramento<input name="reorganizationEndsAt" type="datetime-local" step="1" value="'+localTime(p.reorganizationWindow&&p.reorganizationWindow.endsAtExclusive)+'"></label><p>Horários de Cuiabá. O instante de encerramento já fica fora da janela.</p><label>Vigência da nova revisão<input name="effectiveFrom" type="datetime-local" step="1" required></label><label>Motivo da aprovação<textarea name="reason" required maxlength="2000"></textarea></label><p>O Core preserva regras estruturais do ciclo aberto e direitos já constituídos. Configurações indefinidas mantêm a operação fechada.</p><button type="submit">Registrar configuração aprovada</button></form>';
    if(info.pending)html+='<p>Revisão aprovada aguardando ativação: '+ui.escaparHtml(localTime(info.pending.effectiveFrom).replace('T',' '))+'</p>'+(info.pending.due?'<form data-cycle-config-form="ACTIVATE"><button type="submit">Ativar revisão aprovada</button></form>':'<p>A ativação estará disponível ao atingir a vigência.</p>');
    return html+'</details>';
  }
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form.matches('[data-cycle-config-form]'))return;event.preventDefault();var kind=form.dataset.cycleConfigForm,d=new FormData(form),payload={kind:kind,cycleId:planningCycle,cycleRevision:planningData.cycle.revision},generation=geracaoModal_,cycle=planningCycle;
    if(kind==='RECORD'){var values={calendarMode:String(d.get('calendarMode')),planningMode:String(d.get('planningMode')),preAgendaPolicyId:String(d.get('preAgendaPolicyId')||'')};['shared','quota','early','dynamic'].forEach(function(k){values[k]=d.has(k)});['dynamicLimit','newDateMinimumDays','thematicMinimumDays','titleMinimumDays'].forEach(function(k){values[k]=Number(d.get(k))});['selfSchedulingOpensAt','selfSchedulingEndsAt','reorganizationOpensAt','reorganizationEndsAt'].forEach(function(k){values[k]=d.get(k)?Date.parse(String(d.get(k))+'-04:00'):0});Object.assign(payload,{values:values,effectiveFrom:Date.parse(String(d.get('effectiveFrom'))+'-04:00'),reason:String(d.get('reason'))});}
    else Object.assign(payload,{configId:planningData.configuration.pending.id,configRevision:planningData.configuration.pending.revision});
    var button=form.querySelector('button[type="submit"]');button.disabled=true;api.apiPost('/admin/apresentacoes/configuracao/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível registrar a configuração.');invalidarCacheApresentacoes();abrirPlanejamento(cycle);}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  var quotaData=null;
  document.addEventListener('portal:act-session-cleared',function(){quotaData=null;});
  function abrirCotas(cycleId,cursor){
    abrirModalBase('Cotas e fila temática','<p>Carregando...</p>');var generation=geracaoModal_;
    api.apiGet('/admin/apresentacoes/cotas',Object.assign({cycleId:cycleId},cursor?{cursor:cursor}:{})).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível consultar as cotas.');var d=answer.data;quotaData=d;
      function esc(v){return ui.escaparHtml(String(v===null?'':v));}
      var html='<button type="button" data-quota-back class="secondary-button">Voltar ao ciclo</button><h3>'+esc(d.label)+'</h3><p>Provisórias, confirmadas e realizadas contam uma vez. A espera não ocupa cota. Liberar uma vaga não admite automaticamente um pedido.</p><form data-quota-form="CONFIGURE" class="readonly-form"><h3>Limites por eixo</h3>';
      d.limits.forEach(function(v){html+='<label>'+esc(v.label)+'<input type="number" name="limit_'+esc(v.axisId)+'" min="0" max="180" step="1" required value="'+esc(v.limit)+'"></label><p>'+v.held+' provisória(s); '+v.confirmed+' confirmada(s); '+v.realized+' realizada(s).</p>';});
      html+='<label>Admissão de pedidos em espera<select name="waitAdmissionMode">'+planningOption('DISABLED','Não habilitada',d.waitAdmissionMode==='DISABLED')+planningOption('MANUAL_NEW_ANALYSIS','Decisão da Diretoria com novo prazo de análise',d.waitAdmissionMode==='MANUAL_NEW_ANALYSIS')+'</select></label><p>A configuração inicial deve distribuir o total de obrigações incidentes aprovado para o ciclo. Uma redução posterior preserva as ocupações existentes.</p><label>Fundamento da configuração<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Salvar limites e política</button></form><h3>Pedidos em espera</h3>';
      if(!d.waiting.length)html+='<p>Nenhum pedido nesta página.</p>';
      d.waiting.forEach(function(t){var axis=d.limits.find(function(v){return v.axisId===t.axisId});html+='<section><h4>'+esc(t.title)+'</h4><p>'+esc(t.person)+' — '+esc(axis?axis.label:t.axisId)+'</p><p>Protocolo completo: '+esc(new Date(t.priorityAt).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}))+'</p>';
        if(t.materialityPending)html+='<form data-quota-form="MATERIALITY" data-request-id="'+esc(t.id)+'" class="readonly-form"><p>A natureza da alteração precisa de decisão antes de disputar a cota.</p><label>Natureza da alteração<select name="materiality" required><option value="">Selecione</option><option value="EDITORIAL">Editorial</option><option value="NON_MATERIAL_COMPLEMENT">Complementação sem mudança substancial</option><option value="SUBSTANTIAL">Mudança substancial</option></select></label><label>Fundamento da classificação<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Registrar classificação</button></form>';
        else html+='<form data-quota-form="ADMIT" data-request-id="'+esc(t.id)+'" class="readonly-form"><label>Fundamento da admissão<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit"'+(d.waitAdmissionMode==='DISABLED'?' disabled':'')+'>Admitir para análise</button></form>';
        html+='<details><summary>Resolução de empate</summary><p>Use somente para registrar uma decisão institucional sobre pedidos com a mesma prioridade. O Core confere o empate antes de aceitar.</p><form data-quota-form="RESOLVE" data-request-id="'+esc(t.id)+'" class="readonly-form"><label>Fundamento do desempate<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Registrar precedência deste pedido</button></form></details></section>';
      });
      if(d.nextCursor)html+='<button type="button" data-quota-more>Próximos pedidos</button>';abrirModalBase('Cotas e fila temática',html);
      document.querySelector('[data-quota-back]').onclick=function(){abrirPlanejamento(cycleId)};var more=document.querySelector('[data-quota-more]');if(more)more.onclick=function(){abrirCotas(cycleId,d.nextCursor)};
    }).catch(function(e){if(generation===geracaoModal_)abrirModalBase('Cotas e fila temática','<p>'+ui.escaparHtml(e.message)+'</p>')});
  }
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form.matches('[data-quota-form]'))return;event.preventDefault();var d=quotaData,fd=new FormData(form),action=form.dataset.quotaForm,generation=geracaoModal_,payload={action:action,cycleId:d.cycleId,cycleRevision:d.cycleRevision,reason:String(fd.get('reason'))};
    if(action==='CONFIGURE'){payload.waitAdmissionMode=String(fd.get('waitAdmissionMode'));payload.limits=d.limits.map(function(v){return {axisId:v.axisId,revision:v.revision,limit:Number(fd.get('limit_'+v.axisId))}});}
    else {var request=d.waiting.find(function(v){return v.id===form.dataset.requestId});if(!request)return;payload.requestId=request.id;payload.requestRevision=request.revision;if(action==='MATERIALITY')payload.materiality=String(fd.get('materiality'));}
    var button=form.querySelector('button[type="submit"]');button.disabled=true;api.apiPost('/admin/apresentacoes/cotas/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível registrar a decisão.');invalidarCacheApresentacoes();abrirCotas(d.cycleId);}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  var themePolicyData=null,themeAxisSequence=0;
  document.addEventListener('portal:act-session-cleared',function(){themePolicyData=null;});
  function eixoFormulario(axis){var i=themeAxisSequence++;function esc(v){return ui.escaparHtml(String(v||''));}return '<fieldset data-theme-axis="'+i+'"><legend>Eixo temático</legend><label>Código<input name="code_'+i+'" value="'+esc(axis.code)+'" pattern="[A-Za-z][A-Za-z0-9_-]{0,31}" required></label><label>Nome<input name="label_'+i+'" value="'+esc(axis.label)+'" maxlength="120" required></label><label>Descrição<textarea name="description_'+i+'" maxlength="2000">'+esc(axis.description)+'</textarea></label><button type="button" class="secondary-button" data-remove-axis>Remover eixo</button></fieldset>';}
  function abrirRegrasTematicas(cycleId){
    abrirModalBase('Temas, eixos e prazo de análise','<p>Carregando configurações...</p>');var generation=geracaoModal_;
    api.apiGet('/admin/apresentacoes/regras',{cycleId:cycleId}).then(function(answer){
      if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível consultar as regras.');var d=answer.data;themePolicyData=d;themeAxisSequence=0;
      function esc(v){return ui.escaparHtml(String(v||''));}var clock=d.analysisClock||{unit:'',amount:'',dayRule:'',pauseDayRule:''},html='<button type="button" class="secondary-button" data-theme-policies-back>Voltar ao ciclo</button><h3>'+esc(d.label)+'</h3>';
      if(!d.editable)html+='<p>As definições estruturais deste ciclo já estão em uso. A manutenção abaixo está disponível durante o planejamento de ciclos em rascunho.</p>';
      html+='<form data-theme-policies-form class="readonly-form"><fieldset'+(!d.editable?' disabled':'')+'><legend>Definições temáticas</legend><div data-theme-axis-list>'+d.axes.map(eixoFormulario).join('')+'</div><button type="button" class="secondary-button" data-add-theme-axis>Adicionar eixo</button><label>Prazo de análise<input type="number" min="1" max="366" name="amount" required value="'+esc(clock.amount)+'"></label><label>Unidade do prazo<select name="unit" required><option value="">Selecione</option>'+planningOption('HOURS','Horas',clock.unit==='HOURS')+planningOption('DAYS','Dias civis',clock.unit==='DAYS')+'</select></label><label>Contagem em dias<select name="dayRule"><option value="">Não aplicável a horas</option>'+planningOption('CIVIL_END_INCLUSIVE','Até o encerramento do dia civil',clock.dayRule==='CIVIL_END_INCLUSIVE')+'</select></label><label>Pausa em dias<select name="pauseDayRule"><option value="">Não aplicável a horas</option>'+planningOption('PRESERVE_REMAINING_CIVIL_DAYS','Preservar os dias civis restantes',clock.pauseDayRule==='PRESERVE_REMAINING_CIVIL_DAYS')+'</select></label><label>Guia e critérios de compatibilidade<textarea name="compatibilityGuide" required maxlength="4000">'+esc(d.compatibilityGuide)+'</textarea></label><label>Vigência da revisão<input name="effectiveFrom" type="datetime-local" step="1" required></label><p>Horário de Cuiabá. Após a vigência, ative a revisão na configuração do ciclo.</p><label>Fundamento da aprovação<textarea name="reason" required maxlength="2000"></textarea></label><button type="submit">Registrar definições aprovadas</button></fieldset></form>';
      abrirModalBase('Temas, eixos e prazo de análise',html);document.querySelector('[data-theme-policies-back]').onclick=function(){abrirPlanejamento(cycleId)};
      document.querySelector('[data-add-theme-axis]').onclick=function(){var list=document.querySelector('[data-theme-axis-list]');if(list.children.length<12)list.insertAdjacentHTML('beforeend',eixoFormulario({}));};
      document.querySelector('[data-theme-axis-list]').onclick=function(event){var button=event.target.closest('[data-remove-axis]');if(button)button.closest('[data-theme-axis]').remove();};
    }).catch(function(e){if(generation===geracaoModal_)abrirModalBase('Temas, eixos e prazo de análise','<p>'+ui.escaparHtml(e.message)+'</p>')});
  }
  document.addEventListener('submit',function(event){var form=event.target;if(!form.matches('[data-theme-policies-form]'))return;event.preventDefault();var d=themePolicyData,fd=new FormData(form),generation=geracaoModal_,payload={cycleId:d.cycleId,cycleRevision:d.cycleRevision,axes:Array.from(form.querySelectorAll('[data-theme-axis]')).map(function(row){var i=row.dataset.themeAxis;return {code:String(fd.get('code_'+i)),label:String(fd.get('label_'+i)),description:String(fd.get('description_'+i))}}),analysisClock:{unit:String(fd.get('unit')),amount:Number(fd.get('amount')),dayRule:String(fd.get('dayRule')),pauseDayRule:String(fd.get('pauseDayRule'))},compatibilityGuide:String(fd.get('compatibilityGuide')),effectiveFrom:Date.parse(String(fd.get('effectiveFrom'))+'-04:00'),reason:String(fd.get('reason'))};var button=form.querySelector('button[type="submit"]');button.disabled=true;
    api.apiPost('/admin/apresentacoes/regras/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível registrar as regras.');invalidarCacheApresentacoes();abrirPlanejamento(d.cycleId);}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  var deliveryPolicyData=null,deliveryItemSequence=0;
  document.addEventListener('portal:act-session-cleared',function(){deliveryPolicyData=null;});
  function deliveryEsc(v){return ui.escaparHtml(String(v==null?'':v));}
  function deliveryItemRow(item,group){var i=deliveryItemSequence++;return '<fieldset data-delivery-item="'+i+'" data-group="'+group+'"><legend>Item</legend><label>Código<input name="itemCode_'+i+'" value="'+deliveryEsc(item.key||item.itemId)+'" required maxlength="40"></label><label>Descrição<input name="itemLabel_'+i+'" value="'+deliveryEsc(item.label)+'" required maxlength="300"></label><button type="button" class="secondary-button" data-delivery-remove>Remover item</button></fieldset>';}
  function deliveryItemList(items,group,title){return '<h4>'+title+'</h4><div data-delivery-items="'+group+'">'+items.map(function(i){return deliveryItemRow(i,group)}).join('')+'</div><button type="button" class="secondary-button" data-delivery-add="'+group+'">Adicionar item</button>';}
  function abrirDefinicoesEntrega(cycleId,section){
   var title=section==='MATERIAL'?'Materiais e prazos':'Conferência e divulgação';abrirModalBase(title,'<p>Carregando definições...</p>');var generation=geracaoModal_;
   api.apiGet('/admin/apresentacoes/entrega-publicacao',{cycleId:cycleId,section:section}).then(function(answer){
    if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível consultar as definições.');var d=answer.data;deliveryPolicyData=d;deliveryItemSequence=0;
    var html='<button type="button" class="secondary-button" data-delivery-back>Voltar ao ciclo</button><h3>'+deliveryEsc(d.label)+'</h3>';if(!d.editable)html+='<p>Definições estruturais em uso. A manutenção está disponível durante o planejamento do ciclo em rascunho.</p>';
    html+='<form data-delivery-policies-form class="readonly-form"><fieldset'+(!d.editable?' disabled':'')+'><legend>'+title+'</legend>';
    if(section==='PUBLICATION'){
     html+=deliveryItemList(d.checklist,'checklist','Itens da conferência humana');
     html+='<h4>Informações autorizadas para divulgação</h4>';[['title','Título aprovado'],['civilDate','Data da apresentação'],['approvedFormat','Formato aprovado'],['authorizedAxis','Eixo aprovado']].forEach(function(item){html+='<label><input type="checkbox" name="publicFields" value="'+item[0]+'"'+(d.publicFields.includes(item[0])?' checked':'')+'> '+item[1]+'</label>';});
     html+='<p>Registrar esta definição não publica apresentações. Cada divulgação continua exigindo conferência e aprovação.</p>';
    }else{
     html+=deliveryItemList(d.ordinaryItems,'ordinary','Material da apresentação ordinária')+deliveryItemList(d.dynamicItems,'dynamic','Material da dinâmica');
     html+='<label>Meta operacional de envio (horas após realização)<input type="number" name="operatingHours" min="1" max="8760" required value="'+deliveryEsc(d.operatingHours)+'"></label><label>Data final de regularização<input type="date" name="finalCivilDate" required value="'+deliveryEsc(d.finalCivilDate)+'"></label><p>A data final inclui o dia informado no horário de Cuiabá. A meta operacional não prorroga essa data nem cria sanção automática.</p>';
     html+='<label>Destino privado<select name="providerPolicyId" required><option value="">Selecione o destino configurado</option>'+d.providers.map(function(v){return '<option value="'+deliveryEsc(v.id)+'"'+(d.providerPolicyId===v.id?' selected':'')+'>'+deliveryEsc(v.label)+'</option>'}).join('')+'</select></label>';
     html+='<label>Foto da reunião<select name="photoPolicyId"><option value="">Não habilitada</option>'+(d.photoPolicies||[]).map(function(v){return '<option value="'+deliveryEsc(v.id)+'"'+(d.photoPolicyId===v.id?' selected':'')+'>'+deliveryEsc(v.label)+'</option>'}).join('')+'</select></label>';
     if(!d.providers.length)html+='<p>Nenhum destino DEV habilitado. Configure o provider do Core antes de registrar os materiais.</p>';
     html+='<label><input type="checkbox" name="explicitPortalNotice"'+(d.explicitPortalNotice?' checked':'')+'> Autorizar ciência explícita de correção pelo Portal</label><p>O membro precisa confirmar a ciência. Abrir a página não confirma recebimento.</p>';
    }
    html+='<label>Vigência da revisão<input type="datetime-local" name="effectiveFrom" step="1" required></label><p>Horário de Cuiabá. Após a vigência, ative a revisão na configuração do ciclo.</p><label>Fundamento da aprovação<textarea name="reason" maxlength="2000" required></textarea></label><button type="submit">Registrar definições aprovadas</button></fieldset></form>';
    abrirModalBase(title,html);document.querySelector('[data-delivery-back]').onclick=function(){abrirPlanejamento(cycleId)};
    document.querySelector('[data-delivery-policies-form]').addEventListener('click',function(event){var add=event.target.closest('[data-delivery-add]'),remove=event.target.closest('[data-delivery-remove]');if(add){var group=add.dataset.deliveryAdd,list=document.querySelector('[data-delivery-items="'+group+'"]');if(list.children.length<12)list.insertAdjacentHTML('beforeend',deliveryItemRow({},group));}if(remove)remove.closest('[data-delivery-item]').remove();});
   }).catch(function(e){if(generation===geracaoModal_)abrirModalBase(title,'<p>'+deliveryEsc(e.message)+'</p>')});
  }
  document.addEventListener('submit',function(event){var form=event.target;if(!form.matches('[data-delivery-policies-form]'))return;event.preventDefault();var d=deliveryPolicyData,fd=new FormData(form),generation=geracaoModal_;
   function items(group){return Array.from(form.querySelectorAll('[data-delivery-item][data-group="'+group+'"]')).map(function(row){var i=row.dataset.deliveryItem,item={label:String(fd.get('itemLabel_'+i))};item[group==='checklist'?'key':'itemId']=String(fd.get('itemCode_'+i));return item;});}
   var payload={cycleId:d.cycleId,cycleRevision:d.cycleRevision,section:d.section,effectiveFrom:Date.parse(String(fd.get('effectiveFrom'))+'-04:00'),reason:String(fd.get('reason'))};if(d.section==='PUBLICATION'){payload.checklist=items('checklist');payload.publicFields=fd.getAll('publicFields');}else{payload.ordinaryItems=items('ordinary');payload.dynamicItems=items('dynamic');payload.operatingHours=Number(fd.get('operatingHours'));payload.finalCivilDate=String(fd.get('finalCivilDate'));payload.providerPolicyId=String(fd.get('providerPolicyId'));payload.photoPolicyId=String(fd.get('photoPolicyId')||'');payload.explicitPortalNotice=fd.get('explicitPortalNotice')==='on';}
   var button=form.querySelector('button[type="submit"]');button.disabled=true;api.apiPost('/admin/apresentacoes/entrega-publicacao/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível registrar as definições.');invalidarCacheApresentacoes();abrirPlanejamento(d.cycleId);}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  function editarSessaoPlanejamento(id){
    var d=planningData,s=id?d.sessions.find(function(v){return v.id===id}):{id:'',revision:0,activityId:'',capacity:1,destination:'ORDINARY'};if(!s)return;
    var activities=d.activities.filter(function(a){return a.id===s.activityId||!a.sessionId});
    document.getElementById('planning-session-editor').innerHTML='<form data-planning-form="SESSION" class="readonly-form"><h3>Configurar sessão</h3><input type="hidden" name="sessionId" value="'+ui.escaparHtml(s.id)+'"><label>Atividade<select name="activityId" required>'+activities.map(function(a){return planningOption(a.id,a.date+' — '+a.title,a.id===s.activityId)}).join('')+'</select></label><label>Capacidade<select name="capacity">'+[1,2].map(function(n){return planningOption(String(n),n===1?'1 apresentação':'2 apresentações',n===s.capacity)}).join('')+'</select></label><label>Destinação<select name="destination">'+[['ORDINARY','Ordinária'],['EXCLUSIVE','Exclusiva'],['RESERVE','Reserva administrativa'],['BLOCKED','Bloqueada'],['CANCELLED','Cancelada']].map(function(v){return planningOption(v[0],v[1],v[0]===s.destination)}).join('')+'</select></label><label>Motivo da decisão<textarea name="reason" required maxlength="2000"></textarea></label><p>A data vem da atividade. Capacidade e direitos existentes serão conferidos pelo Core.</p><button type="submit">Salvar sessão</button></form>';
  }
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form.matches('[data-planning-form]'))return;event.preventDefault();
    var data=new FormData(form),kind=form.dataset.planningForm,payload={kind:kind,reason:String(data.get('reason')||'')},cycle=planningCycle,generation=geracaoModal_;
    if(kind==='CYCLE')Object.assign(payload,{label:String(data.get('label')),start:String(data.get('start')),end:String(data.get('end')),policyId:String(data.get('policyId'))});
    else if(kind==='CAPACITY'){Object.assign(payload,{cycleId:planningCycle,cycleRevision:planningData.cycle.revision});}
    else if(kind==='PREAGENDA'){var item=planningData.preagenda.find(function(v){return v.presentationId===form.dataset.presentationId});if(!item||!item.canRecognize)return;Object.assign(payload,{activityId:item.activityId,activityRevision:item.activityRevision,presentationId:item.presentationId,presentationRevision:item.presentationRevision});}
    else if(kind==='CONTINUITY'){var item=planningData.continuity.find(function(v){return v.presentationId===form.dataset.presentationId}),unit=item&&item.units.find(function(u){return u.id===String(data.get('unitId'))});if(!item||!unit||!item.canConnect)return;Object.assign(payload,{activityId:item.activityId,activityRevision:item.activityRevision,presentationId:item.presentationId,presentationRevision:item.presentationRevision,unitId:unit.id,unitRevision:unit.revision});}
    else{var id=String(data.get('sessionId')),s=planningData.sessions.find(function(v){return v.id===id}),activity=planningData.activities.find(function(v){return v.id===String(data.get('activityId'))});if(!activity)return;Object.assign(payload,{cycleId:cycle,cycleRevision:planningData.cycle.revision,sessionId:id,sessionRevision:s?s.revision:0,activityId:activity.id,activityRevision:activity.revision,capacity:Number(data.get('capacity')),destination:String(data.get('destination'))});}
    var button=form.querySelector('button[type="submit"]');button.disabled=true;
    api.apiPost('/admin/apresentacoes/planejamento/salvar',{payload:JSON.stringify(payload)}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível salvar o planejamento.');invalidarCacheApresentacoes();document.dispatchEvent(new CustomEvent('portal:atividades-atualizadas'));abrirPlanejamento(cycle);}).catch(function(e){if(generation===geracaoModal_){var feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.textContent=e.message;form.append(feedback);button.disabled=false;}});
  });
  function abrirFinalizacao(id){
    abrirModalBase('Título final e divulgação','<p>Carregando confirmação e divulgação...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/finalizacao',{idApresentacao:id}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar a divulgação.');var data=answer.data;
      function form(action){return '<form class="readonly-form" data-portal-v2-form="finalizacao"><input type="hidden" name="idApresentacao" value="'+ui.escaparHtml(id)+'"><input type="hidden" name="unitRevision" value="'+data.unitRevision+'"><input type="hidden" name="presentationRevision" value="'+data.presentationRevision+'"><input type="hidden" name="acao" value="'+action+'">';}
      var html='<p><strong>'+ui.escaparHtml(data.titulo)+'</strong></p><p>Título '+(data.tituloConfirmado?'confirmado.':'ainda não confirmado.')+' Divulgação '+(data.publicada?'publicada.':'não publicada.')+'</p>';
      if(data.podeConfirmarTitulo)html+=form('TITULO')+'<label>Título definitivo<input name="titulo" required maxlength="240" value="'+ui.escaparHtml(data.titulo)+'"></label><p>A confirmação exige antecedência mínima de '+data.antecedenciaTitulo+' dias. Alterações posteriores exigem nova conferência.</p><button type="submit">Confirmar título definitivo</button></form>';
      if(data.board){html+='<h3>Conferência para divulgação</h3><p>'+(data.conferenciaAtual?'Conferência atual válida.':'A divulgação exige conferência válida dos dados atuais.')+'</p>';if(!data.checklist.length)html+='<p>Os itens de conferência ainda não foram configurados para este ciclo.</p>';if(data.podeConferir)html+=form('CONFERIR')+data.checklist.map(function(item){return '<label><input type="checkbox" required data-check-key="'+ui.escaparHtml(item.key)+'">'+ui.escaparHtml(item.label)+'</label>';}).join('')+'<button type="submit">Registrar conferência</button></form>';if(data.podePublicar&&!data.publicada)html+=form('PUBLICAR')+'<p>Serão divulgados somente os campos autorizados na configuração do ciclo.</p><button type="submit">Publicar divulgação</button></form>';if(data.podeRetirar)html+=form('RETIRAR')+'<label>Motivo da retirada<textarea name="motivo" required maxlength="2000"></textarea></label><button type="submit">Retirar divulgação</button></form>';}
      abrirModalBase('Título final e divulgação',html);
    }).catch(function(error){if(generation===geracaoModal_)abrirModalBase('Título final e divulgação','<p>'+ui.escaparHtml(error.message)+'</p>');});
  }
  function abrirAgendaApresentacao(id,cursor){
    abrirModalBase('Agenda da apresentação','<p>Carregando sessões e atribuições...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/agenda',Object.assign({idApresentacao:id},cursor?{historyCursor:cursor}:{})).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar a agenda.');var data=answer.data,available=data.sessoes.filter(function(s){return s.disponivel}),current=data.atribuicaoAtual&&data.sessoes.find(function(s){return s.id===data.atribuicaoAtual.sessionId});
      function day(value){return value?value.split('-').reverse().join('/'):'Data não registrada nesta versão';}
      function hidden(action){return '<input type="hidden" name="idApresentacao" value="'+ui.escaparHtml(id)+'"><input type="hidden" name="unitRevision" value="'+data.unitRevision+'"><input type="hidden" name="acao" value="'+action+'">';}
      var html='<p>'+ (current?'Data atual: <strong>'+ui.escaparHtml(day(current.data))+'</strong> — '+ui.escaparHtml(current.titulo):'Sem data atribuída.')+'</p><p>Antecedência mínima para uma nova data: '+data.antecedenciaMinima+' dias.</p>';
      if(data.podeAgendar&&available.length)html+='<form class="readonly-form" data-portal-v2-form="agenda">'+hidden('AGENDAR')+'<label>Sessão<select name="sessionId" required><option value="">Selecione</option>'+available.map(function(s){return '<option value="'+ui.escaparHtml(s.id)+'" data-revision="'+s.revision+'">'+ui.escaparHtml(day(s.data)+' — '+s.titulo+' ('+s.ocupadas+'/'+s.capacidade+')')+'</option>';}).join('')+'</select></label><p>A disponibilidade será conferida novamente ao confirmar.</p><button type="submit">Confirmar agendamento</button></form>';
      else if(data.podeAgendar)html+='<p>Nenhuma sessão elegível está disponível para esta escolha.</p>';
      else if(data.modo==='MEMBER_SELF_SCHEDULE'&&!data.janelaAgendamento.open&&!data.atribuicaoAtual)html+='<p>O período de agendamento pelo membro '+(data.janelaAgendamento.configured?'está fechado.':'ainda não foi configurado.')+'</p>';
      if(data.podeCancelar)html+='<form class="readonly-form" data-portal-v2-form="agenda">'+hidden('CANCELAR')+'<label>Motivo do cancelamento<textarea name="motivo" required maxlength="2000"></textarea></label><p>O cancelamento libera esta data e encerra eventual dinâmica ativa antes da realização. Tema, materiais e obrigação permanecem registrados.</p><button type="submit">Confirmar cancelamento da data</button></form>';
      html+=botaoAcao('reorganizacao',id,'Remarcação / troca','secondary');html+='<h3>Histórico de atribuições</h3>'+(data.historico.length?'<ul>'+data.historico.map(function(h){return '<li>'+ui.escaparHtml(day(h.data)+' — '+({RELEASED:'Cancelada',CONFIRMED:'Confirmada',ACTIVE:'Ativa'}[h.status]||h.status))+'</li>';}).join('')+'</ul>':'<p>Nenhuma atribuição registrada.</p>');
      if(data.proximaPagina)html+='<button type="button" id="agenda-historico-anterior">Histórico anterior</button>';abrirModalBase('Agenda da apresentação',html);var more=document.getElementById('agenda-historico-anterior');if(more)more.addEventListener('click',function(){abrirAgendaApresentacao(id,data.proximaPagina)});
    }).catch(function(error){if(generation===geracaoModal_)abrirModalBase('Agenda da apresentação','<p>'+ui.escaparHtml(error.message)+'</p>')});
  }
  function abrirDinamica(id){
    abrirModalBase('Dinâmica da apresentação','<p>Carregando proposta e histórico...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/dinamica',{idApresentacao:id}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar a dinâmica.');var data=answer.data,history=data.historico||[],labels=['Tema ou título provisório','Eixo principal','Objetivo','Conteúdo técnico','Metodologia','Participação dos presentes','Duração prevista','Recursos necessários','Resultado formativo esperado'],states={OPEN:'Aguardando decisão',CORRECTION_REQUESTED:'Ajustes solicitados',DECIDED:'Analisada'},decisions={APPROVE:'Aprovada',REJECT:'Não autorizada',REQUEST_CORRECTION:'Ajustes solicitados'},occupancies={ACTIVE:'Dinâmica aprovada',RELEASED:'Modalidade cancelada antes da realização',REALIZED_HISTORY:'Dinâmica realizada — registro histórico'};
      function hidden(action){return '<input type="hidden" name="idApresentacao" value="'+ui.escaparHtml(id)+'"><input type="hidden" name="unitRevision" value="'+data.unitRevision+'"><input type="hidden" name="acao" value="'+action+'">';}
      var html=(data.ocupacao?'<p><strong>'+ui.escaparHtml(occupancies[data.ocupacao]||data.ocupacao)+'</strong></p>':'')+(data.motivoCancelamento?'<p>'+ui.escaparHtml(data.motivoCancelamento)+'</p>':'')+(history.length?'<ol>'+history.map(function(h){return '<li><strong>'+ui.escaparHtml(decisions[h.decisao]||states[h.estado]||h.estado)+'</strong><p>'+ui.escaparHtml(h.motivo||'')+'</p><dl>'+labels.map(function(label,i){return '<dt>'+ui.escaparHtml(label)+'</dt><dd>'+ui.escaparHtml(h.elementos[i]||'')+'</dd>'}).join('')+'</dl></li>';}).join('')+'</ol>':'<p>Nenhuma proposta registrada.</p>');
      if(!data.habilitada)html+='<p>Novas solicitações e aprovações estão desabilitadas para este ciclo.</p>';
      if(data.podeSolicitar)html+='<form class="readonly-form" data-portal-v2-form="dinamica">'+hidden('SOLICITAR')+labels.map(function(label,i){return '<label>'+ui.escaparHtml(label)+'<textarea name="elemento'+i+'" required maxlength="2000">'+ui.escaparHtml(history[0]&&history[0].elementos[i]||'')+'</textarea></label>'}).join('')+'<button type="submit">Enviar proposta de dinâmica</button></form>';
      if(data.podeDecidir)html+='<form class="readonly-form" data-portal-v2-form="dinamica">'+hidden('DECIDIR')+'<input type="hidden" name="proposalRevision" value="'+data.proposalRevision+'"><label>Decisão<select name="decisao" required><option value="">Selecione</option><option value="APPROVE"'+(data.materialConfigurado?'':' disabled')+'>Aprovar dinâmica</option><option value="REQUEST_CORRECTION">Solicitar ajustes</option><option value="REJECT">Não autorizar</option></select></label><p>Materiais obrigatórios na aprovação:</p><ul>'+data.materiaisObrigatorios.map(function(v){return '<li>'+ui.escaparHtml(v.rotulo)+'</li>'}).join('')+'</ul>'+(data.materialConfigurado?'<label><input type="checkbox" name="confirmouMateriais">Confirmo os materiais obrigatórios indicados para a aprovação.</label>':'<p>Configure os materiais deste ciclo antes de aprovar a modalidade.</p>')+'<label>Fundamento da decisão<textarea name="motivo" required maxlength="2000"></textarea></label><button type="submit">Registrar decisão sobre dinâmica</button></form>';
      if(data.podeCancelar)html+='<form class="readonly-form" data-portal-v2-form="dinamica">'+hidden(data.podeRevogar?'REVOGAR':'DESISTIR')+'<label>Motivo do cancelamento da modalidade<textarea name="motivo" required maxlength="2000"></textarea></label><p>O cancelamento libera a ocupação dinâmica e preserva a apresentação e o tema.</p><button type="submit">Cancelar modalidade dinâmica</button></form>';
      atualizarModalConteudo(html+'<button type="button" class="secondary-button" data-portal-v2-action="fechar-modal">Fechar</button>');
    }).catch(function(error){if(generation===geracaoModal_)atualizarModalConteudo('<p>'+ui.escaparHtml(error.message)+'</p>');});
  }
  function abrirRealizacao(id){
    abrirModalBase('Realização da apresentação','<p>Carregando histórico...</p>');var generation=geracaoModal_;
    api.apiGet('/v2/apresentacoes/realizacao',{idApresentacao:id}).then(function(answer){if(generation!==geracaoModal_)return;if(!answer.ok)throw Error(answer.message||'Não foi possível carregar a realização.');var data=answer.data,history=data.historico||[];
      atualizarModalConteudo((history.length?'<ol>'+history.map(function(v){return '<li>'+ui.escaparHtml(v.dataOcorrencia||'Data não determinada')+'<p>'+ui.escaparHtml(v.fundamento)+'</p></li>';}).join('')+'</ol>':'<p>A realização ainda não foi reconhecida.</p>')+'<form class="readonly-form" data-portal-v2-form="realizacao"><input type="hidden" name="idApresentacao" value="'+ui.escaparHtml(id)+'"><input type="hidden" name="presentationRevision" value="'+data.presentationRevision+'"><label>Data da ocorrência<input type="date" name="dataOcorrencia" required value="'+ui.escaparHtml(history[0]&&history[0].dataOcorrencia||'')+'"></label><label><input type="checkbox" name="conducaoIndividual" required>Confirmo que esta pessoa conduziu sua apresentação.</label><label>Fundamento do reconhecimento ou revisão<textarea name="fundamento" required maxlength="2000"></textarea></label><div class="presentation-card-actions"><button type="submit">'+(history.length?'Registrar revisão':'Reconhecer realização')+'</button><button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Cancelar</button></div></form>');
    }).catch(function(error){if(generation===geracaoModal_)atualizarModalConteudo('<p>'+ui.escaparHtml(error.message)+'</p>');});
  }
  function abrirModalMaterial(id) {
    var item = estado.itensPorId[id];

    if (!item) {
      return;
    }

    abrirModalBase('Slide/material da apresentacao', [
      '<form class="readonly-form" data-portal-v2-form="material">',
      item.canonicalCorrectionNotice ? '<p class="presentation-pendency-text">' + ui.escaparHtml(item.mensagemMaterial || '') + '</p><label><input type="checkbox" name="cienciaCorrecao" required>Li a orientação e o prazo autorizado até ' + ui.escaparHtml(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Cuiaba'}).format(new Date(item.canonicalCorrectionNotice.dueAt))) + '.</label>' : '',
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
    var idApresentacao = validarIdApresentacaoFrontend(id);

    if (!idApresentacao) {
      return;
    }

    abrirModalBase(obterTituloModalRevisao(tipo), [
      '<form class="readonly-form" data-portal-v2-form="revisao" data-tipo-revisao="' + ui.escaparHtml(tipo) + '" data-decisao="' + ui.escaparHtml(decisao) + '" data-observacao-obrigatoria="' + (observacaoObrigatoria ? 'true' : 'false') + '">',
      '<input type="hidden" name="idApresentacao" value="' + ui.escaparHtml(idApresentacao) + '">',
      observacaoObrigatoria ? '<p class="simulation-warning">' + ui.escaparHtml(obterAvisoRevisao(tipo, decisao)) + '</p>' : '',
      tipo === 'material' && decisao === 'SOLICITAR_AJUSTE' && estado.itensPorId[idApresentacao].canonicalMaterialBasis ? '<label>Prazo autorizado para correção (data em Cuiabá)<input type="date" name="prazoCorrecao" required></label><p class="muted-inline">O prazo depende da confirmação de ciência. A solicitação ficará pendente até essa confirmação.</p>' : '',
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

  function abrirModalVisualizarJustificativa(id) {
    var item = estado.itensPorId[id];
    if (!item) return;

    abrirModalBase('Justificativa', [
      '<div class="readonly-justification-detail">',
      '<p><strong>Atividade:</strong> ' + ui.escaparHtml(formatarValor(item.tituloAtividade || item.tituloPublico || item.idAtividade || 'Atividade')) + '</p>',
      item.dataAtividade ? '<p><strong>Data:</strong> ' + ui.escaparHtml(formatarDataCurtaPendencia(item.dataAtividade) || formatarValor(item.dataAtividade)) + '</p>' : '',
      item.statusJustificativa ? '<p><strong>Status:</strong> ' + ui.escaparHtml(formatarValor(item.statusJustificativa)) + '</p>' : '',
      item.motivoCategoria ? '<p><strong>Motivo:</strong> ' + ui.escaparHtml(formatarValor(item.motivoCategoria)) + '</p>' : '',
      item.observacaoPublica ? '<p><strong>Observação:</strong> ' + ui.escaparHtml(formatarValor(item.observacaoPublica)) + '</p>' : '',
      item.mensagemPortal ? '<p>' + ui.escaparHtml(item.mensagemPortal) + '</p>' : '',
      item.canonicalProofAvailable ? '<p>'+linkComprovanteCanonico(item)+'</p>' : '',
      '<div class="presentation-card-actions">',
      '<button class="secondary-button" type="button" data-portal-v2-action="fechar-modal">Fechar</button>',
      '</div>',
      '</div>'
    ].join(''));
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
      '<option value="SIM"'+(item.canonicalProofAvailable||item.possuiDocumentoComprobatorio==='SIM'?' selected':'')+'>Sim</option>',
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
      (item||{}).canonicalProofAvailable?'<p>'+linkComprovanteCanonico(item)+'</p>':'',
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

  function carregarEixos(idApresentacao) {
    // A form needs only the canonical axes of this presentation's cycle.
    // Do not reuse another cycle's catalogue or an in-flight global request.
    if (idApresentacao) return api.apiGet('/v2/apresentacoes/eixos', {idApresentacao:idApresentacao}).then(function(resposta) {
      if (!resposta.ok) throw new Error(resposta.message || 'Nao foi possivel carregar eixos tematicos.');
      return extrairListaEixos(resposta.data || {});
    });
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
    var idHidden = String(dados.get('idApresentacao') || '').trim();
    var idForm = String(form && form.getAttribute('data-id-apresentacao-modal') || '').trim();
    var idApresentacao;

    if (!ID_APRESENTACAO_TECNICO_PATTERN.test(idHidden) || idHidden !== idForm) {
      validarIdApresentacaoFrontend('', form);
      return;
    }

    idApresentacao = validarIdApresentacaoFrontend(idHidden, form);

    if (!idApresentacao) {
      return;
    }

    executarPostApresentacao('/v2/apresentacoes/titulo-eixo/revisar', {
      idApresentacao: idApresentacao,
      decisao: 'EDITAR_E_APROVAR',
      materialidade: dados.get('materialidade'),
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
        var source=estado.itensPorId[dados.get('idApresentacao')],notice=source&&source.canonicalCorrectionNotice?{correctionNotice:Object.assign({},source.canonicalCorrectionNotice,{acknowledged:dados.get('cienciaCorrecao')==='on'})}:{};
        return executarPostApresentacao('/v2/apresentacoes/material/registrar', Object.assign(notice, {
          idApresentacao: dados.get('idApresentacao'),
          nomeArquivoOriginal: arquivo.name,
          mimeType: arquivo.type || '',
          conteudoBase64: conteudoBase64,
          observacoes: dados.get('observacoes')
        }), { loadingAtivo: true, form: form, acao: 'ENVIAR_MATERIAL' });
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
    var idApresentacao = validarIdApresentacaoFrontend(dados.get('idApresentacao'), form);
    var tipo = form.getAttribute('data-tipo-revisao');
    var decisao = form.getAttribute('data-decisao');
    var observacaoObrigatoria = form.getAttribute('data-observacao-obrigatoria') === 'true';
    var observacaoPublica = String(dados.get('observacaoPublica') || '').trim();
    var observacaoInterna = String(dados.get('observacaoInterna') || '').trim();

    if (!idApresentacao) {
      return;
    }

    if (observacaoObrigatoria && !observacaoPublica && !observacaoInterna) {
      mostrarErroModal('Informe uma observacao para concluir esta acao.', form, {
        observacaoPublica: 'Informe a orientacao que sera exibida ao membro.'
      });
      return;
    }

    if (tipo === 'titulo') {
      enviarRevisaoTitulo(
        idApresentacao,
        decisao,
        observacaoPublica,
        observacaoInterna,
        form
      );
      return;
    }

    if (tipo === 'foto') {
      enviarRevisaoFotoReuniao(
        idApresentacao,
        decisao,
        observacaoPublica,
        observacaoInterna,
        form
      );
      return;
    }

    enviarRevisaoMaterial(
      idApresentacao,
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

    if (possuiDocumento === 'SIM' && (!arquivo || !arquivo.name) && !linkDocumento && !form.querySelector('[data-portal-v2-action="abrir-comprovante-canonico"]')) {
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

        return executarPostJustificativa('/v2/justificativas/enviar', payload, form);
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
    }, form);
  }

  function enviarRevisaoTitulo(id, decisao, observacaoPublica, observacaoInterna, form) {
    var idApresentacao = validarIdApresentacaoFrontend(id, form);
    var route = decisao === 'REPROVAR'
      ? '/v2/apresentacoes/titulo-eixo/reprovar'
      : '/v2/apresentacoes/titulo-eixo/revisar';

    if (!idApresentacao) {
      return;
    }

    executarPostApresentacao(route, {
      idApresentacao: idApresentacao,
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
    var terms=decisao==='SOLICITAR_AJUSTE'&&form&&estado.itensPorId[id].canonicalMaterialBasis?{prazoCorrecao:new FormData(form).get('prazoCorrecao')}:{};
    executarPostApresentacao('/v2/apresentacoes/material/revisar', Object.assign(terms, {
      idApresentacao: id,
      decisao: decisao,
      observacaoPublica: observacaoPublica || '',
      observacaoInterna: observacaoInterna || ''
    }), { form: form, acao: 'REVISAR_MATERIAL' });
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

  function criarRequestIdApresentacaoDev_() {
    return 'GEAPA-REQ-' + Date.now() + '-' +
      Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  function criarTimingApresentacaoDev_(acao, requestId) {
    if (String(portalConfig.ENVIRONMENT || '').trim().toUpperCase() !== 'DEV') {
      return null;
    }
    return {
      requestId: String(requestId || '').slice(0, 120),
      action: String(acao || '').slice(0, 80),
      marks: []
    };
  }

  function marcarTimingApresentacaoDev_(timing, code, label) {
    if (!timing) return;
    timing.marks.push({
      code: String(code || '').slice(0, 8),
      label: String(label || '').slice(0, 80),
      at: new Date().toISOString()
    });
  }

  function validarIdApresentacaoFrontend(valor, form) {
    var idApresentacao = String(valor || '').trim();
    var mensagem;

    if (ID_APRESENTACAO_TECNICO_PATTERN.test(idApresentacao)) {
      return idApresentacao;
    }

    mensagem = 'Nao foi possivel identificar a apresentacao. Feche esta janela e tente novamente pela acao exibida no card.';

    if (form) {
      mostrarErroModal(mensagem, form, {
        idApresentacao: 'Identificador tecnico da apresentacao ausente ou invalido.'
      });
    } else {
      ui.mostrarToast({
        type: 'error',
        title: 'Apresentacao nao identificada',
        message: mensagem
      });
    }

    return '';
  }

  function importarTimingTransporteApresentacaoDev_(timing, resposta) {
    if (!timing) return;
    var transport = resposta && resposta.meta &&
      resposta.meta.devClientTransportTiming;
    (transport && transport.marks || []).forEach(function(mark) {
      if (['F1', 'F2', 'F3', 'FT'].indexOf(String(mark.code || '')) < 0) return;
      timing.marks.push({
        code: String(mark.code || '').slice(0, 8),
        label: String(mark.label || '').slice(0, 80),
        at: String(mark.at || '')
      });
    });
  }

  function publicarTimingApresentacaoDev_(timing) {
    if (!timing || !global.console || typeof global.console.info !== 'function') return;
    var snapshot = {
      requestId: timing.requestId,
      action: timing.action,
      marks: timing.marks.slice(),
      backend: timing.backend || null
    };
    global.__PortalGeapaDevPresentationTimings =
      global.__PortalGeapaDevPresentationTimings || [];
    global.__PortalGeapaDevPresentationTimings.push(snapshot);
    if (global.__PortalGeapaDevPresentationTimings.length > 20) {
      global.__PortalGeapaDevPresentationTimings.shift();
    }
    global.console.info(
      'GEAPA-PRESENTATIONS-DEV-TIMING ' + JSON.stringify(snapshot)
    );
  }

  function obterDecisionTypeApresentacao_(payload) {
    var decision = String(payload && payload.decisao || '').trim().toUpperCase();
    var map = {
      APROVAR: 'APPROVE',
      REPROVAR: 'REJECT',
      SOLICITAR_AJUSTE: 'REQUEST_ADJUSTMENT',
      EDITAR_E_APROVAR: 'EDIT_APPROVE'
    };
    return map[decision] || '';
  }

  function hashAssinaturaDecisaoApresentacao_(value) {
    var source = String(value || '');
    var hash = 0;
    for (var i = 0; i < source.length; i++) {
      hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function chaveDecisaoApresentacao_(route, payload, decisionType) {
    if (!decisionType) return '';
    var source = payload || {};
    return [
      String(portalConfig.ENVIRONMENT || '').trim().toUpperCase(),
      route,
      String(source.idApresentacao || '').trim(),
      decisionType,
      hashAssinaturaDecisaoApresentacao_(JSON.stringify({
        titulo: source.tituloApresentacao || '',
        eixoPrincipal: source.eixoTematicoPrincipal || '',
        eixoSecundario: source.eixoTematicoSecundario || '',
        observacaoPublica: source.observacaoPublica || '',
        observacaoInterna: source.observacaoInterna || ''
      }))
    ].join('|');
  }

  function contextoDiarioDecisoesApresentacoesDev_() {
    var environment = String(portalConfig.ENVIRONMENT || '').trim().toUpperCase();
    var firebaseAuth = global.PortalGeapaFirebaseAuth;
    var firebaseUser;
    var firebaseUid;
    var browserSessionNonce;
    var actorSecret = '';
    if (environment !== 'DEV' || !decisionJournal) return null;
    try {
      firebaseUser = firebaseAuth && typeof firebaseAuth.getCurrentUser === 'function'
        ? firebaseAuth.getCurrentUser()
        : null;
      firebaseUid = String(firebaseUser && firebaseUser.uid || '').trim();
      browserSessionNonce = obterNonceSessaoDiarioDecisoesApresentacoesDev_();
      actorSecret = firebaseUid && browserSessionNonce
        ? 'firebase-uid:' + firebaseUid + '\u0000browser-session:' + browserSessionNonce
        : '';
    } catch (_error) {
      actorSecret = '';
    }
    return actorSecret.length >= 16
      ? { environment: environment, actorSecret: actorSecret }
      : null;
  }

  function obterNonceSessaoDiarioDecisoesApresentacoesDev_() {
    var storage = global.sessionStorage;
    var cryptoApi = global.crypto;
    var nonce;
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function') {
      return '';
    }
    nonce = String(storage.getItem(DECISION_JOURNAL_BROWSER_SESSION_KEY) || '').trim();
    if (/^[A-Za-z0-9_-]{16,120}$/.test(nonce)) {
      return nonce;
    }
    if (!cryptoApi || typeof cryptoApi.randomUUID !== 'function') {
      return '';
    }
    nonce = String(cryptoApi.randomUUID() || '').replace(/-/g, '');
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(nonce)) {
      return '';
    }
    storage.setItem(DECISION_JOURNAL_BROWSER_SESSION_KEY, nonce);
    return nonce;
  }

  function erroDiarioDecisaoApresentacao_(code, message, details) {
    var error = new Error(message || code);
    error.code = code;
    error.details = details || {};
    return error;
  }

  function removerPendenciaDiarioDecisaoApresentacao_(entry) {
    if (!entry || !decisionJournal) return false;
    try {
      return decisionJournal.remove(entry);
    } catch (_error) {
      return false;
    }
  }

  function limparRequestIdDecisaoApresentacao_(key, entry) {
    if (key) delete requestIdsDecisoesPendentes[key];
    removerPendenciaDiarioDecisaoApresentacao_(entry);
  }

  function aplicarReconciliacaoDiarioDecisaoApresentacao_(entry, response) {
    if (!entry || !decisionJournal) return null;
    return decisionJournal.applyReconciliation(entry, response);
  }

  function consultarPendenciaDiarioDecisaoApresentacao_(entry) {
    if (!entry || !api || typeof api.reconcilePresentationDecision !== 'function') {
      return Promise.reject(erroDiarioDecisaoApresentacao_(
        'APRESENTACAO_DECISAO_DIARIO_RECONCILIACAO_INDISPONIVEL',
        'Nao foi possivel reconciliar a decisao pendente com seguranca.'
      ));
    }
    return api.reconcilePresentationDecision({
      requestId: entry.requestId,
      idApresentacao: entry.presentationId,
      decisionType: entry.decisionType
    }, { maxAttempts: 3 }).then(function aplicar(response) {
      if (!response || response.ok !== true || !response.data) {
        throw erroDiarioDecisaoApresentacao_(
          'APRESENTACAO_DECISAO_DIARIO_RECONCILIACAO_FALHOU',
          'O estado da decisao pendente nao pode ser confirmado. Nenhum novo envio foi iniciado.'
        );
      }
      return {
        response: response,
        result: aplicarReconciliacaoDiarioDecisaoApresentacao_(entry, response)
      };
    });
  }

  function abandonarPendenciaExpiradaDecisaoApresentacao_(entry) {
    var confirmed = typeof global.confirm === 'function' && global.confirm(
      'Esta pendencia local expirou e continua sem confirmacao do servidor. ' +
      'Deseja abandona-la? Esta acao nao envia uma nova decisao. Para iniciar ' +
      'outra operacao sera necessario revisar os dados e clicar novamente.'
    );
    if (!confirmed) {
      throw erroDiarioDecisaoApresentacao_(
        'APRESENTACAO_DECISAO_DIARIO_ABANDONO_CANCELADO',
        'A pendencia foi preservada. Nenhuma nova decisao foi enviada.'
      );
    }
    decisionJournal.abandonExpired(entry, {
      reconciliationState: 'INDETERMINATE',
      userConfirmed: true
    });
    return {
      stop: true,
      code: 'APRESENTACAO_DECISAO_DIARIO_ABANDONADO',
      message: 'Pendencia local abandonada. Revise os dados e envie novamente apenas se desejar criar uma nova operacao.'
    };
  }

  function resolverPendenciaExistenteDecisaoApresentacao_(resolution) {
    return consultarPendenciaDiarioDecisaoApresentacao_(resolution.entry)
      .then(function resolved(reconciliation) {
        var state = reconciliation.result && reconciliation.result.state;
        if (state === 'COMPLETED') {
          return {
            stop: true,
            recovered: true,
            code: 'APRESENTACAO_DECISAO_RECONCILIADA',
            message: 'A operacao anterior foi concluida e confirmada pelo requestId.',
            response: reconciliation.response
          };
        }
        if (state === 'PROCESSING') {
          return {
            stop: true,
            code: 'APRESENTACAO_DECISAO_EM_PROCESSAMENTO',
            message: 'A decisao continua em processamento. Nenhum novo envio foi iniciado.'
          };
        }
        if (resolution.expired === true || reconciliation.result.expired === true) {
          return abandonarPendenciaExpiradaDecisaoApresentacao_(
            reconciliation.result.entry || resolution.entry
          );
        }
        if (resolution.payloadMatches !== true) {
          return {
            stop: true,
            code: 'APRESENTACAO_DECISAO_DIARIO_PAYLOAD_DIVERGENTE',
            message: 'Existe uma decisao pendente para esta apresentacao com outro conteudo. O requestId nao foi reutilizado e nenhum novo ID foi criado.'
          };
        }
        return resolution;
      });
  }

  function requestIdDecisaoApresentacao_(key, payload, decisionType) {
    var context = contextoDiarioDecisoesApresentacoesDev_();
    var environment = String(portalConfig.ENVIRONMENT || '').trim().toUpperCase();
    if (!decisionType || environment !== 'DEV' || !decisionJournal) {
      if (!key) return Promise.resolve({ requestId: criarRequestIdApresentacaoDev_() });
      if (!requestIdsDecisoesPendentes[key]) {
        requestIdsDecisoesPendentes[key] = criarRequestIdApresentacaoDev_();
      }
      return Promise.resolve({ requestId: requestIdsDecisoesPendentes[key] });
    }
    if (!context) {
      return Promise.reject(erroDiarioDecisaoApresentacao_(
        'APRESENTACAO_DECISAO_DIARIO_ESCOPO_ATOR_AUSENTE',
        'A sessao nao esta pronta para persistir a decisao com seguranca. Nenhum envio foi iniciado.'
      ));
    }
    return decisionJournal.resolveOrCreate({
      environment: context.environment,
      actorSecret: context.actorSecret,
      presentationId: payload && payload.idApresentacao,
      decisionType: decisionType,
      payload: payload || {},
      createRequestId: criarRequestIdApresentacaoDev_
    }).then(function resolved(resolution) {
      requestIdsDecisoesPendentes[key] = resolution.requestId;
      return resolution.created
        ? resolution
        : resolverPendenciaExistenteDecisaoApresentacao_(resolution);
    });
  }

  function publicarEstadoRestauracaoDiarioDevLocal_(data) {
    if (!diagnosticoModalDevLocalAtivo_() || !global.document ||
        !global.document.documentElement) return;
    global.document.documentElement.setAttribute(
      'data-geapa-presentation-decision-journal',
      JSON.stringify(data || {})
    );
  }

  function publicarEstadoDiagnosticoDiarioDevLocal_(data) {
    if (!global.document || !global.document.documentElement) return;
    global.document.documentElement.setAttribute(
      'data-geapa-presentation-decision-journal-local-test',
      JSON.stringify(data || {})
    );
  }

  function tratarPendenciaRestauradaDecisaoApresentacao_(entry) {
    if (entry.technicalState === 'LOCAL_TEST') {
      return Promise.resolve({ state: 'LOCAL_TEST', entry: entry });
    }
    return consultarPendenciaDiarioDecisaoApresentacao_(entry)
      .then(function restored(reconciliation) {
        var state = reconciliation.result && reconciliation.result.state;
        if (state === 'COMPLETED') {
          estado.feedbackPersistente = {
            idRota: estado.rotaAtual || 'admin-apresentacoes',
            type: 'success',
            title: 'Operacao concluida',
            message: 'Uma decisao pendente foi confirmada pelo requestId e recuperada com sucesso.'
          };
          invalidarCacheApresentacoes();
          ui.mostrarToast({
            type: 'success',
            title: 'Operacao concluida',
            message: 'A decisao foi confirmada pelo requestId. A tela sera atualizada.'
          });
          if (estado.rotaAtual === 'admin-apresentacoes' ||
              estado.rotaAtual === 'minhas-apresentacoes') {
            carregarTela(estado.rotaAtual);
          }
        } else if (state === 'PROCESSING') {
          ui.mostrarToast({
            type: 'warning',
            title: 'Operacao em processamento',
            message: 'Uma decisao anterior continua em processamento. Um novo envio esta bloqueado.'
          });
        } else if (state === 'INDETERMINATE') {
          ui.mostrarToast({
            type: 'warning',
            title: 'Resultado ainda nao confirmado',
            message: reconciliation.result.expired
              ? 'A pendencia expirou e exige abandono explicitamente confirmado antes de uma nova operacao.'
              : 'O mesmo requestId foi preservado para um retry seguro com o mesmo conteudo.'
          });
        }
        return reconciliation.result;
      }).catch(function preserveOnFailure(error) {
        return {
          state: 'RESTORE_ERROR',
          code: error && error.code || 'APRESENTACAO_DECISAO_DIARIO_RESTORE_ERROR'
        };
      });
  }

  function restaurarDiarioDecisoesApresentacoesDev_() {
    var context = contextoDiarioDecisoesApresentacoesDev_();
    if (restauracaoDiarioDecisoesIniciada_ || !decisionJournal ||
        String(portalConfig.ENVIRONMENT || '').trim().toUpperCase() !== 'DEV') {
      return Promise.resolve([]);
    }
    if (!context) {
      restauracaoDiarioDecisoesTentativas_ += 1;
      if (restauracaoDiarioDecisoesTentativas_ <= 15 &&
          typeof global.setTimeout === 'function') {
        global.setTimeout(restaurarDiarioDecisoesApresentacoesDev_, 1000);
      }
      return Promise.resolve([]);
    }
    restauracaoDiarioDecisoesIniciada_ = true;
    return decisionJournal.restore(context).then(function restore(entries) {
      return Promise.all(entries.map(tratarPendenciaRestauradaDecisaoApresentacao_))
        .then(function complete(results) {
          publicarEstadoRestauracaoDiarioDevLocal_({
            restored: entries.length,
            requestIdsPreserved: entries.length,
            states: results.map(function state(result) { return result && result.state || ''; })
          });
          return results;
        });
    }).catch(function restoreFailed(error) {
      publicarEstadoRestauracaoDiarioDevLocal_({
        restored: 0,
        errorCode: error && error.code || 'APRESENTACAO_DECISAO_DIARIO_RESTORE_ERROR'
      });
      return [];
    });
  }

  function registrarDiagnosticoDiarioDecisoesDevLocal_() {
    var environment = String(portalConfig.ENVIRONMENT || '').trim().toUpperCase();
    var hostname = String(global.location && global.location.hostname || '').trim().toLowerCase();
    var local = ['localhost', '127.0.0.1', '::1'].indexOf(hostname) >= 0;
    if (environment !== 'DEV' || !local || !decisionJournal || !global.document) return;
    function executarDiagnostico(actionValue) {
      var action = String(actionValue || '').trim().toUpperCase();
      var context = {
        environment: 'DEV',
        actorSecret: 'GEAPA-LOCAL-DIAGNOSTIC-PRESENTATION-DECISION-JOURNAL-V1'
      };
      var requestId = 'GEAPA-REQ-LOCAL-TEST-PERSIST-0001';
      if (['CREATE', 'INSPECT', 'CLEAR'].indexOf(action) < 0) {
        publicarEstadoDiagnosticoDiarioDevLocal_({ localTest: false, code: 'LOCAL_TEST_INVALID' });
        return;
      }
      decisionJournal.restore(context).then(function current(entries) {
        var existing = entries.filter(function find(entry) { return entry.requestId === requestId; })[0];
        if (action === 'CLEAR') {
          if (existing) decisionJournal.remove(existing);
          return { localTest: true, action: action, present: false, cleared: Boolean(existing) };
        }
        if (action === 'INSPECT' || existing) {
          return {
            localTest: true,
            action: action,
            present: Boolean(existing),
            requestIdRestored: Boolean(existing && existing.requestId === requestId),
            wouldGenerateAnotherRequestId: false
          };
        }
        return decisionJournal.resolveOrCreate({
          environment: context.environment,
          actorSecret: context.actorSecret,
          presentationId: 'APR-2099-1-9999',
          decisionType: 'APPROVE',
          payload: { decisao: 'APROVAR', localSimulation: true },
          technicalState: 'LOCAL_TEST',
          createRequestId: function fixedLocalRequestId() { return requestId; }
        }).then(function created(result) {
          return {
            localTest: true,
            action: action,
            present: true,
            requestIdRestored: result.requestId === requestId,
            wouldGenerateAnotherRequestId: false
          };
        });
      }).then(publicarEstadoDiagnosticoDiarioDevLocal_)
        .catch(function localTestFailed(error) {
          publicarEstadoDiagnosticoDiarioDevLocal_({
            localTest: false,
            code: error && error.code || 'LOCAL_TEST_ERROR'
          });
        });
    }

    global.document.addEventListener('geapa:decision-journal-local-test', function diagnostic(event) {
      executarDiagnostico(event && event.detail && event.detail.action);
    });

    var query = String(global.location && global.location.search || '');
    var queryMatch = query.match(/[?&]geapaJournalTest=(CREATE|INSPECT|CLEAR)(?:&|$)/i);
    if (queryMatch) executarDiagnostico(queryMatch[1]);
  }

  function respostaEhFalhaTransporteApresentacao_(resposta) {
    var code = String(
      resposta && (resposta.code || resposta.errorCode) || ''
    ).trim().toUpperCase();
    return ['API_WRITE_TIMEOUT', 'ERRO_API', 'API_RESPOSTA_INVALIDA'].indexOf(code) >= 0;
  }

  function reconciliarRespostaDecisaoApresentacaoDev_(
    resposta,
    payload,
    decisionType,
    journalEntry
  ) {
    if (!decisionType || !respostaEhFalhaTransporteApresentacao_(resposta) ||
        !api || typeof api.reconcilePresentationDecision !== 'function') {
      return Promise.resolve(resposta);
    }
    return api.reconcilePresentationDecision({
      requestId: payload.requestId,
      idApresentacao: payload.idApresentacao,
      decisionType: decisionType
    }, { maxAttempts: 3 }).then(function(reconciliationResponse) {
      var data = reconciliationResponse && reconciliationResponse.data || {};
      if (reconciliationResponse && reconciliationResponse.ok === true && journalEntry) {
        aplicarReconciliacaoDiarioDecisaoApresentacao_(journalEntry, reconciliationResponse);
      }
      if (reconciliationResponse && reconciliationResponse.ok === true &&
          data.state === 'COMPLETED' && data.commitConfirmed === true) {
        return {
          ok: true,
          code: 'APRESENTACAO_DECISAO_RECONCILIADA',
          message: 'A operacao foi concluida e confirmada pelo requestId.',
          data: {
            idApresentacao: data.presentationId,
            statusTituloEixo: data.statusTituloEixo,
            reconciliation: data
          },
          meta: { reconciliation: data }
        };
      }
      if (reconciliationResponse && reconciliationResponse.ok === false) {
        return Object.assign({}, reconciliationResponse, {
          preservePendingDecision: true
        });
      }
      if (data.state === 'PROCESSING') {
        return {
          ok: false,
          code: 'APRESENTACAO_DECISAO_EM_PROCESSAMENTO',
          errorCode: 'APRESENTACAO_DECISAO_EM_PROCESSAMENTO',
          message: 'A decisao continua em processamento. Nao envie uma nova decisao.',
          data: { reconciliation: data },
          retrySafe: false
        };
      }
      return {
        ok: false,
        code: 'APRESENTACAO_DECISAO_INDETERMINADA',
        errorCode: 'APRESENTACAO_DECISAO_INDETERMINADA',
        message: 'O resultado ainda nao foi confirmado. Tente novamente com o mesmo botao; o requestId sera preservado.',
        data: { reconciliation: data },
        retrySafe: true,
        sameRequestIdRequired: true
      };
    });
  }

  function executarPostApresentacao(route, payload, opcoes) {
    var config = opcoes || {};
    var preparedPayload = Object.assign({}, payload || {});
    var decisionType = obterDecisionTypeApresentacao_(preparedPayload);
    var decisionKey = chaveDecisaoApresentacao_(route, preparedPayload, decisionType);
    return requestIdDecisaoApresentacao_(
      decisionKey,
      preparedPayload,
      decisionType
    ).then(function prepared(resolution) {
      if (resolution && resolution.stop) {
        if (resolution.recovered) {
          estado.feedbackPersistente = {
            idRota: estado.rotaAtual || 'admin-apresentacoes',
            type: 'success',
            title: 'Operacao concluida',
            message: resolution.message
          };
          fecharModal();
          invalidarCacheApresentacoes();
          carregarTela(estado.rotaAtual || 'admin-apresentacoes');
          ui.mostrarToast({ type: 'success', title: 'Operacao concluida', message: resolution.message });
        } else {
          mostrarErroModal(resolution.message, config.form, {});
          ui.mostrarToast({ type: 'warning', title: 'Novo envio bloqueado', message: resolution.message });
        }
        return resolution;
      }
      preparedPayload.requestId = resolution.requestId;
      return executarPostApresentacaoComRequestId_(
        route,
        preparedPayload,
        config,
        decisionType,
        decisionKey,
        resolution.entry || null
      );
    }).catch(function preparationFailed(error) {
      var message = error && error.message || 'Nao foi possivel preparar a decisao com seguranca.';
      mostrarErroModal(message, config.form, {});
      ui.mostrarToast({ type: 'error', title: 'Decisao nao enviada', message: message });
      return { ok: false, code: error && error.code || 'APRESENTACAO_DECISAO_DIARIO_FALHOU' };
    });
  }

  function executarPostApresentacaoComRequestId_(
    route,
    payload,
    config,
    decisionType,
    decisionKey,
    journalEntry
  ) {
    var toastId;
    if (journalEntry && decisionJournal) {
      journalEntry = decisionJournal.updateState(journalEntry, 'SUBMITTED');
    }
    var timing = criarTimingApresentacaoDev_(config.acao, payload.requestId);
    marcarTimingApresentacaoDev_(timing, 'F0', 'CLIQUE_RECEBIDO');

    if (config.form) {
      definirFormularioEnviando(config.form, true);
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
      .then(function reconciliarSeNecessario(resposta) {
        return reconciliarRespostaDecisaoApresentacaoDev_(
          resposta,
          payload,
          decisionType,
          journalEntry
        );
      })
      .then(function tratar(resposta) {
        importarTimingTransporteApresentacaoDev_(timing, resposta);
        if (timing) timing.backend = resposta && resposta.meta && resposta.meta.trace || null;
        var feedback = ui.normalizarFeedbackResposta(resposta);

        if (!resposta.ok) {
          var erro = new Error(ui.obterMensagemErroAmigavel(
            feedback,
            'Nao foi possivel salvar a apresentacao. Tente novamente.'
          ));
          erro.fieldErrors = feedback.fieldErrors;
          erro.code = feedback.code;
          erro.preservePendingDecision = resposta && resposta.preservePendingDecision === true;
          erro.reconciliationState = resposta && resposta.data &&
            resposta.data.reconciliation && resposta.data.reconciliation.state || '';
          if (!Object.keys(erro.fieldErrors).length) {
            erro.fieldErrors = mapearErrosCamposApresentacao(config.acao, feedback.code);
          }
          throw erro;
        }

        marcarTimingApresentacaoDev_(timing, 'F4', 'MUTATION_CONCLUIDA');
        limparRequestIdDecisaoApresentacao_(decisionKey, journalEntry);
        var sucesso = montarFeedbackSucessoApresentacao(config.acao, payload, feedback);
        estado.feedbackPersistente = Object.assign({
          idRota: estado.rotaAtual || 'minhas-apresentacoes'
        }, sucesso);
        fecharModal();
        invalidarCacheApresentacoes();
        notificarApresentacoesAtualizadas(payload, feedback.data);
        marcarTimingApresentacaoDev_(timing, 'F5', 'REFRESH_INICIADO');
        carregarTela(estado.rotaAtual || 'minhas-apresentacoes', {
          onResponse: function() {
            marcarTimingApresentacaoDev_(timing, 'F6', 'REFRESH_CONCLUIDO');
          },
          onRendered: function() {
            marcarTimingApresentacaoDev_(timing, 'F7', 'RENDER_ADMIN_RECOMPOSTO');
            publicarTimingApresentacaoDev_(timing);
          }
        });
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
        if (erro.preservePendingDecision === true || ['PROCESSING', 'INDETERMINATE'].indexOf(
          String(erro.reconciliationState || '').toUpperCase()
        ) >= 0) {
          ui.atualizarToast(toastId, {
            type: 'warning',
            title: erro.reconciliationState === 'PROCESSING'
              ? 'Operacao em processamento' : 'Resultado ainda nao confirmado',
            message: mensagemErro
          });
          return;
        }
        limparRequestIdDecisaoApresentacao_(decisionKey, journalEntry);
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
      .finally(function finalizar() {
        definirFormularioEnviando(config.form, false);
        ui.ocultarLoading();
        marcarTimingApresentacaoDev_(timing, 'F8', 'INDICADOR_PROCESSANDO_REMOVIDO');
        publicarTimingApresentacaoDev_(timing);
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
      REGISTRAR_DINAMICA: 'Dinâmica atualizada. Consulte a proposta e seu histórico.',
      RECONHECER_REALIZACAO: 'Realização da apresentação registrada.',
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

  function executarPostJustificativa(route, payload, form) {
    definirFormularioEnviando(form, true);
    ui.mostrarLoading('Salvando justificativa...');

    return api.apiPost(route, {
      payload: JSON.stringify(payload)
    })
      .then(function tratar(resposta) {
        var feedback = ui.normalizarFeedbackResposta(resposta);
        if (!resposta.ok) {
          throw new Error(feedback.message || 'Nao foi possivel salvar a justificativa.');
        }

        ui.mostrarToast({
          type: feedback.warnings.length ? 'warning' : 'success',
          title: 'Justificativa registrada',
          message: feedback.warnings.length
            ? (feedback.warnings[0].message || feedback.warnings[0].mensagem || feedback.message)
            : (feedback.message || 'Justificativa recebida e registrada.')
        });
        fecharModal();
        invalidarCacheJustificativas();
        carregarTela(estado.rotaAtual || 'frequencia');
      })
      .catch(function falhar(erro) {
        mostrarErroModal(erro.message || 'Erro controlado ao salvar justificativa.');
      })
      .finally(function finalizar() {
        definirFormularioEnviando(form, false);
        ui.ocultarLoading();
      });
  }

  function definirFormularioEnviando(form, enviando) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('button[type="submit"]'), function atualizar(botao) {
      if (enviando) {
        if (!botao.hasAttribute('data-texto-original')) botao.setAttribute('data-texto-original', botao.textContent || 'Enviar');
        botao.disabled = true;
        botao.textContent = 'Enviando...';
      } else {
        botao.disabled = false;
        botao.textContent = botao.getAttribute('data-texto-original') || 'Enviar';
        botao.removeAttribute('data-texto-original');
      }
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
    geracaoModal_ += 1;
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
    return geracaoModal_;
  }

  function atualizarModalConteudo(corpo, opcoes) {
    var alvo = document.querySelector('[data-readonly-modal-content]');
    var config = opcoes || {};

    if (!alvo || (config.geracaoModal !== undefined && config.geracaoModal !== geracaoModal_)) {
      return false;
    }

    alvo.innerHTML = corpo;
    if (config.formName && config.idApresentacao !== undefined) {
      if (!popularIdApresentacaoModal_(alvo, config.formName, config.idApresentacao)) {
        return false;
      }
    }
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-eixo-select]'), atualizarAjudaEixo);
    return true;
  }

  function popularIdApresentacaoModal_(conteudo, formName, valor) {
    var form = conteudo && conteudo.querySelector(
      'form[data-portal-v2-form="' + String(formName || '') + '"]'
    );
    var hidden = form && form.querySelector('input[name="idApresentacao"]');
    var idApresentacao;

    if (!hidden) {
      return false;
    }

    idApresentacao = validarIdApresentacaoFrontend(valor, form);
    if (!idApresentacao) {
      return false;
    }

    hidden.value = idApresentacao;
    hidden.defaultValue = idApresentacao;
    hidden.setAttribute('value', idApresentacao);
    form.setAttribute('data-id-apresentacao-modal', idApresentacao);
    return true;
  }

  function limparIdApresentacaoModal_(modal) {
    var hidden = modal && modal.querySelector('input[name="idApresentacao"]');

    if (!hidden) {
      return;
    }

    hidden.value = '';
    hidden.defaultValue = '';
    hidden.setAttribute('value', '');
  }

  function registrarDiagnosticoModalEditarAprovarDev_(idBotao) {
    var form;
    var hidden;
    var idHidden;
    var idBotaoNormalizado;
    var idBotaoEscapado;
    var diagnostico;

    if (!diagnosticoModalDevLocalAtivo_() ||
        !global.document || !global.document.documentElement) {
      return;
    }

    form = document.querySelector('form[data-portal-v2-form="editar-aprovar-titulo-eixo"]');
    hidden = form && form.querySelector('input[name="idApresentacao"]');
    idHidden = String(hidden && hidden.value || '').trim();
    idBotaoNormalizado = String(idBotao || '').trim();
    idBotaoEscapado = String(ui.escaparHtml(idBotaoNormalizado) || '');
    diagnostico = {
      inputIdNonEmpty: idBotaoNormalizado.length > 0,
      inputIdValid: ID_APRESENTACAO_TECNICO_PATTERN.test(idBotaoNormalizado),
      escapedIdPreserved: idBotaoEscapado === idBotaoNormalizado && idBotaoNormalizado.length > 0,
      hiddenNonEmpty: idHidden.length > 0,
      hiddenValidFormat: ID_APRESENTACAO_TECNICO_PATTERN.test(idHidden),
      hiddenMatchesButton: idHidden === idBotaoNormalizado && idHidden.length > 0,
      resetClearsHidden: false,
      reopenReplacesId: ultimoIdModalEditarAprovarDev_
        ? ultimoIdModalEditarAprovarDev_ !== idHidden && idHidden === idBotaoNormalizado
        : false
    };
    ultimoIdModalEditarAprovarDev_ = idHidden;
    global.document.documentElement.setAttribute(
      'data-geapa-edit-approve-modal-checks',
      JSON.stringify(diagnostico)
    );
  }

  function registrarResetModalEditarAprovarDev_(modal) {
    var form;
    var hidden;
    var atual;

    if (!diagnosticoModalDevLocalAtivo_() ||
        !global.document || !global.document.documentElement) {
      return;
    }

    form = modal && modal.querySelector('form[data-portal-v2-form="editar-aprovar-titulo-eixo"]');
    hidden = form && form.querySelector('input[name="idApresentacao"]');
    if (!hidden) {
      return;
    }

    try {
      atual = JSON.parse(global.document.documentElement.getAttribute(
        'data-geapa-edit-approve-modal-checks'
      ) || '{}');
    } catch (_erroDiagnostico) {
      atual = {};
    }
    atual.resetClearsHidden = String(hidden.value || '') === '' &&
      String(hidden.defaultValue || '') === '' &&
      String(hidden.getAttribute('value') || '') === '';
    global.document.documentElement.setAttribute(
      'data-geapa-edit-approve-modal-checks',
      JSON.stringify(atual)
    );
  }

  function diagnosticoModalDevLocalAtivo_() {
    var environment = String(portalConfig.ENVIRONMENT || '').trim().toUpperCase();
    var hostname = String(global.location && global.location.hostname || '').trim().toLowerCase();

    return environment === 'DEV' || hostname === 'localhost' ||
      hostname === '127.0.0.1' || hostname === '::1';
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

    geracaoModal_ += 1;

    if (modal) {
      limparIdApresentacaoModal_(modal);
      registrarResetModalEditarAprovarDev_(modal);
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

    var eixoPrincipal = (item || {}).eixoTematicoPrincipalRotulo || (item || {}).eixoTematicoPrincipal || '';
    var eixoSecundario = (item || {}).eixoTematicoSecundarioRotulo || (item || {}).eixoTematicoSecundario || '';
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
