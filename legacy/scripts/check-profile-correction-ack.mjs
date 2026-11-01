import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appSource = fs.readFileSync('web/app.js', 'utf8');
const adminSource = fs.readFileSync('web/assets/js/admin-correcoes-cadastrais.js', 'utf8');
const apiSource = fs.readFileSync('web/assets/js/api.js', 'utf8');
const bridgeSource = fs.readFileSync('apps-script/08_profile_corrections.gs', 'utf8');
const webappSource = fs.readFileSync('apps-script/03_webapp.gs', 'utf8');

function extractFunction(source, name) {
  const functionStart = source.indexOf(`function ${name}(`);
  assert.notEqual(functionStart, -1, `funcao ausente: ${name}`);
  const start = source.slice(Math.max(0, functionStart - 6), functionStart) === 'async ' ? functionStart - 6 : functionStart;
  let depth = 0;
  let started = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') { depth += 1; started = true; }
    if (source[index] === '}') {
      depth -= 1;
      if (started && depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`fim da funcao nao encontrado: ${name}`);
}

const calls = { query: 0, reset: 0, toast: 0, persistent: 0, list: [] };
const modal = { hidden: false };
const form = { reset() { calls.reset += 1; } };
const feedback = {};
const context = {
  console: { error() {} },
  meuPerfilCorrecaoPendente: { payload: { campo: 'RGA' } },
  document: {
    body: { classList: { remove() {} } },
    getElementById(id) { return id === 'profile-persistent-feedback' ? feedback : null; }
  },
  window: {
    setTimeout(resolve) { resolve(); },
    PortalGeapaApi: {
      async apiGet(route, params) {
        calls.query += 1;
        assert.equal(route, '/meu-perfil/correcoes/consultar');
        assert.equal(params.chaveIdempotencia, 'correcao-segura-1');
        return { ok: true, data: { encontrada: true, solicitacao: { id: 'SAC-TESTE', status: 'PENDENTE' } } };
      }
    },
    PortalGeapaUi: {
      mostrarMensagemPersistente(_target, payload) { calls.persistent += 1; assert.match(payload.message, /SAC-TESTE/); },
      mostrarToast(payload) { calls.toast += 1; assert.match(payload.message, /PENDENTE/); }
    }
  },
  async carregarSolicitacoesMeuPerfil(_container, id) { calls.list.push(id); return []; }
};
vm.createContext(context);
const functions = [
  'fecharModalCorrecaoPerfil_',
  'respostaCorrecaoIncerta_',
  'aguardarConfirmacaoCorrecao_',
  'reconciliarSolicitacaoCorrecao_',
  'confirmarSucessoSolicitacaoCorrecao_'
];
vm.runInContext(functions.map((name) => extractFunction(appSource, name)).join('\n\n'), context);

assert.equal(context.respostaCorrecaoIncerta_({ code: 'API_WRITE_TIMEOUT' }), true);
assert.equal(context.respostaCorrecaoIncerta_({ code: 'SOLICITACAO_DUPLICADA' }), false);
const reconciled = await context.reconciliarSolicitacaoCorrecao_({ requestId: 'req-safe', chaveIdempotencia: 'correcao-segura-1' });
assert.equal(reconciled.encontrada, true);
assert.equal(calls.query, 1);
await context.confirmarSucessoSolicitacaoCorrecao_(modal, form, {}, reconciled.resposta);
assert.equal(modal.hidden, true);
assert.equal(calls.reset, 1);
assert.equal(calls.toast, 1);
assert.equal(calls.persistent, 1);
assert.deepEqual(calls.list, ['SAC-TESTE']);
assert.equal(context.meuPerfilCorrecaoPendente, null);

assert.match(appSource, /botao\.textContent = 'Enviando\.\.\.'/);
assert.match(appSource, /dataset\.profileSubmitting/);
assert.match(appSource, /Não reenvie agora/);
assert.match(appSource, /profile-request-card-highlight/);
assert.match(apiSource, /meuPerfilConsultarSolicitacao/);
assert.match(bridgeSource, /geapaCoreConsultarMinhaSolicitacaoCadastralPortal/);
assert.match(webappSource, /adminCorrecoesCadastraisDetalhe/);

assert.match(adminSource, /\/admin\/correcoes-cadastrais\/detalhe/);
assert.match(adminSource, /valorSolicitadoMascarado/);
assert.match(adminSource, /item\.valorAtual/);
assert.match(adminSource, /item\.valorSolicitado/);
assert.match(adminSource, /data-admin-correction-reveal/);
assert.match(adminSource, /admin-correction-person-lines/);
assert.doesNotMatch(adminSource, /formatDate\(item\.valorAtual/);
assert.doesNotMatch(adminSource, /formatDate\(item\.valorSolicitado/);

console.log(JSON.stringify({ ok: true, checks: 27 }));
