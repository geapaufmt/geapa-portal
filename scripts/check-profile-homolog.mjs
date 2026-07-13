import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const navigation = read('web/assets/js/navigation.js');
const portalV2 = read('web/assets/js/portal-v2-readonly.js');
const app = read('web/app.js');
const api = read('web/assets/js/api.js');
const webapp = read('apps-script/03_webapp.gs');
const bridge = read('apps-script/08_profile_corrections.gs');
const adminCorrections = read('web/assets/js/admin-correcoes-cadastrais.js');
const manifest = JSON.parse(read('apps-script/appsscript.json'));
const homolog = read('web/assets/js/config.homolog.js');

assert.doesNotMatch(navigation, /rota\('justificativas'/, 'a tela independente nao pode permanecer no menu');
assert.match(navigation, /'app\/justificativas': 'frequencia'/, 'a rota antiga deve redirecionar para frequencia');
assert.match(navigation, /rota\('admin-justificativas'/, 'a gestao de justificativas deve permanecer');
assert.match(portalV2, /justificativa-enviar/, 'Minha frequencia deve preservar o envio de justificativa');
assert.match(portalV2, /montarPendenciasJustificativas/, 'a fila administrativa de justificativas deve permanecer');

[
  'meuPerfilAtualizar', 'meuPerfilSolicitarCorrecao', 'meuPerfilListarSolicitacoes',
  'adminCorrecoesCadastraisListar', 'adminCorrecoesCadastraisAnalisar', 'adminCorrecoesCadastraisAplicar'
].forEach((action) => {
  assert.match(webapp, new RegExp("acao === '" + action + "'"), `roteamento ausente: ${action}`);
  assert.match(api, new RegExp(action), `mapeamento de API ausente: ${action}`);
});

assert.match(bridge, /ambientePortal: 'HOMOLOG'/, 'o contexto do Core deve ser fixado no backend');
assert.doesNotMatch(app, /payload\s*=\s*\{[^}]*idPessoa/s, 'o frontend nao pode escolher ID_PESSOA');
assert.match(app, /data-profile-edit-form/, 'Meu perfil deve oferecer modo de edicao');
assert.match(app, /data-profile-correction-form/, 'Meu perfil deve oferecer solicitacao sensivel');
assert.match(adminCorrections, /name="pessoa"/, 'a gestao deve oferecer filtro por pessoa');
assert.match(adminCorrections, /p\.rgaMascarado/, 'a gestao deve usar RGA mascarado do Core');
assert.match(adminCorrections, /p\.emailMascarado/, 'a gestao deve usar email mascarado do Core');
assert.match(homolog, /ENABLE_PROFILE_UPDATES:\s*true/, 'a feature deve estar ativa somente na configuracao HOMOLOG');
assert.match(homolog, /AKfycbxyUPuu4tb9mkAys5jwDiBxtgE-g4YYOdaid0qNMrVw5i2oWh_Uyv2BHFAQGJPYdnA2/, 'o preview deve usar o Apps Script HOMOLOG');

const core = manifest.dependencies.libraries.find((item) => item.userSymbol === 'GEAPA_CORE');
assert.equal(core.developmentMode, true, 'GEAPA_CORE deve estar em HEAD na homologacao');
assert.equal(core.version, '0', 'library em desenvolvimento deve usar versao 0');

console.log('OK: perfil editavel, correcoes, redirecionamento e ambiente HOMOLOG validados.');
