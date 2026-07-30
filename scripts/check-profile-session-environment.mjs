import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync(new URL('../apps-script/08_profile_corrections.gs', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../web/assets/js/api.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../web/service-worker.js', import.meta.url), 'utf8');

assert.match(bridge, /ambientePortal:\s*ambiente/);
assert.match(bridge, /traceId:\s*String\(portalTraceIdAtual_/);
assert.match(bridge, /PORTAL_PROFILE_SESSION_ENV_V1/);
assert.match(bridge, /sessao\s*&&\s*sessao\.motivoBloqueio/);
assert.match(bridge, /Nao foi possivel validar o acesso nas bases do ambiente solicitado/);
assert.doesNotMatch(
  bridge,
  /resposta:\s*portalRespostaErro_\('SESSAO_CORE_INVALIDA',\s*'Nao foi possivel confirmar sua sessao oficial\.'/,
  'A causa real da falha nao pode ser convertida novamente em sessao expirada.'
);

assert.match(api, /sessionStorage\.getItem\('geapaPortal\.sessionToken'\)/);
assert.match(api, /corpo\.set\('token', token\)/);
assert.match(app, /\[PORTAL_PROFILE_UPDATE_ERROR\]/);
for (const safeField of ['errorCode', 'etapa', 'traceId', 'ambienteEfetivo', 'versaoBackend']) {
  assert.match(app, new RegExp(`${safeField}:`));
}
const diagnosticBlock = app.match(/function registrarDiagnosticoSeguroAtualizacaoPerfil[\s\S]*?\n}\n/);
assert.ok(diagnosticBlock, 'Diagnostico seguro do frontend nao encontrado.');
assert.doesNotMatch(diagnosticBlock[0], /token|email|payload|valorSolicitado|cpf|rga/i);

assert.match(index, /app\.js\?v=38/);
assert.match(worker, /portal-geapa-pwa-v123/);

console.log('Profile session environment checks passed.');
