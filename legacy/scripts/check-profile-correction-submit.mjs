import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appSource = fs.readFileSync('web/app.js', 'utf8');
const bridgeSource = fs.readFileSync('apps-script/08_profile_corrections.gs', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `funcao ausente: ${name}`);
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

const names = [
  'formatarDataNascimentoPerfil_',
  'normalizarDataNascimentoCorrecao_',
  'normalizarValorSolicitadoCorrecao_',
  'mensagemErroCorrecaoPerfil_',
  'diagnosticoSeguroCorrecaoPerfil_',
  'envelopeSeguroCorrecaoPerfil_'
];
const context = {};
vm.createContext(context);
vm.runInContext(names.map((name) => extractFunction(appSource, name)).join('\n\n'), context);

assert.equal(context.formatarDataNascimentoPerfil_('1990-01-10'), '10/01/1990');
assert.equal(context.normalizarDataNascimentoCorrecao_('10/01/1990'), '1990-01-10');
assert.equal(context.normalizarDataNascimentoCorrecao_('29/02/2000'), '2000-02-29');
assert.throws(() => context.normalizarDataNascimentoCorrecao_('29/02/2001'), /DD\/MM\/AAAA/);
assert.throws(() => context.normalizarDataNascimentoCorrecao_('01/01/2999'), /DD\/MM\/AAAA/);
assert.equal(context.normalizarValorSolicitadoCorrecao_('RGA', ' 2024. 123 '), '2024.123');
assert.throws(() => context.normalizarValorSolicitadoCorrecao_('RGA', 'x'), /RGA valido|RGA válido/);

assert.match(context.mensagemErroCorrecaoPerfil_({ code: 'VALOR_SEM_ALTERACAO' }), /igual ao valor atual/);
assert.match(context.mensagemErroCorrecaoPerfil_({ errorCode: 'SOLICITACAO_DUPLICADA' }), /pendente/);
assert.match(context.mensagemErroCorrecaoPerfil_({ reasonCode: 'SESSAO_INVALIDA' }), /sessao expirou|sessão expirou/);
assert.match(context.mensagemErroCorrecaoPerfil_({ code: 'PESSOAS_V2_FONTE_INDISPONIVEL' }), /fila de solicitacoes|fila de solicitações/);
assert.match(context.mensagemErroCorrecaoPerfil_({ code: 'DATA_NASCIMENTO_INVALIDA' }), /DD\/MM\/AAAA/);
assert.match(context.mensagemErroCorrecaoPerfil_({ code: 'RGA_INVALIDO' }), /RGA valido|RGA válido/);
assert.match(context.mensagemErroCorrecaoPerfil_({ code: 'JUSTIFICATIVA_OBRIGATORIA' }), /20 caracteres/);

const sensivel = {
  requestId: 'req-teste-seguro',
  campo: 'RGA',
  valorSolicitado: '2024.987654',
  justificativa: 'Justificativa pessoal secreta para teste',
  chaveIdempotencia: 'correcao-chave-secreta'
};
const diagnostico = context.diagnosticoSeguroCorrecaoPerfil_(sensivel);
const serializado = JSON.stringify(diagnostico);
assert.equal(diagnostico.valorSolicitadoTamanho, sensivel.valorSolicitado.length);
assert.equal(diagnostico.justificativaTamanho, sensivel.justificativa.length);
assert.equal(diagnostico.chaveIdempotenciaTamanho, sensivel.chaveIdempotencia.length);
assert.doesNotMatch(serializado, /2024\.987654|Justificativa pessoal|correcao-chave-secreta/);

