import {
  getApp,
  getApps,
  initializeApp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  doc,
  getDoc,
  getFirestore
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Cache de sessao visual do Portal GEAPA via Firestore.
 *
 * O Firestore e apenas espelho operacional. A validacao oficial continua no
 * Apps Script/GEAPA-CORE antes de qualquer acao sensivel.
 */
(function configurarFirestoreSessionCache(global) {
  var SCHEMA_VERSION = 'portal-user-v1';
  var DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
  var STORAGE_KEY = 'geapaPortal.firestoreSessionSummary';
  var firestore = null;

  function obterConfig() {
    return global.PortalGeapaConfig || {};
  }

  function inicializarFirestore() {
    var config = obterConfig();
    var firebaseConfig = config.FIREBASE || null;
    var auth = global.PortalGeapaFirebaseAuth;
    var app = auth && typeof auth.getFirebaseApp === 'function'
      ? auth.getFirebaseApp()
      : null;

    if (firestore) {
      return firestore;
    }

    if (!app) {
      if (!firebaseConfig || !firebaseConfig.projectId) {
        return null;
      }
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }

    firestore = getFirestore(app);
    return firestore;
  }

  async function buscarPortalUserSnapshot(uid) {
    var inicio = obterTempoAtual();
    var db = inicializarFirestore();
    var id = String(uid || '').trim();

    if (!db || !id) {
      registrarPerf('firestore.cache.indisponivel', inicio, {});
      return null;
    }

    var snap = await getDoc(doc(db, 'portalUsers', id));
    registrarPerf('firestore.cache.leitura', inicio, {
      encontrado: snap.exists()
    });

    return snap.exists() ? (snap.data() || null) : null;
  }

  function obterTempoSnapshot(valor) {
    if (!valor) {
      return 0;
    }

    if (typeof valor.toDate === 'function') {
      return valor.toDate().getTime();
    }

    if (typeof valor.seconds === 'number') {
      return valor.seconds * 1000;
    }

    var data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  function snapshotEstaValido(snapshot) {
    var config = obterConfig();
    var ttlMs = Number(config.FIRESTORE_SESSION_TTL_MS || DEFAULT_TTL_MS);
    var expiresAt = obterTempoSnapshot(snapshot && snapshot.cacheExpiresAt);
    var updatedAt = obterTempoSnapshot(snapshot && (snapshot.cacheUpdatedAt || snapshot.sourceUpdatedAt));

    return Boolean(
      snapshot &&
      snapshot.portalAtivo === true &&
      snapshot.source === 'GEAPA_CORE_PESSOAS_V2' &&
      snapshot.schemaVersion === SCHEMA_VERSION &&
      (
        (expiresAt && Date.now() <= expiresAt) ||
        (updatedAt && Date.now() - updatedAt <= ttlMs)
      )
    );
  }

  function normalizarLista(valores) {
    return Array.isArray(valores)
      ? valores.map(function normalizar(valor) {
        return String(valor || '').trim();
      }).filter(Boolean)
      : [];
  }

  function aplicarSessaoRapidaDoFirestore(snapshot) {
    if (!snapshotEstaValido(snapshot)) {
      return null;
    }

    var sessao = {
      autenticado: true,
      autenticadoFirebase: true,
      validacaoOficialPendente: true,
      origemSessao: 'FIRESTORE_CACHE',
      origemSnapshot: 'FIRESTORE_CACHE',
      expiresAt: snapshot.cacheExpiresAt || '',
      idPessoa: String(snapshot.idPessoa || '').trim(),
      nomeExibicao: String(snapshot.nomeExibicao || '').trim(),
      email: String(snapshot.email || '').trim(),
      rga: String(snapshot.rga || '').trim(),
      portalAtivo: snapshot.portalAtivo === true,
      perfilPortalEfetivo: String(snapshot.perfilPortalEfetivo || '').trim(),
      perfisPortal: normalizarLista(snapshot.perfisPortal),
      permissoes: normalizarLista(snapshot.permissoes),
      tipoVinculoAtual: String(snapshot.tipoVinculoAtual || '').trim(),
      statusVinculoAtual: String(snapshot.statusVinculoAtual || '').trim(),
      cargoFuncaoAtual: String(snapshot.cargoFuncaoAtual || '').trim()
    };

    salvarResumoSeguro(sessao);
    return sessao;
  }

  async function validarSessaoOficialEmSegundoPlano(idToken, validar) {
    var inicio = obterTempoAtual();

    if (typeof validar !== 'function') {
      return null;
    }

    try {
      return await validar(idToken);
    } finally {
      registrarPerf('portalLogin.validacaoOficial', inicio, {});
    }
  }

  function salvarResumoSeguro(sessao) {
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        idPessoa: sessao.idPessoa || '',
        perfilPortalEfetivo: sessao.perfilPortalEfetivo || '',
        portalAtivo: sessao.portalAtivo === true,
        origemSessao: sessao.origemSessao || 'FIRESTORE_CACHE',
        expiresAt: sessao.expiresAt || ''
      }));
    } catch (erro) {}
  }

  function limparResumoSeguro() {
    try {
      global.sessionStorage.removeItem(STORAGE_KEY);
    } catch (erro) {}
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

  global.PortalGeapaFirestoreSession = {
    inicializarFirestore: inicializarFirestore,
    buscarPortalUserSnapshot: buscarPortalUserSnapshot,
    snapshotEstaValido: snapshotEstaValido,
    aplicarSessaoRapidaDoFirestore: aplicarSessaoRapidaDoFirestore,
    validarSessaoOficialEmSegundoPlano: validarSessaoOficialEmSegundoPlano,
    limparResumoSeguro: limparResumoSeguro
  };
})(window);
