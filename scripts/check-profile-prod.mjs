import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const configBackend = read('apps-script/00_config.gs');
const bridge = read('apps-script/08_profile_corrections.gs');
const manifest = JSON.parse(read('apps-script/appsscript.json'));
const configProd = read('web/assets/js/config.prod.js');
const configHomolog = read('web/assets/js/config.homolog.js');
const app = read('web/app.js');
const api = read('web/assets/js/api.js');

assert.match(configBackend, /ambientePerfilCadastral:\s*'PROD'/, 'a versao Apps Script PROD deve fixar o ambiente no backend');
assert.match(bridge, /ambientePortal:\s*ambiente/, 'o contexto do Core deve usar somente o ambiente resolvido no backend');
assert.doesNotMatch(bridge, /ambientePortal:\s*['"]|origem\.ambiente|payload\.ambiente/, 'o navegador nao pode escolher o ambiente cadastral');
assert.match(configProd, /ENVIRONMENT:\s*'PROD'/, 'config.prod deve identificar PROD');
assert.match(configProd, /DATA_ENVIRONMENT:\s*'PROD'/, 'config.prod nao pode manter rotulo ou dependencia DEV');
assert.match(configProd, /ENABLE_PROFILE_UPDATES:\s*true/, 'perfil editavel deve estar habilitado somente apos a homologacao do Core v18');
assert.match(configHomolog, /ENVIRONMENT:\s*'HOMOLOG'/, 'config HOMOLOG deve permanecer separada');
assert.match(app, /\['HOMOLOG', 'PROD'\]/, 'a UI deve aceitar somente os ambientes publicados e habilitados');
assert.match(api, /ACOES_PERFIL_PORTAL/, 'as mutacoes cadastrais devem usar a allowlist dedicada');

const core = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_CORE');
const atividades = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_ATIVIDADES');
const membros = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_MEMBROS');
assert.equal(core.developmentMode, false, 'PROD nao pode consumir Core em HEAD');
assert.equal(atividades.developmentMode, false, 'PROD nao pode consumir Atividades em HEAD');
assert.equal(membros.developmentMode, false, 'PROD nao pode consumir Membros em HEAD');
assert.equal(core.version, '27', 'o candidato deve usar o Core corrigido e versionado');
assert.equal(atividades.version, '20', 'o candidato deve usar Atividades corrigido e versionado');
assert.equal(membros.version, '12', 'o candidato deve usar Membros corrigido e versionado');

console.log('OK: candidato usa Core v27, Atividades v20 e Membros v12 com perfil cadastral controlado.');
