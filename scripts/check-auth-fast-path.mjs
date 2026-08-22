import assert from 'node:assert/strict';
import fs from 'node:fs';

const environmentCode = fs.readFileSync('web/assets/js/environment.js', 'utf8');
const sessionRaw = fs.readFileSync('web/assets/js/firestore-session-cache.js', 'utf8');
const sessionCode = sessionRaw.slice(sessionRaw.indexOf('/**'));
const appCode = fs.readFileSync('web/app.js', 'utf8');
const indexCode = fs.readFileSync('web/index.html', 'utf8');
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
      FIREBASE: { projectId: environment === 'PROD' ? 'portal-geapa' : 'geapa-dev-test' }
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
const homologDebug = buildDebug('', 'HOMOLOG');
assert.equal(prodDebug.getStatus().expectedPortalUserPath, 'portalUsers/uid-1234567890');
assert.equal(homologDebug.getStatus().expectedPortalUserPath, 'portalUsers/uid-1234567890');
const invalidNamespaceDebug = buildDebug('environments/homolog', 'HOMOLOG');
assert.throws(
  () => invalidNamespaceDebug.getStatus(),
  /FIRESTORE_PATH_PREFIX nao e suportado/
);

prodDebug.record('PORTAL_USER_DOC_FOUND', {
  uid: 'uid-1234567890',
  idPessoa: 'PES-001',
  emailNormalizado: 'membro@example.org',
  portalAtivo: true
});
prodDebug.record('CORE_SESSION_CHANGED', {
  loggedIn: true,
  idPessoa: 'PES-001',
  email: 'membro@example.org',
  perfil: 'MEMBRO',
  origemDados: 'GEAPA_CORE'
});
assert.equal(prodDebug.getStatus().identityConsistency.code, 'OK');
assert.equal(prodDebug.getStatus().authMode, 'FIREBASE_PLUS_CORE');

const mismatchDebug = buildDebug('', 'PROD');
mismatchDebug.record('CORE_SESSION_CHANGED', {
  loggedIn: true,
  idPessoa: 'PES-OUTRA',
  email: 'outra@example.org'
});
assert.equal(mismatchDebug.getStatus().identityConsistency.code, 'IDENTITY_MISMATCH_FIREBASE_CORE');
assert.equal(mismatchDebug.getStatus().authMode, 'DESYNC');
mismatchDebug.record('IDENTITY_MISMATCH_FIREBASE_CORE', { code: 'IDENTITY_MISMATCH_FIREBASE_CORE' });
mismatchDebug.record('PROVISION_DENY', { code: 'PROVISION_DENY_IDENTITY_MISMATCH' });
assert.equal(mismatchDebug.getStatus().identityConsistency.code, 'IDENTITY_MISMATCH_FIREBASE_CORE');
assert.equal(mismatchDebug.getStatus().authMode, 'DESYNC');

const coreOnlyDebug = buildDebug('', 'PROD');
coreOnlyDebug.record('AUTH_STATE_CHANGED', { loggedIn: false });
coreOnlyDebug.record('CORE_SESSION_CHANGED', {
  loggedIn: true,
  idPessoa: 'PES-001',
  email: 'membro@example.org'
});
assert.equal(coreOnlyDebug.getStatus().identityConsistency.code, 'CORE_ONLY');
assert.equal(coreOnlyDebug.getStatus().authMode, 'CORE_CODE_ONLY');

const aliasDebug = buildDebug('', 'PROD');
aliasDebug.record('PORTAL_USER_DOC_FOUND', {
  uid: 'uid-1234567890',
  idPessoa: 'PES-001',
  emailNormalizado: 'membro@example.org',
  portalAtivo: true
});
aliasDebug.record('CORE_SESSION_CHANGED', {
  loggedIn: true,
  idPessoa: 'PES-001',
  email: 'principal@example.org',
  emailAutenticacao: 'membro@example.org',
  identidadeFirebaseCoreConfirmada: true
});
assert.equal(aliasDebug.getStatus().identityConsistency.code, 'IDENTITY_ALIAS_CORE_CONFIRMADO');
assert.equal(aliasDebug.getStatus().authMode, 'FIREBASE_PLUS_CORE');

const validator = buildSessionValidator();
const firebaseUser = { uid: 'uid-1', email: 'membro@example.org', emailVerified: true };
const snapshot = {
  uid: 'uid-1',
  idPessoa: 'PES-001',
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

const coreSession = {
  autenticado: true,
  idPessoa: 'PES-001',
  email: 'membro@example.org',
  perfilPortalEfetivo: 'MEMBRO'
};
assert.equal(validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, coreSession).code, 'OK');
assert.equal(
  validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, {
    ...coreSession,
    email: 'principal@example.org',
    emailAutenticacao: 'membro@example.org',
    identidadeFirebaseCoreConfirmada: true,
    identidadeFirebaseCoreCodigo: 'IDENTITY_ALIAS_CORE_CONFIRMADO'
  }).code,
  'IDENTITY_ALIAS_CORE_CONFIRMADO'
);
assert.equal(
  validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, {
    ...coreSession,
    idPessoa: 'PES-OUTRA',
    email: 'principal@example.org',
    emailAutenticacao: 'membro@example.org',
    identidadeFirebaseCoreConfirmada: true
  }).code,
  'IDENTITY_MISMATCH_FIREBASE_CORE'
);
assert.equal(
  validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, {
    ...coreSession,
    email: 'principal@example.org'
  }).code,
  'IDENTITY_MISMATCH_FIREBASE_CORE'
);
assert.equal(
  validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, {
    ...coreSession,
    idPessoa: 'PES-OUTRA',
    email: 'outra@example.org'
  }).code,
  'IDENTITY_MISMATCH_FIREBASE_CORE'
);
assert.equal(validator.verificarConsistenciaIdentidade(null, null, coreSession).code, 'CORE_ONLY');
assert.equal(validator.verificarConsistenciaIdentidade(firebaseUser, snapshot, null).code, 'FIREBASE_ONLY');

assert.match(navigationCode, /fastPathConcedido\s*!==\s*true/);
assert.match(appCode, /FIREBASE_SIGNOUT_BEFORE_CORE_LOGIN/);
assert.match(appCode, /PROVISION_SKIP_SEM_FIREBASE_AUTH/);
assert.match(appCode, /IDENTITY_MISMATCH_FIREBASE_CORE/);
assert.match(appCode, /LOGIN_CORE_CODE_ISOLADO/);
assert.doesNotMatch(appCode, /identificadorEmail\s*&&\s*firebaseEmail\s*&&\s*identificadorEmail\s*===\s*firebaseEmail\)\s*return/);
assert.doesNotMatch(appCode, /aplicarSessaoRapidaDoResumoSeguro\s*\(/);
assert.match(indexCode, /id="entrar-google"[\s\S]*?>\s*Entrar com Google/);
assert.match(indexCode, /id="login-codigo-panel"[^>]*hidden/);
assert.match(indexCode, /id="alternar-login-codigo"[\s\S]*?>Entrar por código<\/button>/);
assert.ok(indexCode.indexOf('id="entrar-google"') < indexCode.indexOf('id="login-codigo-panel"'));
assert.doesNotMatch(sessionRaw, /\b(?:setDoc|addDoc|updateDoc|deleteDoc)\b/);
assert.match(rulesCode, /match \/portalUsers\/\{uid\}[\s\S]*?allow write:\s*if false;/);

console.log('Auth/Firestore fast path: checks passed.');
