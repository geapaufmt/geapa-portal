import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync('web/assets/js/admin-correcoes-cadastrais.js', 'utf8');
const api = fs.readFileSync('web/assets/js/api.js', 'utf8');
const bridge = fs.readFileSync('apps-script/08_profile_corrections.gs', 'utf8');
const router = fs.readFileSync('apps-script/03_webapp.gs', 'utf8');
const index = fs.readFileSync('web/index.html', 'utf8');
const worker = fs.readFileSync('web/service-worker.js', 'utf8');

assert.match(admin, /data-admin-correction-approve-apply/);
assert.match(admin, /Aprovar e aplicar alteração/);
assert.match(admin, /Aplicando alteração\.\.\./);
assert.match(admin, /state\.writing/);
assert.match(admin, /if \(state\.writing \|\| !state\.selected\) return/);
assert.match(admin, /\/admin\/correcoes-cadastrais\/aprovar-aplicar/);
assert.match(admin, /confirmacao: true/);
assert.match(admin, /renderApplySuccess/);
assert.doesNotMatch(admin, /data-admin-correction-apply/);
assert.doesNotMatch(admin, /<option value="APROVADA">Aprovar<\/option>/);

assert.match(api, /adminCorrecoesCadastraisAprovarAplicar/);
assert.match(api, /'\/admin\/correcoes-cadastrais\/aprovar-aplicar': 'adminCorrecoesCadastraisAprovarAplicar'/);
assert.match(router, /acao === 'adminCorrecoesCadastraisAprovarAplicar'/);
assert.match(bridge, /function portalAdminCorrecoesCadastraisAprovarAplicar/);
assert.match(bridge, /geapaCoreAprovarEAplicarSolicitacaoCadastralPortal/);
assert.match(bridge, /dados\.payload\.confirmacao = true/);
assert.match(bridge, /if \(chave !== '_cacheInvalidation'\) acumulado\[chave\] = dadosCore\[chave\]/);
assert.match(bridge, /portalPerfilCorrecoesInvalidarCachesAlvo_/);

assert.doesNotMatch(admin, /idPessoa\s*:/i);
assert.doesNotMatch(admin, /analisadoPor\s*:/i);
assert.match(index, /admin-correcoes-cadastrais\.js\?v=6/);
assert.match(index, /api\.js\?v=50/);
assert.match(index, /style\.css\?v=58/);
assert.match(worker, /portal-geapa-pwa-v120/);

console.log(JSON.stringify({ ok: true, checks: 24 }));
