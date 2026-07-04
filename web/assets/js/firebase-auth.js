import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

(function configurarFirebaseAuth(global) {
  var config = global.PortalGeapaConfig || {};
  var firebaseConfig = config.FIREBASE || null;
  var app = null;
  var auth = null;
  var provider = null;
  var redirectResultPromise = null;
  var authReadyPromise = null;

  function possuiConfigBasica(dados) {
    return Boolean(dados && dados.apiKey && dados.authDomain && dados.projectId && dados.appId);
  }

  function inicializar() {
    if (!possuiConfigBasica(firebaseConfig)) {
      return false;
    }

    if (auth) {
      return true;
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    setPersistence(auth, browserLocalPersistence).catch(function ignorarErroPersistencia() {
      // Se o navegador bloquear storage, o Firebase mantem o comportamento padrao possivel.
    });

    redirectResultPromise = getRedirectResult(auth).then(function obterUsuarioRedirect(credencial) {
      return credencial && credencial.user ? credencial.user : null;
    }).catch(function registrarErroRedirect(erro) {
      if (global.console && typeof global.console.warn === 'function') {
        global.console.warn('[Portal GEAPA] firebase.redirect', erro && erro.code ? erro.code : erro);
      }

      throw erro;
    });

    return true;
  }

  function isAvailable() {
    return inicializar();
  }

  async function signInWithGoogle() {
    inicializar();

    if (!auth || !provider) {
      throw new Error('Firebase Auth nao esta configurado para este portal.');
    }

    var inicio = obterTempoAtual();

    try {
      var credencial = await signInWithPopup(auth, provider);
      registrarPerf('firebase.auth.google', inicio, { metodo: 'popup' });
      return credencial.user;
    } catch (erro) {
      if (
        erro &&
        (
          erro.code === 'auth/popup-blocked' ||
          erro.code === 'auth/cancelled-popup-request'
        )
      ) {
        registrarPerf('firebase.auth.google', inicio, { metodo: 'redirect' });
        await signInWithRedirect(auth, provider);
        return null;
      }

      registrarPerf('firebase.auth.google', inicio, { erro: erro && erro.code ? erro.code : 'ERRO_AUTH' });
      throw erro;
    }
  }

  function observeAuthState(callback) {
    inicializar();

    if (!auth) {
      return function cancelarObservacaoVazia() {};
    }

    return onAuthStateChanged(auth, callback);
  }

  function ensureReady(timeoutMs) {
    inicializar();
    if (!auth) {
      return Promise.reject(new Error('Firebase Auth nao esta configurado para este portal.'));
    }
    if (!authReadyPromise) {
      authReadyPromise = new Promise(function aguardarPrimeiroEstado(resolve, reject) {
        var settled = false;
        var unsubscribe = onAuthStateChanged(auth, function aoResolver(user) {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(user || null);
        }, function aoFalhar(error) {
          if (settled) return;
          settled = true;
          unsubscribe();
          reject(error);
        });
      });
    }

    var limit = Math.max(1000, Number(timeoutMs || 10000));
    return Promise.race([
      authReadyPromise,
      new Promise(function rejeitarNoTimeout(resolve, reject) {
        global.setTimeout(function onTimeout() {
          reject(new Error('Firebase Auth nao inicializou dentro do prazo.'));
        }, limit);
      })
    ]);
  }

  function getCurrentUser() {
    inicializar();
    return auth ? auth.currentUser : null;
  }

  function getFirebaseApp() {
    inicializar();
    return app;
  }

  function getRedirectUser() {
    inicializar();
    return redirectResultPromise || Promise.resolve(null);
  }

  function signOutFromGoogle() {
    inicializar();
    return auth ? signOut(auth) : Promise.resolve();
  }

  function obterTempoAtual() {
    return global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now();
  }

  function registrarPerf(evento, inicio, detalhes) {
    if (!global.console || typeof global.console.info !== 'function') {
      return;
    }

    global.console.info('[GEAPA-PORTAL-PERF]', evento, Object.assign({
      tempoMs: Math.round(obterTempoAtual() - inicio)
    }, detalhes || {}));
  }

  global.PortalGeapaFirebaseAuth = {
    isAvailable: isAvailable,
    signInWithGoogle: signInWithGoogle,
    ensureReady: ensureReady,
    observeAuthState: observeAuthState,
    getCurrentUser: getCurrentUser,
    getFirebaseApp: getFirebaseApp,
    getRedirectUser: getRedirectUser,
    signOutFromGoogle: signOutFromGoogle
  };

  inicializar();
})(window);
