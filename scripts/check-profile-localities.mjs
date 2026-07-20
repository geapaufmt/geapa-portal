import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = JSON.parse(read('web/assets/data/localidades-ibge-v1.json'));

if (catalog.metadata.fonte !== 'IBGE API de Localidades' || catalog.states.length !== 27 || catalog.municipalities.length !== 5571) {
  throw new Error('Snapshot oficial de localidades incompleto.');
}
const cuiaba = catalog.municipalities.find((item) => item.codigo === '5103403');
if (!cuiaba || cuiaba.uf !== 'MT' || cuiaba.nome !== 'Cuiabá') throw new Error('Código oficial de Cuiabá ausente.');

const sandbox = { window: {}, console, fetch: () => Promise.reject(new Error('rede proibida no teste')), Object, Array, String, Promise };
vm.createContext(sandbox);
vm.runInContext(read('web/assets/js/perfil-localidades.js'), sandbox);
const html = sandbox.window.PortalGeapaLocalidades.renderFields({ paisOrigemCodigo: 'BR', ufOrigem: 'MT', municipioOrigemCodigo: '5103403', cidadeOrigem: 'Cuiabá' });
['paisOrigemCodigo','ufOrigem','municipioOrigemCodigo','cidadeOrigemEstrangeira','regiaoOrigem'].forEach((field) => {
  if (!html.includes(`name="${field}"`)) throw new Error(`Campo ausente: ${field}`);
});

const app = read('web/app.js');
if (!app.includes('Período de ingresso no curso') || !app.includes('Semestre atual estimado') || !app.includes('statusCompletudeCadastral')) {
  throw new Error('Dados acadêmicos calculados não estão visíveis.');
}
if (/name="(?:semestreAtualCursoCalculado|periodoIngressoCurso)"/.test(app)) throw new Error('Campos acadêmicos calculados não podem ser editáveis.');
if (!app.includes("montarPerfilItemSensivel('Curso'")) throw new Error('Correção de curso deve usar fluxo sensível.');
console.log('Perfil, catálogo IBGE e campos acadêmicos somente leitura validados.');
