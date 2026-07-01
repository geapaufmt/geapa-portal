import {
  collection,
  getDocs,
  getFirestore
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Read model do calendario de atividades.
 * Firestore e somente cache; qualquer indisponibilidade retorna controle ao
 * fluxo Apps Script existente.
 */
(function configurarFirestoreActivities(global) {
  var COLLECTION = 'portalActivities';
  var SCHEMA_VERSION = 'portal-activity-calendar-v1';
  var DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

  function obterFirestore() {
    var sessionCache = global.PortalGeapaFirestoreSession;
    if (sessionCache && typeof sessionCache.inicializarFirestore === 'function') {
      return sessionCache.inicializarFirestore();
    }
    var auth = global.PortalGeapaFirebaseAuth;
    var app = auth && typeof auth.getFirebaseApp === 'function' ? auth.getFirebaseApp() : null;
    return app ? getFirestore(app) : null;
  }

  function obterTempoMs(value) {
    if (!value) return 0;
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function documentoValido(data, ttlMs) {
    var updatedAt = obterTempoMs(data && (data.cacheUpdatedAt || data.sourceUpdatedAt));
    return Boolean(
      data &&
      data.idAtividade &&
      data.source === 'PORTAL_ATIVIDADES_CALENDARIO' &&
      data.schemaVersion === SCHEMA_VERSION &&
      updatedAt &&
      Date.now() - updatedAt <= ttlMs
    );
  }

  function normalizarDiaSemana(dataIso) {
    if (!dataIso) return '';
    var date = new Date(String(dataIso).slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  }

  function normalizarDocumento(data) {
    var flags = data && data.flags && typeof data.flags === 'object' ? data.flags : {};
    var hasPresentation = data && data.temApresentacao === true;
    return {
      idAtividade: String(data.idAtividade || '').trim(),
      tituloPublico: String(data.titulo || '').trim(),
      tipoAtividade: String(data.tipoAtividade || '').trim(),
      subtipoAtividade: String(data.subtipoAtividade || '').trim(),
      dataAtividade: String(data.dataAtividade || '').trim(),
      diaSemana: normalizarDiaSemana(data.dataAtividade),
      horarioInicio: String(data.horarioInicio || '').trim(),
      horarioFim: String(data.horarioFim || '').trim(),
      local: String(data.local || '').trim(),
      ciclo: String(data.ciclo || '').trim(),
      ano: String(data.ano || '').trim(),
      semestre: String(data.semestre || '').trim(),
      statusOperacional: String(data.statusOperacional || '').trim(),
      statusPublico: String(data.statusPublicacaoPortal || data.statusOperacional || '').trim(),
      statusPublicacaoPortal: String(data.statusPublicacaoPortal || '').trim(),
      visibilidadePortal: String(data.visibilidadePortal || '').trim(),
      classificacaoAcesso: String(data.classificacaoAcesso || '').trim(),
      temApresentacao: hasPresentation,
      possuiApresentacoes: hasPresentation,
      qtdApresentacoes: hasPresentation ? 1 : 0,
      badges: Array.isArray(data.badges) ? data.badges.slice() : [],
      flags: flags,
      contaPresenca: flags.contaPresenca === true,
      contaFalta: flags.contaFalta === true,
      geraCertificado: flags.geraCertificado === true,
      podeVerDetalhes: flags.podeVerDetalhes !== false,
      podeJustificarFalta: false,
      podeRegistrarChamada: false,
      podeEditar: false,
      source: String(data.source || '').trim(),
      sourceSystem: String(data.sourceSystem || '').trim(),
      sourceUpdatedAt: data.sourceUpdatedAt || '',
      cacheUpdatedAt: data.cacheUpdatedAt || '',
      schemaVersion: String(data.schemaVersion || '').trim()
    };
  }

  function compararAtividades(a, b) {
    var keyA = [a.dataAtividade || '9999-12-31', a.horarioInicio || '23:59', a.idAtividade || ''].join('|');
    var keyB = [b.dataAtividade || '9999-12-31', b.horarioInicio || '23:59', b.idAtividade || ''].join('|');
    return keyA.localeCompare(keyB);
  }

  async function buscarCalendario(options) {
    var inicio = obterTempoAtual();
    var config = global.PortalGeapaConfig || {};
    var ttlMs = Math.max(60000, Number(options && options.ttlMs || config.FIRESTORE_ACTIVITIES_TTL_MS || DEFAULT_TTL_MS));
    var db = obterFirestore();
    var auth = global.PortalGeapaFirebaseAuth;
    var user = auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
    if (!db || !user) {
      return { ok: false, origem: 'APPS_SCRIPT_FALLBACK', code: 'FIRESTORE_NAO_AUTENTICADO', data: [] };
    }

    try {
      var snapshot = await getDocs(collection(db, COLLECTION));
      var invalidos = 0;
      var docs = [];
      snapshot.forEach(function(docSnapshot) {
        var data = docSnapshot.data() || {};
        if (!documentoValido(data, ttlMs)) {
          invalidos++;
          return;
        }
        docs.push(normalizarDocumento(data));
      });

      if (snapshot.empty || invalidos > 0 || !docs.length) {
        registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
          code: snapshot.empty ? 'FIRESTORE_VAZIO' : 'FIRESTORE_DESATUALIZADO',
          total: docs.length,
          invalidos: invalidos
        });
        return {
          ok: false,
          origem: 'APPS_SCRIPT_FALLBACK',
          code: snapshot.empty ? 'FIRESTORE_VAZIO' : 'FIRESTORE_DESATUALIZADO',
          data: []
        };
      }

      docs.sort(compararAtividades);
      registrarDiagnostico('FIRESTORE', inicio, { total: docs.length, invalidos: 0 });
      return { ok: true, origem: 'FIRESTORE', code: 'FIRESTORE_OK', data: docs };
    } catch (erro) {
      registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
        code: erro && erro.code ? erro.code : 'FIRESTORE_FALHOU'
      });
      return { ok: false, origem: 'APPS_SCRIPT_FALLBACK', code: 'FIRESTORE_FALHOU', data: [] };
    }
  }

  function obterTempoAtual() {
    return global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now();
  }

  function registrarDiagnostico(origem, inicio, detalhes) {
    if (!global.console || typeof global.console.info !== 'function') return;
    global.console.info('[GEAPA-PORTAL-ACTIVITIES]', origem, Object.assign({
      tempoMs: Math.round(obterTempoAtual() - inicio)
    }, detalhes || {}));
  }

  global.PortalGeapaFirestoreActivities = {
    buscarCalendario: buscarCalendario
  };
})(window);
