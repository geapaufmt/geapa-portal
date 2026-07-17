import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const required = (condition, message) => { if (!condition) throw new Error(message); };

const index = read('web/index.html');
const api = read('web/assets/js/api.js');
const navigation = read('web/assets/js/navigation.js');
const member = read('web/assets/js/vinculo-solicitacoes.js');
const admin = read('web/assets/js/admin-solicitacoes-vinculo.js');
const backend = read('apps-script/09_vinculo_solicitacoes.gs');
const router = read('apps-script/03_webapp.gs');
const serviceWorker = read('web/service-worker.js');
const manifest = JSON.parse(read('apps-script/appsscript.json'));

['meu-vinculo-solicitacoes','vinculo-solicitacao-modal','admin-solicitacoes-vinculo-content','admin-vinculo-modal'].forEach((id) => required(index.includes(`id="${id}"`), `HTML ausente: ${id}`));
['meuVinculoSolicitarSuspensao','meuVinculoSolicitarDesligamento','meuVinculoCancelarSolicitacao','adminSolicitacaoVinculoHomologarEfetivarDesligamento'].forEach((action) => {
  required(api.includes(action), `API sem acao ${action}`);
  required(router.includes(action), `router sem acao ${action}`);
});
required(navigation.includes("rota('admin-solicitacoes-vinculo'"), 'rota administrativa ausente');
required(navigation.includes("['membros:analisar_solicitacoes_vinculo']"), 'permissao visual ausente');
required(backend.includes('portalResolverAmbienteDadosV2_()'), 'ambiente nao resolvido no backend');
required(!/\b(idPessoa|idVinculo|rga|email)\s*:/.test(member), 'frontend do membro envia identidade alvo');
required(member.includes('parametroSuspensao') && member.includes('minimum.valor'), 'frontend nao usa parametro normativo retornado pelo backend');
required(member.includes('Date.UTC') && !member.includes('new Date(start)'), 'calculo civil inseguro');
required(admin.includes('ataReferencia') && admin.includes('confirmacaoReforcada'), 'decisao final sem controles de ata/confirmacao');
required(serviceWorker.includes('portal-geapa-pwa-v113'), 'cache do service worker nao incrementado');
required(serviceWorker.includes('/assets/js/vinculo-solicitacoes.js') && serviceWorker.includes('/assets/js/admin-solicitacoes-vinculo.js'), 'scripts fora do cache PWA');

const library = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_MEMBROS');
required(library && library.developmentMode === false, 'GEAPA_MEMBROS ausente ou em developmentMode');

function config(file) {
  const sandbox = { window: {} }; vm.createContext(sandbox); vm.runInContext(read(file), sandbox); return sandbox.window.PortalGeapaConfig;
}
required(config('web/assets/js/config.homolog.js').ENABLE_VINCULO_REQUESTS === true, 'feature HOMOLOG deve estar habilitada');
required(config('web/assets/js/config.prod.js').ENABLE_VINCULO_REQUESTS === false, 'feature PROD deve permanecer desligada');

const operational = [member, admin, backend].join('\n');
['GEAPA_DESLIGAMENTOS','OFFBOARD_RESPONSES','OFFBOARD_QUEUE_SUSPENSIONS','OFFBOARD_QUEUE_DISMISSALS','PEDIDOS_SUSPENSAO','PEDIDOS_DESLIGAMENTO'].forEach((legacy) => required(!operational.includes(legacy), `dependencia legada: ${legacy}`));
required(!/(^|[^0-9])(30|14)([^0-9]|$)/m.test(operational), 'valor normativo variavel hardcoded');

console.log('Solicitacoes de vinculo V2: contratos, UI, ambiente, PWA e seguranca validados.');
