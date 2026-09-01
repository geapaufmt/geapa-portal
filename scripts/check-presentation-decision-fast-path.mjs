import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(
  path.join(root, 'apps-script/07_views_v2_readonly.gs'),
  'utf8'
);

const calls = {
  tokenLookup: 0,
  temporaryValidation: 0,
  coreCache: 0,
  coreResolver: 0,
  legacyMember: 0,
  renew: 0
};
let environment = 'DEV';
let sessionCacheHit = true;
const session = {
  ok: true,
  autenticado: true,
  portalAtivo: true,
  idPessoa: 'PES-TESTE',
  perfilPortalEfetivo: 'DIRETORIA',
  perfisPortal: ['DIRETORIA'],
  permissoes: ['apresentacoes:gerir']
};

const context = {
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  Math,
  JSON,
  RegExp,
  Error,
  console,
  portalResolverAmbienteDadosV2_: () => environment,
  portalRespostaErro_: (code) => ({ ok: false, code }),
  portalGetIdentificadorSessao_: () => {
    calls.tokenLookup += 1;
    return 'IDENTIFICADOR-TESTE';
  },
  portalSessaoTemporariaValida_: () => {
    calls.temporaryValidation += 1;
    return true;
  },
  portalLerSessaoCorePorToken_: () => {
    calls.coreCache += 1;
    return sessionCacheHit ? session : null;
  },
  portalResolverSessaoAtualViaGeapaCore_: () => {
    calls.coreResolver += 1;
    return session;
  },
  portalMontarMembroDeSessaoPortal_: () => ({ idPessoa: 'PES-TESTE' }),
  portalBuscarMembroPorIdentificadorSessao_: () => {
    calls.legacyMember += 1;
    return {};
  },
  portalMontarUsuarioDeSessao_: () => ({
    idPessoa: 'PES-TESTE',
    perfilPrincipal: 'DIRETORIA',
    perfisPortal: ['DIRETORIA'],
    permissoes: { 'apresentacoes:gerir': true }
  }),
  portalMontarUsuarioBasico_: () => ({ perfilPrincipal: 'MEMBRO' }),
  portalContextoViewsV2TemPermissao_: () => true,
  portalPermissoesListaDeMapaViewsV2_: (value) => Object.keys(value || {}),
  portalLatencyDevLog_: () => {},
  portalTraceEtapa_: () => {},
  portalAgoraViewsV2Ms_: () => Date.now(),
  portalSalvarSessaoCorePorToken_: () => {
    calls.renew += 1;
  }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: '07_views_v2_readonly.gs' });

const config = {
  id: 'apresentacaoRevisarTituloEixo',
  requerDiretoria: true,
  permissoes: ['apresentacoes:gerir'],
  fastPathDecisaoCanonicaDev: true,
  renovarSessaoDecisoesDev: true
};
const result = context.portalMontarContextoViewsV2_('TOKEN-DEV', config);
assert.equal(result.ok, true);
assert.equal(calls.tokenLookup, 1, 'fast path deve ler a chave temporaria uma vez');
assert.equal(calls.temporaryValidation, 0, 'fast path nao deve repetir a mesma leitura');
assert.equal(calls.coreCache, 1, 'snapshot Core continua obrigatorio');
assert.equal(calls.coreResolver, 0, 'cache hit nao deve revalidar no Core');
assert.equal(calls.legacyMember, 0, 'decisao autorizada nao consulta membro legado');
assert.equal(result.contexto.ambienteBackend, 'DEV');
assert.deepEqual(Array.from(result.contexto.permissoes), ['apresentacoes:gerir']);

sessionCacheHit = false;
const missResult = context.portalMontarContextoViewsV2_('TOKEN-DEV', config);
assert.equal(missResult.ok, true);
assert.equal(calls.coreResolver, 1, 'cache miss preserva revalidacao autoritativa');
assert.equal(calls.legacyMember, 0, 'cache miss autorizado continua sem Sheets legado');
sessionCacheHit = true;

session.permissoes = ['outra:permissao'];
const denied = context.portalMontarContextoViewsV2_('TOKEN-DEV', config);
assert.equal(denied.ok, false, 'fast path preserva o bloqueio de permissao');
assert.equal(denied.resposta.code, 'PERMISSAO_INSUFICIENTE');
session.permissoes = ['apresentacoes:gerir'];

assert.equal(
  context.portalRenovarSessaoDecisoesDev_('TOKEN-DEV', result, config),
  true
);
assert.equal(calls.renew, 1);

environment = 'PROD';
assert.equal(context.portalFastPathDecisaoCanonicaDev_(config), false);
const prodResult = context.portalMontarContextoViewsV2_('TOKEN-PROD', config);
assert.equal(prodResult.ok, true);
assert.equal(calls.temporaryValidation, 1, 'PROD preserva validacao anterior');
assert.equal(
  context.portalRenovarSessaoDecisoesDev_('TOKEN-PROD', result, config),
  false
);
assert.equal(calls.renew, 1, 'PROD nao deve renovar pelo mecanismo DEV');

assert.match(source, /presentationDecisionTraceSeed = portalLatencyDevSnapshot_\(\)/);
assert.match(source, /correlationId: portalTraceIdAtual_\(\)/);
assert.match(source, /portalTraceMark_\('B2'/);
assert.match(source, /portalLatencyDevLog_\('P6'/);
assert.match(source, /fastPathDecisaoCanonicaDev: true/);
assert.match(source, /renovarSessaoDecisoesDev: true/);

const actionStart = source.indexOf(
  'function portalExecutarAcaoApresentacaoAtividadesV2_'
);
const actionEnd = source.indexOf(
  'function portalNormalizarPayloadApresentacaoV2_',
  actionStart
);
const actionSource = source.slice(actionStart, actionEnd);
assert.ok(
  actionSource.indexOf('portalChamarAtividadesPacoteApresentacoesV2_') <
    actionSource.indexOf('portalRenovarSessaoDecisoesDev_'),
  'renovacao deve ocorrer depois da chamada a Atividades'
);

console.log('check-presentation-decision-fast-path.mjs: OK');