assert.match(bridgeSource, /JSON\.parse\(String\(valor \|\| '\{\}'\)\)/, 'a ponte deve desserializar strings JSON');
assert.match(bridgeSource, /\[dados\.payload, acesso\.contexto\]/, 'o Core deve receber o payload plano');
assert.match(bridgeSource, /var payload = \{\s*chaveIdempotencia:[\s\S]*campo:[\s\S]*valorSolicitado:[\s\S]*justificativa:/, 'o payload deve conter os quatro campos do contrato');
assert.doesNotMatch(bridgeSource, /var payload = \{\s*payload:/, 'a ponte nao pode aninhar payload novamente');
assert.match(bridgeSource, /payloadType:[\s\S]*deserialized:[\s\S]*chaveIdempotenciaTamanho:[\s\S]*valorSolicitadoTamanho:[\s\S]*justificativaTamanho:/, 'o diagnostico seguro deve registrar tipo, desserializacao e tamanhos');

const bridgeFunctions = [
  'portalPerfilCorrecoesChave_',
  'portalPerfilCorrecoesMensagemErro_',
  'portalPerfilCorrecoesRespostaErroDiagnostico_',
  'portalPerfilCorrecoesLogSeguro_',
  'portalPerfilCorrecoesPayloadCorrecao_',
  'portalPerfilCorrecoesExecutarCore_'
];
const logs = [];
const bridgeContext = {
  Logger: { log(message) { logs.push(String(message)); } },
  portalRespostaErro_(code, message, data, meta) {
    return { ok: false, code, message, data, fieldErrors: data.fieldErrors || {}, meta: meta || {} };
  },
  portalRespostaOk_(code, message, data, meta) { return { ok: true, code, message, data, meta }; },
  portalMetaDesempenho_() { return { source: 'test' }; }
};
vm.createContext(bridgeContext);
vm.runInContext(bridgeFunctions.map((name) => extractFunction(bridgeSource, name)).join('\n\n'), bridgeContext);

const entradaValida = JSON.stringify({
  requestId: 'req-bridge-1',
  chaveIdempotencia: 'correcao-12345678',
  campo: 'RGA',
  valorSolicitado: '2024.987654',
  justificativa: 'Correcao necessaria para o cadastro oficial.'
});
const parseado = bridgeContext.portalPerfilCorrecoesPayloadCorrecao_(entradaValida);
assert.equal(parseado.ok, true);
assert.deepEqual(Object.keys(parseado.payload).sort(), ['campo', 'chaveIdempotencia', 'justificativa', 'valorSolicitado'].sort());
assert.equal(parseado.details.payloadType, 'string');
assert.equal(parseado.details.deserialized, true);
assert.doesNotMatch(logs.join('\n'), /2024\.987654|Correcao necessaria|correcao-12345678/);

const justificativaCurta = bridgeContext.portalPerfilCorrecoesPayloadCorrecao_(JSON.stringify({
  requestId: 'req-bridge-2', chaveIdempotencia: 'correcao-87654321', campo: 'RGA', valorSolicitado: '2024.1111', justificativa: 'curta'
}));
assert.equal(justificativaCurta.ok, false);
assert.equal(justificativaCurta.resposta.code, 'JUSTIFICATIVA_OBRIGATORIA');
assert.equal(justificativaCurta.resposta.errorCode, 'JUSTIFICATIVA_OBRIGATORIA');

bridgeContext.GEAPA_CORE = {
  geapaCoreSolicitarCorrecaoMeuPerfilParaPortal() {
    return { ok: false, errorCode: 'SOLICITACAO_DUPLICADA', message: 'Solicitacao invalida ou indisponivel.' };
  }
};
const recusada = bridgeContext.portalPerfilCorrecoesExecutarCore_(
  'geapaCoreSolicitarCorrecaoMeuPerfilParaPortal',
  [parseado.payload, {}],
  'SUCESSO',
  'Sucesso',
  0,
  { requestId: parseado.requestId, campo: 'RGA', details: parseado.details }
);
assert.equal(recusada.code, 'SOLICITACAO_DUPLICADA');
assert.equal(recusada.reasonCode, 'SOLICITACAO_DUPLICADA');
assert.match(recusada.message, /pendente/);

console.log(JSON.stringify({ ok: true, checks: 36 }));
