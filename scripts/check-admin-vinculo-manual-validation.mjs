import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const required = (condition, message) => { if (!condition) throw new Error(message); };
const expectError = (callback, message) => {
  let thrown = null;
  try { callback(); } catch (error) { thrown = error; }
  required(thrown && String(thrown.message || '').includes(message), `Erro esperado ausente: ${message}`);
};

const document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; }
};
const sandbox = {
  window: { __PORTAL_VINCULO_TEST__: true },
  document,
  console,
  FormData: class FormData {},
  Object,
  Array,
  String
};
vm.createContext(sandbox);
vm.runInContext(read('web/assets/js/admin-solicitacoes-vinculo.js'), sandbox);

const hooks = sandbox.window.__PortalAdminVinculoTestHooks;
required(hooks, 'Hooks controlados de teste nao foram expostos.');

const unresolved = {
  VALIDACAO_VINCULO_ATIVO: 'VALIDO',
  VALIDACAO_SEMESTRE: 'VALIDO',
  VALIDACAO_APRESENTACAO: 'SEM_CONFLITO',
  VALIDACAO_ARQUIVOS_PENDENTES: 'SEM_PENDENCIA',
  VALIDACAO_OBRIGACOES: 'NAO_VERIFICADO',
  VALIDACAO_FUNCAO_ATIVA: 'NAO_VERIFICADO',
  RESULTADO_VALIDACAO: 'PENDENTE_ANALISE_MANUAL'
};
const activeFunction = { ...unresolved, VALIDACAO_FUNCAO_ATIVA: 'ATIVA' };
const regular = { ...unresolved, VALIDACAO_OBRIGACOES: 'SEM_PENDENCIA', VALIDACAO_FUNCAO_ATIVA: 'SEM_FUNCAO', RESULTADO_VALIDACAO: 'VALIDADO' };

const unresolvedHtml = hooks.renderFunctionConfirmation(unresolved);
required(unresolvedHtml.includes('name="confirmacaoFuncaoRegularizada"'), 'NAO_VERIFICADO deve mostrar a caixa de confirmacao.');
required(unresolvedHtml.includes('consultei as bases oficiais') && unresolvedHtml.includes('não possui função ativa'), 'Texto de NAO_VERIFICADO incorreto.');

const activeHtml = hooks.renderFunctionConfirmation(activeFunction);
required(activeHtml.includes('formalmente encerrada, substituída ou transferida'), 'ATIVA deve explicar a regularizacao formal obrigatoria.');
required(hooks.renderFunctionConfirmation(regular) === '', 'Situacao regular nao deve mostrar a caixa.');

const validationsHtml = hooks.renderValidations(unresolved);
['Vínculo ativo','Semestre','Apresentação','Arquivos pendentes','Obrigações','Função ativa','Resultado geral'].forEach((item) => {
  required(validationsHtml.includes(item), `Validacao individual ausente: ${item}`);
});
required(validationsHtml.includes('integração automática não conseguiu concluir'), 'NAO_VERIFICADO nao foi explicado como inconclusivo.');

const values = {
  acao: 'homologar-efetivar-desligamento',
  idSolicitacao: 'SVI-TESTE',
  observacao: 'Conferencia administrativa controlada.',
  ataReferencia: 'ATA-TESTE',
  tratamentoTransicao: 'APLICAR_VIGENTE',
  justificativaAdministrativaReforcada: 'Conferencia manual realizada nas bases oficiais.'
};
const form = {
  elements: {
    confirmacaoFuncaoRegularizada: { checked: false },
    confirmacaoReforcada: { checked: true }
  }
};
expectError(() => hooks.validateManualReview(form, values, unresolved), 'Confirme a conferência da função');

form.elements.confirmacaoFuncaoRegularizada.checked = true;
hooks.validateManualReview(form, values, unresolved);
const payload = hooks.buildActionPayload(form, values);
required(payload.confirmacaoFuncaoRegularizada === true, 'Payload deve enviar confirmacaoFuncaoRegularizada=true.');
required(payload.overrideJustificativa === values.justificativaAdministrativaReforcada, 'overrideJustificativa deixou de ser enviado.');
required(payload.confirmacaoReforcada === true, 'confirmacaoReforcada deixou de ser enviada.');

const nonFinalValues = { ...values, acao: 'iniciar-analise', justificativaAdministrativaReforcada: '' };
form.elements.confirmacaoFuncaoRegularizada.checked = false;
form.elements.confirmacaoReforcada.checked = false;
hooks.validateManualReview(form, nonFinalValues, unresolved);

const finalRegularValues = { ...values };
expectError(() => hooks.validateManualReview(form, finalRegularValues, regular), 'Confirme explicitamente a decisão final');

const forbiddenIdentityFields = ['ID_PESSOA','idPessoa','ID_VINCULO','idVinculo','RGA','rga','EMAIL','email'];
required(forbiddenIdentityFields.every((field) => !Object.prototype.hasOwnProperty.call(payload, field)), 'Frontend enviou identidade alvo.');

function portalConfig(file) {
  const configSandbox = { window: {} };
  vm.createContext(configSandbox);
  vm.runInContext(read(file), configSandbox);
  return configSandbox.window.PortalGeapaConfig;
}
required(portalConfig('web/assets/js/config.prod.js').ENABLE_VINCULO_REQUESTS === true, 'Feature de vinculo deve estar habilitada em PROD apos promocao formal.');

console.log('Painel administrativo: validacoes manuais, payload e ativacao controlada PROD validados (10 cenarios).');
