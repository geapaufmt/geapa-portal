/**
 * Configuracao publica do front-end do Portal GEAPA.
 *
 * Este arquivo roda no GitHub Pages. Nao adicionar segredos, tokens, IDs
 * sensiveis ou dados pessoais reais.
 */

window.PortalGeapaConfig = {
  MOCK_MODE: false,
  GEAPA_API_BASE_URL: 'https://script.google.com/macros/s/AKfycbxf-vC0VFALa45AlT1ycKJcL44EB6LiCFBwVy3LIPvrWGxyd5_1U2XKRM03_7rsh-k/exec',
  PORTAL_VERSION: '0.1',
  ENVIRONMENT: 'DEV',
  FIRESTORE_SESSION_TTL_MS: 6 * 60 * 60 * 1000,
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
