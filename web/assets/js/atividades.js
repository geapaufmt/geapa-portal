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
  var PRELOAD_DETALHES_LIMITE_PADRAO = 5;
  var MODO_ATIVIDADES_PROXIMAS = 'proximas';
  var MODO_ATIVIDADES_HISTORICO = 'historico';
  var HISTORICO_ATIVIDADES_INICIO = '2026-04-09';
  var detalhesCache = {};
  var atividadesResumoCache = {};
  var atividadesBundleCache = null;
  var atividadesBundleCacheSalvoEm = 0;
  var detalhesPreloadPromise = null;
  var detalhesPreloadTimer = null;
  var detalhesPreloadFila = [];
  var detalhesPreloadIds = {};
  var detalhesPreloadEmExecucao = false;
  var detalhesIntersectionObserver = null;
  var chamadaAtual = null;
  var STATUS_CHAMADA = [
    { valor: '', rotulo: 'Sem marcação', codigo: '' },
    { valor: 'PRESENTE_PRESENCIAL', rotulo: 'Presente presencial', codigo: 'P' },
    { valor: 'PRESENTE_REMOTO', rotulo: 'Presente remoto', codigo: 'R' },
    { valor: 'FALTA', rotulo: 'Falta', codigo: 'F' },
    { valor: 'NAO_SE_APLICA', rotulo: 'Não se aplica', codigo: 'N/A' }
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
        : 'Esta tela usa a base Atividades v2 DEV e mostra apenas atividades futuras ou em andamento. Apresentações de membros também serão tratadas a partir de geapa-atividades.';
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
    botaoCriar.disabled = true;
    botaoCriar.title = 'Criação de atividades ainda não está disponível pelo portal.';
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
      planejarPreloadDetalhesPrioritarios(dados, status);
    }, 900);
  }

  function planejarPreloadDetalhesPrioritarios(bundle, status) {
    var dados = normalizarBundleAtividades(bundle);
    var prioridade = obterAtividadesParaPreload(dados.calendario);

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

    if (!id || detalhesCache[id] || detalhesPreloadIds[id]) {
      return;
    }

    detalhesPreloadIds[id] = true;
    detalhesPreloadFila.push({
      idAtividade: id,
      origem: origem || 'background'
    });
    processarFilaPreloadDetalhes();
  }

  function processarFilaPreloadDetalhes() {
    var item;
    var inicio;

    if (detalhesPreloadEmExecucao || !detalhesPreloadFila.length) {
      return;
    }

    item = detalhesPreloadFila.shift();
    detalhesPreloadEmExecucao = true;
    inicio = obterTempoAtual();

    api.apiGet('/atividades/detalhe', {
      idAtividade: item.idAtividade
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível preparar o detalhe.');
      }

      detalhesCache[item.idAtividade] = resposta.data;
      atualizarDetalheNoBundleCache(item.idAtividade, resposta.data);
      registrarPerfAtividades('atividades.detalhe.preload_unitario', inicio, mesclarMetaPerfAtividades(resposta, {
        idAtividade: item.idAtividade,
        origemPreload: item.origem,
        payloadBytes: estimarPayloadBytes(resposta.data || {})
      }));
    }).catch(function tratarErro(erro) {
      registrarPerfAtividades('atividades.detalhe.preload_unitario_falhou', inicio, {
        idAtividade: item.idAtividade,
        origemPreload: item.origem,
        erro: erro.message
      });
    }).then(function finalizarPreload() {
      detalhesPreloadEmExecucao = false;
      global.setTimeout(processarFilaPreloadDetalhes, 350);
    });
  }

  function executarPreloadDetalhesAtividades(status) {
    var inicio = obterTempoAtual();

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
      return atividade && atividade.idAtividade && detalhesCache[atividade.idAtividade];
    });
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

    return 'geapaPortal.atividadesLista.v5.' + hashCurto(token + ':' + usuarioId);
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
    var dados = Object.assign({}, detalhes || {});
    var tempoBackend = Number(desempenho.tempoMs);
    var origemBackend = desempenho.origemDados || atividades.origemDados || '';

    if (!Number.isNaN(tempoBackend) && tempoBackend >= 0) {
      dados.tempoBackendMs = Math.round(tempoBackend);
    }

    if (origemBackend) {
      dados.origemBackend = origemBackend;
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
    var dados = historico ? obterHistoricoAtividades(todas) : obterProximasAtividades(todas);
    var proxima = historico ? null : obterProximaAtividade(dados);
    var rotulos = obterRotulosAtividades(modo);
    var avisoHistorico = historico ? montarAvisoEscopoHistoricoAtividades() : '';

    if (!dados.length) {
      container.innerHTML = avisoHistorico + '<p class="empty-state">' +
        ui.escaparHtml(todas.length
          ? (historico
            ? 'Nenhuma atividade realizada a partir do Ciclo 2026 está disponível nesta aba.'
            : 'Nenhuma próxima atividade disponível. Atividades já realizadas ficarão no histórico de atividades.')
          : rotulos.vazio) +
        '</p>';
      return;
    }

    dados.forEach(function guardarResumo(atividade) {
      if (atividade && atividade.idAtividade) {
        atividadesResumoCache[atividade.idAtividade] = atividade;
      }
    });

    container.innerHTML = [
      avisoHistorico,
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

    observarPreloadDetalhes(container);
  }

  function montarAvisoEscopoHistoricoAtividades() {
    return [
      '<p class="simulation-warning">',
      ui.escaparHtml('Apenas as atividades a partir da primeira atividade do Ciclo 2026 em diante, realizada em 09/04/2026, estarão disponíveis nesta aba.'),
      '</p>'
    ].join('');
  }

  function obterProximasAtividades(atividades) {
    var agora = obterTempoCacheAtual();

    return (Array.isArray(atividades) ? atividades : [])
      .filter(function filtrarAtividadeFuturaOuAtual(atividade) {
        var inicio = obterInicioAtividadeMs(atividade);
        var fim = obterFimAtividadeMs(atividade);

        if (ehAtividadeRealizadaOuCancelada(atividade)) {
          return false;
        }

        if (fim) {
          return fim >= agora;
        }

        if (inicio) {
          return inicio >= agora;
        }

        return true;
      })
      .sort(compararAtividadesPorInicio);
  }

  function obterHistoricoAtividades(atividades) {
    var inicioHistorico = new Date(HISTORICO_ATIVIDADES_INICIO + 'T00:00:00').getTime();
    var agora = obterTempoCacheAtual();

    return (Array.isArray(atividades) ? atividades : [])
      .filter(function filtrarHistorico(atividade) {
        var inicio = obterInicioAtividadeMs(atividade) || obterDataAtividadeMs(atividade);
        var fim = obterFimAtividadeMs(atividade);

        if (!inicio || inicio < inicioHistorico) {
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

  function ehAtividadeRealizadaOuCancelada(atividade) {
    return ehAtividadeRealizadaOuEncerrada(atividade) || ehAtividadeCancelada(atividade);
  }

  function ehAtividadeRealizadaOuEncerrada(atividade) {
    var status = String((atividade && (atividade.statusPublico || atividade.status)) || '').trim().toUpperCase();

    return [
      'REALIZADA',
      'ENCERRADA',
      'FINALIZADA'
    ].indexOf(status) >= 0;
  }

  function ehAtividadeCancelada(atividade) {
    var status = String((atividade && (atividade.statusPublico || atividade.status)) || '').trim().toUpperCase();

    return [
      'CANCELADA',
      'CANCELADO'
    ].indexOf(status) >= 0;
  }

  function montarCardAtividade(atividade, destaque, modo) {
    var historico = modo === MODO_ATIVIDADES_HISTORICO;

    return [
      '<article class="activity-card' + (destaque ? ' activity-card-featured' : '') + '" data-id-atividade="' + ui.escaparHtml(atividade.idAtividade) + '">',
      '<div class="activity-card-main">',
      '<div>',
      '<p class="activity-date">' + ui.escaparHtml(ui.formatarData(atividade.dataAtividade)) + ' · ' + ui.escaparHtml(atividade.diaSemana) + '</p>',
      '<h3>' + ui.escaparHtml(atividade.tituloPublico) + '</h3>',
      '<p class="activity-meta">' + ui.escaparHtml(montarMetaAtividade(atividade)) + '</p>',
      '</div>',
      '<div class="activity-status-stack">',
      '<span class="status-pill">' + ui.escaparHtml(ui.formatarRotulo(atividade.statusPublico)) + '</span>',
      atividade.statusChamadaRotulo
        ? '<span class="status-pill status-pill-muted">' + ui.escaparHtml(atividade.statusChamadaRotulo) + '</span>'
        : '',
      '</div>',
      '</div>',
      '<dl class="activity-facts">',
      montarFato('Tipo', atividade.tipoPublico),
      montarFato('Formato', ui.formatarRotulo(atividade.formato)),
      montarFato('Presença', ui.formatarBooleano(atividade.contaPresenca)),
      montarFato('Falta', ui.formatarBooleano(atividade.contaFalta)),
      montarFato('Certificado', ui.formatarBooleano(atividade.geraCertificado)),
      montarFato('Carga horária', atividade.cargaHoraria + ' h'),
      '</dl>',
      historico ? '' : montarAvisoChamada(atividade, destaque),
      '<div class="activity-actions">',
      montarBotaoDetalhes(atividade),
      montarBotaoChamada(atividade, modo),
      historico ? '' : montarBotaoMock('Editar', auth.canEditActivity(atividade)),
      historico ? '' : montarBotaoMock('Justificar falta', auth.canJustifyAbsence(atividade)),
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
    var agora = obterTempoCacheAtual();

    return (Array.isArray(atividades) ? atividades : [])
      .filter(function filtrarFuturas(atividade) {
        var inicio = obterInicioAtividadeMs(atividade);
        var fim = obterFimAtividadeMs(atividade);

        if (fim) {
          return fim >= agora;
        }

        return inicio && inicio > agora;
      })
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

  function carregarDetalheAtividade(idAtividade) {
    var inicio = obterTempoAtual();
    var detalheCache = cacheAtividadesMemoriaValido() ? detalhesCache[idAtividade] : null;
    var resumo = atividadesResumoCache[idAtividade];

    definirTituloModal('Detalhes da atividade');

    if (detalheCache) {
      abrirModal(detalheCache);
      registrarPerfAtividades('atividades.detalhe.cache', inicio, {
        idAtividade: idAtividade,
        payloadBytes: estimarPayloadBytes(detalheCache)
      });
      return;
    }

    abrirModalCarregando(idAtividade, resumo);

    api.apiGet('/atividades/detalhe', {
      idAtividade: idAtividade
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível carregar detalhes.');
      }

      detalhesCache[idAtividade] = resposta.data;
      atualizarDetalheNoBundleCache(idAtividade, resposta.data);
      abrirModal(resposta.data);
      registrarPerfAtividades('atividades.detalhe.fallback_backend', inicio, mesclarMetaPerfAtividades(resposta, {
        idAtividade: idAtividade,
        payloadBytes: estimarPayloadBytes(resposta.data)
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
      resumoSalvo: origem.resumoSalvo || {},
      modo: origem.modo || 'DEV',
      ultimaAtualizacao: origem.ultimaAtualizacao || ''
    };
  }

  function renderizarChamada(chamada) {
    var conteudo = document.getElementById('atividade-modal-content');
    var atividade = chamada.atividade || {};

    definirTituloModal(chamada.chamadaFinalizada ? 'Visualizar chamada' : 'Registrar chamada');
    conteudo.innerHTML = [
      '<div class="attendance-shell">',
      '<p class="eyebrow">' + ui.escaparHtml(atividade.idAtividade || 'Atividade') + '</p>',
      '<h3>' + ui.escaparHtml(atividade.tituloPublico || 'Chamada') + '</h3>',
      '<p class="section-note">',
      ui.escaparHtml([
        ui.formatarData(atividade.dataAtividade),
        atividade.horarioCompleto,
        atividade.local
      ].filter(Boolean).join(' · ')),
      '</p>',
      '<p class="simulation-warning">Registro em modo ' + ui.escaparHtml(chamada.modo || 'DEV') + '. A chamada é salva somente pela API do Apps Script.</p>',
      montarEstadoChamada(chamada),
      montarResumoChamada(calcularResumoChamada(chamada.participantes)),
      '<div class="attendance-list">',
      chamada.participantes.length
        ? chamada.participantes.map(montarParticipanteChamada).join('')
        : '<p class="empty-state">Nenhum participante aplicável foi localizado para esta atividade.</p>',
      '</div>',
      '<div class="attendance-footer">',
      '<p id="chamada-status" class="section-note" role="status" aria-live="polite"></p>',
      '<div class="attendance-actions">',
      chamada.chamadaFinalizada && chamada.podeReabrir
        ? '<button class="secondary-button compact-button" type="button" data-reopen-attendance>Reabrir chamada</button>'
        : '',
      !chamada.chamadaFinalizada
        ? '<button class="secondary-button compact-button" type="button" data-save-attendance ' +
          (chamada.podeSalvar ? '' : 'disabled') +
          '>Salvar chamada</button>'
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

    if (chamada.chamadaFinalizada) {
      partes.push('<small>Esta chamada está finalizada e aberta apenas para consulta.</small>');
    }

    partes.push('</div>');
    return partes.join('');
  }

  function montarResumoChamada(resumo) {
    return [
      '<dl class="attendance-summary" data-attendance-summary>',
      montarFato('Participantes', resumo.totalParticipantes),
      montarFato('Presentes', resumo.totalPresentes),
      montarFato('Faltas', resumo.totalFaltas),
      montarFato('N/A', resumo.totalNaoSeAplica),
      montarFato('Sem marcação', resumo.totalSemMarcacao),
      '</dl>'
    ].join('');
  }

  function montarParticipanteChamada(participante) {
    var bloqueado = participante.bloqueado || participante.aplicavelNaData === false;
    var somenteLeitura = chamadaAtual && chamadaAtual.chamadaFinalizada;
    var desabilitado = bloqueado || somenteLeitura;

    return [
      '<article class="attendance-row" data-attendance-row data-index="' + participante.indice + '">',
      '<div class="attendance-person">',
      '<strong>' + ui.escaparHtml(participante.nome) + '</strong>',
      '<small>' + ui.escaparHtml(montarSubtituloParticipante(participante)) + '</small>',
      bloqueado
        ? '<small class="attendance-lock">' + ui.escaparHtml(participante.motivoBloqueio || 'Não aplicável nesta data.') + '</small>'
        : '',
      '</div>',
      '<label class="attendance-field">',
      '<span>Presença</span>',
      '<select data-attendance-status ' + (desabilitado ? 'disabled' : '') + '>',
      STATUS_CHAMADA.map(function montarOpcao(opcao) {
        return '<option value="' + ui.escaparHtml(opcao.valor) + '" ' +
          (opcao.valor === participante.statusPresenca ? 'selected' : '') +
          '>' + ui.escaparHtml(opcao.rotulo) + '</option>';
      }).join(''),
      '</select>',
      '</label>',
      '<label class="attendance-field attendance-note">',
      '<span>Observação</span>',
      '<input data-attendance-note type="text" maxlength="300" value="' + ui.escaparHtml(participante.observacoes) + '" ' +
        (desabilitado ? 'disabled' : '') +
        '>',
      '</label>',
      '</article>'
    ].join('');
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
      container.querySelectorAll('[data-attendance-status], [data-attendance-note]'),
      function registrarCampo(campo) {
        campo.addEventListener('change', atualizarResumoChamada);
        campo.addEventListener('input', atualizarResumoChamada);
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

  function atualizarResumoChamada() {
    var participantes = lerParticipantesChamadaDoModal();
    var resumo = calcularResumoChamada(participantes);
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
      var status = linha.querySelector('[data-attendance-status]');
      var observacao = linha.querySelector('[data-attendance-note]');
      var statusValor = status ? status.value : base.statusPresenca;

      return Object.assign({}, base, {
        statusPresenca: statusValor,
        codigoPresenca: obterCodigoPresenca(statusValor),
        observacoes: observacao ? observacao.value.trim() : base.observacoes
      });
    });
  }

  function calcularResumoChamada(participantes) {
    var resumo = {
      totalParticipantes: participantes.length,
      totalPresentes: 0,
      totalFaltas: 0,
      totalNaoSeAplica: 0,
      totalSemMarcacao: 0
    };

    participantes.forEach(function contarParticipante(participante) {
      if (participante.bloqueado || participante.aplicavelNaData === false) {
        return;
      }

      if (participante.statusPresenca === 'PRESENTE_PRESENCIAL' || participante.statusPresenca === 'PRESENTE_REMOTO') {
        resumo.totalPresentes++;
      } else if (participante.statusPresenca === 'FALTA') {
        resumo.totalFaltas++;
      } else if (participante.statusPresenca === 'NAO_SE_APLICA') {
        resumo.totalNaoSeAplica++;
      } else {
        resumo.totalSemMarcacao++;
      }
    });

    return resumo;
  }

  function obterCodigoPresenca(status) {
    var encontrado = STATUS_CHAMADA.find(function encontrarStatus(opcao) {
      return opcao.valor === status;
    });

    return encontrado ? encontrado.codigo : '';
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
    var participantes = lerParticipantesChamadaDoModal();
    var resumo = calcularResumoChamada(participantes);
    var status = document.getElementById('chamada-status');
    var botao = document.querySelector(operacaoNormalizada === 'FINALIZAR'
      ? '[data-finalize-attendance]'
      : '[data-save-attendance]');

    if (resumo.totalSemMarcacao > 0) {
      if (status) {
        status.textContent = 'Marque todos os participantes antes de ' +
          (operacaoNormalizada === 'FINALIZAR' ? 'finalizar' : 'salvar') +
          ' a chamada.';
      }
      return;
    }

    var payload = montarPayloadSalvarChamada(chamadaAtual.atividade.idAtividade, participantes);
    payload.operacao = operacaoNormalizada;
    var inicio = obterTempoAtual();

    if (botao) {
      botao.disabled = true;
      botao.textContent = operacaoNormalizada === 'FINALIZAR' ? 'Finalizando...' : 'Salvando...';
    }
    if (status) {
      status.textContent = operacaoNormalizada === 'FINALIZAR'
        ? 'Finalizando chamada na base DEV.'
        : 'Salvando chamada na base DEV.';
    }

    api.apiPost('/atividades/chamada/salvar', {
      payload: JSON.stringify(payload)
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível salvar a chamada.');
      }

      chamadaAtual.participantes = participantes;
      aplicarStatusChamadaAtual(resposta.data || {});
      sincronizarStatusChamadaNaLista(chamadaAtual.atividade.idAtividade, chamadaAtual);
      if (status) {
        status.textContent = resposta.message || 'Chamada salva com sucesso.';
      }
      renderizarChamada(chamadaAtual);
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
      if (botao) {
        botao.disabled = false;
        botao.textContent = operacaoNormalizada === 'FINALIZAR' ? 'Finalizar chamada' : 'Salvar chamada';
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

      aplicarStatusChamadaAtual(resposta.data || {});
      sincronizarStatusChamadaNaLista(chamadaAtual.atividade.idAtividade, chamadaAtual);
      renderizarChamada(chamadaAtual);
    }).catch(function tratarErro(erro) {
      if (status) {
        status.textContent = erro.message;
      }
    }).then(function finalizar() {
      if (botao) {
        botao.disabled = false;
        botao.textContent = 'Reabrir chamada';
      }
    });
  }

  function aplicarStatusChamadaAtual(dados) {
    chamadaAtual.statusChamada = dados.statusChamada || chamadaAtual.statusChamada;
    chamadaAtual.statusChamadaRotulo = dados.statusChamadaRotulo || chamadaAtual.statusChamadaRotulo;
    chamadaAtual.chamadaFinalizada = dados.chamadaFinalizada === true;
    chamadaAtual.statusChamadaAtualizadoEm = dados.statusChamadaAtualizadoEm || new Date().toISOString();
    chamadaAtual.statusChamadaAtualizadoPor = dados.statusChamadaAtualizadoPor || chamadaAtual.statusChamadaAtualizadoPor;
    chamadaAtual.podeSalvar = !chamadaAtual.chamadaFinalizada;
    chamadaAtual.podeFinalizar = !chamadaAtual.chamadaFinalizada;
    chamadaAtual.podeReabrir = chamadaAtual.chamadaFinalizada;
  }

  function sincronizarStatusChamadaNaLista(idAtividade, chamada) {
    var resumo = atividadesResumoCache[idAtividade];
    var lista = document.getElementById('atividades-lista');

    if (resumo) {
      resumo.statusChamada = chamada.statusChamada;
      resumo.statusChamadaRotulo = chamada.statusChamadaRotulo;
      resumo.chamadaFinalizada = chamada.chamadaFinalizada;
      resumo.statusChamadaAtualizadoEm = chamada.statusChamadaAtualizadoEm;
    }

    if (atividadesBundleCache && Array.isArray(atividadesBundleCache.calendario)) {
      atividadesBundleCache.calendario.forEach(function atualizarItem(item) {
        if (item && item.idAtividade === idAtividade) {
          item.statusChamada = chamada.statusChamada;
          item.statusChamadaRotulo = chamada.statusChamadaRotulo;
          item.chamadaFinalizada = chamada.chamadaFinalizada;
          item.statusChamadaAtualizadoEm = chamada.statusChamadaAtualizadoEm;
        }
      });
      salvarBundleAtividadesCache(atividadesBundleCache);
    }

    if (lista && atividadesBundleCache && Array.isArray(atividadesBundleCache.calendario)) {
      renderizarAtividades(lista, atividadesBundleCache.calendario, obterModoAtividadesAtual());
    }
  }

  function montarPayloadSalvarChamada(idAtividade, participantes) {
    var payload = {
      idAtividade: idAtividade,
      registros: [],
      externos: []
    };

    participantes.forEach(function adicionarParticipante(participante) {
      if (participante.bloqueado || participante.aplicavelNaData === false || !participante.statusPresenca) {
        return;
      }

      var item = {
        tipoParticipante: participante.tipoParticipante,
        idPessoa: participante.idPessoa,
        rga: participante.rga,
        nome: participante.nome,
        statusPresenca: participante.statusPresenca,
        codigoPresenca: participante.codigoPresenca,
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
      statusPublico: resumo && resumo.statusPublico,
      carregando: true
    });
  }

  function abrirModal(detalhe) {
    var modal = document.getElementById('atividade-modal');
    var conteudo = document.getElementById('atividade-modal-content');

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
      montarFato('Conta presença', ui.formatarBooleano(detalhe.contaPresenca)),
      montarFato('Conta falta', ui.formatarBooleano(detalhe.contaFalta)),
      montarFato('Gera certificado', ui.formatarBooleano(detalhe.geraCertificado)),
      montarFato('Carga horária', detalhe.cargaHoraria ? detalhe.cargaHoraria + ' h' : '-'),
      montarFato('Status', ui.formatarRotulo(detalhe.statusPublico)),
      '</dl>',
      '<p class="section-note">Materiais e atas públicas serão exibidos quando a integração real estiver disponível.</p>'
    ].join('');

    modal.hidden = false;
    document.body.classList.add('modal-open');
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
