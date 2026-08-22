import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync('web/assets/js/admin-membros.js', 'utf8');
const index = fs.readFileSync('web/index.html', 'utf8');
const worker = fs.readFileSync('web/service-worker.js', 'utf8');

assert.match(admin, /data-admin-members-refresh/, 'A pagina administrativa deve oferecer atualizacao explicita.');
assert.match(admin, /if \(refreshButton\) return loadMembers\(\)/, 'O botao Atualizar deve recarregar a consulta atual.');
assert.match(admin, /Nome, ID, RGA, e-mail, vinculo ou perfil/, 'A busca deve explicar os novos campos pesquisaveis.');
assert.match(admin, /Categoria do membro/, 'O filtro deve distinguir as categorias de membro.');
assert.match(admin, /detail\('ID da pessoa', item\.idPessoa\)/, 'O detalhe administrativo deve exibir o ID tecnico.');
assert.match(index, /admin-membros\.js\?v=3/, 'O HTML deve invalidar a versao anterior do modulo administrativo.');
assert.match(worker, /portal-geapa-pwa-v122/, 'O service worker deve invalidar o cache anterior.');

console.log('OK: busca, filtros, detalhe e atualizacao da administracao de membros validados.');
