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
  var STORAGE_KEY = 'geapaPortal.safeUserSummary';
  var firestore = null;
  var validacaoOficialEmVoo = null;

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
      cacheUpdatedAt: snapshot.cacheUpdatedAt || '',
      cacheExpiresAt: snapshot.cacheExpiresAt || '',
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

    if (validacaoOficialEmVoo) {
      registrarPerf('portalLogin.validacaoOficial_reuso', inicio, {});
      return validacaoOficialEmVoo;
    }

    validacaoOficialEmVoo = Promise.resolve()
      .then(function validarAgora() {
        return validar(idToken);
      })
      .finally(function limparValidacao() {
        registrarPerf('portalLogin.validacaoOficial', inicio, {});
        validacaoOficialEmVoo = null;
      });

    return validacaoOficialEmVoo;
  }

  function salvarResumoSeguro(sessao) {
    var dados = sessao || {};

    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        idPessoa: String(dados.idPessoa || '').trim(),
        nomeExibicao: String(dados.nomeExibicao || '').trim(),
        email: mascararEmail(String(dados.email || '').trim()),
        rga: String(dados.rga || '').trim(),
        perfilPortalEfetivo: String(dados.perfilPortalEfetivo || dados.perfilPrincipal || '').trim(),
        perfisPortal: normalizarLista(dados.perfisPortal || dados.perfis),
        portalAtivo: dados.portalAtivo === true,
        tipoVinculoAtual: String(dados.tipoVinculoAtual || '').trim(),
        statusVinculoAtual: String(dados.statusVinculoAtual || '').trim(),
        cargoFuncaoAtual: String(dados.cargoFuncaoAtual || '').trim(),
        cacheUpdatedAt: normalizarDataResumo(dados.cacheUpdatedAt || dados.sourceUpdatedAt || new Date().toISOString()),
        cacheExpiresAt: normalizarDataResumo(dados.cacheExpiresAt || dados.expiresAt || '')
      }));
    } catch (erro) {}
  }

  function obterResumoSeguro() {
    try {
      var bruto = global.localStorage.getItem(STORAGE_KEY);
      return bruto ? JSON.parse(bruto) : null;
    } catch (erro) {
      return null;
    }
  }

  function resumoSeguroEstaValido(resumo) {
    var config = obterConfig();
    var ttlMs = Number(config.FIRESTORE_SESSION_TTL_MS || DEFAULT_TTL_MS);
    var expiresAt = obterTempoSnapshot(resumo && resumo.cacheExpiresAt);
    var updatedAt = obterTempoSnapshot(resumo && resumo.cacheUpdatedAt);

    return Boolean(
      resumo &&
      resumo.portalAtivo === true &&
      (
        (expiresAt && Date.now() <= expiresAt) ||
        (updatedAt && Date.now() - updatedAt <= ttlMs)
      )
    );
  }

  function aplicarSessaoRapidaDoResumoSeguro(resumo) {
    if (!resumoSeguroEstaValido(resumo)) {
      return null;
    }

    return {
      autenticado: true,
      autenticadoFirebase: true,
      validacaoOficialPendente: true,
      origemSessao: 'LOCAL_SAFE_CACHE',
      origemSnapshot: 'LOCAL_SAFE_CACHE',
      expiresAt: resumo.cacheExpiresAt || '',
      cacheUpdatedAt: resumo.cacheUpdatedAt || '',
      cacheExpiresAt: resumo.cacheExpiresAt || '',
      idPessoa: String(resumo.idPessoa || '').trim(),
      nomeExibicao: String(resumo.nomeExibicao || '').trim(),
      email: String(resumo.email || '').trim(),
      rga: String(resumo.rga || '').trim(),
      portalAtivo: resumo.portalAtivo === true,
      perfilPortalEfetivo: String(resumo.perfilPortalEfetivo || '').trim(),
      perfisPortal: normalizarLista(resumo.perfisPortal),
      permissoes: [],
      tipoVinculoAtual: String(resumo.tipoVinculoAtual || '').trim(),
      statusVinculoAtual: String(resumo.statusVinculoAtual || '').trim(),
      cargoFuncaoAtual: String(resumo.cargoFuncaoAtual || '').trim()
    };
  }

  function limparResumoSeguro() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (erro) {}
  }

  function normalizarDataResumo(valor) {
    if (!valor) {
      return '';
    }

    if (typeof valor.toDate === 'function') {
      return valor.toDate().toISOString();
    }

    if (typeof valor.seconds === 'number') {
      return new Date(valor.seconds * 1000).toISOString();
    }

    var data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '' : data.toISOString();
  }

  function mascararEmail(email) {
    var valor = String(email || '').trim();
    var partes = valor.split('@');

    if (partes.length !== 2 || !partes[0] || !partes[1]) {
      return '';
    }

    var nome = partes[0];
    var prefixo = nome.slice(0, Math.min(2, nome.length));
    return prefixo + '***@' + partes[1];
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
    obterResumoSeguro: obterResumoSeguro,
    resumoSeguroEstaValido: resumoSeguroEstaValido,
    aplicarSessaoRapidaDoResumoSeguro: aplicarSessaoRapidaDoResumoSeguro,
    salvarResumoSeguro: salvarResumoSeguro,
    validarSessaoOficialEmSegundoPlano: validarSessaoOficialEmSegundoPlano,
    limparResumoSeguro: limparResumoSeguro
  };
})(window);
