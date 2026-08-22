import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Calendario de atividades. No perfil canonico, `activities` e authoritative;
 * os caminhos antigos permanecem apenas como fallback temporario.
 */
(function configurarFirestoreActivities(global) {
  var COLLECTION = 'portalActivities';
  var CANONICAL_COLLECTION = 'activities';
  var SNAPSHOT_COLLECTION = 'portalActivityCalendarSnapshots';
  var SNAPSHOT_ID = 'current';
  var SCHEMA_VERSION = 'portal-activity-calendar-v3';
  var SNAPSHOT_SCHEMA_VERSION = 'portal-activity-calendar-snapshot-v1';
  var CANONICAL_SCHEMA_VERSION = 'activity-canonical-v1';
  var DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

  function flagEnabled(name, defaultValue) {
    var environment = global.PortalGeapaEnvironment;
    if (environment && typeof environment.flagEnabled === 'function') {
      return environment.flagEnabled(name, defaultValue);
    }
    var config = global.PortalGeapaConfig || {};
    return Object.prototype.hasOwnProperty.call(config, name) ? config[name] === true : defaultValue === true;
  }

  function firestorePathSegments(collectionName, documentId) {
    var environment = global.PortalGeapaEnvironment;
    if (environment && typeof environment.firestorePathSegments === 'function') {
      return environment.firestorePathSegments(collectionName, documentId);
    }
    return documentId ? [collectionName, documentId] : [collectionName];
  }

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
      data.ativoNoReadModel !== false &&
      data.stale !== true &&
      data.source === 'PORTAL_ATIVIDADES_CALENDARIO' &&
      data.schemaVersion === SCHEMA_VERSION &&
      updatedAt &&
      Date.now() - updatedAt <= ttlMs
    );
  }

  function documentoCanonicoValido(data) {
    return Boolean(
      data &&
      data.idAtividade &&
      data.ativo === true &&
      data.canonicalSource === 'FIRESTORE' &&
      data.schemaVersion === CANONICAL_SCHEMA_VERSION
    );
  }

  function snapshotValido(data, ttlMs) {
    var updatedAt = obterTempoMs(data && data.cacheUpdatedAt);
    return Boolean(
      data &&
      data.schemaVersion === SNAPSHOT_SCHEMA_VERSION &&
      data.source === 'PORTAL_ATIVIDADES_CALENDARIO' &&
      data.datasetComplete === true &&
      data.stale !== true &&
      Array.isArray(data.atividades) &&
      Number(data.total) === data.atividades.length &&
      data.atividades.length > 0 &&
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
    var statusPublico = String(data.statusPublico || data.statusPublicacaoPortal || data.statusOperacional || '').trim();
    return {
      idAtividade: String(data.idAtividade || '').trim(),
      tituloPublico: String(data.tituloPublico || data.titulo || '').trim(),
      tituloConteudoPublico: String(data.tituloConteudoPublico || '').trim(),
      tipoPublico: String(data.tipoPublico || '').trim(),
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
      rotuloSemestre: String(data.rotuloSemestre || '').trim(),
      formato: String(data.formato || '').trim(),
      publicoAlvo: String(data.publicoAlvo || '').trim(),
      cargaHoraria: String(data.cargaHoraria || '').trim(),
      statusOperacional: String(data.statusOperacional || '').trim(),
      statusPublico: statusPublico,
      statusPublicacaoPortal: String(data.statusPublicacaoPortal || data.statusPublico || '').trim(),
      visibilidadePortal: String(data.visibilidadePortal || '').trim(),
      classificacaoAcesso: String(data.classificacaoAcesso || '').trim(),
      eixoTematicoPrincipal: String(data.eixoTematicoPrincipal || '').trim(),
      eixoTematicoSecundario: String(data.eixoTematicoSecundario || '').trim(),
      nomePessoaPrincipalPublico: String(data.nomePessoaPrincipalPublico || '').trim(),
      papelPessoaPrincipal: String(data.papelPessoaPrincipal || '').trim(),
      tipoPessoaPrincipal: String(data.tipoPessoaPrincipal || '').trim(),
      temApresentacao: hasPresentation,
      possuiApresentacoes: hasPresentation,
      qtdApresentacoes: Number(data.qtdApresentacoes || (hasPresentation ? 1 : 0)),
      resumoApresentacoesPublico: String(data.resumoApresentacoesPublico || '').trim(),
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
      sourceHash: String(data.sourceHash || '').trim(),
      sourceVersion: String(data.sourceVersion || '').trim(),
      datasetComplete: data.datasetComplete === true,
      syncScope: String(data.syncScope || '').trim(),
      ativoNoReadModel: data.ativoNoReadModel !== false,
      stale: data.stale === true,
      schemaVersion: String(data.schemaVersion || '').trim()
    };
  }

  function compararAtividades(a, b) {
    var keyA = [a.dataAtividade || '9999-12-31', a.horarioInicio || '23:59', a.idAtividade || ''].join('|');
    var keyB = [b.dataAtividade || '9999-12-31', b.horarioInicio || '23:59', b.idAtividade || ''].join('|');
    return keyA.localeCompare(keyB);
  }

  async function buscarSnapshotPublico(db, ttlMs, inicio) {
    try {
      var result = await getDoc(doc.apply(null, [db].concat(
        firestorePathSegments(SNAPSHOT_COLLECTION, SNAPSHOT_ID)
      )));
      if (!result.exists()) {
        return { ok: false, code: 'FIRESTORE_SNAPSHOT_AUSENTE' };
      }
      var data = result.data() || {};
      if (!snapshotValido(data, ttlMs)) {
        return { ok: false, code: 'FIRESTORE_SNAPSHOT_INVALIDO' };
      }
      var atividades = data.atividades.map(normalizarDocumento).filter(function(atividade) {
        return Boolean(atividade.idAtividade) && atividade.stale !== true && atividade.ativoNoReadModel !== false;
      });
      if (!atividades.length || atividades.length !== Number(data.total)) {
        return { ok: false, code: 'FIRESTORE_SNAPSHOT_CONTEUDO_INVALIDO' };
      }
      atividades.sort(compararAtividades);
      registrarDiagnostico('FIRESTORE_SNAPSHOT', inicio, {
        total: atividades.length,
        readsEstimados: 1,
        schemaVersion: data.schemaVersion,
        cacheUpdatedAt: data.cacheUpdatedAt || ''
      });
      return {
        ok: true,
        origem: 'FIRESTORE_SNAPSHOT',
        code: 'FIRESTORE_SNAPSHOT_OK',
        data: atividades,
        schemaVersion: data.schemaVersion,
        cacheUpdatedAt: data.cacheUpdatedAt || '',
        readsEstimados: 1
      };
    } catch (erro) {
      return {
        ok: false,
        code: erro && erro.code ? erro.code : 'FIRESTORE_SNAPSHOT_FALHOU'
      };
    }
  }

  async function buscarColecaoAutenticada(db, ttlMs, inicio) {
    var snapshot = await getDocs(collection.apply(null, [db].concat(
      firestorePathSegments(COLLECTION)
    )));
    var invalidos = 0;
    var datasetComplete = false;
    var docs = [];
    snapshot.forEach(function(docSnapshot) {
      var data = docSnapshot.data() || {};
      if (!documentoValido(data, ttlMs)) {
        invalidos++;
        return;
      }
      if (data.datasetComplete === true && String(data.syncScope || '') === 'FULL') datasetComplete = true;
      docs.push(normalizarDocumento(data));
    });

    if (snapshot.empty || !docs.length || !datasetComplete) {
      return {
        ok: false,
        code: snapshot.empty
          ? 'FIRESTORE_VAZIO'
          : (!docs.length ? 'FIRESTORE_DESATUALIZADO' : 'FIRESTORE_DATASET_PARCIAL'),
        total: docs.length,
        invalidos: invalidos,
        readsEstimados: snapshot.size
      };
    }

    docs.sort(compararAtividades);
    registrarDiagnostico('FIRESTORE_COLLECTION', inicio, {
      total: docs.length,
      invalidos: invalidos,
      readsEstimados: snapshot.size,
      schemaVersion: SCHEMA_VERSION,
      cacheUpdatedAt: docs[0] && docs[0].cacheUpdatedAt || ''
    });
    return {
      ok: true,
      origem: 'FIRESTORE_COLLECTION',
      code: 'FIRESTORE_COLLECTION_OK',
      data: docs,
      schemaVersion: SCHEMA_VERSION,
      readsEstimados: snapshot.size
    };
  }

  async function buscarColecaoCanonica(db, inicio) {
    var canonicalCollection = collection.apply(null, [db].concat(
      firestorePathSegments(CANONICAL_COLLECTION)
    ));
    var snapshot = await getDocs(query(canonicalCollection, where('ativo', '==', true)));
    var invalidos = 0;
    var docs = [];
    snapshot.forEach(function(docSnapshot) {
      var data = docSnapshot.data() || {};
      if (!documentoCanonicoValido(data)) {
        invalidos++;
        return;
      }
      docs.push(normalizarDocumento(data));
    });
    if (snapshot.empty || !docs.length) {
      return {
        ok: false,
        code: snapshot.empty ? 'FIRESTORE_CANONICAL_VAZIO' : 'FIRESTORE_CANONICAL_INVALIDO',
        total: docs.length,
        invalidos: invalidos,
        readsEstimados: snapshot.size
      };
    }
    docs.sort(compararAtividades);
    registrarDiagnostico('FIRESTORE_CANONICAL', inicio, {
      total: docs.length,
      invalidos: invalidos,
      readsEstimados: snapshot.size,
      schemaVersion: CANONICAL_SCHEMA_VERSION
    });
    return {
      ok: true,
      origem: 'FIRESTORE_CANONICAL',
      code: 'FIRESTORE_CANONICAL_OK',
      data: docs,
      schemaVersion: CANONICAL_SCHEMA_VERSION,
      readsEstimados: snapshot.size
    };
  }

  function mesclarEnriquecimentoOperacional(canonicalRows, legacyRows) {
    var legacyById = {};
    var operationalFields = [
      'temApresentacao', 'possuiApresentacoes', 'qtdApresentacoes',
      'resumoApresentacoesPublico', 'badges', 'flags', 'contaPresenca',
      'contaFalta', 'geraCertificado', 'podeVerDetalhes',
      'podeJustificarFalta', 'podeRegistrarChamada', 'podeEditar'
    ];
    (legacyRows || []).forEach(function(row) {
      var id = String(row && row.idAtividade || '').trim();
      if (id && !legacyById[id]) legacyById[id] = row;
    });
    return (canonicalRows || []).map(function(canonical) {
      var merged = Object.assign({}, canonical || {});
      var legacy = legacyById[String(merged.idAtividade || '').trim()] || {};
      operationalFields.forEach(function(field) {
        if (Object.prototype.hasOwnProperty.call(legacy, field)) merged[field] = legacy[field];
      });
      merged.source = String(canonical && canonical.source || '');
      merged.sourceSystem = String(canonical && canonical.sourceSystem || '');
      merged.sourceHash = String(canonical && canonical.sourceHash || '');
      merged.schemaVersion = String(canonical && canonical.schemaVersion || '');
      return merged;
    });
  }

  async function buscarCalendario(options) {
    var inicio = obterTempoAtual();
    var config = global.PortalGeapaConfig || {};
    var ttlMs = Math.max(60000, Number(options && options.ttlMs || config.FIRESTORE_ACTIVITIES_TTL_MS || DEFAULT_TTL_MS));
    var firestoreAtivo = flagEnabled('FIRESTORE_ENABLED', true);
    var db = firestoreAtivo ? obterFirestore() : null;
    var auth = global.PortalGeapaFirebaseAuth;
    var user = auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
    if (!firestoreAtivo || !db) {
      var codigoIndisponibilidade = firestoreAtivo ? 'FIRESTORE_INDISPONIVEL' : 'FIRESTORE_DESATIVADO';
      registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
        code: codigoIndisponibilidade,
        total: 0,
        readsEstimados: 0
      });
      return { ok: false, origem: 'APPS_SCRIPT_FALLBACK', code: codigoIndisponibilidade, data: [] };
    }

    if (user && flagEnabled('FIRESTORE_CANONICAL_ACTIVITIES_ENABLED', false)) {
      try {
        var canonicalResult = await buscarColecaoCanonica(db, inicio);
        if (canonicalResult.ok) return canonicalResult;
      } catch (canonicalError) {
        registrarDiagnostico('FIRESTORE_CANONICAL_FALHOU', inicio, {
          code: canonicalError && canonicalError.code ? canonicalError.code : 'FIRESTORE_CANONICAL_FALHOU'
        });
      }
    }

    var snapshotResult = flagEnabled('FIRESTORE_SNAPSHOT_ENABLED', true)
      ? await buscarSnapshotPublico(db, ttlMs, inicio)
      : { ok: false, code: 'FIRESTORE_SNAPSHOT_DESATIVADO' };
    if (snapshotResult.ok) return snapshotResult;

    if (!user || !flagEnabled('FIRESTORE_COLLECTION_FALLBACK_ENABLED', true)) {
      registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
        code: snapshotResult.code || 'FIRESTORE_SNAPSHOT_INDISPONIVEL',
        total: 0,
        readsEstimados: 1
      });
      return {
        ok: false,
        origem: 'APPS_SCRIPT_FALLBACK',
        code: snapshotResult.code || 'FIRESTORE_SNAPSHOT_INDISPONIVEL',
        data: []
      };
    }

    try {
      var collectionResult = await buscarColecaoAutenticada(db, ttlMs, inicio);
      if (!collectionResult.ok) {
        registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
          code: collectionResult.code,
          total: collectionResult.total || 0,
          invalidos: collectionResult.invalidos || 0,
          readsEstimados: collectionResult.readsEstimados || 0
        });
        return {
          ok: false,
          origem: 'APPS_SCRIPT_FALLBACK',
          code: collectionResult.code,
          data: []
        };
      }
      return collectionResult;
    } catch (erro) {
      registrarDiagnostico('APPS_SCRIPT_FALLBACK', inicio, {
        code: erro && erro.code ? erro.code : 'FIRESTORE_FALHOU',
        readsEstimados: 1
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
    var debug = global.PortalGeapaDebug;
    if (debug && typeof debug.registerDataSource === 'function') {
      debug.registerDataSource('atividades', {
        origem: origem,
        fallbackUsado: origem === 'APPS_SCRIPT_FALLBACK',
        cacheLocal: false
      });
    }
    if (!global.console || typeof global.console.info !== 'function') return;
    global.console.info('[GEAPA-PORTAL-ACTIVITIES]', origem, Object.assign({
      tempoMs: Math.round(obterTempoAtual() - inicio)
    }, detalhes || {}));
  }

  global.PortalGeapaFirestoreActivities = {
    buscarCalendario: buscarCalendario,
    mesclarEnriquecimentoOperacional: mesclarEnriquecimentoOperacional
  };
})(window);
