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
const configSource = fs.readFileSync(path.join(root, 'apps-script/00_config.gs'), 'utf8');
const webappSource = fs.readFileSync(path.join(root, 'apps-script/03_webapp.gs'), 'utf8');
const adapterSource = fs.readFileSync(
  path.join(root, 'apps-script/07_views_v2_readonly.gs'),
  'utf8'
);

const fetchCalls = [];
const window = {
  PortalGeapaConfig: {
    ENVIRONMENT: 'DEV',
    GEAPA_API_BASE_URL: 'https://dev.invalid/exec',
    API_WRITE_TIMEOUT_MS: 30000,
    API_READ_TIMEOUT_MS: 35000,
    READ_ONLY_MODE: false,
    MOCK_MODE: false
  },
  sessionStorage: { getItem: () => 'TOKEN-DEV' }
};
const context = {
  window,
  URLSearchParams,
  AbortController,
  Promise,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  RegExp,
  setTimeout,
  clearTimeout,
  fetch: async (_url, options) => {
    fetchCalls.push(options);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: { idApresentacao: 'APR-TESTE' },
        meta: { trace: { traceId: 'GEAPA-REQ-TESTE' } }
      })
    };
  }
};
vm.createContext(context);
vm.runInContext(apiSource, context, { filename: 'api.js' });

const requestId = 'GEAPA-REQ-LATENCY-TEST-0001';
const response = await window.PortalGeapaApi.apiPost(
  '/v2/apresentacoes/titulo-eixo/revisar',
  { payload: JSON.stringify({ idApresentacao: 'APR-TESTE', requestId }) }
);
assert.equal(response.ok, true);
assert.equal(fetchCalls.length, 1, 'mutation deve fazer um unico POST');
const postedPayload = JSON.parse(fetchCalls[0].body.get('payload'));
assert.equal(postedPayload.requestId, requestId);
assert.deepEqual(
  Array.from(response.meta.devClientTransportTiming.marks, (mark) => mark.code),
  ['F1', 'F2', 'F3']
);

const actionSource = uiSource.slice(
  uiSource.indexOf('function executarPostApresentacao'),
  uiSource.indexOf('function obterMensagemPendenteApresentacao')
);
assert.equal((actionSource.match(/api\.apiPost\(/g) || []).length, 1);
assert.equal((actionSource.match(/carregarTela\(/g) || []).length, 1);
assert.match(actionSource, /\.finally\(function finalizar/);
assert.match(actionSource, /ui\.ocultarLoading\(\)/);
assert.doesNotMatch(actionSource, /setTimeout|retry|backoff|poll/i);
for (const mark of ['F0', 'F4', 'F5', 'F6', 'F7', 'F8']) {
  assert.match(actionSource, new RegExp(`'${mark}'`));
}

for (const mark of ['B0', 'B1', 'B2', 'B9', 'B10', 'B11']) {
  assert.match(
    [configSource, webappSource, adapterSource].join('\n'),
    new RegExp(`'${mark}'`)
  );
}
for (const mark of ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']) {
  assert.match(
    [configSource, webappSource, adapterSource].join('\n'),
    new RegExp(`'${mark}'`)
  );
}
assert.match(configSource, /GEAPA_PRESENTATIONS_DEV_LATENCY_V1/);
assert.match(configSource, /console\.log\(JSON\.stringify\(entry\)\)/);
assert.doesNotMatch(
  configSource.slice(
    configSource.indexOf('function portalLatencyDevSafeMetadata_'),
    configSource.indexOf('function portalIniciarTrace_')
  ),
  /email|rga|titulo|eixo|justificativa|payload/i
);
assert.match(adapterSource, /cache: sessionCacheResult/);
assert.match(adapterSource, /durationMs: portalAgoraViewsV2Ms_\(\) - sessaoCacheInicio/);
assert.match(configSource, /ambiente !== 'DEV'/);
assert.match(apiSource, /API_WRITE_TIMEOUT_MS \|\| 30000/);
assert.doesNotMatch(actionSource, /API_WRITE_TIMEOUT_MS/);

console.log('check-presentation-decision-latency.mjs: OK');
