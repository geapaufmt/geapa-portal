import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheValues = new Map();
let coreCalls = 0;
let sentEmails = 0;
let lastCoreOptions = null;

const cache = {
  get(key) { return cacheValues.get(key) || null; },
  put(key, value) { cacheValues.set(key, String(value)); },
  remove(key) { cacheValues.delete(key); }
};
const properties = {
  PORTAL_ENVIO_EMAIL_HABILITADO: 'true',
  PORTAL_MODO_ACESSO: 'MEMBROS_ATIVOS',
  PORTAL_CODIGO_SALT: 'test-salt'
};

const math = Object.create(Math);
math.random = () => 0;
const context = {
  console,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  JSON,
  Math: math,
  Error,
  RegExp,
  Promise,
  Logger: { log() {} },
  CacheService: { getScriptCache: () => cache },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => properties[key] || null
    })
  },
  Utilities: {
    getUuid: () => '00000000-0000-4000-8000-000000000001',
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest(_algorithm, value) {
      return Array.from(crypto.createHash('sha256').update(String(value)).digest())
        .map((byte) => byte > 127 ? byte - 256 : byte);
    }
  },
  MailApp: { sendEmail() { sentEmails += 1; } },
  GEAPA_CORE: {
    corePortalResolverUsuarioAtual(_input, options) {
      coreCalls += 1;
      lastCoreOptions = options;
      return {
        ok: true,
        autenticado: true,
        portalAtivo: true,
        idPessoa: 'PES-TESTE',
        nomeExibicao: 'Pessoa Teste',
        email: 'teste@example.org',
        rga: 'RGA-TESTE',
        permissoes: ['portal:acessar', 'situacao:ver_propria'],
        perfisPortal: ['MEMBRO'],
        perfilPortalEfetivo: 'MEMBRO'
      };
    },
    geapaCoreBuscarMinhaSituacaoParaPortal(_input, options) {
      lastCoreOptions = options;
      return {
        ok: true,
        sessao: options.sessao,
        membro: { id: 'PES-TESTE', nomeExibicao: 'Pessoa Teste' },
        minhaSituacao: {}
      };
    }
  }
};
vm.createContext(context);
for (const file of [
  'apps-script/00_config.gs',
  'apps-script/03_webapp.gs',
  'apps-script/01_auth_codigo.gs',
  'apps-script/03_membros.gs',
  'apps-script/02_minha_situacao.gs'
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

context.portalIniciarTrace_('testeSessao', 'TRACE-1');
const first = context.portalResolverSessaoAtualViaGeapaCore_('teste@example.org', { origem: 'teste' });
const second = context.portalResolverSessaoAtualViaGeapaCore_('teste@example.org', { origem: 'teste-repetido' });
assert.equal(first.idPessoa, 'PES-TESTE');
assert.equal(second.idPessoa, 'PES-TESTE');
assert.equal(coreCalls, 1, 'a sessao deve ser resolvida uma vez por execucao');
assert.equal(lastCoreOptions.ambiente, 'DEV');
assert.equal(lastCoreOptions.environment, 'DEV');
assert.equal(context.portalCacheKey_('sessao', 'abc').split(':')[1], 'DEV');

cacheValues.clear();
context.__portal_sessao_core_execution_memo = {};
coreCalls = 0;
context.portalIniciarTrace_('solicitarCodigo', 'TRACE-LOGIN');
const requestResult = context.portalSolicitarCodigo('teste@example.org');
assert.equal(requestResult.ok, true);
assert.equal(coreCalls, 1);
assert.equal(sentEmails, 1);
assert.equal(typeof context.firebase, 'undefined', 'login por codigo nao pode depender de Firebase');

context.__portal_sessao_core_execution_memo = {};
context.portalIniciarTrace_('validarCodigo', 'TRACE-VALIDAR');
const validateResult = context.portalValidarCodigo('teste@example.org', '100000');
assert.equal(validateResult.ok, true);
assert.equal(validateResult.data.authMode, 'CORE_CODE_ONLY');

cacheValues.clear();
context.__portal_sessao_core_execution_memo = {};
context.GEAPA_CORE.corePortalResolverUsuarioAtual = () => {
  const error = new Error('DOMAIN_DB_INDISPONIVEL');
  error.code = 'DOMAIN_DB_INDISPONIVEL';
  throw error;
};
context.portalIniciarTrace_('erroCore', 'TRACE-ERRO');
const failed = context.portalResolverSessaoAtualViaGeapaCore_('teste@example.org', { origem: 'teste-erro' });
assert.equal(failed.ok, false);
assert.equal(failed.motivoBloqueio, 'DOMAIN_DB_INDISPONIVEL');
assert.equal(failed.failedStage, 'corePortalResolverUsuarioAtual');

const apiSource = fs.readFileSync(path.join(root, 'web/assets/js/api.js'), 'utf8');
const navigationSource = fs.readFileSync(path.join(root, 'web/assets/js/navigation.js'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'apps-script/00_config.gs'), 'utf8');
assert.match(apiSource, /leiturasPendentes\[leituraKey\]/);
assert.match(apiSource, /portal:readrequeststate/);
assert.match(navigationSource, /data-refresh-current-route/);
assert.match(navigationSource, /motivo: 'atualizacao-manual'/);
assert.match(configSource, /ambienteDadosV2:\s*'DEV'/);
assert.doesNotMatch(configSource, /ambienteDadosV2:\s*'PROD'/);

console.log(JSON.stringify({
  ok: true,
  ambienteBackendHomolog: 'DEV',
  resolucoesSessaoPorExecucao: 1,
  loginCodigoSemFirebase: true,
  erroCorePreservado: 'DOMAIN_DB_INDISPONIVEL',
  cacheSeparadoPorAmbiente: true,
  leiturasFrontendDeduplicadas: true,
  atualizarPorAba: true
}, null, 2));
