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

    getRedirectResult(auth).catch(function registrarErroRedirect(erro) {
      if (global.console && typeof global.console.warn === 'function') {
        global.console.warn('[Portal GEAPA] firebase.redirect', erro && erro.code ? erro.code : erro);
      }
    });

    return true;
  }

  function isAvailable() {
    return inicializar();
  }

  function deveUsarRedirect() {
    return global.matchMedia && global.matchMedia('(max-width: 720px)').matches;
  }

  async function signInWithGoogle() {
    inicializar();

    if (!auth || !provider) {
      throw new Error('Firebase Auth nao esta configurado para este portal.');
    }

    if (deveUsarRedirect()) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      var credencial = await signInWithPopup(auth, provider);
      return credencial.user;
    } catch (erro) {
      if (
        erro &&
        (
          erro.code === 'auth/popup-blocked' ||
          erro.code === 'auth/cancelled-popup-request'
        )
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }

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

  function getCurrentUser() {
    inicializar();
    return auth ? auth.currentUser : null;
  }

  function signOutFromGoogle() {
    inicializar();
    return auth ? signOut(auth) : Promise.resolve();
  }

  global.PortalGeapaFirebaseAuth = {
    isAvailable: isAvailable,
    signInWithGoogle: signInWithGoogle,
    observeAuthState: observeAuthState,
    getCurrentUser: getCurrentUser,
    signOutFromGoogle: signOutFromGoogle
  };

  inicializar();
})(window);
