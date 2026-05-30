/**
 * Tela inicial de Atividades do Portal GEAPA.
 *
 * Esta tela usa o Apps Script em modo real e dados simulados apenas quando
 * MOCK_MODE estiver ativo. Permissoes visuais nao substituem o backend.
 */

(function configurarAtividadesPortal(global) {
  var api = global.PortalGeapaApi;
  var auth = global.PortalGeapaAuth;
  var ui = global.PortalGeapaUi;
  var ATIVIDADES_CACHE_TTL_MS = 5 * 60 * 1000;
  var detalhesCache = {};
  var atividadesResumoCache = {};
  var atividadesBundleCache = null;
  var atividadesBundleCacheSalvoEm = 0;
  var detalhesPreloadPromise = null;
  var detalhesPreloadTimer = null;
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

    Array.prototype.forEach.call(botoesAbrir, function registrarBotao(botao) {
      botao.addEventListener('click', function abrirAtividades() {
        mostrarTelaAtividades();
        atualizarAcoesDaTela(botaoCriar);
        carregarAtividades(lista, status);
      });
    });

    Array.prototype.forEach.call(botoesVoltar, function registrarBotao(botao) {
      botao.addEventListener('click', mostrarTelaSituacaoOuAcesso);
    });

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

  function atualizarAcoesDaTela(botaoCriar) {
    if (!botaoCriar) {
      return;
    }

    botaoCriar.hidden = !auth.canCreateActivity();
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

  function carregarAtividades(lista, status) {
    carregarAtividadesComBundle(lista, status);
    return;

    lista.innerHTML = '<p class="empty-state">Carregando atividades...</p>';
    status.textContent = 'Buscando atividades no Portal GEAPA.';

    api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível carregar atividades.');
        }

        renderizarAtividades(lista, resposta.data || []);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : 'Leitura segura carregada pelo backend do Portal GEAPA.';
      })
      .catch(function tratarErro(erro) {
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = 'Falha ao carregar atividades.';
      });
  }

  function carregarAtividadesComBundle(lista, status) {
    var inicio = obterTempoAtual();
    var bundleCache = lerBundleAtividadesCacheValido();

    if (bundleCache) {
      aplicarBundleAtividades(bundleCache);
      renderizarAtividades(lista, bundleCache.calendario);
      status.textContent = configEmModoMock()
        ? 'Dados simulados. Nenhuma atividade real foi consultada.'
        : 'Leitura segura carregada em cache local.';
      registrarPerfAtividades('atividades.aba.cache', inicio, {
        total: bundleCache.calendario.length,
        payloadBytes: estimarPayloadBytes(bundleCache.calendario)
      });
      iniciarPreloadDetalhesAtividades(bundleCache, status);
      return;
    }

    lista.innerHTML = '<p class="empty-state">Carregando atividades...</p>';
    status.textContent = 'Buscando atividades no Portal GEAPA.';

    api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar atividades.');
        }

        var bundle = normalizarBundleAtividades({
          calendario: resposta.data || [],
          detalhesPorId: {},
          ultimaAtualizacao: new Date().toISOString()
        });
        aplicarBundleAtividades(bundle);
        salvarBundleAtividadesCache(bundle);
        renderizarAtividades(lista, bundle.calendario);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : 'Atividades carregadas. Detalhes sendo preparados em segundo plano.';
        registrarPerfAtividades('atividades.lista.renderizada', inicio, {
          total: bundle.calendario.length,
          payloadBytes: estimarPayloadBytes(resposta.data || [])
        });
        iniciarPreloadDetalhesAtividades(bundle, status);
      })
      .catch(function tratarErro(erro) {
        registrarPerfAtividades('atividades.lista.falhou', inicio, {
          erro: erro.message
        });
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = 'Falha ao carregar atividades.';
      });
  }

  function carregarAtividadesFallback(lista, status, inicioOriginal) {
    var inicio = obterTempoAtual();

    api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar atividades.');
        }

        var bundle = normalizarBundleAtividades({
          calendario: resposta.data || [],
          detalhesPorId: {},
          ultimaAtualizacao: new Date().toISOString()
        });
        aplicarBundleAtividades(bundle);
        salvarBundleAtividadesCache(bundle);
        renderizarAtividades(lista, bundle.calendario);
        status.textContent = configEmModoMock()
          ? 'Dados simulados. Nenhuma atividade real foi consultada.'
          : 'Leitura segura carregada pelo backend do Portal GEAPA.';
        registrarPerfAtividades('atividades.aba.fallback_lista', inicioOriginal || inicio, {
          total: bundle.calendario.length,
          tempoFallbackMs: Math.round(obterTempoAtual() - inicio)
        });
      })
      .catch(function tratarErro(erro) {
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = 'Falha ao carregar atividades.';
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
      executarPreloadDetalhesAtividades(status);
    }, 700);
  }

  function executarPreloadDetalhesAtividades(status) {
    var inicio = obterTempoAtual();

    detalhesPreloadPromise = api.apiGet('/atividades/detalhes-preload', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel preparar detalhes.');
        }

        var detalhes = normalizarDetalhesPorId((resposta.data || {}).detalhesPorId);
        mesclarDetalhesNoCache(detalhes, (resposta.data || {}).ultimaAtualizacao);
        registrarPerfAtividades('atividades.detalhes.preload', inicio, {
          totalDetalhes: Object.keys(detalhes).length,
          payloadBytes: estimarPayloadBytes(resposta.data || {})
        });

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

    return 'geapaPortal.atividadesBundle.v2.' + hashCurto(token + ':' + usuarioId);
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

  function estimarPayloadBytes(valor) {
    try {
      return JSON.stringify(valor || {}).length;
    } catch (erro) {
      return 0;
    }
  }

  function renderizarAtividades(container, atividades) {
    if (!atividades.length) {
      container.innerHTML = '<p class="empty-state">Nenhuma atividade disponível nesta etapa.</p>';
      return;
    }

    atividades.forEach(function guardarResumo(atividade) {
      if (atividade && atividade.idAtividade) {
        atividadesResumoCache[atividade.idAtividade] = atividade;
      }
    });

    container.innerHTML = atividades.map(function montarAtividade(atividade) {
      return [
        '<article class="activity-card" data-id-atividade="' + ui.escaparHtml(atividade.idAtividade) + '">',
        '<div class="activity-card-main">',
        '<div>',
        '<p class="activity-date">' + ui.escaparHtml(ui.formatarData(atividade.dataAtividade)) + ' · ' + ui.escaparHtml(atividade.diaSemana) + '</p>',
        '<h3>' + ui.escaparHtml(atividade.tituloPublico) + '</h3>',
        '<p class="activity-meta">' + ui.escaparHtml(atividade.horarioInicio + ' às ' + atividade.horarioFim) + ' · ' + ui.escaparHtml(atividade.local) + '</p>',
        '</div>',
        '<span class="status-pill">' + ui.escaparHtml(ui.formatarRotulo(atividade.statusPublico)) + '</span>',
        '</div>',
        '<dl class="activity-facts">',
        montarFato('Tipo', atividade.tipoPublico),
        montarFato('Formato', ui.formatarRotulo(atividade.formato)),
        montarFato('Presença', ui.formatarBooleano(atividade.contaPresenca)),
        montarFato('Falta', ui.formatarBooleano(atividade.contaFalta)),
        montarFato('Certificado', ui.formatarBooleano(atividade.geraCertificado)),
        montarFato('Carga horária', atividade.cargaHoraria + ' h'),
        '</dl>',
        '<div class="activity-actions">',
        montarBotaoDetalhes(atividade),
        montarBotaoChamada(atividade),
        montarBotaoMock('Editar', auth.canEditActivity(atividade)),
        montarBotaoMock('Justificar falta', auth.canJustifyAbsence(atividade)),
        '</div>',
        '</article>'
      ].join('');
    }).join('');

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

  function montarBotaoChamada(atividade) {
    if (!auth.canRegisterAttendance(atividade)) {
      return '';
    }

    return [
      '<button class="secondary-button compact-button" type="button" data-activity-attendance="',
      ui.escaparHtml(atividade.idAtividade),
      '">Registrar chamada</button>'
    ].join('');
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
      registrarPerfAtividades('atividades.detalhe.fallback_backend', inicio, {
        idAtividade: idAtividade,
        payloadBytes: estimarPayloadBytes(resposta.data)
      });
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
      registrarPerfAtividades('atividades.chamada.carregada', inicio, {
        idAtividade: idAtividade,
        totalParticipantes: chamadaAtual.participantes.length,
        payloadBytes: estimarPayloadBytes(resposta.data || {})
      });
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
      modo: origem.modo || 'DEV',
      ultimaAtualizacao: origem.ultimaAtualizacao || ''
    };
  }

  function renderizarChamada(chamada) {
    var conteudo = document.getElementById('atividade-modal-content');
    var atividade = chamada.atividade || {};

    definirTituloModal('Registrar chamada');
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
      montarResumoChamada(calcularResumoChamada(chamada.participantes)),
      '<div class="attendance-list">',
      chamada.participantes.length
        ? chamada.participantes.map(montarParticipanteChamada).join('')
        : '<p class="empty-state">Nenhum participante aplicável foi localizado para esta atividade.</p>',
      '</div>',
      '<div class="attendance-footer">',
      '<p id="chamada-status" class="section-note" role="status" aria-live="polite"></p>',
      '<button class="secondary-button compact-button" type="button" data-save-attendance ' +
        (chamada.podeSalvar ? '' : 'disabled') +
        '>Salvar chamada</button>',
      '</div>',
      '</div>'
    ].join('');

    registrarEventosChamada(conteudo);
    atualizarResumoChamada();
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
      '<select data-attendance-status ' + (bloqueado ? 'disabled' : '') + '>',
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
        (bloqueado ? 'disabled' : '') +
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
      botaoSalvar.addEventListener('click', salvarChamadaAtual);
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

  function salvarChamadaAtual() {
    if (!chamadaAtual || !chamadaAtual.atividade) {
      return;
    }

    var participantes = lerParticipantesChamadaDoModal();
    var resumo = calcularResumoChamada(participantes);
    var status = document.getElementById('chamada-status');
    var botao = document.querySelector('[data-save-attendance]');

    if (resumo.totalSemMarcacao > 0) {
      if (status) {
        status.textContent = 'Marque todos os participantes antes de salvar a chamada.';
      }
      return;
    }

    var payload = montarPayloadSalvarChamada(chamadaAtual.atividade.idAtividade, participantes);
    var inicio = obterTempoAtual();

    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Salvando...';
    }
    if (status) {
      status.textContent = 'Salvando chamada na base DEV.';
    }

    api.apiPost('/atividades/chamada/salvar', {
      payload: JSON.stringify(payload)
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível salvar a chamada.');
      }

      chamadaAtual.participantes = participantes;
      if (status) {
        status.textContent = resposta.message || 'Chamada salva com sucesso.';
      }
      registrarPerfAtividades('atividades.chamada.salva', inicio, {
        idAtividade: payload.idAtividade,
        totalRegistros: payload.registros.length + payload.externos.length,
        payloadBytes: estimarPayloadBytes(payload)
      });
    }).catch(function tratarErro(erro) {
      if (status) {
        status.textContent = erro.message;
      }
    }).then(function finalizar() {
      if (botao) {
        botao.disabled = false;
        botao.textContent = 'Salvar chamada';
      }
    });
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
