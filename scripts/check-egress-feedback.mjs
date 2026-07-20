import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..'); const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const document = { addEventListener() {}, getElementById() { return null; } };
const sandbox = { window: { __PORTAL_EGRESS_TEST__: true, location: { hash: '#/avaliacao-egresso?token=token%20seguro' }, PortalGeapaConfig: { ENABLE_EGRESS_FEEDBACK: true } }, document, console, FormData: class FormData {}, Object, String };
vm.createContext(sandbox); vm.runInContext(read('web/assets/js/avaliacao-egresso.js'), sandbox);
const hooks = sandbox.window.__PortalEgressTestHooks; if (hooks.tokenFromHash() !== 'token seguro') throw new Error('Token nao foi lido da rota.');
['CONVITE_AVALIACAO_RESPONDIDO','CONVITE_AVALIACAO_EXPIRADO','CONVITE_AVALIACAO_INVALIDO','AVALIACAO_EGRESSO_INDISPONIVEL'].forEach((code) => { if (!hooks.errorMessage(code)) throw new Error(`Mensagem ausente: ${code}`); });
function config(file) { const box = { window: {} }; vm.createContext(box); vm.runInContext(read(file), box); return box.window.PortalGeapaConfig; }
if (config('web/assets/js/config.homolog.js').ENABLE_EGRESS_FEEDBACK !== true) throw new Error('HOMOLOG deve habilitar feedback.');
if (config('web/assets/js/config.prod.js').ENABLE_EGRESS_FEEDBACK !== false) throw new Error('PROD deve desabilitar feedback.');
if (/ID_PESSOA|RGA|EMAIL/.test(read('web/assets/js/avaliacao-egresso.js'))) throw new Error('Formulario publico nao deve enviar identidade.');
console.log('Avaliacao voluntaria de egresso validada em HOMOLOG e bloqueada em PROD.');
