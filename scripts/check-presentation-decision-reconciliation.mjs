import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiSource = fs.readFileSync(path.join(root, 'web/assets/js/api.js'), 'utf8');
const uiSource = fs.readFileSync(
  path.join(root, 'web/assets/js/portal-v2-readonly.js'),
  'utf8'
);
const backendSource = fs.readFileSync(
  path.join(root, 'apps-script/07_views_v2_readonly.gs'),
  'utf8'
);

const responses = [];
const requestBodies = [];
const config = {
  ENVIRONMENT: 'DEV',
  GEAPA_API_BASE_URL: 'https://example.invalid/dev',
  API_READ_TIMEOUT_MS: 35000,
  API_WRITE_TIMEOUT_MS: 30000,
  MOCK_MODE: false
};
const browser = {
  PortalGeapaConfig: config,
  sessionStorage: { getItem: () => 'TOKEN-DEV' }
};
const sandbox = {
  window: browser,
  URLSearchParams,
  AbortController,
  Promise,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  Math,
  Error,
  setTimeout,
  clearTimeout,
  fetch: async (_url, options) => {
    requestBodies.push(String(options.body));
    const body = responses.shift();
    return {
      ok: body.ok !== false,
      status: body.ok === false ? 403 : 200,
      json: async () => body
    };
  }
};
vm.createContext(sandbox);
vm.runInContext(apiSource, sandbox, { filename: 'api.js' });

const api = browser.PortalGeapaApi;
const request = {
  requestId: 'GEAPA-REQ-RECONCILIACAO-0001',
  idApresentacao: 'APR-2026-1-0001',
  decisionType: 'REQUEST_ADJUSTMENT'
};

responses.push(
  { ok: true, data: { state: 'PROCESSING', nextPollAfterMs: 1 } },
  { ok: true, data: { state: 'COMPLETED', commitConfirmed: true } }
);
let result = await api.reconcilePresentationDecision(request, {
  maxAttempts: 3,
  wait: () => Promise.resolve()
});
assert.equal(result.data.state, 'COMPLETED');
assert.equal(result.reconciliationAttempts, 2);
assert.equal(requestBodies.length, 2);
for (const body of requestBodies) {
  const params = new URLSearchParams(body);
  assert.equal(params.get('acao'), 'apresentacaoConsultarDecisao');
  assert.equal(JSON.parse(params.get('payload')).requestId, request.requestId);
}

responses.push({ ok: true, data: { state: 'INDETERMINATE', retryAllowed: true } });
result = await api.reconcilePresentationDecision(request, {
  wait: () => Promise.resolve()
});
assert.equal(result.data.state, 'INDETERMINATE');
assert.equal(result.reconciliationAttempts, 1);

responses.push({
  ok: false,
  code: 'PRESENTATIONS_RECONCILIATION_PERMISSAO_NEGADA',
  message: 'Permissao negada.'
});
result = await api.reconcilePresentationDecision(request, {
  wait: () => Promise.resolve()
});
assert.equal(result.ok, false);
assert.equal(result.code, 'PRESENTATIONS_RECONCILIATION_PERMISSAO_NEGADA');

const callsBeforeProd = requestBodies.length;
config.ENVIRONMENT = 'PROD';
result = await api.reconcilePresentationDecision(request);
assert.equal(result.ok, false);
assert.equal(result.code, 'APRESENTACAO_RECONCILIACAO_SOMENTE_DEV');
assert.equal(requestBodies.length, callsBeforeProd, 'PROD nao pode consultar o endpoint DEV');

assert.match(uiSource, /APRESENTACAO_DECISAO_RECONCILIADA/);
assert.match(uiSource, /APRESENTACAO_DECISAO_EM_PROCESSAMENTO/);
assert.match(uiSource, /APRESENTACAO_DECISAO_INDETERMINADA/);
assert.match(uiSource, /requestIdsDecisoesPendentes\[key\]/);
assert.match(uiSource, /sameRequestIdRequired:\s*true/);
assert.match(uiSource, /APPROVE/);
assert.match(uiSource, /REJECT/);
assert.match(uiSource, /REQUEST_ADJUSTMENT/);
assert.match(uiSource, /EDIT_APPROVE/);
assert.ok(
  uiSource.indexOf('reconciliarRespostaDecisaoApresentacaoDev_') <
    uiSource.indexOf("marcarTimingApresentacaoDev_(timing, 'F4'"),
  'reconciliacao deve ocorrer antes de declarar a mutacao concluida'
);
assert.match(backendSource, /portalApresentacaoConsultarDecisaoV2/);
assert.match(backendSource, /portalResolverAmbienteDadosV2_\(\) !== 'DEV'/);
assert.match(backendSource, /requerDiretoria:\s*true/);

console.log('check-presentation-decision-reconciliation.mjs: OK');
