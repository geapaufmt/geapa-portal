import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = fs.readFileSync('apps-script/00_config.gs', 'utf8');
const activities = fs.readFileSync('apps-script/04_atividades.gs', 'utf8');
const views = fs.readFileSync('apps-script/07_views_v2_readonly.gs', 'utf8');
const frontend = fs.readdirSync('web/assets/js')
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(`web/assets/js/${name}`, 'utf8'))
  .join('\n');

assert.match(config, /ambienteDadosV2:\s*'PROD'/, 'o backend deve fixar o ambiente V2 publicado');
assert.match(config, /function portalResolverAmbienteDadosV2_\(\)/, 'o backend deve validar DEV ou PROD');
assert.match(activities, /ambienteBackend:\s*portalResolverAmbienteDadosV2_\(\)/, 'Atividades deve receber ambiente do backend');
assert.match(activities, /contexto\.contextoAtividades\.ambienteBackend/, 'cache de Atividades deve separar ambientes');
assert.match(
  views,
  /function portalMontarContextoAtividadesReadonlyV2_[\s\S]*ambienteBackend:\s*portalResolverAmbienteDadosV2_\(\)/,
  'Minhas Apresentacoes deve propagar o ambiente efetivo explicitamente'
);
assert.match(views, /domainLogicalSheet:\s*'PORTAL_/, 'views devem declarar aba logica, nao key especifica');
assert.match(views, /coreReadDomainRecords/, 'fallback de views deve usar o resolvedor de dominio do Core');
assert.doesNotMatch(views, /ATIVIDADES_V2_PORTAL_/, 'views nao devem depender operacionalmente de keys especificas');
assert.doesNotMatch(frontend, /ambienteDadosV2\s*[:=]|PESSOAS_V2_DB|VIGENCIAS_V2_DB|ATIVIDADES_V2_DB/, 'frontend nao pode escolher ambiente ou base V2');

console.log(JSON.stringify({ ok: true, checks: 9 }));
