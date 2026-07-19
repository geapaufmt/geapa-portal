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
required(serviceWorker.includes('portal-geapa-pwa-v118'), 'cache do service worker nao incrementado');
required(serviceWorker.includes('/assets/js/vinculo-solicitacoes.js') && serviceWorker.includes('/assets/js/admin-solicitacoes-vinculo.js'), 'scripts fora do cache PWA');
required(member.includes('var form = event.target;'), 'submit do vinculo deve usar o formulario originador do evento');
required(!member.includes('var form = event.currentTarget;'), 'submit delegado nao pode tratar document como formulario');
required(member.includes('enviar(event).catch(function(error)'), 'falha inesperada do submit nao pode ficar silenciosa');
required(admin.includes('var form = event.target;'), 'submit administrativo deve usar o formulario originador do evento');
required(!admin.includes('var form = event.currentTarget;'), 'submit administrativo delegado nao pode tratar document como formulario');
required(admin.includes('submitAction(event).catch(function(error)'), 'falha inesperada da acao administrativa nao pode ficar silenciosa');
required(admin.includes('Deferir / aprovar suspens') && admin.includes('Deferir, homologar e efetivar desligamento'), 'rotulos de deferimento administrativo ausentes');
required(admin.includes("status === 'RECEBIDO' && request.MODALIDADE_SOLICITADA === 'DESLIGAMENTO_APOS_HOMOLOGACAO'"), 'desligamento imediato nao oferece decisao direta desde RECEBIDO');
required(admin.includes("status === 'RECEBIDO' || status === 'EM_ANALISE'") && admin.includes("['analise-preliminar','Registrar análise preliminar']"), 'analise preliminar direta de fim de semestre ausente');
required(admin.includes('requisitosDecisaoFinal') && admin.includes('effectiveMinutesRequirement') && admin.includes('input.required = requirement === true'), 'exigencia de ata nao depende do contrato protegido');
required(admin.includes('confirmacaoFuncaoRegularizada') && admin.includes('validateManualReview'), 'conferencia manual de funcao ausente');
required(admin.includes('VALIDACAO_VINCULO_ATIVO') && admin.includes('VALIDACAO_OBRIGACOES') && admin.includes('RESULTADO_VALIDACAO'), 'validacoes individuais nao renderizadas');
required(index.includes('admin-solicitacoes-vinculo.js?v=4'), 'cache-buster do painel administrativo nao incrementado');

const coreLibrary = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_CORE');
required(coreLibrary && String(coreLibrary.version) === '20' && coreLibrary.developmentMode === false, 'GEAPA_CORE deve usar versao imutavel 20');
const library = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_MEMBROS');
required(library && String(library.version) === '7' && library.developmentMode === false, 'GEAPA_MEMBROS deve usar versao imutavel 7');

function config(file) {
  const sandbox = { window: {} }; vm.createContext(sandbox); vm.runInContext(read(file), sandbox); return sandbox.window.PortalGeapaConfig;
}
required(config('web/assets/js/config.homolog.js').ENABLE_VINCULO_REQUESTS === true, 'feature HOMOLOG deve estar habilitada');
required(config('web/assets/js/config.prod.js').ENABLE_VINCULO_REQUESTS === true, 'feature PROD deve estar habilitada apos promocao formal');

const operational = [member, admin, backend].join('\n');
['GEAPA_DESLIGAMENTOS','OFFBOARD_RESPONSES','OFFBOARD_QUEUE_SUSPENSIONS','OFFBOARD_QUEUE_DISMISSALS','PEDIDOS_SUSPENSAO','PEDIDOS_DESLIGAMENTO'].forEach((legacy) => required(!operational.includes(legacy), `dependencia legada: ${legacy}`));
required(!/(^|[^0-9])(30|14)([^0-9]|$)/m.test(operational), 'valor normativo variavel hardcoded');

console.log('Solicitacoes de vinculo V2: contratos, UI, ambiente, PWA e seguranca validados.');
