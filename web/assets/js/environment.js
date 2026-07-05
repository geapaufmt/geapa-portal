/** Ambiente publico, feature flags e diagnostico seguro do build. */
(function configurarAmbientePortal(global) {
  var config = global.PortalGeapaConfig || {};
  var dataSources = {};
  var authDebugState = {
    firebaseReady: false,
    firebaseAuthLogado: false,
    uid: '',
    email: '',
    emailVerified: false,
    portalUserDoc: {
      checked: false,
      exists: false,
      portalAtivo: false,
      perfilOperacional: '',
      roles: [],
      schemaVersion: '',
      cacheUpdatedAt: '',
      stale: false,
      validationCode: 'NAO_VERIFICADO'
    },
    provisionamento: {
      executadoNestaSessao: false,
      status: 'NAO_EXECUTADO',
      code: 'NAO_EXECUTADO',
      lastRunAt: '',
      durationMs: 0
    },
    portalUserSource: 'NAO_CARREGADO',
    fastPath: 'NAO_VERIFICADO',
    backgroundRevalidation: 'NAO_EXECUTADO'
  };

  function flagEnabled(name, defaultValue) {
    if (!Object.prototype.hasOwnProperty.call(config, name)) return defaultValue === true;
    return config[name] === true;
  }

  function isReadOnly() {
    return config.READ_ONLY_MODE === true;
  }

  function firestorePathSegments(collectionName, documentId) {
    var prefix = String(config.FIRESTORE_PATH_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
    var segments = prefix ? prefix.split('/').filter(Boolean) : [];
    segments.push(String(collectionName || '').trim());
    if (documentId !== undefined && documentId !== null && String(documentId).trim()) {
      segments.push(String(documentId).trim());
    }
    return segments;
  }

  function maskedApiUrl() {
    var value = String(config.GEAPA_API_BASE_URL || '').trim();
    return value.replace(/(\/macros\/s\/)[^/]+(\/exec)/, '$1***$2');
  }

  function registerDataSource(screen, details) {
    var key = String(screen || '').trim() || 'unknown';
    var source = details || {};
    dataSources[key] = Object.freeze({
      origem: String(source.origem || source.source || '').slice(0, 80),
      fallbackUsado: source.fallbackUsado === true,
      cacheLocal: source.cacheLocal === true,
      firestorePathPrefix: String(config.FIRESTORE_PATH_PREFIX || '')
    });
  }

  function uidPreview(uid) {
    var value = String(uid || '').trim();
    if (!value) return '';
    return value.length <= 10 ? value : value.slice(0, 6) + '...' + value.slice(-4);
  }

  function expectedPortalUserPath(uid) {
    var id = String(uid || '').trim();
    return id ? firestorePathSegments('portalUsers', id).join('/') : '';
  }

  function recordAuthEvent(eventName, details) {
    var event = String(eventName || '').trim().toUpperCase();
    var data = details || {};
    if (event === 'FIREBASE_READY') authDebugState.firebaseReady = true;
    if (event === 'AUTH_STATE_CHANGED') {
      authDebugState.firebaseReady = true;
      authDebugState.firebaseAuthLogado = data.loggedIn === true;
      authDebugState.uid = authDebugState.firebaseAuthLogado ? String(data.uid || '') : '';
      authDebugState.email = authDebugState.firebaseAuthLogado ? String(data.email || '') : '';
      authDebugState.emailVerified = authDebugState.firebaseAuthLogado && data.emailVerified === true;
      if (!authDebugState.firebaseAuthLogado) {
        authDebugState.portalUserSource = 'NAO_CARREGADO';
        authDebugState.fastPath = 'NAO_VERIFICADO';
      }
    }
    if (event === 'PORTAL_USER_DOC_FOUND' || event === 'PORTAL_USER_DOC_MISSING') {
      authDebugState.portalUserSource = 'FIRESTORE';
      authDebugState.portalUserDoc = {
        checked: true,
        exists: event === 'PORTAL_USER_DOC_FOUND',
        portalAtivo: data.portalAtivo === true,
        perfilOperacional: String(data.perfilOperacional || ''),
        roles: Array.isArray(data.roles) ? data.roles.map(String) : [],
        schemaVersion: String(data.schemaVersion || ''),
        cacheUpdatedAt: String(data.cacheUpdatedAt || ''),
        stale: data.stale === true,
        validationCode: String(data.validationCode || (event === 'PORTAL_USER_DOC_FOUND' ? 'DOC_ENCONTRADO' : 'DOC_AUSENTE'))
      };
    }
    if (event.indexOf('PROVISION_') === 0) {
      var provisionStatus = event === 'PROVISION_START' ? 'NAO_EXECUTADO' : event.replace('PROVISION_', '');
      authDebugState.provisionamento = {
        executadoNestaSessao: true,
        status: provisionStatus || 'NAO_EXECUTADO',
        code: String(data.code || provisionStatus || ''),
        lastRunAt: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(Number(data.durationMs || 0)))
      };
      if (event === 'PROVISION_OK' || event === 'PROVISION_SKIP') authDebugState.portalUserSource = 'APPS_SCRIPT';
    }
    if (event === 'FAST_PATH_GRANTED' || event === 'FAST_PATH_BLOCKED') {
      authDebugState.fastPath = event === 'FAST_PATH_GRANTED' ? 'GRANTED' : 'BLOCKED';
      if (data.code) authDebugState.portalUserDoc.validationCode = String(data.code);
    }
    if (event === 'BACKGROUND_REVALIDATION_OK' || event === 'BACKGROUND_REVALIDATION_DENY' || event === 'BACKGROUND_REVALIDATION_ERROR') {
      authDebugState.backgroundRevalidation = event.replace('BACKGROUND_REVALIDATION_', '');
    }

    if (global.console && typeof global.console.info === 'function') {
      global.console.info('[GEAPA-AUTH]', event, {
        code: String(data.code || ''),
        uidPreview: uidPreview(data.uid || authDebugState.uid),
        durationMs: Math.max(0, Math.round(Number(data.durationMs || 0)))
      });
    }
  }

  function getAuthStatus() {
    var activitySource = dataSources.atividades && dataSources.atividades.origem || 'NAO_CARREGADO';
    return Object.freeze({
      environment: String(config.ENVIRONMENT || ''),
      dataEnvironment: String(config.DATA_ENVIRONMENT || ''),
      firestoreProjectId: String(config.FIREBASE && config.FIREBASE.projectId || ''),
      firestorePathPrefix: String(config.FIRESTORE_PATH_PREFIX || ''),
      firebaseReady: authDebugState.firebaseReady === true,
      firebaseAuthLogado: authDebugState.firebaseAuthLogado === true,
      uid: authDebugState.uid,
      uidPreview: uidPreview(authDebugState.uid),
      email: authDebugState.email,
      emailVerified: authDebugState.emailVerified === true,
      expectedPortalUserPath: expectedPortalUserPath(authDebugState.uid),
      portalUserDoc: Object.freeze(Object.assign({}, authDebugState.portalUserDoc, {
        roles: Object.freeze((authDebugState.portalUserDoc.roles || []).slice())
      })),
      provisionamento: Object.freeze(Object.assign({}, authDebugState.provisionamento)),
      fastPath: authDebugState.fastPath,
      backgroundRevalidation: authDebugState.backgroundRevalidation,
      dataSources: Object.freeze({
        calendario: String(activitySource),
        portalUser: String(authDebugState.portalUserSource || 'NAO_CARREGADO')
      })
    });
  }

  function printAuthStatus() {
    var status = getAuthStatus();
    if (!global.console) return status;
    global.console.info('[GEAPA-AUTH] STATUS', status);
    global.console.info('[GEAPA-AUTH] FIRESTORE_SNAPSHOT != portalUsers provisionado');
    return status;
  }

  function renderEnvironmentIndicators() {
    var environment = String(config.ENVIRONMENT || 'INDEFINIDO').toUpperCase();
    var showBadge = config.SHOW_ENV_BADGE === true && environment !== 'PROD';
    var badge = document.querySelector('[data-environment-badge]');
    var banner = document.querySelector('[data-maintenance-banner]');

    if (badge) {
      badge.hidden = !showBadge;
      badge.textContent = showBadge
        ? [environment, config.BUILD_CHANNEL].filter(Boolean).join(' · ')
        : '';
    }
    if (banner) {
      banner.hidden = !String(config.MAINTENANCE_BANNER || '').trim();
      banner.textContent = String(config.MAINTENANCE_BANNER || '').trim();
    }
    document.documentElement.setAttribute('data-portal-environment', environment.toLowerCase());
  }

  global.PortalGeapaEnvironment = Object.freeze({
    flagEnabled: flagEnabled,
    isReadOnly: isReadOnly,
    firestorePathSegments: firestorePathSegments
  });

  global.PortalGeapaDebugAuth = Object.freeze({
    getStatus: getAuthStatus,
    printStatus: printAuthStatus,
    record: recordAuthEvent
  });

  global.PortalGeapaDebug = Object.freeze({
    getEnvironment: function getEnvironment() {
      return Object.freeze({
        environment: String(config.ENVIRONMENT || ''),
        dataEnvironment: String(config.DATA_ENVIRONMENT || ''),
        readOnly: isReadOnly()
      });
    },
    getDataSources: function getDataSources() {
      return Object.freeze(Object.assign({}, dataSources));
    },
    getBuildInfo: function getBuildInfo() {
      return Object.freeze({
        portalVersion: String(config.PORTAL_VERSION || ''),
        buildChannel: String(config.BUILD_CHANNEL || ''),
        apiBaseUrl: maskedApiUrl(),
        firebaseProjectId: String(config.FIREBASE && config.FIREBASE.projectId || ''),
        firestorePathPrefix: String(config.FIRESTORE_PATH_PREFIX || '')
      });
    },
    getAuthStatus: getAuthStatus,
    registerDataSource: registerDataSource
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderEnvironmentIndicators);
  } else {
    renderEnvironmentIndicators();
  }
})(window);
