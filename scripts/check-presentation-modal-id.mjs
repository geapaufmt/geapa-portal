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
const modal = {
  active: false,
  html: '',
  contentHtml: '',
  errors: [],
  form: null,
  hiddenInput: null
};

function parseModalContent(html) {
  const sourceHtml = String(html || '');
  const formMatch = sourceHtml.match(/data-portal-v2-form="([^"]+)"/);
  const hiddenMatch = sourceHtml.match(/name="idApresentacao" value="([^"]*)"/);

  modal.form = null;
  modal.hiddenInput = null;
  if (!formMatch || !hiddenMatch) return;

  modal.hiddenInput = {
    value: hiddenMatch[1],
    defaultValue: hiddenMatch[1],
    attributeValue: hiddenMatch[1],
    setAttribute(name, value) {
      if (name === 'value') this.attributeValue = String(value || '');
    }
  };
  modal.form = {
    formName: formMatch[1],
    querySelector(selector) {
      if (selector === 'input[name="idApresentacao"]') return modal.hiddenInput;
      return null;
    }
  };
}

const modalContent = {
  firstChild: null,
  querySelector(selector) {
    const formMatch = String(selector || '').match(/^form\[data-portal-v2-form="([^"]+)"\]$/);
    if (formMatch && modal.form && modal.form.formName === formMatch[1]) return modal.form;
    return null;
  },
  querySelectorAll() { return []; },
  insertBefore() {},
  set innerHTML(value) {
    modal.contentHtml = String(value || '');
    parseModalContent(modal.contentHtml);
  },
  get innerHTML() { return modal.contentHtml; }
};

const modalElement = {
  querySelector(selector) {
    if (selector === 'input[name="idApresentacao"]') return modal.hiddenInput;
    return null;
  },
  remove() { modal.active = false; }
};

const document = {
  readyState: 'complete',
  body: {
    classList: { add() {}, remove() {} },
    insertAdjacentHTML(_position, html) {
      modal.active = true;
      modal.html = String(html || '');
      parseModalContent(modal.html);
    }
  },
  addEventListener(type, handler) { listeners[type] = handler; },
  dispatchEvent() {},
  getElementById() { return null; },
  querySelector(selector) {
    if (selector === '[data-readonly-modal-content]') return modalContent;
    if (selector === '.readonly-modal') return modal.active ? modalElement : null;
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

let requestIdRandomCalls = 0;
const MathMock = Object.create(Math);
MathMock.random = function random() {
  requestIdRandomCalls += 1;
  return 0.123456789;
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
  Math: MathMock,
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

function editApproveForm(id) {
  return {
    values: {
      idApresentacao: id,
      tituloApresentacao: 'Titulo de homologacao',
      eixoTematicoPrincipal: 'EIXO-1',
      eixoTematicoSecundario: '',
      observacaoInterna: ''
    },
    querySelectorAll() { return []; }
  };
}

// Fluxos legados de revisao continuam preservando o ID.
const requestButton = actionButton('revisar-titulo-ajuste', firstId);
listeners.click({ target: requestButton });
assert.equal(hiddenId(modal.html), firstId);

// O clique em elemento filho continua usando closest().
modal.html = '';
listeners.click({ target: childOf(requestButton) });
assert.equal(hiddenId(modal.html), firstId);

// Reabrir um modal legado para outro card substitui o ID anterior.
listeners.click({ target: actionButton('revisar-titulo-ajuste', secondId) });
assert.equal(hiddenId(modal.html), secondId);
assert.notEqual(hiddenId(modal.html), firstId);

// Ausente, vazio e formato invalido bloqueiam submit antes de requestId e API.
for (const invalidId of [undefined, '', 'ATV-2026-1-0010']) {
  const callsBefore = apiCalls.length;
  const requestIdsBefore = requestIdRandomCalls;
  testApi.salvarRevisao(reviewForm(invalidId));
  assert.equal(apiCalls.length, callsBefore);
  assert.equal(requestIdRandomCalls, requestIdsBefore);
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
assert.equal(modal.hiddenInput.value, firstId);
assert.equal(modal.hiddenInput.defaultValue, firstId);
assert.equal(modal.hiddenInput.attributeValue, firstId);

// Clique em elemento filho do botao EDIT_APPROVE preserva o mesmo ID.
listeners.click({ target: childOf(actionButton('revisar-titulo-editar-aprovar', firstId)) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(modal.hiddenInput.value, firstId);

// Fechamento limpa o hidden antes de remover o modal.
const firstHidden = modal.hiddenInput;
listeners.click({ target: actionButton('fechar-modal', '') });
assert.equal(firstHidden.value, '');
assert.equal(firstHidden.defaultValue, '');
assert.equal(firstHidden.attributeValue, '');
assert.equal(modal.active, false);

// Reabertura com outro candidato substitui integralmente o ID anterior.
listeners.click({ target: actionButton('revisar-titulo-editar-aprovar', secondId) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(modal.hiddenInput.value, secondId);
assert.equal(modal.hiddenInput.defaultValue, secondId);
assert.equal(modal.hiddenInput.attributeValue, secondId);
assert.notEqual(modal.hiddenInput.value, firstId);

// ID invalido no EDIT_APPROVE bloqueia antes de requestId e API.
const callsBeforeInvalidEditApprove = apiCalls.length;
const requestIdsBeforeInvalidEditApprove = requestIdRandomCalls;
listeners.click({ target: actionButton('revisar-titulo-editar-aprovar', 'ATV-2026-1-0010') });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(apiCalls.length, callsBeforeInvalidEditApprove);
assert.equal(requestIdRandomCalls, requestIdsBeforeInvalidEditApprove);

for (const invalidId of [undefined, '', 'ATV-2026-1-0010']) {
  const callsBefore = apiCalls.length;
  const requestIdsBefore = requestIdRandomCalls;
  testApi.salvarEditarAprovarTituloEixo(editApproveForm(invalidId));
  assert.equal(apiCalls.length, callsBefore);
  assert.equal(requestIdRandomCalls, requestIdsBefore);
}

const callsBeforeInvalidDirect = apiCalls.length;
testApi.enviarRevisaoTitulo('', 'APROVAR', '', '');
assert.equal(apiCalls.length, callsBeforeInvalidDirect);
assert.ok(toasts.length >= 1);

console.log('check-presentation-modal-id.mjs: OK');
