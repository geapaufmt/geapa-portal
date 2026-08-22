import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logs = [];
let coreCall = null;
let persistedLog = null;

const context = {
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  JSON,
  Math,
  isNaN,
  Logger: { log(value) { logs.push(String(value)); } },
  portalAgoraMs_: () => 1000,
  portalResolverAmbienteDadosV2_: () => 'DEV',
  portalMascararEmail_: () => 'a***@geapa.test',
  GEAPA_CORE: {
    corePortalProvisionarFirestoreUserAutenticado(identity, opts) {
      coreCall = { identity, opts };
      return {
        ok: true,
        synced: true,
        writer: 'APPS_SCRIPT_FIRESTORE_REST',
        code: 'FIRESTORE_SYNC_OK',
        httpStatus: 200
      };
    },
    corePortalLogAccess(payload, opts) {
      persistedLog = { payload, opts };
      return { ok: true };
    }
  }
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'apps-script', '05_auth_firebase.gs'), 'utf8'),
  context,
  { filename: '05_auth_firebase.gs' }
);

const session = {
  idPessoa: 'PES-1',
  email: 'canonico@geapa.test',
  emailAutenticacao: 'alias@geapa.test',
  identidadeFirebaseCoreConfirmada: true,
  portalAtivo: true
};
const success = context.portalSincronizarCacheFirestoreLogin_({
  uid: 'firebase-uid-1',
  email: 'alias@geapa.test',
  emailVerified: true,
  sessao: session
});
assert.equal(success.ok, true);
assert.equal(success.code, 'PROVISION_OK');
assert.equal(success.backendCode, 'FIRESTORE_SYNC_OK');
assert.equal(coreCall.identity.email, 'alias@geapa.test');
assert.equal(coreCall.opts.ambiente, 'DEV');
assert.equal(coreCall.opts.sessao.idPessoa, 'PES-1');

context.portalRegistrarLogProvisionamentoFirestore_({
  acao: 'PORTAL_FIRESTORE_USER_PROVISION_OK',
  resultado: 'OK',
  email: 'alias@geapa.test'
});
assert.equal(persistedLog.opts.ambiente, 'DEV', 'log deve receber ambiente DEV explicitamente');

context.GEAPA_CORE.corePortalProvisionarFirestoreUserAutenticado = () => ({
  ok: false,
  synced: false,
  code: 'FIRESTORE_SYNC_FALHOU',
  httpStatus: 403,
  firestoreError: { status: 'PERMISSION_DENIED', message: 'detalhe sensivel' }
});
const failure = context.portalSincronizarCacheFirestoreLogin_({
  uid: 'firebase-uid-1',
  email: 'alias@geapa.test',
  emailVerified: true,
  sessao: session
});
assert.equal(failure.ok, false);
assert.equal(failure.code, 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED');
assert.equal(failure.backendCode, 'FIRESTORE_SYNC_FALHOU');
assert.equal(failure.firestoreStatus, 'PERMISSION_DENIED');
assert.equal(JSON.stringify(failure).includes('detalhe sensivel'), false, 'mensagem interna nao deve sair na API');

console.log('check-firestore-login-provisioning: OK');
