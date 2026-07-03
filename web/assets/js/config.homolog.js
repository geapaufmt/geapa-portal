/** Configuracao publica HOMOLOG/preview. Nao adicionar segredos. */
window.PortalGeapaConfig = {
  MOCK_MODE: false,
  ENVIRONMENT: 'HOMOLOG',
  DATA_ENVIRONMENT: 'PILOTO_DEV',
  BUILD_CHANNEL: 'homolog',
  PORTAL_VERSION: 'candidate',
  GEAPA_API_BASE_URL: 'https://script.google.com/macros/s/AKfycbxf-vC0VFALa45AlT1ycKJcL44EB6LiCFBwVy3LIPvrWGxyd5_1U2XKRM03_7rsh-k/exec',
  FIRESTORE_ENABLED: true,
  FIRESTORE_SNAPSHOT_ENABLED: true,
  FIRESTORE_COLLECTION_FALLBACK_ENABLED: true,
  APPS_SCRIPT_FALLBACK_ENABLED: true,
  FIRESTORE_PATH_PREFIX: 'environments/homolog',
  FIRESTORE_SESSION_TTL_MS: 2 * 60 * 60 * 1000,
  FIRESTORE_ACTIVITIES_TTL_MS: 2 * 60 * 60 * 1000,
  ATIVIDADES_CACHE_TTL_MS: 15 * 60 * 1000,
  ENABLE_ACTIVITY_MANAGEMENT: false,
  ENABLE_JUSTIFICATIVAS: false,
  READ_ONLY_MODE: true,
  SHOW_ENV_BADGE: true,
  MAINTENANCE_BANNER: 'Ambiente de homologacao com dados controlados.',
  FIREBASE: {
    apiKey: 'AIzaSyCiHX3n1NbYnGkVtELqzU-JztZ_53gjkd8',
    authDomain: 'portal-geapa.firebaseapp.com',
    projectId: 'portal-geapa',
    storageBucket: 'portal-geapa.firebasestorage.app',
    messagingSenderId: '913092907585',
    appId: '1:913092907585:web:2e222064751ab80505acc0',
    measurementId: 'G-BYH8WBKT4D'
  }
};
