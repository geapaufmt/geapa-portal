import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = read('web/assets/js/api.js');
const view = read('web/assets/js/portal-v2-readonly.js');
const config = read('apps-script/00_config.gs');
const webapp = read('apps-script/03_webapp.gs');
const adapter = read('apps-script/07_views_v2_readonly.gs');

assert.match(api, /API_READ_TIMEOUT_MS\s*\|\|\s*35000/);
assert.match(api, /apresentacoesPendenciasDiretoria'\s*\?\s*'G13'/);
assert.match(api, /apresentacoesPendenciasDiretoria'\s*\?\s*'G14'/);
assert.match(view, /'G0',\s*'FRONTEND_INICIOU_CHAMADA'/);
assert.match(view, /'G15',\s*'RENDER_CONCLUIDO'/);
assert.match(view, /__PortalGeapaDevPresentationManagementTimings/);
assert.match(view, /data-geapa-presentation-management-timing/);
assert.match(config, /portalTraceMark_\('G1',\s*'PORTAL_RECEBEU_REQUEST'/);
assert.match(config, /\^G\(\?:\[4-9\]\|10\|11\)\$/);
assert.match(webapp, /portalTraceMark_\('G12',\s*'RESPOSTA_PORTAL_PRONTA'/);
assert.match(adapter, /portalTraceMark_\('G2',\s*'SESSAO_E_PERMISSAO_CONCLUIDAS'/);
assert.match(adapter, /portalTraceMark_\('G3',\s*'BUILDER_GESTAO_INICIADO'/);
assert.match(adapter, /portalTraceImportManagementMarks_/);
assert.doesNotMatch(view, /presentationPrivate/);
assert.doesNotMatch(adapter, /coreFirestoreEnvironment(?:Set|Commit|Delete)|setValue|setValues|appendRow/);

console.log('OK: telemetria G0-G15 da Gestao de Apresentacoes e somente leitura validada.');
