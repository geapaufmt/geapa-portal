import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('web/app.js', 'utf8');
const functionNames = [
  'tratarCliqueMeuPerfil',
  'reportarModalCorrecaoPerfilIndisponivel_',
  'fecharModalCorrecaoPerfil_',
  'abrirModalCorrecaoPerfil',
  'formatarCampoCorrecao',
  'formatarDataNascimentoPerfil_'
];

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ausente: ${name}`);
  let depth = 0;
  let bodyStarted = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
      bodyStarted = true;
    } else if (source[index] === '}') {
      depth -= 1;
      if (bodyStarted && depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`fim da função não encontrado: ${name}`);
}

const label = { textContent: '' };
const errorTarget = { textContent: 'erro antigo', hidden: false };
const fields = {
  campo: { value: '' },
  valorAtual: { value: '' },
  valorSolicitado: { focused: false, focus() { this.focused = true; } },
  justificativa: { value: '' }
};
const form = {
  elements: fields,
  resetCalled: false,
  reset() { this.resetCalled = true; },
  querySelector(selector) {
    if (selector === '[data-profile-correction-error]') return errorTarget;
    const fieldMatch = selector.match(/^\[name="([^"]+)"\]$/);
    if (fieldMatch) return fields[fieldMatch[1]] || null;
    return null;
  }
};
const modal = {
  hidden: true,
  querySelector(selector) {
    if (selector === '[data-profile-correction-form]') return form;
    if (selector === '[data-profile-correction-label]') return label;
    return null;
  }
};
const bodyClasses = new Set();
const visibleErrors = [];
const consoleErrors = [];
const context = {
  console: { error(...args) { consoleErrors.push(args); } },
  document: {
    body: { classList: { add(value) { bodyClasses.add(value); }, remove(value) { bodyClasses.delete(value); } } },
    getElementById(id) { return id === 'profile-correction-modal' ? modal : null; },
    createElement() { return { setAttribute() {}, hidden: true, textContent: '' }; }
  },
  window: {},
  meuPerfilDadosAtuais: null,
  mostrarFeedbackPerfil(type, message) { visibleErrors.push({ type, message }); },
  renderizarEdicaoMeuPerfil() {},
  renderizarMeuPerfil() {}
};
vm.createContext(context);
vm.runInContext(functionNames.map(extractFunction).join('\n\n'), context);

const button = { dataset: { profileCorrection: 'CPF', profileCurrent: '***.456.***-**' } };
const event = {
  prevented: false,
  currentTarget: { querySelector() { return null; }, prepend() {} },
  target: {
    closest(selector) { return selector === '[data-profile-correction]' ? button : null; }
  },
  preventDefault() { this.prevented = true; }
};

context.tratarCliqueMeuPerfil(event);
assert.equal(event.prevented, true, 'o clique deve ser tratado pelo container de Meu perfil');
assert.equal(modal.hidden, false, 'o modal deve ficar visível');
assert.equal(form.resetCalled, true, 'o formulário deve ser limpo antes da abertura');
assert.equal(fields.campo.value, 'CPF');
assert.equal(fields.valorAtual.value, '***.456.***-**');
assert.equal(label.textContent, 'CPF');
assert.equal(fields.valorSolicitado.focused, true, 'o foco deve ir para valorSolicitado');
assert.equal(bodyClasses.has('modal-open'), true);

context.document.getElementById = () => null;
modal.hidden = true;
context.abrirModalCorrecaoPerfil('RGA', '***123', event.currentTarget);
assert.equal(consoleErrors.length, 1, 'a ausência do modal deve ser registrada no console');
assert.equal(visibleErrors.length, 1, 'a ausência do modal deve produzir mensagem visível');

console.log(JSON.stringify({ ok: true, checks: 10 }));
