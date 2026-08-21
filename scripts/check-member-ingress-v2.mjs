import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const required = (condition, message) => { if (!condition) throw new Error(message); };

const backend = read('apps-script/02_minha_situacao.gs');
const app = read('web/app.js');
const auth = read('web/assets/js/auth.js');
const navigation = read('web/assets/js/navigation.js');
const model = read('web/assets/js/portal-model.js');
const registration = read('web/assets/js/admin-cadastro-membros.js');
const index = read('web/index.html');
const serviceWorker = read('web/service-worker.js');

[backend, app, auth, navigation, model, registration, serviceWorker].forEach((source) => new vm.Script(source));

required(backend.includes('resumoOperacional: portalNormalizarResumoOperacionalCore_(situacao.resumoOperacional)'), 'Backend do Portal descarta o resumo operacional do Core.');
required(backend.includes("'MEMBRO_INGRESSANTE'"), 'Backend do Portal nao reconhece o perfil ingressante.');
required(app.includes('Situação no GEAPA') && app.includes('Membro ingressante'), 'Minha situacao nao identifica o membro ingressante.');
required(app.includes('Ativo — em período de integração'), 'Minha situacao nao exibe o status de integracao.');
required(app.includes('Pendente de avaliação da Diretoria'), 'Minha situacao nao exibe a efetivacao pendente.');
required(app.includes('Você está em período de integração como membro ingressante.'), 'Mensagem explicativa institucional esta ausente.');
required(auth.includes("MEMBRO_INGRESSANTE: 'MEMBRO_INGRESSANTE'"), 'Camada visual de autenticacao nao aceita o perfil ingressante.');
required(navigation.includes('PERFIS.MEMBRO_INGRESSANTE, PERFIS.MEMBRO') && navigation.includes("['situacao:ver_propria']"), 'Rota Minha situacao nao permite o perfil ingressante com permissao basica.');
required((navigation.match(/PERFIS\.MEMBRO_INGRESSANTE/g) || []).length === 2, 'Perfil ingressante foi liberado em rotas adicionais sem contrato explicito.');
required(model.includes("MEMBRO_INGRESSANTE: 'MEMBRO_INGRESSANTE'"), 'Modelo visual nao declara o vinculo ingressante.');
required(registration.includes("origemCadastro: data.get('origemCadastro')"), 'Admissao nao envia a origem administrativa.');
required(registration.includes('value="PROCESSO_SELETIVO" selected') && !registration.includes('CONVITE_DIRETORIA'), 'Admissao permite forma diferente de processo seletivo.');
required(index.includes('portal-model.js?v=2') && index.includes('auth.js?v=3') && index.includes('navigation.js?v=36') && index.includes('admin-cadastro-membros.js?v=3') && index.includes('app.js?v=36'), 'Cache-busters dos arquivos alterados nao foram atualizados.');
required(serviceWorker.includes('portal-geapa-pwa-v121'), 'Cache do service worker nao foi incrementado.');

process.stdout.write('Contrato de membro ingressante no Portal aprovado: 14 verificacoes passaram.\n');
