/**
 * Tela inicial de Atividades do Portal GEAPA.
 *
 * Esta tela usa o Apps Script em modo real e dados simulados apenas quando
 * MOCK_MODE estiver ativo. Permissoes visuais nao substituem o backend.
 */

(function configurarAtividadesPortal(global) {
  var api = global.PortalGeapaApi;
  var auth = global.PortalGeapaAuth;
  var navigation = global.PortalGeapaNavigation;
  var ui = global.PortalGeapaUi;
  var ATIVIDADES_CACHE_TTL_MS = 5 * 60 * 1000;
  var CHAMADA_ANTECEDENCIA_PADRAO_MINUTOS = 60;
  var CHAMADA_TOLERANCIA_PADRAO_MINUTOS = 240;
  var PRELOAD_DETALHES_LIMITE_PADRAO = 2;
  var PRELOAD_DETALHES_CONCORRENCIA = 2;
  var MODO_ATIVIDADES_PROXIMAS = 'proximas';
  var MODO_ATIVIDADES_HISTORICO = 'historico';
  var detalhesCache = {};
  var atividadesResumoCache = {};
  var atividadesBundleCache = null;
  var atividadesBundleCacheSalvoEm = 0;
  var filtrosHistoricoAtividades = {
    tipoSubtipo: '',
    somenteApresentacoes: false,
    eixo: '',
    cicloSemestre: ''
  };
  var filtrosProximasAtividades = {
    mes: ''
  };
  var detalhesPreloadPromise = null;
  var detalhesPreloadTimer = null;
  var detalhesPreloadFila = [];
  var detalhesPreloadIds = {};
  var detalhesPreloadEmExecucao = 0;
  var detalhesRequisicoesEmVoo = {};
  var detalhesIntersectionObserver = null;
  var chamadaAtual = null;
  var isChamadaLoading = false;
  var isChamadaSaving = false;
  var isChamadaFinalizing = false;
  var isCriandoAtividade = false;
  var modelosCriacaoAtividadeCache = [];
  var modelosCriacaoAtividadeExpiraEm = 0;
  var modelosCriacaoAtividadePromise = null;
  var membrosApresentadoresCache = {};
  var filtroChamadaAtual = 'TODOS';
  var justificativasConfig = null;
  var justificativasConfigExpiraEm = 0;
  var justificativasConfigPromise = null;
  var JUSTIFICATIVAS_CONFIG_TTL_MS = 20 * 60 * 1000;
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
  var STATUS_CHAMADA = [
    { valor: 'PRESENTE_PRESENCIAL', rotulo: 'Presente presencial', codigo: 'P' },
    { valor: 'PRESENTE_REMOTO', rotulo: 'Presente remoto', codigo: 'R' }
  ];

  function iniciarAtividades() {
    var telaAtividades = document.getElementById('tela-atividades');
    var lista = document.getElementById('atividades-lista');
    var status = document.getElementById('atividades-status');
    var modal = document.getElementById('atividade-modal');
    var botoesAbrir = document.querySelectorAll('[data-open-atividades]');
    var botoesVoltar = document.querySelectorAll('[data-voltar-situacao]');
    var botaoFecharModal = document.getElementById('fechar-atividade-modal');
    var botaoCriar = document.querySelector('[data-create-activity]');

    if (!telaAtividades || !lista || !status || !modal || !api || !auth || !ui) {
      return;
    }

    if (navigation) {
      document.addEventListener('portal:navigationchange', function carregarAoNavegar(evento) {
        var rota = evento.detail && evento.detail.rota;
        var modo;

        if (!rota || !ehRotaDaTelaAtividades(rota.id)) {
          return;
        }

        modo = obterModoAtividadesPorRota(rota);
        configurarTelaAtividades(modo);
        atualizarAcoesDaTela(botaoCriar, modo);
        carregarAtividades(lista, status, modo);
      });

      if (typeof navigation.getRotaAtual === 'function' && ehRotaDaTelaAtividades(navigation.getRotaAtual())) {
        configurarTelaAtividades(obterModoAtividadesAtual());
        atualizarAcoesDaTela(botaoCriar, obterModoAtividadesAtual());
        carregarAtividades(lista, status, obterModoAtividadesAtual());
      }
    } else {
      Array.prototype.forEach.call(botoesAbrir, function registrarBotao(botao) {
        botao.addEventListener('click', function abrirAtividades() {
          mostrarTelaAtividades();
          configurarTelaAtividades(MODO_ATIVIDADES_PROXIMAS);
          atualizarAcoesDaTela(botaoCriar, MODO_ATIVIDADES_PROXIMAS);
          carregarAtividades(lista, status, MODO_ATIVIDADES_PROXIMAS);
        });
      });

      Array.prototype.forEach.call(botoesVoltar, function registrarBotao(botao) {
        botao.addEventListener('click', mostrarTelaSituacaoOuAcesso);
      });
    }

    botaoFecharModal.addEventListener('click', fecharModal);
    modal.addEventListener('click', function fecharAoClicarFora(event) {
      if (event.target === modal) {
        fecharModal();
      }
    });
    document.addEventListener('keydown', function fecharComEsc(event) {
      if (event.key === 'Escape' && !modal.hidden) {
        fecharModal();
      }
    });
    document.addEventListener('click', tratarCliqueAtividades);
    document.addEventListener('submit', tratarSubmitAtividades);
  }

  function ehRotaDaTelaAtividades(idRota) {
    return ['atividades', 'historico-atividades'].indexOf(idRota) >= 0;
  }

  function obterModoAtividadesAtual() {
    var idRota = navigation && typeof navigation.getRotaAtual === 'function'
      ? navigation.getRotaAtual()
      : '';

    return obterModoAtividadesPorRota({ id: idRota });
  }

  function obterModoAtividadesPorRota(rota) {
    return rota && rota.id === 'historico-atividades'
      ? MODO_ATIVIDADES_HISTORICO
      : MODO_ATIVIDADES_PROXIMAS;
  }

  function tratarCliqueAtividades(evento) {
    var botaoCriar = evento.target.closest('[data-create-activity]');
    var botaoJustificar = evento.target.closest('[data-activity-justify-future]');
    var botaoFechar = evento.target.closest('[data-activity-modal-close]');

    if (botaoCriar) {
      abrirModalCriarAtividade();
      return;
    }

    if (botaoJustificar) {
      abrirModalJustificativaPrevia(botaoJustificar.getAttribute('data-activity-justify-future'));
      return;
    }

    if (botaoFechar) {
      fecharModal();
    }
  }

  function tratarSubmitAtividades(evento) {
    var form = evento.target;
    var tipoFormulario = form ? form.getAttribute('data-activity-form') : '';

    if (!form || !tipoFormulario) {
      return;
    }

    evento.preventDefault();

    if (tipoFormulario === 'justificativa-previa') {
      salvarJustificativaPrevia(form);
      return;
    }

    if (tipoFormulario === 'criar-atividade') {
      salvarNovaAtividade(form);
    }
  }

  function configurarTelaAtividades(modo) {
    var titulo = document.getElementById('atividades-title');
    var descricao = document.getElementById('atividades-descricao');
    var tituloToolbar = document.getElementById('atividades-toolbar-title');
    var status = document.getElementById('atividades-status');
    var historico = modo === MODO_ATIVIDADES_HISTORICO;

    if (titulo) {
      titulo.textContent = historico ? 'Histórico de atividades' : 'Próximas atividades';
    }

    if (descricao) {
      descricao.textContent = historico
        ? 'Esta tela reúne atividades realizadas já disponíveis para consulta interna. Os detalhes continuam sendo carregados sob demanda.'
        : 'Esta tela busca a agenda pelo Apps Script do módulo Atividades. As chamadas continuam sendo carregadas e salvas somente pelo backend.';
    }

    if (tituloToolbar) {
      tituloToolbar.textContent = historico ? 'Atividades realizadas' : 'Agenda futura';
    }

    if (status && !status.textContent.trim()) {
      status.textContent = historico
        ? 'Pronta para carregar o histórico de atividades.'
        : 'Pronta para carregar próximas atividades.';
    }
  }

  function atualizarAcoesDaTela(botaoCriar, modo) {
    if (!botaoCriar) {
      return;
    }

    botaoCriar.hidden = modo === MODO_ATIVIDADES_HISTORICO || !auth.canCreateActivity();
    botaoCriar.disabled = botaoCriar.hidden;
    botaoCriar.title = botaoCriar.hidden
      ? 'Criacao permitida apenas para Diretoria, Secretaria ou Admin tecnico.'
      : 'Criar uma nova atividade como rascunho visivel apenas para Diretoria.';
  }

  function mostrarTelaAtividades() {
    var app = document.getElementById('portal-app');
    var telaAcesso = document.getElementById('tela-acesso');
    var telaSituacao = document.getElementById('tela-situacao');
    var telaAtividades = document.getElementById('tela-atividades');

    app.classList.remove('view-login', 'view-situacao');
    app.classList.add('view-atividades');
    telaAcesso.hidden = true;
    telaSituacao.hidden = true;
    telaAtividades.hidden = false;
  }

  function mostrarTelaSituacaoOuAcesso() {
    var app = document.getElementById('portal-app');
    var telaAcesso = document.getElementById('tela-acesso');
    var telaSituacao = document.getElementById('tela-situacao');
    var telaAtividades = document.getElementById('tela-atividades');
    var possuiSessao = false;

    try {
      possuiSessao = Boolean(window.sessionStorage.getItem('geapaPortal.sessionToken'));
    } catch (erro) {
      possuiSessao = false;
    }

    app.classList.remove('view-login', 'view-situacao', 'view-atividades');
    telaAtividades.hidden = true;

    if (possuiSessao) {
      app.classList.add('view-situacao');
      telaAcesso.hidden = true;
      telaSituacao.hidden = false;
      return;
    }

    app.classList.add('view-login');
    telaAcesso.hidden = false;
    telaSituacao.hidden = true;
  }

  function carregarAtividades(lista, status, modo) {
    carregarAtividadesComLista(lista, status, modo || MODO_ATIVIDADES_PROXIMAS);
  }

  function carregarAtividadesComLista(lista, status, modo) {
    var inicio = obterTempoAtual();
    var bundleCache = lerBundleAtividadesCacheValido();
    var rotulos = obterRotulosAtividades(modo);

    if (bundleCache && bundleCache.calendario.length) {
      aplicarBundleAtividades(bundleCache);
      renderizarAtividades(lista, bundleCache.calendario, modo);
      status.textContent = configEmModoMock()
        ? 'Dados simulados. Nenhuma atividade real foi consultada.'
        : rotulos.cache;
      registrarPerfAtividades('atividades.aba.cache', inicio, {
        total: bundleCache.calendario.length,
        detalhesCache: Object.keys(bundleCache.detalhesPorId || {}).length,
        payloadBytes: estimarPayloadBytes(bundleCache.calendario)
      });
      iniciarPreloadDetalhesAtividades(bundleCache, status);
      return;
    }

    lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(rotulos.carregando) + '</p>';
    status.textContent = rotulos.buscando;
    ui.mostrarLoading(rotulos.carregando);

    return api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível carregar atividades.');
        }

        var bundle = normalizarBundleAtividades({
          calendario: resposta.data || [],
          detalhesPorId: {},
          ultimaAtualizacao: new Date().toISOString()
        });

        aplicarBundleAtividades(bundle);
        salvarBundleAtividadesCache(bundle);
        renderizarAtividades(lista, bundle.calendario, modo);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : rotulos.carregado;
        registrarPerfAtividades('atividades.lista.renderizada', inicio, mesclarMetaPerfAtividades(resposta, {
          total: bundle.calendario.length,
          payloadBytes: estimarPayloadBytes(resposta.data || {}),
          detalhesPreCarregados: 0
        }));
        iniciarPreloadDetalhesAtividades(bundle, status);
      })
      .catch(function tratarErro(erro) {
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = rotulos.falha;
      })
      .finally(function finalizarLoadingAtividades() {
        ui.ocultarLoading();
      });
  }

  function carregarAtividadesComBundle(lista, status, modo) {
    var inicio = obterTempoAtual();
    var bundleCache = lerBundleAtividadesCacheValido();
    var rotulos = obterRotulosAtividades(modo);

    if (bundleCache) {
      aplicarBundleAtividades(bundleCache);
      renderizarAtividades(lista, bundleCache.calendario, modo);
      status.textContent = configEmModoMock()
        ? 'Dados simulados. Nenhuma atividade real foi consultada.'
        : rotulos.cache;
      registrarPerfAtividades('atividades.aba.cache', inicio, {
        total: bundleCache.calendario.length,
        payloadBytes: estimarPayloadBytes(bundleCache.calendario)
      });
      iniciarPreloadDetalhesAtividades(bundleCache, status);
      return;
    }

    lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(rotulos.carregando) + '</p>';
    status.textContent = rotulos.buscando;
    ui.mostrarLoading(rotulos.carregando);

    return api.apiGet('/atividades/bundle', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível carregar atividades.');
        }

        var bundle = normalizarBundleAtividades(resposta.data || {});
        aplicarBundleAtividades(bundle);
        salvarBundleAtividadesCache(bundle);
        renderizarAtividades(lista, bundle.calendario, modo);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : rotulos.carregado;
        registrarPerfAtividades('atividades.lista.renderizada', inicio, mesclarMetaPerfAtividades(resposta, {
          total: bundle.calendario.length,
          payloadBytes: estimarPayloadBytes(resposta.data || {}),
          detalhesPreCarregados: Object.keys(bundle.detalhesPorId).length
        }));
        iniciarPreloadDetalhesAtividades(bundle, status);
      })
      .catch(function tratarErro(erro) {
        registrarPerfAtividades('atividades.lista.falhou', inicio, {
          erro: erro.message
        });
        return carregarAtividadesFallback(lista, status, inicio, true, modo);
      })
      .finally(function finalizarLoadingAtividades() {
        ui.ocultarLoading();
      });
  }

  function carregarAtividadesFallback(lista, status, inicioOriginal, manterLoadingAtual, modo) {
    var inicio = obterTempoAtual();
    var rotulos = obterRotulosAtividades(modo);

    if (!manterLoadingAtual) {
      ui.mostrarLoading(rotulos.carregando);
    }

    return api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível carregar atividades.');
        }

        var bundle = normalizarBundleAtividades({
          calendario: resposta.data || [],
          detalhesPorId: {},
          ultimaAtualizacao: new Date().toISOString()
        });
        aplicarBundleAtividades(bundle);
        salvarBundleAtividadesCache(bundle);
        renderizarAtividades(lista, bundle.calendario, modo);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : rotulos.carregadoFallback;
        registrarPerfAtividades('atividades.aba.fallback_lista', inicioOriginal || inicio, {
          total: bundle.calendario.length,
          tempoFallbackMs: Math.round(obterTempoAtual() - inicio)
        });
      })
      .catch(function tratarErro(erro) {
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = rotulos.falha;
      })
      .finally(function finalizarLoadingFallback() {
        if (!manterLoadingAtual) {
          ui.ocultarLoading();
        }
      });
  }

  function iniciarPreloadDetalhesAtividades(bundle, status) {
    var dados = normalizarBundleAtividades(bundle);

    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_skip_chamada_ativa', obterTempoAtual(), {
        origemPreload: 'iniciar',
        fila: detalhesPreloadFila.length
      });
      return;
    }

    if (!dados.calendario.length || todosDetalhesCarregados(dados.calendario)) {
      return;
    }

    if (detalhesPreloadPromise) {
      return;
    }

    if (detalhesPreloadTimer) {
      global.clearTimeout(detalhesPreloadTimer);
    }

    detalhesPreloadTimer = global.setTimeout(function iniciarDepoisDaPintura() {
      detalhesPreloadTimer = null;
      agendarQuandoOcioso(function planejarQuandoOcioso() {
        planejarPreloadDetalhesPrioritarios(dados, status);
      }, 1200);
    }, 900);
  }

  function planejarPreloadDetalhesPrioritarios(bundle, status) {
    var dados = normalizarBundleAtividades(bundle);
    var prioridade = obterAtividadesParaPreload(dados.calendario);

    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_skip_chamada_ativa', obterTempoAtual(), {
        origemPreload: 'planejar',
        candidatos: prioridade.length
      });
      return;
    }

    prioridade.forEach(function enfileirar(atividade) {
      if (atividade && atividade.idAtividade) {
        enfileirarPreloadDetalhe(atividade.idAtividade, 'prioridade');
      }
    });

    if (status && prioridade.length && !configEmModoMock()) {
      status.textContent = 'Agenda carregada. Detalhes prioritários sendo preparados.';
    }
  }

  function obterAtividadesParaPreload(atividades) {
    var lista = Array.isArray(atividades) ? atividades.slice() : [];
    var proxima = obterProximaAtividade(lista);
    var selecionadas = [];
    var usados = {};

    if (proxima && proxima.idAtividade) {
      selecionadas.push(proxima);
      usados[proxima.idAtividade] = true;
    }

    lista
      .filter(function filtrarPreload(atividade) {
        return atividade &&
          atividade.idAtividade &&
          !usados[atividade.idAtividade] &&
          obterInicioAtividadeMs(atividade) >= obterTempoCacheAtual();
      })
      .sort(compararAtividadesPorInicio)
      .slice(0, Math.max(PRELOAD_DETALHES_LIMITE_PADRAO - selecionadas.length, 0))
      .forEach(function adicionar(atividade) {
        selecionadas.push(atividade);
        usados[atividade.idAtividade] = true;
      });

    return selecionadas;
  }

  function observarPreloadDetalhes(container) {
    if (detalhesIntersectionObserver && typeof detalhesIntersectionObserver.disconnect === 'function') {
      detalhesIntersectionObserver.disconnect();
    }

    if (!global.IntersectionObserver) {
      return;
    }

    detalhesIntersectionObserver = new global.IntersectionObserver(function tratarEntradas(entradas) {
      entradas.forEach(function tratarEntrada(entrada) {
        var idAtividade = entrada.target && entrada.target.getAttribute('data-id-atividade');

        if (!entrada.isIntersecting || !idAtividade) {
          return;
        }

        enfileirarPreloadDetalhe(idAtividade, 'viewport');
        detalhesIntersectionObserver.unobserve(entrada.target);
      });
    }, {
      root: null,
      rootMargin: '420px 0px',
      threshold: 0.01
    });

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-id-atividade]'),
      function observarCard(card) {
        detalhesIntersectionObserver.observe(card);
      }
    );
  }

  function enfileirarPreloadDetalhe(idAtividade, origem) {
    var id = String(idAtividade || '').trim();

    if (!id) {
      return;
    }

    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_skip_chamada_ativa', obterTempoAtual(), {
        idAtividade: id,
        origemPreload: origem || 'background'
      });
      return;
    }

    if (obterDetalheAtividadeCacheValido(id).detalhe || detalhesPreloadIds[id] || detalhesRequisicoesEmVoo[id]) {
      return;
    }

    detalhesPreloadIds[id] = true;
    detalhesPreloadFila.push({
      idAtividade: id,
      origem: origem || 'background'
    });
    agendarProcessamentoPreloadDetalhes(0);
  }

  function processarFilaPreloadDetalhes() {
    return processarFilaPreloadDetalhesControlada();
  }

  function agendarProcessamentoPreloadDetalhes(atrasoMs) {
    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_pausado_chamada_ativa', obterTempoAtual(), {
        fila: detalhesPreloadFila.length,
        emExecucao: detalhesPreloadEmExecucao
      });
      return;
    }

    global.setTimeout(processarFilaPreloadDetalhesControlada, Number(atrasoMs) || 0);
  }

  function processarFilaPreloadDetalhesControlada() {
    var item;

    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_pausado_chamada_ativa', obterTempoAtual(), {
        fila: detalhesPreloadFila.length,
        emExecucao: detalhesPreloadEmExecucao
      });
      return;
    }

    while (detalhesPreloadEmExecucao < PRELOAD_DETALHES_CONCORRENCIA && detalhesPreloadFila.length) {
      item = detalhesPreloadFila.shift();

      if (!item || obterDetalheAtividadeCacheValido(item.idAtividade).detalhe) {
        if (item && item.idAtividade) {
          delete detalhesPreloadIds[item.idAtividade];
        }
        continue;
      }

      executarPreloadDetalhe(item);
    }
  }

  function executarPreloadDetalhe(item) {
    var inicio = obterTempoAtual();

    detalhesPreloadEmExecucao += 1;
    carregarDetalheAtividadeBackend(item.idAtividade, 'preload:' + (item.origem || 'background'))
      .then(function tratarResultado(resultado) {
        if (!resultado || resultado.reutilizada) {
          return;
        }

        registrarPerfAtividades('atividades.detalhe.preload_unitario', inicio, mesclarMetaPerfAtividades(resultado.resposta, {
          idAtividade: item.idAtividade,
          origemPreload: item.origem,
          payloadBytes: estimarPayloadBytes(resultado.detalhe || {})
        }));
      }).catch(function tratarErro(erro) {
        registrarPerfAtividades('atividades.detalhe.preload_unitario_falhou', inicio, {
          idAtividade: item.idAtividade,
          origemPreload: item.origem,
          erro: erro.message
        });
      }).then(function finalizarPreload() {
        detalhesPreloadEmExecucao = Math.max(detalhesPreloadEmExecucao - 1, 0);
        delete detalhesPreloadIds[item.idAtividade];
        agendarProcessamentoPreloadDetalhes(350);
      });
  }

  function executarPreloadDetalhesAtividades(status) {
    var inicio = obterTempoAtual();

    if (chamadaOperacionalAtiva()) {
      registrarPerfAtividades('atividades.detalhe.preload_skip_chamada_ativa', inicio, {
        origemPreload: 'preload_lote'
      });
      return;
    }

    detalhesPreloadPromise = api.apiGet('/atividades/detalhes-preload', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível preparar os detalhes.');
        }

        var detalhes = normalizarDetalhesPorId((resposta.data || {}).detalhesPorId);
        mesclarDetalhesNoCache(detalhes, (resposta.data || {}).ultimaAtualizacao);
        registrarPerfAtividades('atividades.detalhes.preload', inicio, mesclarMetaPerfAtividades(resposta, {
          totalDetalhes: Object.keys(detalhes).length,
          payloadBytes: estimarPayloadBytes(resposta.data || {})
        }));

        if (status && !configEmModoMock()) {
          status.textContent = 'Atividades e detalhes preparados para consulta rápida.';
        }
      })
      .catch(function tratarErro(erro) {
        registrarPerfAtividades('atividades.detalhes.preload_falhou', inicio, {
          erro: erro.message
        });
      })
      .then(function limparPreload() {
        detalhesPreloadPromise = null;
      });
  }

  function todosDetalhesCarregados(calendario) {
    return calendario.every(function verificarDetalhe(atividade) {
      return atividade && atividade.idAtividade && obterDetalheAtividadeCacheValido(atividade.idAtividade).detalhe;
    });
  }

  function obterDetalheAtividadeCacheValido(idAtividade) {
    var id = String(idAtividade || '').trim();
    var bundle;

    if (!id) {
      return { detalhe: null, origem: '' };
    }

    if (cacheAtividadesMemoriaValido() && detalhesCache[id]) {
      return {
        detalhe: detalhesCache[id],
        origem: 'cache_memoria'
      };
    }

    bundle = lerBundleAtividadesCacheValido();

    if (bundle && bundle.detalhesPorId && bundle.detalhesPorId[id]) {
      detalhesCache[id] = bundle.detalhesPorId[id];
      return {
        detalhe: bundle.detalhesPorId[id],
        origem: 'cache_sessao'
      };
    }

    return { detalhe: null, origem: '' };
  }

  function carregarDetalheAtividadeBackend(idAtividade, origemSolicitante) {
    var id = String(idAtividade || '').trim();
    var inicio = obterTempoAtual();
    var promise;

    if (!id) {
      return Promise.reject(new Error('Informe a atividade para carregar detalhes.'));
    }

    if (detalhesRequisicoesEmVoo[id]) {
      registrarPerfAtividades('atividades.detalhe.inflight_reuse', inicio, {
        idAtividade: id,
        origemSolicitante: origemSolicitante || ''
      });
      return detalhesRequisicoesEmVoo[id].then(function marcarReuso(resultado) {
        return Object.assign({}, resultado, {
          reutilizada: true
        });
      });
    }

    promise = api.apiGet('/atividades/detalhe', {
      idAtividade: id
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Nao foi possivel carregar detalhes.');
      }

      detalhesCache[id] = resposta.data;
      atualizarDetalheNoBundleCache(id, resposta.data);
      return {
        resposta: resposta,
        detalhe: resposta.data,
        reutilizada: false
      };
    }).finally(function limparInflight() {
      delete detalhesRequisicoesEmVoo[id];
    });

    detalhesRequisicoesEmVoo[id] = promise;
    return promise;
  }

  function mesclarDetalhesNoCache(detalhesPorId, ultimaAtualizacao) {
    var bundle = atividadesBundleCache || normalizarBundleAtividades({});
    var detalhes = normalizarDetalhesPorId(detalhesPorId);

    Object.keys(detalhes).forEach(function guardarDetalhe(idAtividade) {
      detalhesCache[idAtividade] = detalhes[idAtividade];
      bundle.detalhesPorId[idAtividade] = detalhes[idAtividade];
    });

    if (ultimaAtualizacao) {
      bundle.ultimaAtualizacao = ultimaAtualizacao;
    }

    salvarBundleAtividadesCache(bundle);
  }

  function configEmModoMock() {
    return Boolean(global.PortalGeapaConfig && global.PortalGeapaConfig.MOCK_MODE);
  }

  function normalizarBundleAtividades(dados) {
    var origem = dados || {};
    var calendario = Array.isArray(origem.calendario)
      ? origem.calendario.slice()
      : [];

    return {
      modo: origem.modo || 'LEVE',
      calendario: calendario,
      detalhesPorId: normalizarDetalhesPorId(origem.detalhesPorId),
      ultimaAtualizacao: origem.ultimaAtualizacao || ''
    };
  }

  function normalizarDetalhesPorId(valor) {
    var detalhes = {};

    if (Array.isArray(valor)) {
      valor.forEach(function guardarDetalhe(item) {
        if (item && item.idAtividade) {
          detalhes[item.idAtividade] = item;
        }
      });
      return detalhes;
    }

    Object.keys(valor || {}).forEach(function copiarDetalhe(idAtividade) {
      if (valor[idAtividade]) {
        detalhes[idAtividade] = valor[idAtividade];
      }
    });

    return detalhes;
  }

  function aplicarBundleAtividades(bundle) {
    var dados = normalizarBundleAtividades(bundle);

    atividadesBundleCache = dados;
    dados.calendario.forEach(function guardarResumo(atividade) {
      if (atividade && atividade.idAtividade) {
        atividadesResumoCache[atividade.idAtividade] = atividade;
      }
    });

    Object.keys(dados.detalhesPorId).forEach(function guardarDetalhe(idAtividade) {
      detalhesCache[idAtividade] = dados.detalhesPorId[idAtividade];
    });
  }

  function lerBundleAtividadesCacheValido() {
    if (cacheAtividadesMemoriaValido()) {
      return atividadesBundleCache;
    }

    try {
      var chave = obterChaveCacheAtividades();
      var bruto = chave ? window.sessionStorage.getItem(chave) : '';

      if (!bruto) {
        return null;
      }

      var registro = JSON.parse(bruto);
      var expirado = !registro.salvoEm || obterTempoCacheAtual() - registro.salvoEm > ATIVIDADES_CACHE_TTL_MS;

      if (expirado) {
        window.sessionStorage.removeItem(chave);
        return null;
      }

      atividadesBundleCache = normalizarBundleAtividades(registro.bundle);
      atividadesBundleCacheSalvoEm = registro.salvoEm;
      return atividadesBundleCache;
    } catch (erro) {
      return null;
    }
  }

  function cacheAtividadesMemoriaValido() {
    return Boolean(
      atividadesBundleCache &&
      atividadesBundleCacheSalvoEm &&
      obterTempoCacheAtual() - atividadesBundleCacheSalvoEm <= ATIVIDADES_CACHE_TTL_MS
    );
  }

  function salvarBundleAtividadesCache(bundle) {
    atividadesBundleCache = normalizarBundleAtividades(bundle);
    atividadesBundleCacheSalvoEm = obterTempoCacheAtual();

    try {
      var chave = obterChaveCacheAtividades();

      if (!chave) {
        return;
      }

      window.sessionStorage.setItem(chave, JSON.stringify({
        salvoEm: atividadesBundleCacheSalvoEm,
        ttlMs: ATIVIDADES_CACHE_TTL_MS,
        bundle: atividadesBundleCache
      }));
    } catch (erro) {
      // O portal continua funcionando sem cache local.
    }
  }

  function invalidarCacheAtividades() {
    atividadesBundleCache = null;
    atividadesBundleCacheSalvoEm = 0;
    detalhesCache = {};
    atividadesResumoCache = {};

    try {
      var chave = obterChaveCacheAtividades();

      if (chave) {
        window.sessionStorage.removeItem(chave);
      }
    } catch (erro) {
      // O proximo carregamento fara nova consulta ao backend.
    }
  }

  function atualizarDetalheNoBundleCache(idAtividade, detalhe) {
    var bundle = atividadesBundleCache || normalizarBundleAtividades({});

    if (!idAtividade || !detalhe) {
      return;
    }

    bundle.detalhesPorId[idAtividade] = detalhe;
    salvarBundleAtividadesCache(bundle);
  }

  function obterChaveCacheAtividades() {
    var token = '';
    var usuario = auth.getUsuarioAtual ? auth.getUsuarioAtual() : {};
    var usuarioId = usuario && (usuario.id || usuario.rga || usuario.emailCadastrado || usuario.nomeExibicao)
      ? String(usuario.id || usuario.rga || usuario.emailCadastrado || usuario.nomeExibicao)
      : 'usuario';

    try {
      token = window.sessionStorage.getItem('geapaPortal.sessionToken') || '';
    } catch (erro) {
      token = '';
    }

    if (!token) {
      return '';
    }

    return 'geapaPortal.atividadesLista.v9.' + hashCurto(token + ':' + usuarioId);
  }

  function hashCurto(valor) {
    var texto = String(valor || '');
    var hash = 0;

    for (var i = 0; i < texto.length; i++) {
      hash = ((hash << 5) - hash) + texto.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }

  function obterTempoAtual() {
    if (global.performance && typeof global.performance.now === 'function') {
      return global.performance.now();
    }

    return Date.now();
  }

  function obterTempoCacheAtual() {
    return Date.now();
  }

  function chamadaOperacionalAtiva() {
    return isChamadaLoading || isChamadaSaving || isChamadaFinalizing;
  }

  function pausarPreloadsPorChamada(motivo) {
    if (detalhesPreloadTimer) {
      global.clearTimeout(detalhesPreloadTimer);
      detalhesPreloadTimer = null;
    }

    registrarPerfAtividades('atividades.detalhe.preload_pausado_chamada_ativa', obterTempoAtual(), {
      motivo: motivo || 'chamada',
      fila: detalhesPreloadFila.length,
      emExecucao: detalhesPreloadEmExecucao
    });
  }

  function retomarPreloadsAposChamada() {
    if (!chamadaOperacionalAtiva() && detalhesPreloadFila.length) {
      agendarProcessamentoPreloadDetalhes(600);
    }
  }

  function agendarQuandoOcioso(callback, timeoutMs) {
    if (typeof callback !== 'function') {
      return;
    }

    if (global.requestIdleCallback) {
      global.requestIdleCallback(function executarOcioso() {
        if (!chamadaOperacionalAtiva()) {
          callback();
        }
      }, {
        timeout: timeoutMs || 1200
      });
      return;
    }

    global.setTimeout(function executarFallbackOcioso() {
      if (!chamadaOperacionalAtiva()) {
        callback();
      }
    }, Math.min(Number(timeoutMs) || 1200, 1200));
  }

  function registrarPerfAtividades(evento, inicio, detalhes) {
    if (!global.console || typeof global.console.debug !== 'function') {
      return;
    }

    global.console.debug('[GEAPA-PORTAL-PERF]', evento, Object.assign({
      tempoMs: Math.round(obterTempoAtual() - inicio)
    }, detalhes || {}));
  }

  function mesclarMetaPerfAtividades(resposta, detalhes) {
    var meta = resposta && resposta.meta ? resposta.meta : {};
    var desempenho = meta.desempenho || {};
    var atividades = meta.atividades || {};
    var performanceBackend = resposta && resposta.data && resposta.data.performance
      ? resposta.data.performance
      : {};
    var dados = Object.assign({}, detalhes || {});
    var tempoBackend = Number(desempenho.tempoMs || performanceBackend.totalMs);
    var origemBackend = desempenho.origemDados || atividades.origemDados || '';

    if (!Number.isNaN(tempoBackend) && tempoBackend >= 0) {
      dados.tempoBackendMs = Math.round(tempoBackend);
    }

    if (origemBackend) {
      dados.origemBackend = origemBackend;
    }

    if (Array.isArray(performanceBackend.etapas)) {
      dados.etapasBackend = performanceBackend.etapas.length;
    }

    return dados;
  }

  function estimarPayloadBytes(valor) {
    try {
      return JSON.stringify(valor || {}).length;
    } catch (erro) {
      return 0;
    }
  }

  function obterRotulosAtividades(modo) {
    var historico = modo === MODO_ATIVIDADES_HISTORICO;

    return historico
      ? {
        carregando: 'Carregando histórico de atividades...',
        buscando: 'Buscando histórico de atividades no Portal GEAPA.',
        cache: 'Histórico de atividades carregado em cache local.',
        carregado: 'Histórico de atividades carregado. Detalhes serão preparados em segundo plano.',
        carregadoFallback: 'Histórico de atividades carregado pelo backend do Portal GEAPA.',
        falha: 'Falha ao carregar o histórico de atividades.',
        vazio: 'Nenhuma atividade realizada disponível no histórico nesta etapa.'
      }
      : {
        carregando: 'Carregando próximas atividades...',
        buscando: 'Buscando próximas atividades no Portal GEAPA.',
        cache: 'Próximas atividades carregadas em cache local.',
        carregado: 'Próximas atividades carregadas. Detalhes serão preparados em segundo plano.',
        carregadoFallback: 'Próximas atividades carregadas pelo backend do Portal GEAPA.',
        falha: 'Falha ao carregar próximas atividades.',
        vazio: 'Nenhuma próxima atividade disponível nesta etapa.'
      };
  }

  function renderizarAtividades(container, atividades, modo) {
    var todas = Array.isArray(atividades) ? atividades.slice() : [];
    var historico = modo === MODO_ATIVIDADES_HISTORICO;
    var base = historico ? obterHistoricoAtividades(todas) : obterAgendaOperacionalAtividades(todas);
    var dados = historico ? aplicarFiltrosHistoricoAtividades(base) : aplicarFiltrosProximasAtividades(base);
    var proxima = historico ? null : obterProximaAtividade(dados);
    var rotulos = obterRotulosAtividades(modo);
    var avisoHistorico = historico ? montarAvisoEscopoHistoricoAtividades() : '';
    var filtrosHistorico = historico ? montarFiltrosHistoricoAtividades(base) : '';
    var filtrosProximas = historico ? '' : montarFiltrosProximasAtividades(base);

    if (!dados.length) {
      container.innerHTML = avisoHistorico + filtrosHistorico + filtrosProximas + '<p class="empty-state">' +
        ui.escaparHtml(todas.length
          ? (historico
            ? 'Nenhuma atividade realizada atende aos filtros selecionados.'
            : 'Nenhuma próxima atividade atende ao filtro selecionado.')
          : rotulos.vazio) +
        '</p>';
      registrarEventosFiltrosHistorico(container, todas, modo);
      registrarEventosFiltrosProximas(container, todas, modo);
      return;
    }

    dados.forEach(function guardarResumo(atividade) {
      if (atividade && atividade.idAtividade) {
        atividadesResumoCache[atividade.idAtividade] = atividade;
      }
    });

    container.innerHTML = [
      avisoHistorico,
      filtrosHistorico,
      filtrosProximas,
      proxima
        ? [
          '<section class="next-activity-section" aria-labelledby="proxima-atividade-title">',
          '<div class="activity-section-heading">',
          '<p class="eyebrow">Próxima atividade</p>',
          '<h3 id="proxima-atividade-title">' + ui.escaparHtml(proxima.tituloPublico || 'Atividade') + '</h3>',
          '</div>',
          montarCardAtividade(proxima, true, modo),
          '</section>'
        ].join('')
        : '',
      '<section class="activities-list-section" aria-label="' + ui.escaparHtml(historico ? 'Histórico de atividades' : 'Lista de próximas atividades') + '">',
      historico ? '<h3 class="activity-list-title">Atividades realizadas</h3>' : (proxima ? '<h3 class="activity-list-title">Agenda futura</h3>' : ''),
      dados.map(function montarAtividade(atividade) {
        return montarCardAtividade(atividade, false, modo);
      }).join(''),
      '</section>'
    ].join('');

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-activity-details]'),
      function registrarDetalhe(botao) {
        botao.addEventListener('click', function abrirDetalhe() {
          carregarDetalheAtividade(botao.getAttribute('data-activity-details'));
        });
      }
    );

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-activity-attendance]'),
      function registrarChamada(botao) {
        botao.addEventListener('click', function abrirChamada() {
          carregarChamadaAtividade(botao.getAttribute('data-activity-attendance'));
        });
      }
    );

    registrarEventosFiltrosHistorico(container, todas, modo);
    registrarEventosFiltrosProximas(container, todas, modo);
    observarPreloadDetalhes(container);
  }

  function montarAvisoEscopoHistoricoAtividades() {
    return '';
  }

  function obterAgendaOperacionalAtividades(atividades) {
    return (Array.isArray(atividades) ? atividades.slice() : [])
      .filter(atividadeEhFuturaOuEmAndamento)
      .sort(compararAtividadesPorInicio);
  }

  function atividadeEhFuturaOuEmAndamento(atividade) {
    var inicio = obterInicioAtividadeMs(atividade) || obterDataAtividadeMs(atividade);
    var fim = obterFimAtividadeMs(atividade) || obterFimDoDiaAtividadeMs(atividade);
    var agora = obterTempoCacheAtual();

    if (!inicio || ehAtividadeCancelada(atividade) || ehAtividadeRealizadaOuEncerrada(atividade)) {
      return false;
    }

    if (fim) {
      return fim >= agora;
    }

    return inicio > agora;
  }

  function obterHistoricoAtividades(atividades) {
    var agora = obterTempoCacheAtual();

    return (Array.isArray(atividades) ? atividades : [])
      .filter(function filtrarHistorico(atividade) {
        var inicio = obterInicioAtividadeMs(atividade) || obterDataAtividadeMs(atividade);
        var fim = obterFimAtividadeMs(atividade);

        if (!inicio) {
          return false;
        }

        if (ehAtividadeCancelada(atividade)) {
          return false;
        }

        if (ehAtividadeRealizadaOuEncerrada(atividade)) {
          return true;
        }

        return fim ? fim < agora : inicio < agora;
      })
      .sort(compararAtividadesPorInicioDesc);
  }

  function aplicarFiltrosProximasAtividades(atividades) {
    var filtroMes = String(filtrosProximasAtividades.mes || '').trim();

    return (Array.isArray(atividades) ? atividades : []).filter(function filtrar(atividade) {
      return !filtroMes || obterValorFiltroMesAtividade(atividade) === filtroMes;
    });
  }

  function aplicarFiltrosHistoricoAtividades(atividades) {
    var filtroTipo = String(filtrosHistoricoAtividades.tipoSubtipo || '').trim();
    var filtroEixo = String(filtrosHistoricoAtividades.eixo || '').trim();
    var filtroCicloSemestre = String(filtrosHistoricoAtividades.cicloSemestre || '').trim();

    return (Array.isArray(atividades) ? atividades : []).filter(function filtrar(atividade) {
      if (filtrosHistoricoAtividades.somenteApresentacoes && !atividadePossuiApresentacoes(atividade)) {
        return false;
      }

      if (filtroTipo && obterValorFiltroTipoAtividade(atividade) !== filtroTipo) {
        return false;
      }

      if (filtroEixo && obterValorFiltroEixoAtividade(atividade) !== filtroEixo) {
        return false;
      }

      if (filtroCicloSemestre && obterValorFiltroCicloSemestreAtividade(atividade) !== filtroCicloSemestre) {
        return false;
      }

      return true;
    });
  }

  function montarFiltrosHistoricoAtividades(atividades) {
    var ciclosSemestres = obterOpcoesUnicas(atividades, obterValorFiltroCicloSemestreAtividade);
    var tipos = obterOpcoesUnicas(atividades, obterValorFiltroTipoAtividade);
    var eixos = obterOpcoesUnicas(atividades, obterValorFiltroEixoAtividade);

    return [
      '<div class="activity-history-filters" aria-label="Filtros do historico de atividades">',
      '<label>',
      '<span>Ciclo/semestre</span>',
      '<select data-history-filter="cicloSemestre">',
      '<option value="">Todos</option>',
      ciclosSemestres.map(function montarOpcao(valor) {
        return '<option value="' + ui.escaparHtml(valor) + '"' +
          (valor === filtrosHistoricoAtividades.cicloSemestre ? ' selected' : '') +
          '>' + ui.escaparHtml(valor) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '<label>',
      '<span>Tipo/subtipo</span>',
      '<select data-history-filter="tipoSubtipo">',
      '<option value="">Todos</option>',
      tipos.map(function montarOpcao(valor) {
        return '<option value="' + ui.escaparHtml(valor) + '"' +
          (valor === filtrosHistoricoAtividades.tipoSubtipo ? ' selected' : '') +
          '>' + ui.escaparHtml(valor) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '<label>',
      '<span>Eixo tematico</span>',
      '<select data-history-filter="eixo">',
      '<option value="">Todos</option>',
      eixos.map(function montarOpcao(valor) {
        return '<option value="' + ui.escaparHtml(valor) + '"' +
          (valor === filtrosHistoricoAtividades.eixo ? ' selected' : '') +
          '>' + ui.escaparHtml(valor) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '<label class="activity-history-check">',
      '<input type="checkbox" data-history-filter="somenteApresentacoes"' +
        (filtrosHistoricoAtividades.somenteApresentacoes ? ' checked' : '') +
        '>',
      '<span>Somente apresentacoes</span>',
      '</label>',
      '</div>'
    ].join('');
  }

  function montarFiltrosProximasAtividades(atividades) {
    var meses = obterOpcoesUnicas(atividades, obterValorFiltroMesAtividade);

    if (!meses.length) {
      return '';
    }

    return [
      '<div class="activity-history-filters activity-upcoming-filters" aria-label="Filtros de próximas atividades">',
      '<label>',
      '<span>Mês</span>',
      '<select data-upcoming-filter="mes">',
      '<option value="">Todos</option>',
      meses.map(function montarOpcao(valor) {
        return '<option value="' + ui.escaparHtml(valor) + '"' +
          (valor === filtrosProximasAtividades.mes ? ' selected' : '') +
          '>' + ui.escaparHtml(formatarRotuloMesAtividade(valor)) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '</div>'
    ].join('');
  }

  function registrarEventosFiltrosHistorico(container, atividades, modo) {
    if (modo !== MODO_ATIVIDADES_HISTORICO) {
      return;
    }

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-history-filter]'),
      function registrarFiltro(campo) {
        campo.addEventListener('change', function atualizarFiltro() {
          var chave = campo.getAttribute('data-history-filter');

          if (chave === 'somenteApresentacoes') {
            filtrosHistoricoAtividades.somenteApresentacoes = campo.checked === true;
          } else {
            filtrosHistoricoAtividades[chave] = campo.value || '';
          }

          renderizarAtividades(container, atividades, modo);
        });
      }
    );
  }

  function registrarEventosFiltrosProximas(container, atividades, modo) {
    if (modo === MODO_ATIVIDADES_HISTORICO) {
      return;
    }

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-upcoming-filter]'),
      function registrarFiltro(campo) {
        campo.addEventListener('change', function atualizarFiltro() {
          var chave = campo.getAttribute('data-upcoming-filter');
          filtrosProximasAtividades[chave] = campo.value || '';
          renderizarAtividades(container, atividades, modo);
        });
      }
    );
  }

  function obterOpcoesUnicas(atividades, extrator) {
    var mapa = {};

    (Array.isArray(atividades) ? atividades : []).forEach(function guardar(atividade) {
      var valor = extrator(atividade);

      if (valor) {
        mapa[valor] = true;
      }
    });

    return Object.keys(mapa).sort(function ordenar(a, b) {
      return a.localeCompare(b);
    });
  }

  function obterValorFiltroTipoAtividade(atividade) {
    return [
      obterCampoTextoAtividade(atividade, ['tipoPublico', 'tipoAtividade']),
      obterCampoTextoAtividade(atividade, ['subtipoAtividade'])
    ].filter(Boolean).join(' / ');
  }

  function obterValorFiltroEixoAtividade(atividade) {
    return obterCampoTextoAtividade(atividade, ['eixoTematicoPrincipal', 'eixoPrincipal', 'eixoTematico']);
  }

  function obterValorFiltroMesAtividade(atividade) {
    var inicio = obterInicioAtividadeMs(atividade) || obterDataAtividadeMs(atividade);
    var data;
    var ano;
    var mes;

    if (!inicio) {
      return '';
    }

    data = new Date(inicio);
    if (Number.isNaN(data.getTime())) {
      return '';
    }

    ano = data.getFullYear();
    mes = String(data.getMonth() + 1).padStart(2, '0');
    return ano + '-' + mes;
  }

  function formatarRotuloMesAtividade(valor) {
    var partes = String(valor || '').split('-');
    var nomes = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro'
    ];
    var ano = partes[0];
    var mes = Number(partes[1]) - 1;

    if (!ano || mes < 0 || mes > 11) {
      return valor || '';
    }

    return nomes[mes] + '/' + ano;
  }

  function obterValorFiltroCicloSemestreAtividade(atividade) {
    var rotulo = obterCampoTextoAtividade(atividade, ['rotuloSemestre']);
    var ano = obterCampoTextoAtividade(atividade, [
      'ano',
      'anoAtividade',
      'anoLetivo'
    ]);
    var semestre = obterCampoTextoAtividade(atividade, [
      'semestre',
      'semestreAtividade',
      'semestreLetivo'
    ]);
    var rotuloNormalizado = normalizarRotuloCicloSemestre(rotulo);
    var rotuloPorAnoSemestre = montarRotuloCicloSemestre(ano, semestre);
    var rotuloPorData = montarRotuloCicloSemestrePorData(atividade);

    if (rotuloNormalizado) {
      return rotuloNormalizado;
    }

    if (rotuloPorAnoSemestre) {
      return rotuloPorAnoSemestre;
    }

    return rotuloPorData || 'Sem semestre definido';
  }

  function normalizarRotuloCicloSemestre(valor) {
    var texto = String(valor || '').trim();

    return /^\d{4}\/[12]$/.test(texto) ? texto : '';
  }

  function montarRotuloCicloSemestre(ano, semestre) {
    var anoNormalizado = String(ano || '').trim();
    var semestreNormalizado = String(semestre || '').trim();
    var rotulo;

    if (!/^\d{4}$/.test(anoNormalizado) || !/^[12]$/.test(semestreNormalizado)) {
      return '';
    }

    rotulo = anoNormalizado + '/' + semestreNormalizado;
    return normalizarRotuloCicloSemestre(rotulo);
  }

  function montarRotuloCicloSemestrePorData(atividade) {
    var data = String((atividade && (atividade.dataAtividade || atividade.data)) || '').trim();
    var matchIso = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
    var matchBr = data.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    var dataHora;
    var ano;
    var semestre;

    if (matchIso) {
      ano = matchIso[1];
      semestre = Number(matchIso[2]) <= 6 ? '1' : '2';
      return montarRotuloCicloSemestre(ano, semestre);
    }

    if (matchBr) {
      ano = matchBr[3];
      semestre = Number(matchBr[2]) <= 6 ? '1' : '2';
      return montarRotuloCicloSemestre(ano, semestre);
    }

    dataHora = new Date(data);
    if (Number.isNaN(dataHora.getTime())) {
      return '';
    }

    ano = String(dataHora.getFullYear());
    semestre = dataHora.getMonth() <= 5 ? '1' : '2';
    return montarRotuloCicloSemestre(ano, semestre);
  }

  function ehAtividadeRealizadaOuCancelada(atividade) {
    return ehAtividadeRealizadaOuEncerrada(atividade) || ehAtividadeCancelada(atividade);
  }

  function ehAtividadeRealizadaOuEncerrada(atividade) {
    var status = obterStatusAtividadeNormalizado(atividade);

    return [
      'REALIZADA',
      'ENCERRADA',
      'FINALIZADA',
      'ARQUIVADA'
    ].indexOf(status) >= 0;
  }

  function ehAtividadeCancelada(atividade) {
    var status = obterStatusAtividadeNormalizado(atividade);

    return [
      'CANCELADA',
      'CANCELADO',
      'INATIVA',
      'EXCLUIDA',
      'SUSPENSA'
    ].indexOf(status) >= 0;
  }

  function obterStatusAtividade(atividade) {
    return obterCampoTextoAtividade(atividade, [
      'statusOperacional',
      'statusPublico',
      'status'
    ]);
  }

  function obterStatusAtividadeNormalizado(atividade) {
    return String(obterStatusAtividade(atividade) || '').trim().toUpperCase();
  }

  function montarCardAtividade(atividade, destaque, modo) {
    var historico = modo === MODO_ATIVIDADES_HISTORICO;
    var possuiApresentacao = atividadePossuiApresentacoes(atividade);

    return [
      '<article class="activity-card' + (destaque ? ' activity-card-featured' : '') +
        (possuiApresentacao ? ' activity-card-with-presentation' : '') +
        '" data-id-atividade="' + ui.escaparHtml(atividade.idAtividade) + '">',
      '<div class="activity-card-main">',
      '<div>',
      '<p class="activity-date">' + ui.escaparHtml(ui.formatarData(atividade.dataAtividade)) + ' · ' + ui.escaparHtml(atividade.diaSemana) + '</p>',
      '<h3>' + ui.escaparHtml(atividade.tituloPublico) + '</h3>',
      '<p class="activity-meta">' + ui.escaparHtml(montarMetaAtividade(atividade)) + '</p>',
      '</div>',
      '<div class="activity-status-stack">',
      '<span class="status-pill">' + ui.escaparHtml(ui.formatarRotulo(obterStatusAtividade(atividade))) + '</span>',
      atividade.statusChamadaRotulo
        ? '<span class="status-pill status-pill-muted">' + ui.escaparHtml(atividade.statusChamadaRotulo) + '</span>'
        : '',
      '</div>',
      '</div>',
      '<dl class="activity-facts">',
      montarFato('Tipo', atividade.tipoPublico),
      montarFato('Formato', ui.formatarRotulo(atividade.formato)),
      possuiApresentacao ? '' : montarFatoOpcional('Eixo principal', obterCampoTextoAtividade(atividade, ['eixoTematicoPrincipal', 'eixoPrincipal', 'eixoTematico'])),
      possuiApresentacao ? '' : montarFatoOpcional('Eixo secundario', obterCampoTextoAtividade(atividade, ['eixoTematicoSecundario', 'eixoSecundario'])),
      possuiApresentacao ? '' : montarFatoOpcional('Pessoa principal', montarPessoaPrincipalAtividade(atividade)),
      montarFato('Presença', ui.formatarBooleano(atividade.contaPresenca)),
      montarFato('Falta', ui.formatarBooleano(atividade.contaFalta)),
      montarFato('Certificado', ui.formatarBooleano(atividade.geraCertificado)),
      montarFato('Carga horária', atividade.cargaHoraria + ' h'),
      '</dl>',
      montarBlocoApresentacoesCard(atividade),
      historico ? '' : montarAvisoChamada(atividade, destaque),
      '<div class="activity-actions">',
      montarBotaoDetalhes(atividade),
      montarAcaoJustificativaPrevia(atividade, modo),
      montarBotaoChamada(atividade, modo),
      '</div>',
      '</article>'
    ].join('');
  }

  function montarMetaAtividade(atividade) {
    var horarios = [
      atividade.horarioInicio,
      atividade.horarioFim
    ].filter(Boolean).join(' às ');
    var partes = [
      horarios || atividade.horarioCompleto,
      atividade.local
    ].filter(Boolean);

    return partes.join(' · ');
  }

  function obterProximaAtividade(atividades) {
    return (Array.isArray(atividades) ? atividades : [])
      .filter(atividadeEhFuturaOuEmAndamento)
      .sort(compararAtividadesPorInicio)[0] || null;
  }

  function compararAtividadesPorInicio(a, b) {
    var inicioA = obterInicioAtividadeMs(a) || Number.MAX_SAFE_INTEGER;
    var inicioB = obterInicioAtividadeMs(b) || Number.MAX_SAFE_INTEGER;

    return inicioA - inicioB;
  }

  function compararAtividadesPorInicioDesc(a, b) {
    var inicioA = obterInicioAtividadeMs(a) || obterDataAtividadeMs(a) || 0;
    var inicioB = obterInicioAtividadeMs(b) || obterDataAtividadeMs(b) || 0;

    return inicioB - inicioA;
  }

  function obterInicioAtividadeMs(atividade) {
    return obterTimestampAtividade(atividade, [
      'dataHoraInicio',
      'inicioEm',
      'inicio',
      'horarioInicio'
    ]);
  }

  function obterFimAtividadeMs(atividade) {
    return obterTimestampAtividade(atividade, [
      'dataHoraFim',
      'fimEm',
      'fim',
      'horarioFim'
    ]);
  }

  function obterDataAtividadeMs(atividade) {
    var data = String((atividade && (atividade.dataAtividade || atividade.data)) || '').trim();
    var dataHora;

    if (!data) {
      return 0;
    }

    dataHora = new Date(data + 'T00:00:00');
    return Number.isNaN(dataHora.getTime()) ? 0 : dataHora.getTime();
  }

  function obterFimDoDiaAtividadeMs(atividade) {
    var data = String((atividade && (atividade.dataAtividade || atividade.data)) || '').trim();
    var dataHora;

    if (!data) {
      return 0;
    }

    dataHora = new Date(data + 'T23:59:59');
    return Number.isNaN(dataHora.getTime()) ? 0 : dataHora.getTime();
  }

  function obterTimestampAtividade(atividade, campos) {
    var dados = atividade || {};
    var direto = campos
      .map(function obterCampo(campo) {
        return dados[campo];
      })
      .filter(Boolean)[0];
    var data = String(dados.dataAtividade || dados.data || '').trim();
    var dataHora;

    if (direto && String(direto).indexOf('-') >= 0) {
      dataHora = new Date(direto);
      return Number.isNaN(dataHora.getTime()) ? 0 : dataHora.getTime();
    }

    if (!data || !direto) {
      return 0;
    }

    dataHora = new Date(data + 'T' + normalizarHorario(direto));
    return Number.isNaN(dataHora.getTime()) ? 0 : dataHora.getTime();
  }

  function normalizarHorario(valor) {
    var texto = String(valor || '').trim().toLowerCase();
    var match = texto.match(/(\d{1,2})(?:h|:)?(\d{2})?/);
    var hora;
    var minuto;

    if (!match) {
      return '00:00:00';
    }

    hora = Math.max(Math.min(Number(match[1]) || 0, 23), 0);
    minuto = Math.max(Math.min(Number(match[2]) || 0, 59), 0);

    return String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0') + ':00';
  }

  function montarAvisoChamada(atividade, destaque) {
    var acao = avaliarAcaoChamada(atividade);

    if (!destaque || acao.visivel || !acao.disponivelEm) {
      return '';
    }

    return '<p class="activity-attendance-note">' +
      ui.escaparHtml('Chamada disponível a partir de ' + formatarDataHoraCurta(acao.disponivelEm) + '.') +
      '</p>';
  }

  function montarFato(rotulo, valor) {
    return [
      '<div>',
      '<dt>' + ui.escaparHtml(rotulo) + '</dt>',
      '<dd>' + ui.escaparHtml(valor || '-') + '</dd>',
      '</div>'
    ].join('');
  }

  function montarFatoOpcional(rotulo, valor) {
    return valor ? montarFato(rotulo, valor) : '';
  }

  function montarBlocoApresentacoesCard(atividade) {
    var qtd = obterQtdApresentacoesAtividade(atividade);
    var resumo = obterCampoTextoAtividade(atividade, ['resumoApresentacoesPublico', 'resumoApresentacoes']);
    var pessoa = montarPessoaPrincipalAtividade(atividade);
    var eixo = [
      obterCampoTextoAtividade(atividade, ['eixoTematicoPrincipal', 'eixoPrincipal', 'eixoTematico']),
      obterCampoTextoAtividade(atividade, ['eixoTematicoSecundario', 'eixoSecundario'])
    ].filter(Boolean).join(' / ');

    if (!atividadePossuiApresentacoes(atividade)) {
      return '';
    }

    return [
      '<div class="activity-presentation-summary">',
      '<span class="status-pill status-pill-muted">' +
        ui.escaparHtml(qtd > 1 ? 'Apresentacoes vinculadas' : 'Apresentacao vinculada') +
        '</span>',
      qtd > 1
        ? '<strong>' + ui.escaparHtml(qtd + ' apresentacoes vinculadas') + '</strong>'
        : '<strong>' + ui.escaparHtml(resumo || 'Apresentacao vinculada') + '</strong>',
      pessoa ? '<small>' + ui.escaparHtml(pessoa) + '</small>' : '',
      qtd > 1 && resumo ? '<small>' + ui.escaparHtml(resumo) + '</small>' : '',
      eixo ? '<small>' + ui.escaparHtml(eixo) + '</small>' : '',
      '</div>'
    ].join('');
  }

  function obterTituloApresentacao(apresentacao) {
    return obterCampoTextoAtividade(apresentacao, ['titulo', 'tema', 'tituloPublico', 'resumoPublico']);
  }

  function montarPessoaPrincipalApresentacao(apresentacao) {
    var nome = obterCampoTextoAtividade(apresentacao, ['nomeApresentador', 'apresentadorPublico', 'nomePessoaPrincipalPublico', 'nomePublico', 'nome']);
    var papel = obterCampoTextoAtividade(apresentacao, ['papelPessoaPrincipal', 'papelApresentador', 'papel']);
    var tipo = obterCampoTextoAtividade(apresentacao, ['tipoPessoaPrincipal', 'tipoApresentador', 'tipoPessoa']);

    return [
      nome,
      [papel, tipo].filter(Boolean).join(' / ')
    ].filter(Boolean).join(' - ');
  }

  function montarEixoApresentacao(apresentacao) {
    return [
      obterCampoTextoAtividade(apresentacao, ['eixoTematicoPrincipal', 'eixoPrincipal', 'eixoTematico']),
      obterCampoTextoAtividade(apresentacao, ['eixoTematicoSecundario', 'eixoSecundario'])
    ].filter(Boolean).join(' / ');
  }

  function montarPessoaPrincipalAtividade(atividade) {
    var nome = obterCampoTextoAtividade(atividade, ['nomePessoaPrincipalPublico', 'pessoaPrincipalPublica']);
    var papel = obterCampoTextoAtividade(atividade, ['papelPessoaPrincipal', 'papelApresentador']);
    var tipo = obterCampoTextoAtividade(atividade, ['tipoPessoaPrincipal', 'tipoApresentador']);

    return [
      nome,
      [papel, tipo].filter(Boolean).join(' / ')
    ].filter(Boolean).join(' - ');
  }

  function atividadePossuiApresentacoes(atividade) {
    var qtd = obterQtdApresentacoesAtividade(atividade);
    var flag = atividade && atividade.possuiApresentacoes === true;

    return Boolean(flag || qtd > 0);
  }

  function obterQtdApresentacoesAtividade(atividade) {
    var direto = Number(atividade && atividade.qtdApresentacoes);
    var apresentacoes = obterApresentacoesPublicas(atividade);

    if (Number.isFinite(direto) && direto > 0) {
      return direto;
    }

    return apresentacoes.length;
  }

  function obterCampoTextoAtividade(dados, chaves) {
    var origem = dados || {};
    var keys = Object.keys(origem);

    for (var i = 0; i < chaves.length; i++) {
      var alvo = normalizarChaveAtividade(chaves[i]);

      for (var j = 0; j < keys.length; j++) {
        if (normalizarChaveAtividade(keys[j]) === alvo) {
          return String(origem[keys[j]] || '').trim();
        }
      }
    }

    return '';
  }

  function normalizarChaveAtividade(chave) {
    return String(chave || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  function obterApresentacoesPublicas(dados) {
    return normalizarListaPublicaAtividade(
      (dados && (dados.apresentacoesPublicas || dados.apresentacoesPublicasJson || dados.APRESENTACOES_PUBLICAS_JSON)) || []
    );
  }

  function obterEnvolvidosPublicos(dados) {
    return normalizarListaPublicaAtividade(
      (dados && (dados.envolvidosPublicos || dados.envolvidosPublicosJson || dados.ENVOLVIDOS_PUBLICOS_JSON)) || []
    );
  }

  function normalizarListaPublicaAtividade(valor) {
    if (Array.isArray(valor)) {
      return valor.filter(Boolean);
    }

    if (valor && typeof valor === 'object') {
      return [valor];
    }

    if (typeof valor === 'string' && valor.trim()) {
      try {
        var parsed = JSON.parse(valor);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (erro) {
        return [];
      }
    }

    return [];
  }

  function montarBotaoDetalhes(atividade) {
    if (!auth.canViewActivityDetails(atividade)) {
      return '';
    }

    return [
      '<button class="secondary-button compact-button" type="button" data-activity-details="',
      ui.escaparHtml(atividade.idAtividade),
      '">Ver detalhes</button>'
    ].join('');
  }

  function montarAcaoJustificativaPrevia(atividade, modo) {
    if (modo === MODO_ATIVIDADES_HISTORICO) {
      return '';
    }

    if (atividade.justificativaPreviaEnviada === true) {
      return [
        '<span class="status-pill status-pill-muted" title="',
        ui.escaparHtml(atividade.mensagemJustificativaPrevia || 'Acompanhe em Meu vinculo > Minhas justificativas.'),
        '">',
        ui.escaparHtml(formatarStatusJustificativaPrevia(atividade.statusJustificativaPrevia)),
        '</span>'
      ].join('');
    }

    if (atividade.podeJustificarAusenciaFutura !== true) {
      return '';
    }

    return [
      '<button class="secondary-button compact-button" type="button" data-activity-justify-future="',
      ui.escaparHtml(atividade.idAtividade),
      '">Justificar ausencia futura</button>'
    ].join('');
  }

  function formatarStatusJustificativaPrevia(status) {
    var normalizado = String(status || '').trim();

    if (!normalizado) {
      return 'Justificativa previa enviada';
    }

    return 'Justificativa previa: ' + ui.formatarRotulo(normalizado);
  }

  function montarBotaoChamada(atividade, modo) {
    var acao = modo === MODO_ATIVIDADES_HISTORICO
      ? avaliarVisualizacaoChamadaHistorica(atividade)
      : avaliarAcaoChamada(atividade);

    if (!acao.visivel) {
      return '';
    }

    return [
      '<button class="secondary-button compact-button" type="button" data-activity-attendance="',
      ui.escaparHtml(atividade.idAtividade),
      '"',
      acao.desabilitado ? ' disabled' : '',
      acao.motivo ? ' title="' + ui.escaparHtml(acao.motivo) + '"' : '',
      '>' + ui.escaparHtml(acao.rotulo) + '</button>'
    ].join('');
  }

  function avaliarVisualizacaoChamadaHistorica(atividade) {
    if (!auth.canRegisterAttendance(atividade) || !podeVisualizarChamada(atividade)) {
      return { visivel: false };
    }

    return {
      visivel: true,
      desabilitado: false,
      rotulo: 'Visualizar chamada'
    };
  }

  function avaliarAcaoChamada(atividade) {
    var janela;

    if (!auth.canRegisterAttendance(atividade)) {
      return { visivel: false };
    }

    if (podeVisualizarChamada(atividade)) {
      return {
        visivel: true,
        desabilitado: false,
        rotulo: 'Visualizar chamada'
      };
    }

    if (atividade && atividade.podeRegistrarChamadaAgora === true) {
      return {
        visivel: true,
        desabilitado: false,
        rotulo: 'Registrar chamada'
      };
    }

    janela = avaliarJanelaChamada(atividade);

    if (janela.dentro) {
      return {
        visivel: true,
        desabilitado: false,
        rotulo: 'Registrar chamada'
      };
    }

    return {
      visivel: false,
      disponivelEm: janela.disponivelEm,
      motivo: janela.motivo
    };
  }

  function podeVisualizarChamada(atividade) {
    var status = String((atividade && atividade.statusChamada) || '').trim().toUpperCase();

    return Boolean(
      atividade &&
      (
        atividade.podeVisualizarChamada === true ||
        atividade.chamadaFinalizada === true ||
        status === 'SALVA' ||
        status === 'FINALIZADA' ||
        status === 'ENCERRADA'
      )
    );
  }

  function avaliarJanelaChamada(atividade) {
    var inicio = obterInicioAtividadeMs(atividade);
    var fim = obterFimAtividadeMs(atividade) || inicio;
    var agora = obterTempoCacheAtual();
    var antecedencia = obterNumeroConfigAtividade(
      atividade,
      ['chamadaAntecedenciaMinutos', 'janelaChamadaMinutos', 'atividadesChamadaAntecedenciaMinutos'],
      CHAMADA_ANTECEDENCIA_PADRAO_MINUTOS
    );
    var tolerancia = obterNumeroConfigAtividade(
      atividade,
      ['chamadaToleranciaPosMinutos', 'atividadesChamadaToleranciaPosMinutos'],
      CHAMADA_TOLERANCIA_PADRAO_MINUTOS
    );
    var disponivelEm = obterTimestampDireto(atividade && atividade.chamadaDisponivelEm) ||
      (inicio ? inicio - antecedencia * 60 * 1000 : 0);
    var encerraEm = fim ? fim + tolerancia * 60 * 1000 : 0;

    if (!inicio || !disponivelEm) {
      return {
        dentro: atividade && atividade.podeRegistrarChamada === true,
        disponivelEm: 0,
        motivo: ''
      };
    }

    if (agora >= disponivelEm && (!encerraEm || agora <= encerraEm)) {
      return {
        dentro: true,
        disponivelEm: disponivelEm,
        motivo: ''
      };
    }

    return {
      dentro: false,
      disponivelEm: disponivelEm,
      motivo: agora < disponivelEm
        ? 'Chamada ainda fora da janela operacional.'
        : 'Janela operacional da chamada encerrada.'
    };
  }

  function obterNumeroConfigAtividade(atividade, chaves, padrao) {
    var dados = atividade || {};
    var config = dados.portalConfig || dados.config || {};
    var valor;

    for (var i = 0; i < chaves.length; i++) {
      valor = dados[chaves[i]];

      if (valor === undefined && config) {
        valor = config[chaves[i]];
      }

      if (valor !== undefined && valor !== null && valor !== '') {
        valor = Number(valor);
        return Number.isFinite(valor) && valor >= 0 ? valor : padrao;
      }
    }

    return padrao;
  }

  function obterTimestampDireto(valor) {
    var data;

    if (!valor) {
      return 0;
    }

    data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  function montarBotaoMock(rotulo, permitido) {
    if (!permitido) {
      return '';
    }

    return '<button class="secondary-button compact-button" type="button" disabled>' +
      ui.escaparHtml(rotulo) +
      '</button>';
  }

  function abrirModalCriarAtividade() {
    var modal = document.getElementById('atividade-modal');
    var conteudo = document.getElementById('atividade-modal-content');

    if (!modal || !conteudo || !auth.canCreateActivity()) {
      return;
    }

    definirTituloModal('Nova atividade');
    conteudo.innerHTML = '<p class="loading-state">Carregando modelos homologados...</p>';
    modal.hidden = false;
    document.body.classList.add('modal-open');

    carregarModelosCriacaoAtividade().then(function renderizar(modelos) {
      if (!modelos.length) {
        conteudo.innerHTML = '<p class="empty-state">Nenhum modelo homologado esta disponivel para seu perfil.</p>';
        return;
      }
      conteudo.innerHTML = montarFormularioCriarAtividade(modelos);
      var form = conteudo.querySelector('[data-activity-form="criar-atividade"]');
      var select = form && form.querySelector('[name="idConfig"]');
      if (select) {
        select.addEventListener('change', function atualizarModelo() {
          var modelo = obterModeloCriacaoPorId(select.value);
          atualizarFormularioCriacaoPorModelo(form, modelo);
          if (ehModeloApresentacaoMembro(modelo)) {
            carregarMembrosApresentadores(form, modelo).catch(function ignorarFalhaExibida() {});
          }
        });
      }
      var campoData = form && form.elements.dataAtividade;
      if (campoData) {
        campoData.addEventListener('change', function atualizarMembrosPorCiclo() {
          var modelo = obterModeloCriacaoPorId(form.elements.idConfig.value);
          if (ehModeloApresentacaoMembro(modelo)) {
            carregarMembrosApresentadores(form, modelo, true).catch(function ignorarFalhaExibida() {});
          }
        });
      }
    }).catch(function falhar(erro) {
      conteudo.innerHTML = '<p class="error-state">' + ui.escaparHtml(erro.message || 'Nao foi possivel carregar os modelos.') + '</p>';
    });
  }

  function carregarModelosCriacaoAtividade() {
    if (modelosCriacaoAtividadeCache.length && modelosCriacaoAtividadeExpiraEm > Date.now()) {
      return Promise.resolve(modelosCriacaoAtividadeCache.slice());
    }
    if (modelosCriacaoAtividadePromise) return modelosCriacaoAtividadePromise;

    modelosCriacaoAtividadePromise = api.apiGet('/atividades/modelos', {}).then(function tratar(resposta) {
      if (!resposta.ok) throw criarErroAtividade(resposta);
      modelosCriacaoAtividadeCache = resposta.data && Array.isArray(resposta.data.modelos)
        ? resposta.data.modelos.slice()
        : [];
      modelosCriacaoAtividadeExpiraEm = Date.now() + ATIVIDADES_CACHE_TTL_MS;
      return modelosCriacaoAtividadeCache.slice();
    }).finally(function finalizar() {
      modelosCriacaoAtividadePromise = null;
    });
    return modelosCriacaoAtividadePromise;
  }

  function obterModeloCriacaoPorId(idConfig) {
    return modelosCriacaoAtividadeCache.find(function encontrar(modelo) {
      return modelo.idConfig === idConfig;
    }) || null;
  }

  function montarFormularioCriarAtividade(modelos) {
    return [
      '<p class="eyebrow">Gestao de atividades</p>',
      '<h3>Criar atividade por modelo</h3>',
      '<p class="section-note">As regras desta atividade vem do modelo homologado. Alteracoes sensiveis devem seguir fluxo de excecao.</p>',
      '<form class="readonly-form activity-create-form" data-activity-form="criar-atividade">',
      '<section class="activity-detail-section">',
      '<h4>Modelo da atividade</h4>',
      '<label><span>Modelo <span class="required-marker">*</span></span>',
      '<select name="idConfig" required>',
      '<option value="">Selecione um modelo homologado</option>',
      montarOpcoesModelosCriacao(modelos),
      '</select>',
      '</label>',
      '<div data-modelo-padroes><p class="section-note">Selecione um modelo para conferir os padroes aplicados.</p></div>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h4>Dados da ocorrencia</h4>',
      '<label data-modelo-titulo><span>Titulo publico <span class="required-marker" data-required-titulo>*</span></span>',
      '<input name="tituloPublico" type="text" required maxlength="180">',
      '</label>',
      '<label data-modelo-descricao-publica>Descricao publica',
      '<textarea name="descricaoPublica" rows="3"></textarea>',
      '</label>',
      '<label data-modelo-descricao-interna>Descricao interna',
      '<textarea name="descricaoInterna" rows="3"></textarea>',
      '</label>',
      '<label><span>Formato <span class="required-marker">*</span></span>',
      '<select name="formato" required>',
      montarOpcoesSelecao([
        ['PRESENCIAL', 'Presencial'],
        ['REMOTO', 'Remoto'],
        ['HIBRIDO', 'Hibrido']
      ], 'PRESENCIAL'),
      '</select>',
      '</label>',
      '<label><span>Local <span class="required-marker">*</span></span>',
      '<input name="local" type="text" required>',
      '</label>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h4>Data e horario</h4>',
      '<label><span>Data da atividade <span class="required-marker">*</span></span>',
      '<input name="dataAtividade" type="date" required>',
      '</label>',
      '<label><span>Horario de inicio <span class="required-marker">*</span></span>',
      '<input name="horarioInicio" type="time" required>',
      '</label>',
      '<label><span>Horario de fim <span class="required-marker">*</span></span>',
      '<input name="horarioFim" type="time" required>',
      '</label>',
      '</section>',
      '<section class="activity-detail-section" data-modelo-eixos hidden>',
      '<h4>Eixo tematico</h4>',
      '<label data-modelo-eixo-principal><span>Eixo tematico principal <span class="required-marker" data-required-eixo>*</span></span>',
      '<input name="eixoTematicoPrincipal" type="text">',
      '</label>',
      '<label data-modelo-eixo-secundario>Eixo tematico secundario',
      '<input name="eixoTematicoSecundario" type="text">',
      '</label>',
      '</section>',
      '<section class="activity-detail-section" data-modelo-pessoa hidden>',
      '<h4 data-modelo-pessoa-titulo>Pessoa principal</h4>',
      '<label data-modelo-membro-apresentador hidden><span>Membro apresentador <span class="required-marker">*</span></span>',
      '<select data-modelo-membro-select><option value="">Selecione o membro apresentador</option></select>',
      '<small data-modelo-membro-status></small>',
      '</label>',
      '<label data-modelo-tipo-pessoa><span>Tipo da pessoa principal <span class="required-marker" data-required-tipo-pessoa>*</span></span>',
      '<select name="tipoPessoaPrincipal"></select>',
      '</label>',
      '<label data-modelo-nome-pessoa><span>Nome publico da pessoa principal <span class="required-marker" data-required-pessoa>*</span></span>',
      '<input name="nomePessoaPrincipalPublico" type="text">',
      '</label>',
      '<label data-modelo-id-pessoa>ID_PESSOA do membro',
      '<input name="idPessoaPrincipal" type="text">',
      '</label>',
      '<label data-modelo-rga-pessoa>RGA para conferencia',
      '<input name="rgaPessoaPrincipal" type="text">',
      '</label>',
      '<label data-modelo-email-pessoa><span>E-mail da pessoa principal <span class="required-marker" data-required-email-pessoa>*</span></span>',
      '<input name="emailPessoaPrincipal" type="email">',
      '</label>',
      '<label data-modelo-papel-pessoa>Papel da pessoa principal',
      '<input name="papelPessoaPrincipal" type="text" placeholder="Ex.: PALESTRANTE">',
      '</label>',
      '<label data-modelo-instituicao-pessoa><span>Instituicao da pessoa principal <span class="required-marker" data-required-instituicao-pessoa>*</span></span>',
      '<input name="instituicaoPessoaPrincipal" type="text">',
      '</label>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h4>Dados complementares</h4>',
      '<label data-modelo-responsavel-interno>Responsavel interno',
      '<input name="responsavelInterno" type="text">',
      '</label>',
      '<label data-modelo-responsavel-email>E-mail do responsavel',
      '<input name="responsavelEmail" type="email">',
      '</label>',
      '<label>Publico-alvo',
      '<input name="publicoAlvo" type="text">',
      '</label>',
      '<label>Observacoes internas',
      '<textarea name="observacoes" rows="3"></textarea>',
      '</label>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h4>Publicacao inicial</h4>',
      '<dl class="activity-detail-grid">',
      montarFato('Status operacional', 'Planejada'),
      montarFato('Publicacao no portal', 'Rascunho'),
      montarFato('Visibilidade', 'Diretoria'),
      '</dl>',
      '<p class="simulation-warning">Esses valores sao fixos neste pacote e serao validados novamente pelo backend.</p>',
      '</section>',
      '<p class="section-note"><span class="required-marker">*</span> campo obrigatorio</p>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Validar e criar rascunho</button>',
      '<button class="secondary-button" type="button" data-activity-modal-close>Cancelar</button>',
      '</div>',
      '</form>'
    ].join('');
  }

  function montarOpcoesModelosCriacao(modelos) {
    var grupos = {};
    (modelos || []).forEach(function agrupar(modelo) {
      var grupo = modelo.grupoModelo || 'Outros';
      if (!grupos[grupo]) grupos[grupo] = [];
      grupos[grupo].push(modelo);
    });
    return Object.keys(grupos).sort().map(function montarGrupo(grupo) {
      var opcoes = grupos[grupo].map(function montarModelo(modelo) {
        return '<option value="' + ui.escaparHtml(modelo.idConfig) + '">' +
          ui.escaparHtml(modelo.nomeModeloPortal) +
          '</option>';
      }).join('');
      return '<optgroup label="' + ui.escaparHtml(grupo) + '">' + opcoes + '</optgroup>';
    }).join('');
  }

  function montarOpcoesSelecao(opcoes, valorAtual) {
    return (opcoes || []).map(function montar(opcao) {
      var valor = opcao[0];
      var rotulo = opcao[1];
      var selecionado = valor === valorAtual ? ' selected' : '';

      return '<option value="' + ui.escaparHtml(valor) + '"' + selecionado + '>' +
        ui.escaparHtml(rotulo) +
        '</option>';
    }).join('');
  }

  function atualizarFormularioCriacaoPorModelo(form, modelo) {
    var painel = form.querySelector('[data-modelo-padroes]');
    var secaoEixos = form.querySelector('[data-modelo-eixos]');
    var secaoPessoa = form.querySelector('[data-modelo-pessoa]');
    var eixoPrincipal = form.elements.eixoTematicoPrincipal;
    var eixoSecundario = form.elements.eixoTematicoSecundario;
    var titulo = form.elements.tituloPublico;
    var tipoPessoa = form.elements.tipoPessoaPrincipal;
    var idPessoa = form.elements.idPessoaPrincipal;
    var nomePessoa = form.elements.nomePessoaPrincipalPublico;
    var emailPessoa = form.elements.emailPessoaPrincipal;
    var instituicaoPessoa = form.elements.instituicaoPessoaPrincipal;
    var isMemberPresentation = ehModeloApresentacaoMembro(modelo);
    var tipoPessoaLabel = form.querySelector('[data-modelo-tipo-pessoa]');
    var nomePessoaLabel = form.querySelector('[data-modelo-nome-pessoa]');
    var idPessoaLabel = form.querySelector('[data-modelo-id-pessoa]');
    var rgaPessoaLabel = form.querySelector('[data-modelo-rga-pessoa]');
    var emailPessoaLabel = form.querySelector('[data-modelo-email-pessoa]');
    var papelPessoaLabel = form.querySelector('[data-modelo-papel-pessoa]');
    var instituicaoPessoaLabel = form.querySelector('[data-modelo-instituicao-pessoa]');
    var membroApresentadorLabel = form.querySelector('[data-modelo-membro-apresentador]');
    var pessoaTitulo = form.querySelector('[data-modelo-pessoa-titulo]');
    var responsavelInternoLabel = form.querySelector('[data-modelo-responsavel-interno]');
    var responsavelEmailLabel = form.querySelector('[data-modelo-responsavel-email]');
    var tituloLabel = form.querySelector('[data-modelo-titulo]');
    var descricaoPublicaLabel = form.querySelector('[data-modelo-descricao-publica]');
    var descricaoInternaLabel = form.querySelector('[data-modelo-descricao-interna]');

    if (!modelo) {
      painel.innerHTML = '<p class="section-note">Selecione um modelo para conferir os padroes aplicados.</p>';
      secaoEixos.hidden = true;
      secaoPessoa.hidden = true;
      return;
    }

    painel.innerHTML = montarPainelPadroesModelo(modelo);
    titulo.required = !isMemberPresentation && modelo.exigeTituloPublico === true;
    tituloLabel.hidden = isMemberPresentation;
    descricaoPublicaLabel.hidden = isMemberPresentation;
    descricaoInternaLabel.hidden = isMemberPresentation;
    if (isMemberPresentation) {
      titulo.value = '';
      form.elements.descricaoPublica.value = '';
      form.elements.descricaoInterna.value = '';
    }
    form.querySelector('[data-required-titulo]').hidden = !titulo.required;
    secaoEixos.hidden = isMemberPresentation || (!modelo.exigeEixoTematico && !modelo.permiteEixoSecundario);
    eixoPrincipal.required = !isMemberPresentation && modelo.exigeEixoTematico === true;
    form.querySelector('[data-required-eixo]').hidden = !eixoPrincipal.required;
    eixoSecundario.closest('label').hidden = isMemberPresentation || modelo.permiteEixoSecundario !== true;

    secaoPessoa.hidden = modelo.exigePessoaPrincipal !== true;
    pessoaTitulo.textContent = isMemberPresentation ? 'Membro apresentador' : 'Pessoa principal';
    membroApresentadorLabel.hidden = !isMemberPresentation;
    tipoPessoaLabel.hidden = isMemberPresentation || (modelo.tipoPessoaPrincipalPadrao || []).length === 1;
    nomePessoaLabel.hidden = isMemberPresentation;
    idPessoaLabel.hidden = isMemberPresentation;
    rgaPessoaLabel.hidden = isMemberPresentation;
    emailPessoaLabel.hidden = isMemberPresentation;
    papelPessoaLabel.hidden = isMemberPresentation;
    instituicaoPessoaLabel.hidden = isMemberPresentation;
    nomePessoa.required = !isMemberPresentation && modelo.exigePessoaPrincipal === true;
    emailPessoa.required = !isMemberPresentation && modelo.exigeEmailPessoaPrincipal === true;
    instituicaoPessoa.required = !isMemberPresentation && modelo.exigeInstituicaoPessoaPrincipal === true;
    montarTiposPessoaPrincipal(tipoPessoa, modelo.tipoPessoaPrincipalPadrao || []);
    idPessoa.required = !isMemberPresentation && (modelo.exigePessoaPrincipal === true &&
      (modelo.tipoPessoaPrincipalPadrao || []).indexOf('MEMBRO') >= 0 &&
      (modelo.tipoPessoaPrincipalPadrao || []).length === 1);
    form.querySelector('[data-required-pessoa]').hidden = !nomePessoa.required;
    form.querySelector('[data-required-email-pessoa]').hidden = !emailPessoa.required;
    form.querySelector('[data-required-instituicao-pessoa]').hidden = !instituicaoPessoa.required;
    form.querySelector('[data-required-tipo-pessoa]').hidden = !tipoPessoa.required;
    responsavelInternoLabel.hidden = isMemberPresentation;
    responsavelEmailLabel.hidden = isMemberPresentation;
    if (isMemberPresentation) {
      preencherMembroApresentadorSelecionado(form, '');
      form.elements.responsavelInterno.value = 'Secretaria GEAPA';
      form.elements.responsavelEmail.value = '';
      tipoPessoa.value = 'MEMBRO';
      form.elements.papelPessoaPrincipal.value = 'APRESENTADOR';
    } else if (form._membrosApresentadores) {
      preencherMembroApresentadorSelecionado(form, '');
      form._membrosApresentadores = null;
    }
  }

  function montarTiposPessoaPrincipal(select, tipos) {
    var lista = Array.isArray(tipos) ? tipos : [];
    select.innerHTML = '<option value="">Selecione</option>' + lista.map(function montar(tipo) {
      return '<option value="' + ui.escaparHtml(tipo) + '">' + ui.escaparHtml(tipo) + '</option>';
    }).join('');
    if (lista.length === 1) select.value = lista[0];
    select.required = lista.length > 1;
  }

  function ehModeloApresentacaoMembro(modelo) {
    return !!modelo && String(modelo.subtipoAtividade || '').toUpperCase() === 'APRESENTACAO_MEMBRO';
  }

  function carregarMembrosApresentadores(form, modelo, forceRefresh) {
    var select = form.querySelector('[data-modelo-membro-select]');
    var status = form.querySelector('[data-modelo-membro-status]');
    var referencia = form.elements.dataAtividade.value || '';
    var cacheKey = modelo.idConfig + '|' + (referencia || 'ATUAL');
    if (!forceRefresh && membrosApresentadoresCache[cacheKey]) {
      aplicarMembrosApresentadoresNoFormulario(form, membrosApresentadoresCache[cacheKey]);
      return Promise.resolve(membrosApresentadoresCache[cacheKey]);
    }

    form._membrosApresentadores = [];
    preencherMembroApresentadorSelecionado(form, '');
    select.disabled = true;
    select.innerHTML = '<option value="">Carregando membros...</option>';
    status.textContent = '';
    return api.apiGet('/atividades/modelo/membros-apresentadores', {
      idConfig: modelo.idConfig,
      referencia: referencia
    }).then(function tratar(resposta) {
      if (!resposta.ok) throw criarErroAtividade(resposta);
      var membros = resposta.data && Array.isArray(resposta.data.membros) ? resposta.data.membros : [];
      membrosApresentadoresCache[cacheKey] = membros;
      aplicarMembrosApresentadoresNoFormulario(form, membros);
      return membros;
    }).catch(function falhar(erro) {
      select.innerHTML = '<option value="">Nao foi possivel carregar os membros</option>';
      status.textContent = erro.message || 'Falha ao carregar membros apresentadores.';
      throw erro;
    }).finally(function finalizar() {
      select.disabled = false;
    });
  }

  function aplicarMembrosApresentadoresNoFormulario(form, membros) {
    var select = form.querySelector('[data-modelo-membro-select]');
    var status = form.querySelector('[data-modelo-membro-status]');
    form._membrosApresentadores = membros || [];
    preencherMembroApresentadorSelecionado(form, '');
    select.innerHTML = '<option value="">Selecione o membro apresentador</option>' +
      (membros || []).map(function montar(member) {
        var suffix = member.elegivelApresentacao
          ? ''
          : ' - ' + (member.situacaoApresentacaoNoCicloRotulo ||
            ('ja agendado no ciclo ' + (member.idCiclo || 'GEAPA')));
        return '<option value="' + ui.escaparHtml(member.idPessoa) + '"' +
          (member.elegivelApresentacao ? '' : ' disabled') + '>' +
          ui.escaparHtml(member.nomeExibicao + (member.rga ? ' (' + member.rga + ')' : '') + suffix) +
          '</option>';
      }).join('');
    select.required = true;
    var totalElegiveis = (membros || []).filter(function(member) {
      return member.elegivelApresentacao === true;
    }).length;
    status.textContent = totalElegiveis
      ? 'Selecione pelo nome. O RGA aparece apenas para conferencia.'
      : 'Nenhum membro elegivel foi encontrado para o ciclo.';
    select.onchange = function selecionar() {
      preencherMembroApresentadorSelecionado(form, select.value);
    };
  }

  function preencherMembroApresentadorSelecionado(form, idPessoa) {
    var member = (form._membrosApresentadores || []).find(function encontrar(item) {
      return item.idPessoa === idPessoa;
    }) || {};
    form.elements.idPessoaPrincipal.value = member.idPessoa || '';
    form.elements.nomePessoaPrincipalPublico.value = member.nomeExibicao || '';
    form.elements.rgaPessoaPrincipal.value = member.rga || '';
    form.elements.emailPessoaPrincipal.value = member.email || '';
    form.elements.tipoPessoaPrincipal.value = member.idPessoa ? 'MEMBRO' : '';
    form.elements.papelPessoaPrincipal.value = member.idPessoa ? 'APRESENTADOR' : '';
  }

  function montarPainelPadroesModelo(modelo) {
    var arquivos = (modelo.tiposArquivoMaterialPermitidos || []).join(', ') || 'Nao informado';
    return [
      '<div class="activity-detail-section">',
      '<h4>Padroes aplicados</h4>',
      '<dl class="activity-detail-grid">',
      montarFato('Tipo / subtipo', [modelo.tipoAtividade, modelo.subtipoAtividade].filter(Boolean).join(' / ')),
      montarFato('Conta presenca', rotuloSimNao(modelo.contaPresencaPadrao)),
      montarFato('Conta falta', rotuloSimNao(modelo.contaFaltaPadrao)),
      montarFato('Gera certificado', rotuloSimNao(modelo.geraCertificadoPadrao)),
      montarFato('Permite justificativa', rotuloSimNao(modelo.permiteJustificativa)),
      montarFato('Carga horaria padrao', modelo.cargaHorariaPadrao || 'Calculada pelo horario'),
      montarFato('Exige eixo no agendamento', rotuloSimNao(modelo.exigeEixoTematico)),
      montarFato('Exige pessoa principal', rotuloSimNao(modelo.exigePessoaPrincipal)),
      montarFato('Papel principal', modelo.papelPadraoPessoaPrincipal || 'Nao aplicavel'),
      montarFato('Exige material no agendamento', rotuloSimNao(modelo.exigeMaterialPadrao)),
      montarFato('Titulo/eixo posterior', rotuloSimNao(modelo.tituloEixoPosterior)),
      montarFato('Material posterior', rotuloSimNao(modelo.materialPosterior)),
      montarFato('Arquivos permitidos', arquivos),
      montarFato('Limite do material', modelo.tamanhoMaxMaterialMb ? modelo.tamanhoMaxMaterialMb + ' MB' : 'Nao informado'),
      montarFato('Publicacao inicial', modelo.statusPublicacaoPortalPadrao || 'RASCUNHO'),
      montarFato('Visibilidade inicial', modelo.visibilidadePortalPadrao || 'DIRETORIA'),
      '</dl>',
      '</div>'
    ].join('');
  }

  function rotuloSimNao(value) {
    return value === true ? 'Sim' : 'Nao';
  }

  function salvarNovaAtividade(form) {
    var payload;
    var erros;

    if (isCriandoAtividade) {
      return;
    }

    payload = montarPayloadCriarAtividade(form);
    erros = validarPayloadCriarAtividade(payload, obterModeloCriacaoPorId(payload.idConfig));

    if (erros.length) {
      mostrarErroModalAtividade(erros.join(' '));
      return;
    }

    isCriandoAtividade = true;
    alternarFormularioAtividadeOcupado(form, true);
    ui.mostrarLoading('Validando atividade...');

    api.apiPost('/atividades/modelo/validar', {
      payload: JSON.stringify(payload)
    }).then(function tratarPrevia(resposta) {
      if (!resposta.ok) {
        throw criarErroAtividade(resposta);
      }

      var dadosPrevia = resposta.data || {};
      if (!confirm(montarMensagemConfirmacaoCriarAtividade(dadosPrevia.atividadePreview || {}))) {
        throw criarErroAtividade({
          ok: false,
          message: 'Criacao cancelada pelo usuario.',
          cancelado: true
        });
      }

      ui.mostrarLoading('Criando atividade...');
      return api.apiPost('/atividades/modelo/criar', {
        payload: JSON.stringify(Object.assign({}, payload, {
          dryRun: false,
          confirmacaoToken: dadosPrevia.confirmacaoToken || ''
        }))
      });
    }).then(function tratarCriacao(resposta) {
      if (!resposta.ok) {
        throw criarErroAtividade(resposta);
      }

      fecharModal();
      invalidarCacheAtividades();
      recarregarAtividadesAposCriacao();
      mostrarStatusCriacaoAtividade(resposta);
    }).catch(function falhar(erro) {
      if (!erro.cancelado) {
        mostrarErroModalAtividade(erro.message || 'Nao foi possivel criar a atividade.');
      }
    }).finally(function finalizar() {
      isCriandoAtividade = false;
      alternarFormularioAtividadeOcupado(form, false);
      ui.ocultarLoading();
    });
  }

  function montarPayloadCriarAtividade(form) {
    var dados = new FormData(form);
    var atividade = {
      tituloPublico: obterValorFormulario(dados, 'tituloPublico'),
      dataAtividade: obterValorFormulario(dados, 'dataAtividade'),
      horarioInicio: normalizarHorarioFormulario(obterValorFormulario(dados, 'horarioInicio')),
      horarioFim: normalizarHorarioFormulario(obterValorFormulario(dados, 'horarioFim')),
      formato: obterValorFormulario(dados, 'formato'),
      local: obterValorFormulario(dados, 'local')
    };
    var opcionais = [
      'descricaoPublica',
      'descricaoInterna',
      'eixoTematicoPrincipal',
      'eixoTematicoSecundario',
      'idPessoaPrincipal',
      'nomePessoaPrincipalPublico',
      'rgaPessoaPrincipal',
      'emailPessoaPrincipal',
      'tipoPessoaPrincipal',
      'papelPessoaPrincipal',
      'instituicaoPessoaPrincipal',
      'responsavelInterno',
      'responsavelEmail',
      'publicoAlvo',
      'observacoes'
    ];

    opcionais.forEach(function copiar(campo) {
      var valor = obterValorFormulario(dados, campo);

      if (valor) {
        atividade[campo] = valor;
      }
    });

    return {
      idConfig: obterValorFormulario(dados, 'idConfig'),
      dryRun: true,
      atividade: atividade
    };
  }

  function validarPayloadCriarAtividade(payload, modelo) {
    var erros = [];
    var atividade = payload.atividade || {};
    var inicio = converterHorarioMinutos(atividade.horarioInicio);
    var fim = converterHorarioMinutos(atividade.horarioFim);

    if (!payload.idConfig || !modelo) erros.push('Selecione um modelo homologado.');

    [
      ['dataAtividade', 'Informe a data da atividade.'],
      ['horarioInicio', 'Informe o horario de inicio.'],
      ['horarioFim', 'Informe o horario de fim.'],
      ['formato', 'Informe o formato.'],
      ['local', 'Informe o local.']
    ].forEach(function validar(item) {
      if (!atividade[item[0]]) {
        erros.push(item[1]);
      }
    });

    if (inicio >= 0 && fim >= 0 && fim <= inicio) {
      erros.push('O horario de fim deve ser posterior ao inicio.');
    }

    var isMemberPresentation = ehModeloApresentacaoMembro(modelo);
    if (modelo && !isMemberPresentation && modelo.exigeTituloPublico && !atividade.tituloPublico) erros.push('Informe o titulo publico.');
    if (modelo && !isMemberPresentation && modelo.exigeEixoTematico && !atividade.eixoTematicoPrincipal) erros.push('Informe o eixo tematico principal.');
    if (isMemberPresentation && !atividade.idPessoaPrincipal) {
      erros.push('Selecione o membro apresentador.');
    } else if (modelo && modelo.exigePessoaPrincipal && !atividade.idPessoaPrincipal && !atividade.nomePessoaPrincipalPublico) {
      erros.push('Informe a pessoa principal.');
    }
    if (modelo && modelo.exigeEmailPessoaPrincipal && !atividade.emailPessoaPrincipal) erros.push('Informe o e-mail da pessoa principal.');
    if (modelo && modelo.exigeInstituicaoPessoaPrincipal && !atividade.instituicaoPessoaPrincipal) {
      erros.push('Informe a instituicao da pessoa principal.');
    }

    return erros;
  }

  function criarErroAtividade(resposta) {
    var erro = new Error(resposta.message || 'Nao foi possivel criar a atividade.');
    var fieldErrors = resposta.fieldErrors ||
      (resposta.data && resposta.data.fieldErrors) ||
      {};
    var mensagens = Object.keys(fieldErrors || {}).map(function montar(campo) {
      return fieldErrors[campo];
    }).filter(Boolean);

    if (mensagens.length) {
      erro.message = mensagens.join(' ');
    }

    erro.cancelado = resposta.cancelado === true;
    return erro;
  }

  function montarMensagemConfirmacaoCriarAtividade(preview) {
    return [
      'Criar atividade como rascunho visivel apenas para Diretoria?',
      '',
      'ID previsto: ' + (preview.idAtividade || 'gerado pelo backend'),
      'Titulo: ' + (preview.tituloPublico || 'nao informado'),
      'Data: ' + (preview.dataAtividade || 'nao informada'),
      'Horario: ' + [preview.horarioInicio, preview.horarioFim].filter(Boolean).join(' as '),
      'Status: ' + (preview.statusOperacional || 'PLANEJADA') + ' / ' + (preview.statusPublicacaoPortal || 'RASCUNHO')
    ].join('\n');
  }

  function mostrarStatusCriacaoAtividade(resposta) {
    var status = document.getElementById('atividades-status');
    var avisos = resposta && resposta.meta && resposta.meta.avisos
      ? resposta.meta.avisos
      : [];

    if (status) {
      status.textContent = (resposta && resposta.message) || 'Atividade criada como rascunho.';
      if (Array.isArray(avisos) && avisos.length) {
        status.textContent += ' Avisos: ' + avisos.join(' ');
      }
    }
  }

  function alternarFormularioAtividadeOcupado(form, ocupado) {
    Array.prototype.forEach.call(form.elements || [], function alternar(campo) {
      campo.disabled = ocupado;
    });
  }

  function obterValorFormulario(dados, campo) {
    return String(dados.get(campo) || '').trim();
  }

  function normalizarHorarioFormulario(valor) {
    return String(valor || '').trim().replace(':', 'h');
  }

  function converterHorarioMinutos(valor) {
    var partes = String(valor || '').trim().replace('h', ':').split(':');
    var horas = Number(partes[0]);
    var minutos = Number(partes[1]);

    if (!Number.isFinite(horas) || !Number.isFinite(minutos)) {
      return -1;
    }

    return horas * 60 + minutos;
  }

  function abrirModalJustificativaPrevia(idAtividade) {
    var atividade = atividadesResumoCache[idAtividade] || {};
    var modal = document.getElementById('atividade-modal');
    var conteudo = document.getElementById('atividade-modal-content');

    if (!idAtividade || !modal || !conteudo) {
      return;
    }

    definirTituloModal('Justificar ausencia futura');
    conteudo.innerHTML = '<p class="empty-state readonly-skeleton">Carregando configuracao de justificativas...</p>';
    modal.hidden = false;
    document.body.classList.add('modal-open');

    carregarJustificativasConfig()
      .then(function renderizar(config) {
        renderizarModalJustificativaPrevia(idAtividade, atividade, config);
      })
      .catch(function renderizarFallback() {
        renderizarModalJustificativaPrevia(idAtividade, atividade, normalizarJustificativasConfig({}));
      });
  }

  function renderizarModalJustificativaPrevia(idAtividade, atividade, config) {
    var conteudo = document.getElementById('atividade-modal-content');

    if (!conteudo) {
      return;
    }

    conteudo.innerHTML = [
      '<p class="eyebrow">Justificativa previa</p>',
      '<h3>' + ui.escaparHtml(atividade.tituloPublico || 'Atividade') + '</h3>',
      '<p class="section-note">' + ui.escaparHtml(montarDescricaoAtividadeJustificativaPrevia(atividade)) + '</p>',
      atividade.mensagemJustificativaPrevia
        ? '<p class="status-message">' + ui.escaparHtml(atividade.mensagemJustificativaPrevia) + '</p>'
        : '',
      '<form class="readonly-form" data-activity-form="justificativa-previa">',
      '<input type="hidden" name="idAtividade" value="' + ui.escaparHtml(idAtividade) + '">',
      '<input type="hidden" name="idRegistroPresenca" value="">',
      '<p class="simulation-warning">Voce esta enviando uma justificativa antes da atividade. Ela sera registrada como justificativa previa e sera analisada pela Diretoria/Secretaria caso a falta seja confirmada na chamada.</p>',
      montarCampoMotivoJustificativa(config, ''),
      '<label>Descricao da justificativa',
      '<textarea name="descricaoJustificativa" rows="5" required></textarea>',
      '</label>',
      '<label>Possui documento comprobatorio?',
      '<select name="possuiDocumentoComprobatorio">',
      '<option value="NAO">Nao</option>',
      '<option value="SIM">Sim</option>',
      '</select>',
      '</label>',
      montarCamposDocumentoJustificativa(config, {}),
      '<label>Observacoes',
      '<textarea name="observacoes" rows="3"></textarea>',
      '</label>',
      '<div class="presentation-card-actions">',
      '<button type="submit">Enviar justificativa previa</button>',
      '<button class="secondary-button" type="button" data-activity-modal-close>Cancelar</button>',
      '</div>',
      '</form>'
    ].join('');
  }

  function carregarJustificativasConfig() {
    if (justificativasConfig && justificativasConfigExpiraEm > Date.now()) {
      return Promise.resolve(justificativasConfig);
    }

    if (justificativasConfigPromise) {
      return justificativasConfigPromise;
    }

    justificativasConfigPromise = api.apiGet('/v2/justificativas/config', {})
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar configuracao de justificativas.');
        }

        justificativasConfig = normalizarJustificativasConfig(resposta.data || {});
        justificativasConfigExpiraEm = Date.now() + JUSTIFICATIVAS_CONFIG_TTL_MS;
        return justificativasConfig;
      })
      .finally(function limpar() {
        justificativasConfigPromise = null;
      });

    return justificativasConfigPromise;
  }

  function normalizarJustificativasConfig(config) {
    var dados = config || {};

    return {
      motivos: obterMotivosJustificativa(dados),
      upload: Object.assign({}, JUSTIFICATIVA_UPLOAD_PADRAO, dados.upload || dados.regrasUpload || {}),
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
        rotulo: String((motivo || {}).rotulo || (motivo || {}).label || (motivo || {}).valor || (motivo || {}).codigo || '').trim()
      };
    }).filter(function filtrar(motivo) {
      return motivo.valor;
    });
  }

  function montarCampoMotivoJustificativa(config, valorAtual) {
    var motivos = obterMotivosJustificativa(config);

    return [
      '<label>Motivo',
      '<select name="motivoDeclarado" required>',
      '<option value="">Selecionar</option>',
      motivos.map(function montar(motivo) {
        var selecionado = motivo.valor === valorAtual ? ' selected' : '';
        return '<option value="' + ui.escaparHtml(motivo.valor) + '"' + selecionado + '>' + ui.escaparHtml(motivo.rotulo || motivo.valor) + '</option>';
      }).join(''),
      '</select>',
      '</label>'
    ].join('');
  }

  function montarCamposDocumentoJustificativa(config, item) {
    var upload = obterUploadJustificativa(config);
    var formatos = obterFormatosJustificativa(upload);
    var limiteMb = Math.round((upload.tamanhoMaximoBytes || JUSTIFICATIVA_UPLOAD_PADRAO.tamanhoMaximoBytes) / 1024 / 1024);
    var accept = formatos.map(function montar(extensao) {
      return '.' + extensao.toLowerCase();
    }).join(',');

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

  function montarDescricaoAtividadeJustificativaPrevia(atividade) {
    var partes = [
      ui.formatarData(atividade.dataAtividade),
      montarMetaAtividade(atividade)
    ].filter(Boolean);

    return partes.length ? partes.join(' - ') : 'Atividade futura';
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

  function montarPayloadDocumentoJustificativa(arquivo) {
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

  function salvarJustificativaPrevia(form) {
    var dados = new FormData(form);
    var possuiDocumento = dados.get('possuiDocumentoComprobatorio') || 'NAO';
    var linkDocumento = String(dados.get('linkDocumentoComprobatorio') || '').trim();
    var motivo = String(dados.get('motivoDeclarado') || '').trim();
    var descricao = String(dados.get('descricaoJustificativa') || '').trim();
    var arquivo = dados.get('arquivoDocumentoComprobatorio');
    var config = justificativasConfig || normalizarJustificativasConfig({});

    if (motivo === 'OUTRO' && descricao.length < obterDescricaoMinimaOutro(config)) {
      mostrarErroModalAtividade('Descreva melhor o motivo quando selecionar Outro.');
      return;
    }

    if (possuiDocumento === 'SIM' && (!arquivo || !arquivo.name) && !linkDocumento) {
      mostrarErroModalAtividade('Anexe um arquivo ou informe o link do documento comprobatorio.');
      return;
    }

    if (arquivo && arquivo.name && !arquivoJustificativaPermitido(arquivo, config)) {
      mostrarErroModalAtividade('Formato ou tamanho do comprovante nao permitido.');
      return;
    }

    montarPayloadDocumentoJustificativa(arquivo, config)
      .then(function enviar(documentoComprobatorio) {
        var payload = {
        idAtividade: dados.get('idAtividade'),
        idRegistroPresenca: '',
          motivoDeclarado: motivo,
          descricaoJustificativa: descricao,
        possuiDocumentoComprobatorio: possuiDocumento,
        linkDocumentoComprobatorio: linkDocumento,
        confirmouCienciaForaPrazo: false,
        observacoes: dados.get('observacoes')
        };

        if (documentoComprobatorio) {
          payload.documentoComprobatorio = documentoComprobatorio;
        }

        ui.mostrarLoading('Enviando justificativa previa...');
        return api.apiPost('/v2/justificativas/enviar', {
          payload: JSON.stringify(payload)
        });
      })
      .then(function tratar(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel enviar a justificativa previa.');
        }

        fecharModal();
        invalidarCacheAtividades();
        notificarJustificativasAtualizadas();
        recarregarAtividadesAposJustificativa();
      })
      .catch(function falhar(erro) {
        mostrarErroModalAtividade(erro.message || 'Erro controlado ao enviar justificativa previa.');
      })
      .then(function finalizar() {
        ui.ocultarLoading();
      });
  }

  function recarregarAtividadesAposJustificativa() {
    var lista = document.getElementById('atividades-lista');
    var status = document.getElementById('atividades-status');

    if (lista && status) {
      carregarAtividadesComLista(lista, status, obterModoAtividadesAtual());
    }
  }

  function notificarJustificativasAtualizadas() {
    try {
      document.dispatchEvent(new CustomEvent('portal:justificativas-atualizadas'));
    } catch (erro) {
      // O evento e apenas uma otimizacao para invalidar caches da aba Meu vinculo.
    }
  }

  function mostrarErroModalAtividade(mensagem) {
    var conteudo = document.getElementById('atividade-modal-content');
    var alerta = conteudo ? conteudo.querySelector('[data-activity-modal-error]') : null;

    if (!conteudo) {
      return;
    }

    if (!alerta) {
      alerta = document.createElement('p');
      alerta.className = 'empty-state readonly-error';
      alerta.setAttribute('data-activity-modal-error', 'true');
      conteudo.insertBefore(alerta, conteudo.firstChild);
    }

    alerta.textContent = mensagem;
  }

  function carregarDetalheAtividade(idAtividade) {
    var inicio = obterTempoAtual();
    var cache = obterDetalheAtividadeCacheValido(idAtividade);
    var detalheCache = cache.detalhe;
    var resumo = atividadesResumoCache[idAtividade];

    definirTituloModal('Detalhes da atividade');

    if (detalheCache) {
      abrirModal(detalheCache);
      registrarPerfAtividades('atividades.detalhe.' + (cache.origem || 'cache_memoria'), inicio, {
        idAtividade: idAtividade,
        payloadBytes: estimarPayloadBytes(detalheCache)
      });
      return;
    }

    if (chamadaOperacionalAtiva()) {
      abrirModal({
        idAtividade: idAtividade,
        tituloPublico: 'Detalhes temporariamente adiados',
        descricaoPublica: 'A chamada operacional esta em andamento. Aguarde a chamada carregar ou salvar para buscar detalhes da atividade.'
      });
      registrarPerfAtividades('atividades.detalhe.fallback_skip_chamada_ativa', inicio, {
        idAtividade: idAtividade
      });
      return;
    }

    abrirModalCarregando(idAtividade, resumo);

    carregarDetalheAtividadeBackend(idAtividade, 'fallback')
      .then(function tratarResultado(resultado) {
        var resposta = resultado.resposta;

        abrirModal(resultado.detalhe);

        if (resultado.reutilizada) {
          return;
        }

        registrarPerfAtividades('atividades.detalhe.fallback_backend', inicio, mesclarMetaPerfAtividades(resposta, {
          idAtividade: idAtividade,
          payloadBytes: estimarPayloadBytes(resultado.detalhe)
        }));
      }).catch(function tratarErro(erro) {
        abrirModal({
          idAtividade: idAtividade,
          tituloPublico: 'Erro ao carregar atividade',
          descricaoPublica: erro.message
        });
      });
  }

  function carregarChamadaAtividade(idAtividade) {
    var inicio = obterTempoAtual();

    isChamadaLoading = true;
    pausarPreloadsPorChamada('carregar_chamada');
    definirTituloModal('Registrar chamada');
    abrirModal({
      idAtividade: idAtividade,
      tituloPublico: 'Carregando chamada',
      descricaoPublica: 'Buscando participantes aplicáveis no backend do Portal GEAPA...',
      carregando: true
    });

    api.apiGet('/atividades/chamada', {
      idAtividade: idAtividade
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível carregar a chamada.');
      }

      chamadaAtual = normalizarChamada(resposta.data);
      renderizarChamada(chamadaAtual);
      registrarPerfAtividades('atividades.chamada.carregada', inicio, mesclarMetaPerfAtividades(resposta, {
        idAtividade: idAtividade,
        totalParticipantes: chamadaAtual.participantes.length,
        payloadBytes: estimarPayloadBytes(resposta.data || {})
      }));
    }).catch(function tratarErro(erro) {
      definirTituloModal('Registrar chamada');
      abrirModal({
        idAtividade: idAtividade,
        tituloPublico: 'Erro ao carregar chamada',
        descricaoPublica: erro.message
      });
    }).then(function finalizarCarregamentoChamada() {
      isChamadaLoading = false;
      retomarPreloadsAposChamada();
    });
  }

  function normalizarChamada(dados) {
    var origem = dados || {};
    var atividade = origem.atividade || {};
    var participantes = Array.isArray(origem.participantes)
      ? origem.participantes
      : [];

    return {
      atividade: atividade,
      participantes: participantes.map(function normalizarParticipante(participante, indice) {
        return {
          indice: indice,
          tipoParticipante: String(participante.tipoParticipante || '').trim() || 'MEMBRO',
          idPessoa: String(participante.idPessoa || participante.id || participante.ID_PESSOA || '').trim(),
          rga: String(participante.rga || '').trim(),
          nome: String(participante.nome || 'Participante').trim(),
          instituicao: String(participante.instituicao || '').trim(),
          statusPresenca: String(participante.statusPresenca || '').trim(),
          codigoPresenca: String(participante.codigoPresenca || '').trim(),
          observacoes: String(participante.observacoes || '').trim(),
          aplicavelNaData: participante.aplicavelNaData !== false,
          contaPresenca: participante.contaPresenca === true,
          contaFalta: participante.contaFalta === true,
          bloqueado: participante.bloqueado === true,
          motivoBloqueio: String(participante.motivoBloqueio || '').trim()
        };
      }),
      resumo: origem.resumo || {},
      podeSalvar: origem.podeSalvar === true,
      podeFinalizar: origem.podeFinalizar === true,
      podeReabrir: origem.podeReabrir === true,
      statusChamada: origem.statusChamada || 'RASCUNHO',
      statusChamadaRotulo: origem.statusChamadaRotulo || 'Chamada pendente',
      chamadaFinalizada: origem.chamadaFinalizada === true,
      statusChamadaAtualizadoEm: origem.statusChamadaAtualizadoEm || '',
      statusChamadaAtualizadoPor: origem.statusChamadaAtualizadoPor || '',
      statusOperacional: obterCampoTextoAtividade(origem, ['statusOperacional', 'statusAtividadeOperacional']),
      statusPublico: obterCampoTextoAtividade(origem, ['statusPublico']),
      rascunhoRestaurado: origem.rascunhoRestaurado === true,
      temRascunhoSalvo: origem.rascunhoRestaurado === true || origem.rascunhoSalvo === true || Boolean(origem.rascunhoSalvoEm),
      rascunhoSalvoEm: origem.rascunhoSalvoEm || '',
      rascunhoSalvoPor: origem.rascunhoSalvoPor || '',
      resumoSalvo: origem.resumoSalvo || {},
      performance: origem.performance || {},
      modo: origem.modo || 'DEV',
      ultimaAtualizacao: origem.ultimaAtualizacao || '',
      mensagemOperacao: ''
    };
  }

  function renderizarChamada(chamada) {
    var conteudo = document.getElementById('atividade-modal-content');
    var atividade = chamada.atividade || {};
    var participantesVisiveis = filtrarParticipantesChamada(chamada.participantes || []);

    definirTituloModal(chamada.chamadaFinalizada ? 'Visualizar chamada' : 'Registrar chamada');
    conteudo.innerHTML = [
      '<div class="attendance-shell">',
      '<p class="eyebrow">' + ui.escaparHtml(atividade.idAtividade || 'Atividade') + '</p>',
      '<h3>' + ui.escaparHtml(atividade.tituloPublico || 'Chamada') + '</h3>',
      '<p class="section-note">',
      ui.escaparHtml([
        ui.formatarData(atividade.dataAtividade),
        atividade.horarioCompleto,
        atividade.local,
        atividade.formato
      ].filter(Boolean).join(' · ')),
      '</p>',
      '<p class="simulation-warning">Registro em modo ' + ui.escaparHtml(chamada.modo || 'DEV') + '. A chamada é salva somente pela API do Apps Script.</p>',
      montarEstadoChamada(chamada),
      montarResumoChamada(calcularResumoChamada(chamada.participantes)),
      montarFerramentasChamada(chamada),
      '<div class="attendance-list">',
      participantesVisiveis.length
        ? participantesVisiveis.map(montarParticipanteChamada).join('')
        : '<p class="empty-state">Nenhum participante atende ao filtro selecionado.</p>',
      '</div>',
      '<div class="attendance-footer">',
      '<p id="chamada-status" class="section-note" role="status" aria-live="polite">' + ui.escaparHtml(chamada.mensagemOperacao || '') + '</p>',
      '<div class="attendance-actions">',
      chamada.chamadaFinalizada && chamada.podeReabrir
        ? '<button class="secondary-button compact-button" type="button" data-reopen-attendance>Reabrir chamada</button>'
        : '',
      !chamada.chamadaFinalizada
        ? '<button class="secondary-button compact-button" type="button" data-save-attendance ' +
          (chamada.podeSalvar ? '' : 'disabled') +
          '>Salvar rascunho</button>'
        : '',
      !chamada.chamadaFinalizada
        ? '<button class="primary-button compact-button" type="button" data-finalize-attendance ' +
          (chamada.podeFinalizar ? '' : 'disabled') +
          '>Finalizar chamada</button>'
        : '',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    registrarEventosChamada(conteudo);
    atualizarResumoChamada();
  }

  function montarEstadoChamada(chamada) {
    var partes = [
      '<div class="attendance-state">',
      '<span class="status-pill">' + ui.escaparHtml(chamada.statusChamadaRotulo || 'Chamada pendente') + '</span>'
    ];

    if (chamada.statusChamadaAtualizadoEm) {
      partes.push('<small>Atualizada em ' + ui.escaparHtml(formatarDataHoraCurta(chamada.statusChamadaAtualizadoEm)) + '</small>');
    }

    if (chamada.statusChamadaAtualizadoPor) {
      partes.push('<small>Por ' + ui.escaparHtml(chamada.statusChamadaAtualizadoPor) + '</small>');
    }

    if (!chamada.chamadaFinalizada && chamada.rascunhoRestaurado) {
      partes.push('<small>Rascunho restaurado' + montarSufixoRascunhoChamada(chamada) + '.</small>');
    } else if (!chamada.chamadaFinalizada && chamada.temRascunhoSalvo) {
      partes.push('<small>Rascunho salvo' + montarSufixoRascunhoChamada(chamada) + '. A frequencia so muda ao finalizar.</small>');
    }

    if (chamada.chamadaFinalizada) {
      partes.push('<small>Esta chamada está finalizada e aberta apenas para consulta.</small>');
    }

    if (chamada.performance && Number(chamada.performance.totalMs) >= 0) {
      partes.push('<small>Backend DEV: ' + ui.escaparHtml(Math.round(Number(chamada.performance.totalMs))) + ' ms.</small>');
    }

    partes.push('</div>');
    return partes.join('');
  }

  function montarSufixoRascunhoChamada(chamada) {
    var partes = [];

    if (chamada.rascunhoSalvoEm) {
      partes.push('em ' + formatarDataHoraCurta(chamada.rascunhoSalvoEm));
    }

    if (chamada.rascunhoSalvoPor) {
      partes.push('por ' + chamada.rascunhoSalvoPor);
    }

    return partes.length ? ' ' + partes.join(' ') : '';
  }

  function montarResumoChamada(resumo) {
    return [
      '<dl class="attendance-summary" data-attendance-summary>',
      montarFato('Total', resumo.totalParticipantes),
      montarFato('Presenciais', resumo.totalPresenciais),
      montarFato('Remotos', resumo.totalRemotos),
      montarFato('Faltas previstas', resumo.totalFaltasPrevistas),
      montarFato('N/A', resumo.totalNaoSeAplica),
      montarFato('Sem marcação', resumo.totalSemMarcacao),
      '</dl>'
    ].join('');
  }

  function montarFerramentasChamada(chamada) {
    var filtros = [
      ['TODOS', 'Todos'],
      ['SEM_MARCACAO', 'Sem marcação'],
      ['PRESENCIAL', 'Presencial'],
      ['REMOTO', 'Remoto'],
      ['FALTA', 'Falta']
    ];

    return [
      '<div class="attendance-toolbar">',
      '<div class="attendance-filters" aria-label="Filtros da chamada">',
      filtros.map(function montarFiltro(filtro) {
        return '<button class="secondary-button compact-button ' + (filtroChamadaAtual === filtro[0] ? 'is-active' : '') + '" type="button" data-attendance-filter="' + ui.escaparHtml(filtro[0]) + '">' +
          ui.escaparHtml(filtro[1]) +
          '</button>';
      }).join(''),
      '</div>',
      !chamada.chamadaFinalizada
        ? '<div class="attendance-bulk-actions">' +
          '<button class="secondary-button compact-button" type="button" data-attendance-bulk="PRESENTE_PRESENCIAL">Marcar todos como presencial</button>' +
          '<button class="secondary-button compact-button" type="button" data-attendance-bulk="LIMPAR">Limpar marcações</button>' +
          '</div>'
        : '',
      '</div>'
    ].join('');
  }

  function montarParticipanteChamada(participante) {
    var bloqueado = participante.bloqueado || participante.aplicavelNaData === false;
    var somenteLeitura = chamadaAtual && chamadaAtual.chamadaFinalizada;
    var desabilitado = bloqueado || somenteLeitura;

    return [
      '<article class="attendance-row" data-attendance-row data-index="' + participante.indice + '" data-status-presenca="' + ui.escaparHtml(statusLeituraChamada(participante.statusPresenca)) + '">',
      '<div class="attendance-person">',
      '<strong>' + ui.escaparHtml(participante.nome) + '</strong>',
      '<small>' + ui.escaparHtml(montarSubtituloParticipante(participante)) + '</small>',
      bloqueado
        ? '<small class="attendance-lock">' + ui.escaparHtml(participante.motivoBloqueio || 'Não aplicável nesta data.') + '</small>'
        : '',
      !bloqueado && rotuloStatusNaoOperacionalChamada(participante.statusPresenca)
        ? '<small class="attendance-lock">' + ui.escaparHtml(rotuloStatusNaoOperacionalChamada(participante.statusPresenca)) + '</small>'
        : '',
      '</div>',
      '<div class="attendance-toggle-group" role="group" aria-label="Presença de ' + ui.escaparHtml(participante.nome) + '">',
      montarBotaoMarcacaoChamada(participante, 'PRESENTE_PRESENCIAL', 'Presencial', desabilitado),
      montarBotaoMarcacaoChamada(participante, 'PRESENTE_REMOTO', 'Remoto', desabilitado),
      '</div>',
      '<label class="attendance-field attendance-note">',
      '<span>Observação</span>',
      '<input data-attendance-note type="text" maxlength="300" value="' + ui.escaparHtml(participante.observacoes) + '" ' +
        (desabilitado ? 'disabled' : '') +
        '>',
      '</label>',
      '</article>'
    ].join('');
  }

  function montarBotaoMarcacaoChamada(participante, status, rotulo, desabilitado) {
    var ativo = participante.statusPresenca === status;

    return '<button class="attendance-mark-button ' + (ativo ? 'is-active' : '') + '" type="button" data-attendance-mark="' + ui.escaparHtml(status) + '" aria-pressed="' + (ativo ? 'true' : 'false') + '" ' +
      (desabilitado ? 'disabled' : '') +
      '>' + ui.escaparHtml(rotulo) + '</button>';
  }

  function rotuloStatusNaoOperacionalChamada(status) {
    if (status === 'FALTA') {
      return 'Falta registrada';
    }

    if (status === 'NAO_SE_APLICA') {
      return 'Não se aplica';
    }

    return '';
  }

  function montarSubtituloParticipante(participante) {
    var partes = [
      participante.tipoParticipante,
      participante.rga,
      participante.instituicao
    ].filter(Boolean);

    return partes.join(' · ');
  }

  function registrarEventosChamada(container) {
    Array.prototype.forEach.call(
      container.querySelectorAll('[data-attendance-note]'),
      function registrarCampo(campo) {
        campo.addEventListener('input', atualizarResumoChamada);
      }
    );

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-attendance-mark]'),
      function registrarBotao(botao) {
        botao.addEventListener('click', function marcar() {
          alternarMarcacaoParticipante(botao);
        });
      }
    );

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-attendance-filter]'),
      function registrarFiltro(botao) {
        botao.addEventListener('click', function filtrar() {
          filtroChamadaAtual = botao.getAttribute('data-attendance-filter') || 'TODOS';
          sincronizarParticipantesChamadaDoModal();
          renderizarChamada(chamadaAtual);
        });
      }
    );

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-attendance-bulk]'),
      function registrarAcaoMassa(botao) {
        botao.addEventListener('click', function executar() {
          aplicarAcaoMassaChamada(botao.getAttribute('data-attendance-bulk'));
        });
      }
    );

    var botaoSalvar = container.querySelector('[data-save-attendance]');
    if (botaoSalvar) {
      botaoSalvar.addEventListener('click', function salvar() {
        salvarChamadaAtual('SALVAR');
      });
    }

    var botaoFinalizar = container.querySelector('[data-finalize-attendance]');
    if (botaoFinalizar) {
      botaoFinalizar.addEventListener('click', function finalizar() {
        salvarChamadaAtual('FINALIZAR');
      });
    }

    var botaoReabrir = container.querySelector('[data-reopen-attendance]');
    if (botaoReabrir) {
      botaoReabrir.addEventListener('click', reabrirChamadaAtual);
    }
  }

  function alternarMarcacaoParticipante(botao) {
    var linha = botao.closest('[data-attendance-row]');
    var status = botao.getAttribute('data-attendance-mark') || '';

    if (!linha || botao.disabled) {
      return;
    }

    Array.prototype.forEach.call(linha.querySelectorAll('[data-attendance-mark]'), function limpar(outro) {
      var ativo = outro === botao && !outro.classList.contains('is-active');
      outro.classList.toggle('is-active', ativo);
      outro.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });

    if (botao.classList.contains('is-active')) {
      linha.setAttribute('data-status-presenca', status);
    } else {
      linha.setAttribute('data-status-presenca', '');
    }

    atualizarResumoChamada();
  }

  function aplicarAcaoMassaChamada(acao) {
    var linhas = document.querySelectorAll('[data-attendance-row]');

    Array.prototype.forEach.call(linhas, function aplicar(linha) {
      var indice = Number(linha.getAttribute('data-index'));
      var participante = chamadaAtual && chamadaAtual.participantes[indice];

      if (!participante || participante.bloqueado || participante.aplicavelNaData === false || chamadaAtual.chamadaFinalizada) {
        return;
      }

      if (acao === 'LIMPAR') {
        definirMarcacaoLinhaChamada(linha, '');
        return;
      }

      if (acao === 'PRESENTE_PRESENCIAL') {
        definirMarcacaoLinhaChamada(linha, 'PRESENTE_PRESENCIAL');
      }
    });

    atualizarResumoChamada();
  }

  function definirMarcacaoLinhaChamada(linha, status) {
    Array.prototype.forEach.call(linha.querySelectorAll('[data-attendance-mark]'), function atualizar(botao) {
      var ativo = Boolean(status) && botao.getAttribute('data-attendance-mark') === status;
      botao.classList.toggle('is-active', ativo);
      botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });

    linha.setAttribute('data-status-presenca', status || '');
  }

  function atualizarResumoChamada() {
    sincronizarParticipantesChamadaDoModal();
    var resumo = calcularResumoChamada(chamadaAtual ? chamadaAtual.participantes : []);
    var containerResumo = document.querySelector('[data-attendance-summary]');

    if (containerResumo) {
      containerResumo.outerHTML = montarResumoChamada(resumo);
    }
  }

  function lerParticipantesChamadaDoModal() {
    var participantesBase = chamadaAtual ? chamadaAtual.participantes : [];
    var linhas = document.querySelectorAll('[data-attendance-row]');

    return Array.prototype.map.call(linhas, function lerLinha(linha) {
      var indice = Number(linha.getAttribute('data-index'));
      var base = participantesBase[indice] || {};
      var observacao = linha.querySelector('[data-attendance-note]');
      var statusValor = linha.getAttribute('data-status-presenca') || '';

      return Object.assign({}, base, {
        statusPresenca: statusValor,
        codigoPresenca: obterCodigoPresenca(statusValor),
        observacoes: observacao ? observacao.value.trim() : base.observacoes
      });
    });
  }

  function sincronizarParticipantesChamadaDoModal() {
    var participantes = lerParticipantesChamadaDoModal();

    participantes.forEach(function atualizar(participante) {
      if (chamadaAtual && chamadaAtual.participantes[participante.indice]) {
        chamadaAtual.participantes[participante.indice] = participante;
      }
    });
  }

  function calcularResumoChamada(participantes) {
    var resumo = {
      totalParticipantes: participantes.length,
      totalPresenciais: 0,
      totalRemotos: 0,
      totalFaltasPrevistas: 0,
      totalNaoSeAplica: 0,
      totalSemMarcacao: 0
    };

    participantes.forEach(function contarParticipante(participante) {
      if (participante.bloqueado || participante.aplicavelNaData === false) {
        resumo.totalNaoSeAplica++;
        return;
      }

      if (participante.statusPresenca === 'PRESENTE_PRESENCIAL') {
        resumo.totalPresenciais++;
      } else if (participante.statusPresenca === 'PRESENTE_REMOTO') {
        resumo.totalRemotos++;
      } else if (participante.statusPresenca === 'FALTA') {
        resumo.totalFaltasPrevistas++;
      } else if (participante.statusPresenca === 'NAO_SE_APLICA') {
        resumo.totalNaoSeAplica++;
      } else {
        resumo.totalSemMarcacao++;
        resumo.totalFaltasPrevistas++;
      }
    });

    return resumo;
  }

  function obterCodigoPresenca(status) {
    if (status === 'PRESENTE_PRESENCIAL') {
      return 'P';
    }

    if (status === 'PRESENTE_REMOTO') {
      return 'R';
    }

    return '';
  }

  function statusOperacionalChamada(status) {
    return status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO'
      ? status
      : '';
  }

  function statusLeituraChamada(status) {
    return status === 'PRESENTE_PRESENCIAL' ||
      status === 'PRESENTE_REMOTO' ||
      status === 'FALTA' ||
      status === 'NAO_SE_APLICA'
      ? status
      : '';
  }

  function filtrarParticipantesChamada(participantes) {
    var filtro = filtroChamadaAtual || 'TODOS';

    return (participantes || []).filter(function filtrar(participante) {
      var status = participante.statusPresenca || '';
      var bloqueado = participante.bloqueado || participante.aplicavelNaData === false || status === 'NAO_SE_APLICA';

      if (filtro === 'SEM_MARCACAO') {
        return !bloqueado && !statusOperacionalChamada(status) && status !== 'FALTA';
      }

      if (filtro === 'PRESENCIAL') {
        return status === 'PRESENTE_PRESENCIAL';
      }

      if (filtro === 'REMOTO') {
        return status === 'PRESENTE_REMOTO';
      }

      if (filtro === 'FALTA') {
        return !bloqueado && (status === 'FALTA' || !statusOperacionalChamada(status));
      }

      return true;
    });
  }

  function formatarDataHoraCurta(valor) {
    var data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor || '';
    }

    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function salvarChamadaAtual(operacao) {
    if (!chamadaAtual || !chamadaAtual.atividade) {
      return;
    }

    var operacaoNormalizada = operacao === 'FINALIZAR' ? 'FINALIZAR' : 'SALVAR';
    sincronizarParticipantesChamadaDoModal();
    var participantes = chamadaAtual.participantes || [];
    var resumo = calcularResumoChamada(participantes);
    var status = document.getElementById('chamada-status');
    var botao = document.querySelector(operacaoNormalizada === 'FINALIZAR'
      ? '[data-finalize-attendance]'
      : '[data-save-attendance]');

    if (operacaoNormalizada === 'FINALIZAR' && resumo.totalSemMarcacao > 0 && !global.confirm('Os membros sem marcação serão registrados como falta. Deseja finalizar a chamada?')) {
      return;
    }

    var payload = montarPayloadSalvarChamada(chamadaAtual.atividade.idAtividade, participantes, operacaoNormalizada);
    payload.operacao = operacaoNormalizada;
    var inicio = obterTempoAtual();

    isChamadaSaving = operacaoNormalizada !== 'FINALIZAR';
    isChamadaFinalizing = operacaoNormalizada === 'FINALIZAR';
    pausarPreloadsPorChamada(operacaoNormalizada === 'FINALIZAR' ? 'finalizar_chamada' : 'salvar_rascunho');

    if (botao) {
      botao.disabled = true;
      botao.textContent = operacaoNormalizada === 'FINALIZAR' ? 'Finalizando...' : 'Salvando rascunho...';
    }
    if (status) {
      status.textContent = operacaoNormalizada === 'FINALIZAR'
        ? 'Finalizando chamada oficial na base DEV.'
        : 'Salvando rascunho na base DEV. Isso nao altera a frequencia.';
    }

    api.apiPost('/atividades/chamada/salvar', {
      payload: JSON.stringify(payload)
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível salvar a chamada.');
      }

      chamadaAtual.participantes = participantes;
      aplicarStatusChamadaAtual(resposta.data || {}, operacaoNormalizada);
      sincronizarStatusChamadaNaLista(chamadaAtual.atividade.idAtividade, chamadaAtual);
      chamadaAtual.mensagemOperacao = resposta.message || (operacaoNormalizada === 'FINALIZAR'
        ? 'Chamada finalizada com sucesso.'
        : 'Rascunho salvo. A frequencia so sera atualizada quando a chamada for finalizada.');
      if (operacaoNormalizada === 'FINALIZAR') {
        notificarJustificativasAtualizadas();
        invalidarCacheAtividades();
      }
      renderizarChamada(chamadaAtual);
      if (operacaoNormalizada === 'FINALIZAR') {
        recarregarAtividadesAposChamada();
      }
      registrarPerfAtividades('atividades.chamada.salva', inicio, mesclarMetaPerfAtividades(resposta, {
        idAtividade: payload.idAtividade,
        totalRegistros: payload.registros.length + payload.externos.length,
        operacao: operacaoNormalizada,
        payloadBytes: estimarPayloadBytes(payload)
      }));
    }).catch(function tratarErro(erro) {
      if (status) {
        status.textContent = erro.message;
      }
    }).then(function finalizar() {
      isChamadaSaving = false;
      isChamadaFinalizing = false;
      retomarPreloadsAposChamada();
      if (botao) {
        botao.disabled = false;
        botao.textContent = operacaoNormalizada === 'FINALIZAR' ? 'Finalizar chamada' : 'Salvar rascunho';
      }
    });
  }

  function reabrirChamadaAtual() {
    if (!chamadaAtual || !chamadaAtual.atividade) {
      return;
    }

    var status = document.getElementById('chamada-status');
    var botao = document.querySelector('[data-reopen-attendance]');
    var payload = {
      idAtividade: chamadaAtual.atividade.idAtividade,
      operacao: 'REABRIR',
      registros: [],
      externos: []
    };

    isChamadaSaving = true;
    pausarPreloadsPorChamada('reabrir_chamada');

    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Reabrindo...';
    }
    if (status) {
      status.textContent = 'Reabrindo chamada para ajustes.';
    }

    api.apiPost('/atividades/chamada/salvar', {
      payload: JSON.stringify(payload)
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível reabrir a chamada.');
      }

      aplicarStatusChamadaAtual(resposta.data || {}, 'REABRIR');
      sincronizarStatusChamadaNaLista(chamadaAtual.atividade.idAtividade, chamadaAtual);
      chamadaAtual.mensagemOperacao = resposta.message || 'Chamada reaberta para ajustes.';
      invalidarCacheAtividades();
      renderizarChamada(chamadaAtual);
      recarregarAtividadesAposChamada();
    }).catch(function tratarErro(erro) {
      if (status) {
        status.textContent = erro.message;
      }
    }).then(function finalizar() {
      isChamadaSaving = false;
      retomarPreloadsAposChamada();
      if (botao) {
        botao.disabled = false;
        botao.textContent = 'Reabrir chamada';
      }
    });
  }

  function aplicarStatusChamadaAtual(dados, operacao) {
    var statusRecebido = String(dados.statusChamada || '').toUpperCase();
    var finalizada = dados.chamadaFinalizada === true || operacao === 'FINALIZAR' || statusRecebido === 'FINALIZADA';
    var rascunhoSalvo = dados.rascunhoSalvo === true || operacao === 'SALVAR';
    var reaberta = operacao === 'REABRIR';

    chamadaAtual.statusChamada = dados.statusChamada || (finalizada ? 'FINALIZADA' : (reaberta ? 'REABERTA' : (rascunhoSalvo ? 'SALVA' : chamadaAtual.statusChamada)));
    chamadaAtual.statusChamadaRotulo = dados.statusChamadaRotulo || (finalizada ? 'Chamada finalizada' : (reaberta ? 'Chamada reaberta' : (rascunhoSalvo ? 'Rascunho salvo' : chamadaAtual.statusChamadaRotulo)));
    chamadaAtual.chamadaFinalizada = finalizada;
    chamadaAtual.statusChamadaAtualizadoEm = dados.statusChamadaAtualizadoEm || dados.rascunhoSalvoEm || new Date().toISOString();
    chamadaAtual.statusChamadaAtualizadoPor = dados.statusChamadaAtualizadoPor || chamadaAtual.statusChamadaAtualizadoPor;
    aplicarStatusOperacionalChamadaAtual(dados);
    chamadaAtual.rascunhoRestaurado = false;
    chamadaAtual.temRascunhoSalvo = !finalizada && (rascunhoSalvo || Boolean(dados.rascunhoSalvoEm) || (chamadaAtual.temRascunhoSalvo && !reaberta));
    chamadaAtual.rascunhoSalvoEm = dados.rascunhoSalvoEm || (rascunhoSalvo ? chamadaAtual.statusChamadaAtualizadoEm : chamadaAtual.rascunhoSalvoEm);
    chamadaAtual.rascunhoSalvoPor = dados.rascunhoSalvoPor || chamadaAtual.rascunhoSalvoPor;
    chamadaAtual.performance = dados.performance || chamadaAtual.performance || {};
    chamadaAtual.podeSalvar = !chamadaAtual.chamadaFinalizada;
    chamadaAtual.podeFinalizar = !chamadaAtual.chamadaFinalizada;
    chamadaAtual.podeReabrir = chamadaAtual.chamadaFinalizada;
  }

  function aplicarStatusOperacionalChamadaAtual(dados) {
    var origem = dados || {};
    var atividade = origem.atividade || {};
    var statusOperacional = obterCampoTextoAtividade(origem, ['statusOperacional', 'statusAtividadeOperacional']) ||
      obterCampoTextoAtividade(atividade, ['statusOperacional', 'statusAtividadeOperacional']);
    var statusPublico = obterCampoTextoAtividade(origem, ['statusPublico']) ||
      obterCampoTextoAtividade(atividade, ['statusPublico']);

    if (statusOperacional) {
      chamadaAtual.statusOperacional = statusOperacional;
      if (chamadaAtual.atividade) {
        chamadaAtual.atividade.statusOperacional = statusOperacional;
      }
    }

    if (statusPublico) {
      chamadaAtual.statusPublico = statusPublico;
      if (chamadaAtual.atividade) {
        chamadaAtual.atividade.statusPublico = statusPublico;
      }
    }
  }

  function sincronizarStatusChamadaNaLista(idAtividade, chamada) {
    var resumo = atividadesResumoCache[idAtividade];
    var lista = document.getElementById('atividades-lista');

    if (resumo) {
      resumo.statusChamada = chamada.statusChamada;
      resumo.statusChamadaRotulo = chamada.statusChamadaRotulo;
      resumo.chamadaFinalizada = chamada.chamadaFinalizada;
      resumo.statusChamadaAtualizadoEm = chamada.statusChamadaAtualizadoEm;
      if (chamada.statusOperacional) {
        resumo.statusOperacional = chamada.statusOperacional;
      }
      if (chamada.statusPublico) {
        resumo.statusPublico = chamada.statusPublico;
      }
    }

    if (atividadesBundleCache && Array.isArray(atividadesBundleCache.calendario)) {
      atividadesBundleCache.calendario.forEach(function atualizarItem(item) {
        if (item && item.idAtividade === idAtividade) {
          item.statusChamada = chamada.statusChamada;
          item.statusChamadaRotulo = chamada.statusChamadaRotulo;
          item.chamadaFinalizada = chamada.chamadaFinalizada;
          item.statusChamadaAtualizadoEm = chamada.statusChamadaAtualizadoEm;
          if (chamada.statusOperacional) {
            item.statusOperacional = chamada.statusOperacional;
          }
          if (chamada.statusPublico) {
            item.statusPublico = chamada.statusPublico;
          }
        }
      });
      salvarBundleAtividadesCache(atividadesBundleCache);
    }

    if (lista && atividadesBundleCache && Array.isArray(atividadesBundleCache.calendario)) {
      renderizarAtividades(lista, atividadesBundleCache.calendario, obterModoAtividadesAtual());
    }
  }

  function recarregarAtividadesAposChamada() {
    var lista = document.getElementById('atividades-lista');
    var status = document.getElementById('atividades-status');

    if (lista && status) {
      carregarAtividadesComLista(lista, status, obterModoAtividadesAtual());
    }
  }

  function recarregarAtividadesAposCriacao() {
    var lista = document.getElementById('atividades-lista');
    var status = document.getElementById('atividades-status');

    if (lista && status) {
      carregarAtividadesComLista(lista, status, MODO_ATIVIDADES_PROXIMAS);
    }
  }

  function montarPayloadSalvarChamada(idAtividade, participantes, operacao) {
    var payload = {
      idAtividade: idAtividade,
      operacao: operacao === 'FINALIZAR' ? 'FINALIZAR' : 'SALVAR',
      registros: [],
      externos: []
    };

    participantes.forEach(function adicionarParticipante(participante) {
      var status = statusOperacionalChamada(participante.statusPresenca);

      if (participante.bloqueado || participante.aplicavelNaData === false || !status) {
        return;
      }

      var item = {
        tipoParticipante: participante.tipoParticipante,
        idPessoa: participante.idPessoa,
        rga: participante.rga,
        nome: participante.nome,
        statusPresenca: status,
        codigoPresenca: obterCodigoPresenca(status),
        observacoes: participante.observacoes
      };

      if (participante.tipoParticipante === 'MEMBRO') {
        payload.registros.push(item);
        return;
      }

      payload.externos.push(Object.assign({}, item, {
        email: '',
        instituicao: participante.instituicao
      }));
    });

    return payload;
  }

  function abrirModalCarregando(idAtividade, resumo) {
    abrirModal({
      idAtividade: idAtividade,
      tituloPublico: resumo && resumo.tituloPublico ? resumo.tituloPublico : 'Carregando atividade',
      descricaoPublica: 'Buscando detalhes no backend do Portal GEAPA...',
      dataAtividade: resumo && resumo.dataAtividade,
      horarioCompleto: resumo && resumo.horarioInicio && resumo.horarioFim
        ? resumo.horarioInicio + ' às ' + resumo.horarioFim
        : '',
      local: resumo && resumo.local,
      formato: resumo && resumo.formato,
      tipoAtividade: resumo && resumo.tipoPublico,
      subtipoAtividade: resumo && resumo.subtipoAtividade,
      classificacaoAcesso: resumo && resumo.classificacaoAcesso,
      contaPresenca: resumo && resumo.contaPresenca,
      contaFalta: resumo && resumo.contaFalta,
      geraCertificado: resumo && resumo.geraCertificado,
      cargaHoraria: resumo && resumo.cargaHoraria,
      statusOperacional: resumo && resumo.statusOperacional,
      statusPublico: resumo && resumo.statusPublico,
      carregando: true
    });
  }

  function abrirModal(detalhe) {
    var modal = document.getElementById('atividade-modal');
    var conteudo = document.getElementById('atividade-modal-content');
    var possuiApresentacao = obterApresentacoesPublicas(detalhe).length > 0;

    conteudo.innerHTML = [
      '<p class="eyebrow">' + ui.escaparHtml(detalhe.idAtividade || 'Atividade') + '</p>',
      '<h3>' + ui.escaparHtml(detalhe.tituloPublico || 'Atividade') + '</h3>',
      '<p class="section-note">' + ui.escaparHtml(detalhe.descricaoPublica || '') + '</p>',
      detalhe.carregando
        ? '<p class="status-message">Carregando detalhes completos...</p>'
        : '',
      '<dl class="activity-detail-grid">',
      montarFato('Data', ui.formatarData(detalhe.dataAtividade)),
      montarFato('Horário', detalhe.horarioCompleto),
      montarFato('Local', detalhe.local),
      montarFato('Formato', ui.formatarRotulo(detalhe.formato)),
      montarFato('Tipo', ui.formatarRotulo(detalhe.tipoAtividade)),
      montarFato('Subtipo', ui.formatarRotulo(detalhe.subtipoAtividade)),
      montarFato('Reunião', ui.formatarRotulo(detalhe.classificacaoReuniao)),
      montarFato('Acesso', ui.formatarRotulo(detalhe.classificacaoAcesso)),
      montarFato('Responsável', detalhe.responsavelPublico || 'Não informado'),
      possuiApresentacao ? '' : montarFatoOpcional('Eixo principal', obterCampoTextoAtividade(detalhe, ['eixoTematicoPrincipal', 'eixoPrincipal', 'eixoTematico'])),
      possuiApresentacao ? '' : montarFatoOpcional('Eixo secundario', obterCampoTextoAtividade(detalhe, ['eixoTematicoSecundario', 'eixoSecundario'])),
      possuiApresentacao ? '' : montarFatoOpcional('Pessoa principal', montarPessoaPrincipalAtividade(detalhe)),
      montarFato('Conta presença', ui.formatarBooleano(detalhe.contaPresenca)),
      montarFato('Conta falta', ui.formatarBooleano(detalhe.contaFalta)),
      montarFato('Gera certificado', ui.formatarBooleano(detalhe.geraCertificado)),
      montarFato('Carga horária', detalhe.cargaHoraria ? detalhe.cargaHoraria + ' h' : '-'),
      montarFato('Status', ui.formatarRotulo(obterStatusAtividade(detalhe))),
      '</dl>',
      montarLinksPublicosDetalhe(detalhe),
      montarEnvolvidosPublicosDetalhe(detalhe),
      montarApresentacoesVinculadasDetalhe(detalhe)
    ].join('');

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function montarLinksPublicosDetalhe(detalhe) {
    var links = [
      { rotulo: 'Material geral da atividade', href: obterCampoTextoAtividade(detalhe, ['linkMaterialPublico']) },
      { rotulo: 'Pasta geral da atividade', href: obterCampoTextoAtividade(detalhe, ['linkPastaDrive']), classe: 'activity-folder-link' },
      { rotulo: 'Ata publica', href: obterCampoTextoAtividade(detalhe, ['linkAtaPublica']) },
      { rotulo: 'Fotos publicas', href: obterCampoTextoAtividade(detalhe, ['linkFotosPublico']) }
    ].filter(function filtrar(link) {
      return link.href;
    });

    if (!links.length) {
      return '';
    }

    return [
      '<section class="activity-detail-section">',
      '<h4>Materiais publicos</h4>',
      '<div class="activity-detail-links">',
      links.map(function montarLink(link) {
        return '<a class="secondary-button compact-button ' + ui.escaparHtml(link.classe || '') + '" href="' + ui.escaparHtml(link.href) +
          '" target="_blank" rel="noopener noreferrer">' + ui.escaparHtml(link.rotulo) + '</a>';
      }).join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function montarEnvolvidosPublicosDetalhe(detalhe) {
    var envolvidos = obterEnvolvidosPublicos(detalhe);

    if (!envolvidos.length) {
      return '';
    }

    return [
      '<section class="activity-detail-section">',
      '<h4>Envolvidos publicos</h4>',
      '<div class="activity-detail-list">',
      envolvidos.map(function montarEnvolvido(item) {
        var nome = obterCampoTextoAtividade(item, ['nomePublico', 'nome', 'nomePessoaPublico']);
        var papel = obterCampoTextoAtividade(item, ['papel', 'papelPublico']);
        var tipo = obterCampoTextoAtividade(item, ['tipoPessoa', 'tipo']);

        return [
          '<article>',
          '<strong>' + ui.escaparHtml(nome || 'Pessoa vinculada') + '</strong>',
          [papel, tipo].filter(Boolean).length
            ? '<small>' + ui.escaparHtml([papel, tipo].filter(Boolean).join(' / ')) + '</small>'
            : '',
          '</article>'
        ].join('');
      }).join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function montarApresentacoesVinculadasDetalhe(detalhe) {
    var apresentacoes = obterApresentacoesPublicas(detalhe);

    if (!apresentacoes.length) {
      return '';
    }

    return [
      '<section class="activity-detail-section">',
      '<h4>' + ui.escaparHtml(apresentacoes.length > 1 ? 'Apresentacoes vinculadas' : 'Apresentacao vinculada') + '</h4>',
      '<div class="activity-presentation-list">',
      apresentacoes.map(montarApresentacaoDetalhe).join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function montarApresentacaoDetalhe(apresentacao) {
    var apresentador = obterCampoTextoAtividade(apresentacao, ['nomeApresentador', 'apresentadorPublico', 'nomePessoaPrincipalPublico', 'nomePublico', 'nome']);
    var titulo = obterTituloApresentacao(apresentacao);
    var eixoPrincipal = obterCampoTextoAtividade(apresentacao, ['eixoTematicoPrincipal', 'eixoPrincipal']);
    var eixoSecundario = obterCampoTextoAtividade(apresentacao, ['eixoTematicoSecundario', 'eixoSecundario']);
    var statusApresentacao = obterCampoTextoAtividade(apresentacao, ['statusApresentacao', 'statusPublico', 'status']);
    var statusTituloEixo = obterCampoTextoAtividade(apresentacao, ['statusTituloEixo']);
    var statusMaterial = obterCampoTextoAtividade(apresentacao, ['statusMaterial']);
    var nomeArquivoMaterial = obterCampoTextoAtividade(apresentacao, ['nomeArquivoMaterial']);
    var idArquivoMaterial = obterCampoTextoAtividade(apresentacao, ['idArquivoMaterial']);
    var versaoMaterial = obterCampoTextoAtividade(apresentacao, ['versaoMaterial']);
    var linkMaterial = obterCampoTextoAtividade(apresentacao, ['linkMaterialPublico']);

    return [
      '<article class="activity-presentation-detail">',
      apresentador ? '<small>' + ui.escaparHtml(apresentador) + '</small>' : '',
      '<strong>' + ui.escaparHtml(titulo || 'Apresentacao') + '</strong>',
      eixoPrincipal || eixoSecundario
        ? '<span>' + ui.escaparHtml([eixoPrincipal, eixoSecundario].filter(Boolean).join(' / ')) + '</span>'
        : '',
      statusApresentacao || statusTituloEixo || statusMaterial || versaoMaterial
        ? '<span>' + ui.escaparHtml([statusApresentacao, statusTituloEixo, statusMaterial, versaoMaterial].filter(Boolean).join(' - ')) + '</span>'
        : '',
      idArquivoMaterial && !linkMaterial
        ? '<span>' + ui.escaparHtml(nomeArquivoMaterial || 'Material cadastrado sem link publico') + '</span>'
        : '',
      linkMaterial
        ? '<a href="' + ui.escaparHtml(linkMaterial) + '" target="_blank" rel="noopener noreferrer">' +
          ui.escaparHtml(nomeArquivoMaterial || 'Abrir material da apresentacao') + '</a>'
        : '<small>Material nao disponivel</small>',
      '</article>'
    ].join('');
  }

  function definirTituloModal(titulo) {
    var tituloModal = document.getElementById('atividade-modal-title');

    if (tituloModal) {
      tituloModal.textContent = titulo;
    }
  }

  function fecharModal() {
    var modal = document.getElementById('atividade-modal');

    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAtividades);
  } else {
    iniciarAtividades();
  }
})(window);
