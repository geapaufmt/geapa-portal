import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authCode = fs.readFileSync(path.join(root, 'apps-script', '01_auth_codigo.gs'), 'utf8');
const authFirebase = fs.readFileSync(path.join(root, 'apps-script', '05_auth_firebase.gs'), 'utf8');
const views = fs.readFileSync(path.join(root, 'apps-script', '07_views_v2_readonly.gs'), 'utf8');

assert.match(authCode, /function portalSalvarSessaoCorePorToken_\(token, sessaoCore\)/);
assert.match(authCode, /function portalLerSessaoCorePorToken_\(token\)/);
assert.match(authCode, /portalCacheKey_\('sessaoCoreTokenV1', tokenNormalizado\)/);
assert.match(authCode, /Math\.min\(validadeSessaoSegundos, validadeCacheSegundos\)/);
assert.match(authCode, /portalCriarSessaoTemporaria_\(identificadorSessao, sessaoResolvida\)/);
assert.match(authFirebase, /portalCriarSessaoTemporaria_\(autorizacao\.email, autorizacao\.sessao\)/);

const readIndex = views.indexOf('portalLerSessaoCorePorToken_(tokenNormalizado)');
const resolveIndex = views.indexOf('portalResolverSessaoAtualViaGeapaCore_(identificadorSessao', readIndex);
assert.ok(readIndex >= 0, 'Views devem tentar o cache vinculado ao token.');
assert.ok(resolveIndex > readIndex, 'O resolvedor Core deve ser apenas fallback apos miss do cache.');
assert.match(views, /sessaoCore\.tokenCache/);

const helperStart = authCode.indexOf('function portalSalvarSessaoCorePorToken_');
const helperEnd = authCode.indexOf('function portalMascararEmail_', helperStart);
const helperBlock = authCode.slice(helperStart, helperEnd);
assert.doesNotMatch(helperBlock, /SpreadsheetApp|UrlFetchApp|appendRow|setValue|setValues/);

console.log('Cache curto de sessao Core por token: contrato seguro validado.');
