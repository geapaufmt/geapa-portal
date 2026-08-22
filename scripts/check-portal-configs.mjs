import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(root, 'scripts', 'generate-portal-config.mjs');
const fakeDevEndpoint = 'https://script.google.com/macros/s/AKfycb-dev-validation-only/exec';

function loadConfig(environment) {
  const sandbox = { window: {} };
  const filename = path.join(root, 'web', 'assets', 'js', `config.${environment}.js`);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return sandbox.window.PortalGeapaConfig;
}

function runGenerator(environment, environmentOverrides = {}) {
  const childEnvironment = Object.assign({}, process.env, environmentOverrides);
  delete childEnvironment.FIREBASE_DEV_WEB_CONFIG_JSON;
  delete childEnvironment.FIREBASE_PROD_WEB_CONFIG_JSON;
  const result = spawnSync(process.execPath, [generator, environment, '--check'], {
    cwd: root,
    env: childEnvironment,
    encoding: 'utf8',
    shell: false
  });
  return result;
}

const dev = loadConfig('dev');
const homolog = loadConfig('homolog');
const prod = loadConfig('prod');

assert.equal(dev.GEAPA_API_BASE_URL, '', 'config.dev.js deve permanecer sem endpoint hardcodado.');
assert.notEqual(homolog.GEAPA_API_BASE_URL, prod.GEAPA_API_BASE_URL);

const missingDevEndpoint = runGenerator('dev', { GEAPA_DEV_API_BASE_URL: '' });
assert.notEqual(missingDevEndpoint.status, 0, 'DEV sem endpoint explicito deve falhar.');
assert.match(missingDevEndpoint.stderr, /GEAPA_DEV_API_BASE_URL obrigatoria/);

const sameAsProd = runGenerator('dev', {
  GEAPA_DEV_API_BASE_URL: prod.GEAPA_API_BASE_URL
});
assert.notEqual(sameAsProd.status, 0, 'DEV apontando para PROD deve falhar.');
assert.match(sameAsProd.stderr, /APPS_SCRIPT_ENDPOINT_DEV_PROD_IGUAIS/);

const validDev = runGenerator('dev', { GEAPA_DEV_API_BASE_URL: fakeDevEndpoint });
assert.equal(validDev.status, 0, validDev.stderr || validDev.stdout);

for (const environment of ['homolog', 'prod']) {
  const result = runGenerator(environment);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

console.log('Portal configs: endpoint Apps Script DEV explicito e isolado de PROD.');
