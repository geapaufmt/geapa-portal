import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const required = (value, message) => { if (!value) throw new Error(message); };
const config = (file) => { const sandbox = { window: {} }; vm.runInNewContext(read(file), sandbox); return sandbox.window.PortalGeapaConfig; };
const homolog = config('web/assets/js/config.homolog.js'); const prod = config('web/assets/js/config.prod.js');
const manifest = JSON.parse(read('apps-script/appsscript.json')); const sw = read('web/service-worker.js'); const index = read('web/index.html'); const api = read('web/assets/js/api.js'); const bridge = read('apps-script/09_vinculo_solicitacoes.gs');

required(homolog.ENABLE_EGRESS_FEEDBACK === true && homolog.ENABLE_MEMBER_REGISTRATION === true, 'HOMOLOG nao habilita as duas features.');
required(prod.ENABLE_EGRESS_FEEDBACK === false && prod.ENABLE_MEMBER_REGISTRATION === false, 'PROD deve manter as duas features desligadas.');
required(manifest.dependencies.libraries.every((library) => library.developmentMode === false), 'Library em developmentMode.');
required(/portal-geapa-pwa-v123/.test(sw), 'Cache PWA nao foi incrementado.');
['/assets/js/perfil-localidades.js','/assets/js/admin-cadastro-membros.js','/assets/js/avaliacao-egresso.js','/assets/data/localidades-ibge-v1.json'].forEach((asset) => required(sw.includes(asset), `Asset ausente do cache: ${asset}`));
required(index.includes('style.css?v=60') && index.includes('api.js?v=52') && index.includes('app.js?v=38'), 'Cache-busters finais nao foram atualizados.');
required(/function apiGet[\s\S]*obterBloqueioAcao_/.test(api), 'Leitura conhecida por URL nao passa pelo gate frontend.');
required(bridge.includes("ambienteDadosV2 === 'DEV'"), 'Backend nao deriva as flags do ambiente oficial.');
required(!/SPREADSHEET_ID\s*=\s*['\"][A-Za-z0-9_-]{20,}/.test(bridge), 'ID de planilha hardcoded na ponte.');
process.stdout.write('Integracao HOMOLOG validada: ambiente, gates, Libraries fixas e PWA coerentes.\n');
