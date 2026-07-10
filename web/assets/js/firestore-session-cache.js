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
  var SCHEMA_VERSION = 'portal-user-v2';
  var COMPATIBLE_SCHEMA_VERSIONS = ['portal-user-v1', 'portal-user-v2'];
  var DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
  var STORAGE_KEY = 'geapaPortal.safeUserSummary';
  var firestore = null;
  var validacaoOficialEmVoo = null;

  function obterConfig() {
    return global.PortalGeapaConfig || {};
  }

  function registrarDebugAuth(eventName, details) {
    var debug = global.PortalGeapaDebugAuth;
    if (debug && typeof debug.record === 'function') debug.record(eventName, details || {});
  }

  function firestoreEnabled() {
    var environment = global.PortalGeapaEnvironment;
    return environment && typeof environment.flagEnabled === 'function'
      ? environment.flagEnabled('FIRESTORE_ENABLED', true)
      : obterConfig().FIRESTORE_ENABLED !== false;
  }

  function firestorePathSegments(collectionName, documentId) {
    var environment = global.PortalGeapaEnvironment;
    if (environment && typeof environment.firestorePathSegments === 'function') {
      return environment.firestorePathSegments(collectionName, documentId);
    }
    return documentId ? [collectionName, documentId] : [collectionName];
  }

  function inicializarFirestore() {
    var config = obterConfig();
    var firebaseConfig = config.FIREBASE || null;
    var auth = global.PortalGeapaFirebaseAuth;
    var app = auth && typeof auth.getFirebaseApp === 'function'
      ? auth.getFirebaseApp()
      : null;

    if (!firestoreEnabled()) return null;

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
      registrarDebugAuth('PORTAL_USER_DOC_MISSING', {
        uid: id,
        validationCode: !id ? 'UID_AUSENTE' : 'FIRESTORE_INDISPONIVEL',
        durationMs: obterTempoAtual() - inicio
      });
      return null;
    }

    try {
      var snap = await getDoc(doc.apply(null, [db].concat(
        firestorePathSegments('portalUsers', id)
      )));
      var data = snap.exists() ? (snap.data() || null) : null;
      registrarPerf('firestore.cache.leitura', inicio, { encontrado: snap.exists() });
      registrarDebugAuth(snap.exists() ? 'PORTAL_USER_DOC_FOUND' : 'PORTAL_USER_DOC_MISSING', {
        uid: data && data.uid || '',
        idPessoa: data && data.idPessoa || '',
        emailNormalizado: data && (data.emailNormalizado || data.email) || '',
        portalAtivo: Boolean(data && data.portalAtivo),
        perfilOperacional: data && (data.perfilOperacional || data.perfilPortalEfetivo) || '',
        roles: data && (data.roles || data.perfisPortal) || [],
        schemaVersion: data && data.schemaVersion || '',
        cacheUpdatedAt: normalizarDataResumo(data && (data.cacheUpdatedAt || data.sourceUpdatedAt) || ''),
        stale: Boolean(data && data.stale),
        validationCode: snap.exists() ? 'DOC_ENCONTRADO' : 'DOC_AUSENTE',
        durationMs: obterTempoAtual() - inicio
      });
      return data;
    } catch (erro) {
      registrarDebugAuth('PORTAL_USER_DOC_MISSING', {
        uid: id,
        validationCode: 'FIRESTORE_READ_ERROR',
        durationMs: obterTempoAtual() - inicio
      });
      throw erro;
    }
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

  function validarPortalUserSnapshot(snapshot, firebaseUser) {
    var config = obterConfig();
    var ttlMs = Number(config.FIRESTORE_SESSION_TTL_MS || DEFAULT_TTL_MS);
    var expiresAt = obterTempoSnapshot(snapshot && snapshot.cacheExpiresAt);
    var updatedAt = obterTempoSnapshot(snapshot && (snapshot.cacheUpdatedAt || snapshot.sourceUpdatedAt));
    var userEmail = normalizarEmail(firebaseUser && firebaseUser.email || '');
    var userUid = String(firebaseUser && firebaseUser.uid || '').trim();
    var snapshotEmail = normalizarEmail(snapshot && (snapshot.emailNormalizado || snapshot.email) || '');
    var accessAllowed = snapshot && snapshot.portalAtivo === true && snapshot.stale !== true;
    if (snapshot && typeof snapshot.ativo === 'boolean') {
      accessAllowed = accessAllowed && snapshot.ativo === true && snapshot.podeAcessarPortal === true;
    }
    if (snapshot && typeof snapshot.podeLerDadosPrivados === 'boolean') {
      accessAllowed = accessAllowed && snapshot.podeLerDadosPrivados === true;
    }
    var sourceAllowed = snapshot && (snapshot.source === 'PESSOAS_V2' || snapshot.source === 'GEAPA_CORE_PESSOAS_V2');
    if (!userUid || !userEmail || !firebaseUser || firebaseUser.emailVerified !== true) {
      return { ok: false, code: 'FIREBASE_AUTH_INVALIDO' };
    }
    if (!snapshot) return { ok: false, code: 'DOC_AUSENTE' };
    if (snapshot.uid && String(snapshot.uid).trim() !== userUid) return { ok: false, code: 'UID_DIVERGENTE' };
    if (!accessAllowed) return { ok: false, code: snapshot.stale === true ? 'DOC_STALE' : 'PORTAL_INATIVO' };
    if (!sourceAllowed) return { ok: false, code: 'SOURCE_INCOMPATIVEL' };
    if (COMPATIBLE_SCHEMA_VERSIONS.indexOf(String(snapshot.schemaVersion || '')) < 0) {
      return { ok: false, code: 'SCHEMA_INCOMPATIVEL' };
    }
    if (snapshotEmail && userEmail && snapshotEmail !== userEmail) return { ok: false, code: 'EMAIL_DIVERGENTE' };
    if (!((expiresAt && Date.now() <= expiresAt) || (updatedAt && Date.now() - updatedAt <= ttlMs))) {
      return { ok: false, code: 'CACHE_EXPIRADO' };
    }
    return { ok: true, code: 'PORTAL_USER_VALIDO' };
  }

  function snapshotEstaValido(snapshot, firebaseUser) {
    return validarPortalUserSnapshot(snapshot, firebaseUser).ok === true;
  }

  function normalizarEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function emailComparavel(email) {
    var value = normalizarEmail(email);
    return value.indexOf('@') > 0 && value.indexOf('*') < 0;
  }

  function normalizarSessaoCoreIdentidade(sessao) {
    var dados = sessao || {};
    var idPessoa = String(dados.idPessoa || dados.id || '').trim();
    var email = normalizarEmail(dados.email || dados.emailNormalizado || '');
    var emailAutenticacao = normalizarEmail(dados.emailAutenticacao || '');
    var logado = dados.autenticado === true || dados.logado === true || Boolean(idPessoa || email);
    return {
      logado: logado,
      idPessoa: idPessoa,
      email: email,
      emailAutenticacao: emailAutenticacao,
      identidadeFirebaseCoreConfirmada: dados.identidadeFirebaseCoreConfirmada === true,
      identidadeFirebaseCoreCodigo: String(dados.identidadeFirebaseCoreCodigo || '').trim(),
      perfil: String(dados.perfilPortalEfetivo || dados.perfilPrincipal || dados.perfil || '').trim(),
      origemDados: String(dados.origemDados || dados.origemSessao || dados.origemSnapshot || '').trim()
    };
  }

  function verificarConsistenciaIdentidade(firebaseUser, snapshot, sessaoCore) {
    var firebaseUid = String(firebaseUser && firebaseUser.uid || '').trim();
    var firebaseEmail = normalizarEmail(firebaseUser && firebaseUser.email || '');
    var core = normalizarSessaoCoreIdentidade(sessaoCore);
    var docUid = String(snapshot && snapshot.uid || '').trim();
    var docEmail = normalizarEmail(snapshot && (snapshot.emailNormalizado || snapshot.email) || '');
    var docPessoa = String(snapshot && snapshot.idPessoa || '').trim();
    var reasons = [];
    var evidence = false;
    var aliasCoreConfirmado = Boolean(
      core.identidadeFirebaseCoreConfirmada === true &&
      core.idPessoa &&
      emailComparavel(firebaseEmail) &&
      emailComparavel(core.emailAutenticacao) &&
      firebaseEmail === core.emailAutenticacao
    );

    if (!firebaseUid) {
      return {
        checked: true,
        match: !core.logado,
        code: core.logado ? 'CORE_ONLY' : 'NAO_AUTENTICADO',
        reasons: []
      };
    }

    if (docUid) {
      evidence = true;
      if (docUid !== firebaseUid) reasons.push('UID_DIVERGENTE');
    }
    if (emailComparavel(firebaseEmail) && emailComparavel(docEmail)) {
      evidence = true;
      if (firebaseEmail !== docEmail) reasons.push('EMAIL_FIREBASE_DOC_DIVERGENTE');
    }

    if (!core.logado) {
      return {
        checked: true,
        match: reasons.length === 0 && evidence,
        code: reasons.length ? 'IDENTITY_MISMATCH_FIREBASE_CORE' : 'FIREBASE_ONLY',
        reasons: reasons
      };
    }

    if (emailComparavel(firebaseEmail) && emailComparavel(core.email)) {
      evidence = true;
      if (firebaseEmail !== core.email && !aliasCoreConfirmado) {
        reasons.push('EMAIL_FIREBASE_CORE_DIVERGENTE');
      }
    }
    if (emailComparavel(docEmail) && emailComparavel(core.email)) {
      evidence = true;
      if (docEmail !== core.email && !aliasCoreConfirmado) {
        reasons.push('EMAIL_DOC_CORE_DIVERGENTE');
      }
    }
    if (docPessoa && core.idPessoa) {
      evidence = true;
      if (docPessoa !== core.idPessoa) reasons.push('ID_PESSOA_DIVERGENTE');
    }
    if (!evidence) reasons.push('IDENTIDADE_SEM_CHAVE_COMPARAVEL');

    return {
      checked: true,
      match: reasons.length === 0,
      code: reasons.length
        ? 'IDENTITY_MISMATCH_FIREBASE_CORE'
        : (aliasCoreConfirmado ? 'IDENTITY_ALIAS_CORE_CONFIRMADO' : 'OK'),
      reasons: reasons
    };
  }

  function normalizarLista(valores) {
    return Array.isArray(valores)
      ? valores.map(function normalizar(valor) {
        return String(valor || '').trim();
      }).filter(Boolean)
      : [];
  }

  function normalizarPermissoes(snapshot) {
    if (Array.isArray(snapshot && snapshot.permissoes)) return normalizarLista(snapshot.permissoes);
    var permissions = snapshot && snapshot.permissions;
    if (!permissions || typeof permissions !== 'object') return [];
    return Object.keys(permissions).filter(function(permission) {
      return permissions[permission] === true;
    });
  }

  function aplicarSessaoRapidaDoFirestore(snapshot, firebaseUser, sessaoCore) {
    var validation = validarPortalUserSnapshot(snapshot, firebaseUser);
    if (!validation.ok) {
      registrarDebugAuth('FAST_PATH_BLOCKED', {
        uid: firebaseUser && firebaseUser.uid || '',
        code: validation.code
      });
      return null;
    }

    var core = normalizarSessaoCoreIdentidade(sessaoCore);
    var identity = verificarConsistenciaIdentidade(firebaseUser, snapshot, core.logado ? core : null);
    if (core.logado && identity.match !== true) {
      registrarDebugAuth('IDENTITY_MISMATCH_FIREBASE_CORE', {
        uid: firebaseUser && firebaseUser.uid || '',
        code: identity.code
      });
      registrarDebugAuth('FAST_PATH_BLOCKED', {
        uid: firebaseUser && firebaseUser.uid || '',
        code: 'IDENTITY_MISMATCH_FIREBASE_CORE'
      });
      return null;
    }

    registrarDebugAuth(core.logado ? 'IDENTITY_MATCH_OK' : 'FAST_PATH_SEM_SESSAO_CORE', {
      uid: firebaseUser && firebaseUser.uid || '',
      code: core.logado ? 'OK' : 'FIREBASE_ONLY'
    });

    var sessao = {
      autenticado: true,
      autenticadoFirebase: true,
      validacaoOficialPendente: true,
      fastPathConcedido: true,
      origemSessao: 'FIRESTORE_CACHE',
      origemSnapshot: 'FIRESTORE_CACHE',
      expiresAt: snapshot.cacheExpiresAt || '',
      cacheUpdatedAt: snapshot.cacheUpdatedAt || '',
      cacheExpiresAt: snapshot.cacheExpiresAt || '',
      idPessoa: String(snapshot.idPessoa || '').trim(),
      nomeExibicao: String(snapshot.nomePublico || snapshot.nomeExibicao || '').trim(),
      email: String(snapshot.emailNormalizado || snapshot.email || '').trim(),
      rga: '',
      portalAtivo: snapshot.ativo === true || snapshot.portalAtivo === true,
      modoAcesso: String(snapshot.modoAcesso || snapshot.portalModoAcesso || '').trim(),
      motivoBloqueio: String(snapshot.motivoBloqueio || '').trim(),
      mensagemBloqueio: String(snapshot.mensagemBloqueio || '').trim(),
      perfilPortalEfetivo: String(snapshot.perfilPortalEfetivo || '').trim(),
      perfisPortal: normalizarLista(snapshot.roles || snapshot.perfisPortal),
      permissoes: normalizarPermissoes(snapshot),
      tipoVinculoAtual: String(snapshot.tipoVinculoAtual || '').trim(),
      statusVinculoAtual: String(snapshot.statusVinculoAtual || '').trim(),
      cargoFuncaoAtual: String(snapshot.cargoFuncaoAtual || '').trim()
    };

    registrarDebugAuth('FAST_PATH_GRANTED', {
      uid: firebaseUser && firebaseUser.uid || '',
      code: validation.code
    });
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
        schemaVersion: SCHEMA_VERSION,
        idPessoa: String(dados.idPessoa || '').trim(),
        nomeExibicao: String(dados.nomeExibicao || '').trim(),
        email: mascararEmail(String(dados.email || '').trim()),
        rga: String(dados.rga || '').trim(),
        perfilPortalEfetivo: String(dados.perfilPortalEfetivo || dados.perfilPrincipal || '').trim(),
        perfisPortal: normalizarLista(dados.perfisPortal || dados.perfis),
        portalAtivo: dados.portalAtivo === true,
        modoAcesso: String(dados.modoAcesso || '').trim(),
        motivoBloqueio: String(dados.motivoBloqueio || '').trim(),
        mensagemBloqueio: String(dados.mensagemBloqueio || '').trim(),
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
      resumo.schemaVersion === SCHEMA_VERSION &&
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
      fastPathConcedido: false,
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
      modoAcesso: String(resumo.modoAcesso || '').trim(),
      motivoBloqueio: String(resumo.motivoBloqueio || '').trim(),
      mensagemBloqueio: String(resumo.mensagemBloqueio || '').trim(),
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
    registrarDebugAuth('PORTAL_USER_CACHE_CLEARED', { code: 'CACHE_LOCAL_REMOVIDO' });
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
    validarPortalUserSnapshot: validarPortalUserSnapshot,
    verificarConsistenciaIdentidade: verificarConsistenciaIdentidade,
    aplicarSessaoRapidaDoFirestore: aplicarSessaoRapidaDoFirestore,
    obterResumoSeguro: obterResumoSeguro,
    resumoSeguroEstaValido: resumoSeguroEstaValido,
    aplicarSessaoRapidaDoResumoSeguro: aplicarSessaoRapidaDoResumoSeguro,
    salvarResumoSeguro: salvarResumoSeguro,
    validarSessaoOficialEmSegundoPlano: validarSessaoOficialEmSegundoPlano,
    limparResumoSeguro: limparResumoSeguro
  };
})(window);
