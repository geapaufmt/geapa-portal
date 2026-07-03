/** Ambiente publico, feature flags e diagnostico seguro do build. */
(function configurarAmbientePortal(global) {
  var config = global.PortalGeapaConfig || {};
  var dataSources = {};

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
    registerDataSource: registerDataSource
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderEnvironmentIndicators);
  } else {
    renderEnvironmentIndicators();
  }
})(window);
