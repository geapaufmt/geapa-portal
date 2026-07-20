import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'web/assets/js/admin-solicitacoes-vinculo.js'), 'utf8');
const document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } };
const sandbox = { window: { __PORTAL_VINCULO_TEST__: true }, document, console, FormData: class FormData {}, Object, Array, String };
vm.createContext(sandbox); vm.runInContext(source, sandbox);
const hooks = sandbox.window.__PortalAdminVinculoTestHooks;
const required = (condition, message) => { if (!condition) throw new Error(message); };
['CANCELADO_PELO_MEMBRO','CANCELADO_PELA_DIRETORIA','INDEFERIDO','EXECUTADO','CONCLUIDO'].forEach((status) => required(hooks.isTerminal({ status }), `${status} deve ser terminal.`));
required(!hooks.isTerminal({ status: 'RECEBIDO' }), 'RECEBIDO deve permanecer aberto.');
required(source.includes("scope: 'PENDENTES'"), 'A listagem deve iniciar em Pendentes.');
required(source.includes('somente para consulta'), 'O detalhe terminal deve explicar o modo somente leitura.');
required(source.includes('data-admin-vinculo-resend'), 'O reenvio deve ser uma ação separada.');
required(source.includes('CANCELADO_POR') && source.includes('MOTIVO_CANCELAMENTO') && source.includes('HISTORICO_STATUS_JSON'), 'Campos históricos obrigatórios ausentes.');
console.log('Estados terminais e detalhe somente leitura validados.');
