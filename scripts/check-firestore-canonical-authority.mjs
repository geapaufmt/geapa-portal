import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('web/assets/js/firestore-activities.js', 'utf8')
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/m, '');
const sandbox = {
  window: {},
  console: { info() {} },
  Date,
  Intl,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Promise,
  Math,
  setTimeout,
  clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'firestore-activities.js' });

const activitiesUi = fs.readFileSync('web/assets/js/atividades.js', 'utf8');
assert.match(activitiesUi, /mesclarEnriquecimentoOperacional\(dados\.calendario, resposta\.data\)/);
assert.match(activitiesUi, /mesclarDetalheComResumoCanonico_\(id, resposta\.data\)/);
assert.match(activitiesUi, /Object\.assign\(\{\}, detalhe \|\| \{\}, resumo\)/);

const client = sandbox.window.PortalGeapaFirestoreActivities;
assert.equal(typeof client.mesclarEnriquecimentoOperacional, 'function');

const canonical = [{
  idAtividade: 'ATV-2026-2-0001',
  tituloPublico: 'Titulo Firestore',
  dataAtividade: '2026-08-30',
  statusOperacional: 'PLANEJADA',
  source: '',
  sourceSystem: 'geapa-atividades',
  sourceHash: 'hash-canonico',
  schemaVersion: 'activity-canonical-v1',
  contaPresenca: false
}];
const legacy = [{
  idAtividade: 'ATV-2026-2-0001',
  tituloPublico: 'Titulo Sheets divergente',
  dataAtividade: '1999-01-01',
  statusOperacional: 'CANCELADA',
  contaPresenca: true,
  podeJustificarFalta: true,
  emailPessoaPrincipal: 'nao-deve-entrar@example.invalid'
}];

const merged = client.mesclarEnriquecimentoOperacional(canonical, legacy);
assert.equal(merged.length, 1);
assert.equal(merged[0].tituloPublico, 'Titulo Firestore');
assert.equal(merged[0].dataAtividade, '2026-08-30');
assert.equal(merged[0].statusOperacional, 'PLANEJADA');
assert.equal(merged[0].sourceHash, 'hash-canonico');
assert.equal(merged[0].contaPresenca, true);
assert.equal(merged[0].podeJustificarFalta, true);
assert.equal(Object.prototype.hasOwnProperty.call(merged[0], 'emailPessoaPrincipal'), false);

console.log('check-firestore-canonical-authority: OK');
