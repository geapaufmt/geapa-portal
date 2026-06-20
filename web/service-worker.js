const GEAPA_CACHE_VERSION = 'portal-geapa-pwa-v45';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/assets/js/config.js',
  '/assets/js/api.js',
  '/assets/js/public-content.js',
  '/assets/js/auth.js',
  '/assets/js/auth-adapter.js',
  '/assets/js/navigation.js',
  '/assets/js/ui.js',
  '/assets/js/atividades.js',
  '/assets/js/portal-v2-readonly.js',
  '/assets/js/painel-diretoria-v2.js',
  '/assets/js/firebase-auth.js',
  '/assets/js/firestore-session-cache.js',
  '/assets/js/pwa.js',
  '/assets/img/geapa-loader-brain.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-192.png',
  '/assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', function instalarServiceWorker(evento) {
  evento.waitUntil(
    caches.open(GEAPA_CACHE_VERSION)
      .then(function abrirCache(cache) {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function ativarRapido() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function ativarServiceWorker(evento) {
  evento.waitUntil(
    caches.keys()
      .then(function listarCaches(chaves) {
        return Promise.all(chaves.map(function removerCacheAntigo(chave) {
          if (chave !== GEAPA_CACHE_VERSION) {
            return caches.delete(chave);
          }

          return Promise.resolve();
        }));
      })
      .then(function assumirClientes() {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function aoBuscar(evento) {
  var requisicao = evento.request;
  var url = new URL(requisicao.url);

  if (requisicao.method !== 'GET') {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.indexOf('/__/auth') === 0) {
    return;
  }

  if (requisicao.mode === 'navigate') {
    evento.respondWith(networkFirstIndex(requisicao));
    return;
  }

  if (isAssetCritico(url.pathname)) {
    evento.respondWith(networkFirstAsset(requisicao));
    return;
  }

  if (STATIC_ASSETS.indexOf(url.pathname) >= 0) {
    evento.respondWith(cacheFirst(requisicao));
  }
});

function isAssetCritico(caminho) {
  return caminho === '/style.css'
    || caminho === '/app.js'
    || caminho.indexOf('/assets/js/') === 0;
}

function cacheFirst(requisicao) {
  return caches.match(requisicao)
    .then(function usarCache(respostaCache) {
      if (respostaCache) {
        return respostaCache;
      }

      return fetch(requisicao).then(function guardarResposta(respostaRede) {
        if (respostaRede && respostaRede.ok) {
          var copia = respostaRede.clone();
          caches.open(GEAPA_CACHE_VERSION).then(function abrirCache(cache) {
            cache.put(requisicao, copia);
          });
        }

        return respostaRede;
      });
    });
}

function networkFirstIndex(requisicao) {
  return fetch(requisicao)
    .then(function guardarHtml(respostaRede) {
      if (respostaRede && respostaRede.ok) {
        var copia = respostaRede.clone();
        caches.open(GEAPA_CACHE_VERSION).then(function abrirCache(cache) {
          cache.put('/index.html', copia);
        });
      }

      return respostaRede;
    })
    .catch(function usarHtmlCache() {
      return caches.match('/index.html');
    });
}

function networkFirstAsset(requisicao) {
  return fetch(requisicao)
    .then(function guardarAsset(respostaRede) {
      if (respostaRede && respostaRede.ok) {
        var copia = respostaRede.clone();
        caches.open(GEAPA_CACHE_VERSION).then(function abrirCache(cache) {
          cache.put(requisicao, copia);
        });
      }

      return respostaRede;
    })
    .catch(function usarAssetCache() {
      return caches.match(requisicao)
        .then(function tentarSemQuery(respostaCache) {
          if (respostaCache) {
            return respostaCache;
          }

          var url = new URL(requisicao.url);
          return caches.match(url.pathname);
        });
    });
}
