import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const endpoint = String(process.env.GEAPA_DEV_API_BASE_URL || '').trim();
assert.ok(endpoint, 'GEAPA_DEV_API_BASE_URL obrigatoria.');
assert.match(
  endpoint,
  /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/,
  'GEAPA_DEV_API_BASE_URL deve ser uma URL /macros/s/<deployment-id>/exec.'
);

const prodSandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync('web/assets/js/config.prod.js', 'utf8'),
  prodSandbox,
  { filename: 'web/assets/js/config.prod.js' }
);
assert.notEqual(
  endpoint,
  String(prodSandbox.window.PortalGeapaConfig.GEAPA_API_BASE_URL || '').trim(),
  'APPS_SCRIPT_ENDPOINT_DEV_PROD_IGUAIS'
);

const response = await fetch(endpoint, {
  method: 'GET',
  redirect: 'follow',
  signal: AbortSignal.timeout(15000)
});
assert.equal(response.ok, true, `Apps Script DEV respondeu HTTP ${response.status}.`);

const payload = await response.json();
const environment = String(
  payload && payload.meta && (
    payload.meta.ambiente ||
    payload.meta.trace && payload.meta.trace.ambiente
  ) || ''
).trim().toUpperCase();

assert.equal(payload && payload.ok, true, 'Apps Script DEV nao retornou ok=true.');
assert.equal(payload && payload.code, 'PORTAL_API_OK');
assert.equal(environment, 'DEV', 'Apps Script informado nao confirma ambiente DEV.');

console.log('Apps Script DEV: GET seguro confirmou PORTAL_API_OK e ambiente DEV.');
