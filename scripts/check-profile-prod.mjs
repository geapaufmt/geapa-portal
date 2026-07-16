import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const configBackend = read('apps-script/00_config.gs');
const bridge = read('apps-script/08_profile_corrections.gs');
const manifest = JSON.parse(read('apps-script/appsscript.json'));
const configProd = read('web/assets/js/config.prod.js');
const configGenerated = read('web/assets/js/config.js');
const configHomolog = read('web/assets/js/config.homolog.js');
const app = read('web/app.js');
const api = read('web/assets/js/api.js');

assert.match(configBackend, /ambientePerfilCadastral:\s*'PROD'/, 'a versao Apps Script PROD deve fixar o ambiente no backend');
assert.match(bridge, /ambientePortal:\s*ambiente/, 'o contexto do Core deve usar somente o ambiente resolvido no backend');
assert.doesNotMatch(bridge, /ambientePortal:\s*['"]|origem\.ambiente|payload\.ambiente/, 'o navegador nao pode escolher o ambiente cadastral');
assert.match(configProd, /ENVIRONMENT:\s*'PROD'/, 'config.prod deve identificar PROD');
assert.match(configProd, /DATA_ENVIRONMENT:\s*'PROD'/, 'config.prod nao pode manter rotulo ou dependencia DEV');
assert.match(configProd, /ENABLE_PROFILE_UPDATES:\s*false/, 'perfil editavel deve permanecer protegido ate o Registry PROD estar pronto');
assert.match(configGenerated, /"DATA_ENVIRONMENT":\s*"PROD"/, 'config.js publicado deve apontar para dados PROD');
assert.match(configGenerated, /"ENABLE_PROFILE_UPDATES":\s*false/, 'config.js publicado deve manter perfil protegido na primeira publicacao');
assert.match(configHomolog, /ENVIRONMENT:\s*'HOMOLOG'/, 'config HOMOLOG deve permanecer separada');
assert.match(app, /\['HOMOLOG', 'PROD'\]/, 'a UI deve aceitar somente os ambientes publicados e habilitados');
assert.match(api, /ACOES_PERFIL_PORTAL/, 'as mutacoes cadastrais devem usar a allowlist dedicada');

const core = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_CORE');
assert.equal(core.developmentMode, false, 'PROD nao pode consumir Core em HEAD');
assert.equal(core.version, '17', 'o candidato deve usar a nova versao fixa do Core publicada a partir da main');

console.log('OK: candidato usa Core v17 e mantem perfil protegido em PROD por feature flag.');
