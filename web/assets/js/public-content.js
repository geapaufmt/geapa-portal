/**
 * Cliente de conteudo publico editorial do Portal GEAPA.
 *
 * O front-end nao acessa planilhas. Ele consome o backend do portal, que por sua
 * vez chama o snapshot sanitizado do GEAPA-CORE. Firestore fica para uma etapa
 * futura como espelho publico rapido.
 */
(function configurarConteudoPublicoPortal(global) {
  var CACHE_KEY = 'geapaPortal.conteudoPublico.v1';
  var CACHE_TTL_MS = 5 * 60 * 1000;

  var FALLBACK = Object.freeze({
    pages: {
      home: {
        blocos: [],
        atualizadoEm: ''
      },
      sobre: {
        blocos: [],
        atualizadoEm: ''
      },
      historia: {
        marcos: [],
        atualizadoEm: ''
      },
      parceiros: {
        itens: [],
        atualizadoEm: ''
      }
    },
    documents: [],
    media: [],
    config: {},
    boardComplements: []
  });

  function carregarSnapshotConteudoPublico(options) {
    var opts = options || {};
    var cache = opts.forceRefresh ? null : lerCacheSnapshot();

    if (cache) {
      return Promise.resolve({
        ok: true,
        data: cache,
        meta: {
          origemDados: 'cache-local'
        }
      });
    }

    return obterApi().apiGet('/conteudo-publico/snapshot', {
      forceRefresh: opts.forceRefresh ? 'true' : ''
    })
      .then(function tratarResposta(resposta) {
        if (!resposta || resposta.ok !== true) {
          throw new Error(
            resposta && resposta.message
              ? resposta.message
              : 'Conteudo publico indisponivel.'
          );
        }

        var snapshot = normalizarSnapshot(resposta.data);
        salvarCacheSnapshot(snapshot);

        return {
          ok: true,
          data: snapshot,
          meta: resposta.meta || {}
        };
      })
      .catch(function usarFallback(erro) {
        return {
          ok: false,
          data: clonarFallback(),
          errorCode: 'CONTEUDO_PUBLICO_FALLBACK',
          message: erro && erro.message
            ? erro.message
            : 'Usando conteudo publico minimo.',
          meta: {
            origemDados: 'fallback-local'
          }
        };
      });
  }

  function carregarPaginaPublica(slug, options) {
    var pagina = normalizarSlugPagina(slug);

    return carregarSnapshotConteudoPublico(options)
      .then(function selecionarPagina(resultado) {
        var snapshot = resultado.data || clonarFallback();
        var pages = snapshot.pages || {};

        return {
          ok: resultado.ok,
          data: pages[pagina] || {},
          meta: resultado.meta || {}
        };
      });
  }

  function carregarHomePublica(options) {
    return carregarPaginaPublica('home', options);
  }

  function carregarDiretoriaPublica(options) {
    return carregarSnapshotConteudoPublico(options)
      .then(function selecionarDiretoria(resultado) {
        return {
          ok: resultado.ok,
          data: (resultado.data && resultado.data.boardComplements) || [],
          meta: resultado.meta || {}
        };
      });
  }

  function carregarParceirosPublicos(options) {
    return carregarSnapshotConteudoPublico(options)
      .then(function selecionarParceiros(resultado) {
        var pages = (resultado.data && resultado.data.pages) || {};
        var parceiros = pages.parceiros || {};

        return {
          ok: resultado.ok,
          data: Array.isArray(parceiros.itens) ? parceiros.itens : [],
          meta: resultado.meta || {}
        };
      });
  }

  function carregarDocumentosPublicos(options) {
    return carregarSnapshotConteudoPublico(options)
      .then(function selecionarDocumentos(resultado) {
        return {
          ok: resultado.ok,
          data: (resultado.data && resultado.data.documents) || [],
          meta: resultado.meta || {}
        };
      });
  }

  function carregarAtividadesPublicas() {
    return Promise.resolve({
      ok: false,
      data: [],
      errorCode: 'AGENDA_PUBLICA_FORA_DO_CMS',
      message: 'Atividades publicas devem vir do modulo geapa-atividades.'
    });
  }

  function carregarApresentacoesPublicas() {
    return Promise.resolve({
      ok: false,
      data: [],
      errorCode: 'AGENDA_PUBLICA_FORA_DO_CMS',
      message: 'Apresentacoes publicas devem vir do modulo geapa-atividades.'
    });
  }

  function normalizarSnapshot(snapshot) {
    var dados = snapshot || {};
    var pages = dados.pages || {};

    return {
      pages: {
        home: normalizarPaginaBlocos_(pages.home),
        sobre: normalizarPaginaBlocos_(pages.sobre),
        historia: normalizarPaginaMarcos_(pages.historia),
        parceiros: normalizarPaginaItens_(pages.parceiros)
      },
      documents: Array.isArray(dados.documents) ? dados.documents : [],
      media: Array.isArray(dados.media) ? dados.media : [],
      config: dados.config || {},
      boardComplements: Array.isArray(dados.boardComplements)
        ? dados.boardComplements
        : []
    };
  }

  function normalizarPaginaBlocos_(pagina) {
    var dados = pagina || {};

    return {
      blocos: Array.isArray(dados.blocos) ? dados.blocos : [],
      atualizadoEm: String(dados.atualizadoEm || '')
    };
  }

  function normalizarPaginaMarcos_(pagina) {
    var dados = pagina || {};

    return {
      marcos: Array.isArray(dados.marcos) ? dados.marcos : [],
      atualizadoEm: String(dados.atualizadoEm || '')
    };
  }

  function normalizarPaginaItens_(pagina) {
    var dados = pagina || {};

    return {
      itens: Array.isArray(dados.itens) ? dados.itens : [],
      atualizadoEm: String(dados.atualizadoEm || '')
    };
  }

  function normalizarSlugPagina(slug) {
    var valor = String(slug || 'home').trim().toLowerCase();
    var aliases = {
      inicio: 'home',
      home: 'home',
      sobre: 'sobre',
      historia: 'historia',
      parceiros: 'parceiros'
    };

    return aliases[valor] || 'home';
  }

  function lerCacheSnapshot() {
    try {
      var bruto = global.sessionStorage.getItem(CACHE_KEY);

      if (!bruto) {
        return null;
      }

      var registro = JSON.parse(bruto);

      if (!registro || !registro.salvoEm || !registro.snapshot) {
        return null;
      }

      if (Date.now() - registro.salvoEm > CACHE_TTL_MS) {
        return null;
      }

      return normalizarSnapshot(registro.snapshot);
    } catch (erro) {
      return null;
    }
  }

  function salvarCacheSnapshot(snapshot) {
    try {
      global.sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        salvoEm: Date.now(),
        snapshot: snapshot
      }));
    } catch (erro) {
      // Cache local e melhoria de desempenho, nao requisito funcional.
    }
  }

  function clonarFallback() {
    return normalizarSnapshot(FALLBACK);
  }

  function obterApi() {
    if (!global.PortalGeapaApi) {
      throw new Error('API do Portal GEAPA nao carregada.');
    }

    return global.PortalGeapaApi;
  }

  global.PortalGeapaPublicContent = {
    carregarSnapshotConteudoPublico: carregarSnapshotConteudoPublico,
    carregarPaginaPublica: carregarPaginaPublica,
    carregarHomePublica: carregarHomePublica,
    carregarDiretoriaPublica: carregarDiretoriaPublica,
    carregarParceirosPublicos: carregarParceirosPublicos,
    carregarDocumentosPublicos: carregarDocumentosPublicos,
    carregarAtividadesPublicas: carregarAtividadesPublicas,
    carregarApresentacoesPublicas: carregarApresentacoesPublicas
  };
})(window);
