import assert from 'node:assert/strict';
import fs from 'node:fs';

const environmentCode = fs.readFileSync('web/assets/js/environment.js', 'utf8');
const sessionRaw = fs.readFileSync('web/assets/js/firestore-session-cache.js', 'utf8');
const sessionCode = sessionRaw.slice(sessionRaw.indexOf('/**'));
const navigationCode = fs.readFileSync('web/assets/js/navigation.js', 'utf8');
const rulesCode = fs.readFileSync('firestore.rules', 'utf8');

function buildDocument() {
  return {
    readyState: 'complete',
    querySelector: () => null,
    documentElement: { setAttribute() {} }
  };
}

function buildDebug(prefix, environment) {
  const window = {
    PortalGeapaConfig: {
      ENVIRONMENT: environment,
      DATA_ENVIRONMENT: 'TEST',
      FIRESTORE_PATH_PREFIX: prefix,
      FIREBASE: { projectId: 'portal-geapa' }
    },
    console: { info() {} }
  };
  new Function('window', 'document', environmentCode)(window, buildDocument());
  window.PortalGeapaDebugAuth.record('AUTH_STATE_CHANGED', {
    loggedIn: true,
    uid: 'uid-1234567890',
    email: 'membro@example.org',
    emailVerified: true
  });
  return window.PortalGeapaDebugAuth;
}

function buildSessionValidator() {
  const window = {
    PortalGeapaConfig: {
      FIRESTORE_SESSION_TTL_MS: 6 * 60 * 60 * 1000,
      FIREBASE: { projectId: 'portal-geapa' }
    },
    PortalGeapaDebugAuth: { record() {} },
    console: { info() {} },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} },
    performance: { now: () => Date.now() }
  };
  new Function('window', sessionCode)(window);
  return window.PortalGeapaFirestoreSession;
}

const prodDebug = buildDebug('', 'PROD');
const homologDebug = buildDebug('environments/homolog', 'HOMOLOG');
assert.equal(prodDebug.getStatus().expectedPortalUserPath, 'portalUsers/uid-1234567890');
assert.equal(homologDebug.getStatus().expectedPortalUserPath, 'environments/homolog/portalUsers/uid-1234567890');

const validator = buildSessionValidator();
const firebaseUser = { uid: 'uid-1', email: 'membro@example.org', emailVerified: true };
const snapshot = {
  uid: 'uid-1',
  emailNormalizado: 'membro@example.org',
  portalAtivo: true,
  ativo: true,
  podeAcessarPortal: true,
  podeLerDadosPrivados: true,
  stale: false,
  source: 'PESSOAS_V2',
  schemaVersion: 'portal-user-v2',
  cacheUpdatedAt: new Date().toISOString()
};

assert.equal(validator.validarPortalUserSnapshot(snapshot, firebaseUser).code, 'PORTAL_USER_VALIDO');
assert.equal(validator.validarPortalUserSnapshot({ ...snapshot, stale: true }, firebaseUser).code, 'DOC_STALE');
assert.equal(validator.validarPortalUserSnapshot({ ...snapshot, emailNormalizado: 'outra@example.org' }, firebaseUser).code, 'EMAIL_DIVERGENTE');
assert.equal(validator.validarPortalUserSnapshot({ ...snapshot, cacheUpdatedAt: '2020-01-01T00:00:00Z' }, firebaseUser).code, 'CACHE_EXPIRADO');
assert.equal(validator.validarPortalUserSnapshot(snapshot, { ...firebaseUser, emailVerified: false }).code, 'FIREBASE_AUTH_INVALIDO');

assert.match(navigationCode, /fastPathConcedido\s*!==\s*true/);
assert.doesNotMatch(sessionRaw, /\b(?:setDoc|addDoc|updateDoc|deleteDoc)\b/);
assert.match(rulesCode, /match \/portalUsers\/\{uid\}[\s\S]*?allow write:\s*if false;/);

console.log('Auth/Firestore fast path: checks passed.');
