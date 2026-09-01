import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'web/assets/js/portal-v2-readonly.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const apiCalls = [];
const toasts = [];
const listeners = {};
const modal = { html: '', contentHtml: '', errors: [] };

const modalContent = {
  firstChild: null,
  querySelector() { return null; },
  querySelectorAll() { return []; },
  insertBefore() {},
  set innerHTML(value) { modal.contentHtml = String(value || ''); },
  get innerHTML() { return modal.contentHtml; }
};

const document = {
  readyState: 'complete',
  body: {
    classList: { add() {}, remove() {} },
    insertAdjacentHTML(_position, html) { modal.html = String(html || ''); }
  },
  addEventListener(type, handler) { listeners[type] = handler; },
  dispatchEvent() {},
  getElementById() { return null; },
  querySelector(selector) {
    if (selector === '[data-readonly-modal-content]') return modalContent;
    return null;
  },
  createElement() {
    return {
      setAttribute() {},
      remove() {},
      querySelector() { return null; }
    };
  }
};

class FormDataMock {
  constructor(form) { this.form = form; }
  get(name) { return this.form.values[name]; }
}

const api = {
  apiGet() {
    return Promise.resolve({ ok: true, data: { eixos: [] } });
  },
  apiPost(route, body) {
    apiCalls.push({ route, body });
    return new Promise(() => {});
  }
};

const ui = {
  escaparHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  mostrarToast(payload) { toasts.push(payload); return 'toast-test'; },
  atualizarToast() {},
  mostrarLoading() {},
  ocultarLoading() {},
  limparErrosCampos() {},
  aplicarErrosCampos(_form, errors) { modal.errors.push(errors); },
  mostrarMensagemPersistente() {},
  normalizarFeedbackResposta(value) { return value || {}; },
  obterMensagemErroAmigavel(_value, fallback) { return fallback; }
};

const window = {
  PortalGeapaApi: api,
  PortalGeapaUi: ui,
  PortalGeapaNavigation: { getRotaAtual() { return ''; } },
  PortalGeapaConfig: { ENVIRONMENT: 'DEV' },
  console: { info() {} }
};

const instrumented = source.replace(
  /\}\)\(window\);\s*$/,
  [
    'global.__PresentationModalIdTest = {',
    '  abrirModalRevisao: abrirModalRevisao,',
    '  abrirModalEditarAprovarTituloEixo: abrirModalEditarAprovarTituloEixo,',
    '  salvarRevisao: salvarRevisao,',
    '  salvarEditarAprovarTituloEixo: salvarEditarAprovarTituloEixo,',
    '  enviarRevisaoTitulo: enviarRevisaoTitulo,',
    '  validarIdApresentacaoFrontend: validarIdApresentacaoFrontend,',
    '  setItens: function(itens) { estado.itensPorId = itens || {}; }',
    '};',
    '})(window);'
  ].join('\n')
);

const context = {
  window,
  document,
  FormData: FormDataMock,
  Promise,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  RegExp,
  CustomEvent: class CustomEvent {},
  setTimeout,
  clearTimeout
};
vm.createContext(context);
vm.runInContext(instrumented, context, { filename: 'portal-v2-readonly.js' });

const testApi = window.__PresentationModalIdTest;
const firstId = 'APR-2026-1-0010';
const secondId = 'APR-2026-1-0009';
testApi.setItens({
  [firstId]: { idApresentacao: firstId, titulo: 'Primeira' },
  [secondId]: { idApresentacao: secondId, titulo: 'Segunda' }
});

function actionButton(action, id) {
  return {
    getAttribute(name) {
      if (name === 'data-portal-v2-action') return action;
      if (name === 'data-id-apresentacao') return id;
      return null;
    },
    closest(selector) {
      if (selector === '[data-portal-v2-action]') return this;
      return null;
    }
  };
}

function childOf(button) {
  return {
    closest(selector) {
      if (selector === '[data-portal-v2-action]') return button;
      return null;
    }
  };
}

function hiddenId(html) {
  const match = String(html || '').match(/name="idApresentacao" value="([^"]*)"/);
  return match ? match[1] : null;
}

function reviewForm(id, decision = 'SOLICITAR_AJUSTE') {
  return {
    values: {
      idApresentacao: id,
      observacaoPublica: '',
      observacaoInterna: ''
    },
    getAttribute(name) {
      if (name === 'data-tipo-revisao') return 'titulo';
      if (name === 'data-decisao') return decision;
      if (name === 'data-observacao-obrigatoria') return 'false';
      return null;
    },
    querySelectorAll() { return []; }
  };
}

// 1-2. Clique direto no botao preserva o ID no modal.
const requestButton = actionButton('revisar-titulo-ajuste', firstId);
listeners.click({ target: requestButton });
assert.equal(hiddenId(modal.html), firstId);

// 3. Clique em elemento filho usa closest() e preserva o ID do botao legitimo.
modal.html = '';
listeners.click({ target: childOf(requestButton) });
assert.equal(hiddenId(modal.html), firstId);

// 4. O value tambem e defaultValue, portanto reset nao apaga o ID.
const hidden = { value: hiddenId(modal.html), defaultValue: hiddenId(modal.html) };
hidden.value = 'ALTERADO-LOCALMENTE';
hidden.value = hidden.defaultValue;
assert.equal(hidden.value, firstId);

// 5. Reabrir para outro card substitui o ID anterior.
listeners.click({ target: actionButton('revisar-titulo-ajuste', secondId) });
assert.equal(hiddenId(modal.html), secondId);
assert.notEqual(hiddenId(modal.html), firstId);

// 6-8 e 10. Ausente, vazio e formato invalido bloqueiam submit e API.
for (const invalidId of [undefined, '', 'ATV-2026-1-0010']) {
  const callsBefore = apiCalls.length;
  testApi.salvarRevisao(reviewForm(invalidId));
  assert.equal(apiCalls.length, callsBefore);
}

// 9. O payload futuro usa exatamente o ID vindo do botao/card.
listeners.click({ target: requestButton });
const propagatedId = hiddenId(modal.html);
testApi.salvarRevisao(reviewForm(propagatedId));
assert.equal(apiCalls.length, 1);
assert.equal(JSON.parse(apiCalls[0].body.payload).idApresentacao, firstId);

// Auditoria dos quatro caminhos de decisao.
const callsAfterRequest = apiCalls.length;
listeners.click({ target: actionButton('revisar-titulo-aprovar', firstId) });
assert.equal(apiCalls.length, callsAfterRequest + 1);
assert.equal(JSON.parse(apiCalls.at(-1).body.payload).idApresentacao, firstId);

listeners.click({ target: actionButton('revisar-titulo-reprovar', firstId) });
assert.equal(hiddenId(modal.html), firstId);

listeners.click({ target: actionButton('revisar-titulo-ajuste', firstId) });
assert.equal(hiddenId(modal.html), firstId);

listeners.click({ target: actionButton('revisar-titulo-editar-aprovar', firstId) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(hiddenId(modal.contentHtml), firstId);

const callsBeforeInvalidDirect = apiCalls.length;
testApi.enviarRevisaoTitulo('', 'APROVAR', '', '');
assert.equal(apiCalls.length, callsBeforeInvalidDirect);
assert.ok(toasts.length >= 1);

console.log('check-presentation-modal-id.mjs: OK');
