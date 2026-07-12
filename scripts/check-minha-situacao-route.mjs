import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appCode = fs.readFileSync('web/app.js', 'utf8');

function criarCenario({ rotaInicial = 'outra-rota', sessao = 'token-valido', resultado = 'sucesso' } = {}) {
  const listeners = new Map();
  const container = { innerHTML: 'placeholder' };
  let rotaAtual = rotaInicial;
  let tokenAtual = sessao;
  let chamadasMinhaSituacao = 0;
  let chamadasAplicarUsuario = 0;
  let erroRenderizado = '';
  let resolverCarregamento;

  const document = {
    getElementById() {
      return null;
    },
    addEventListener(nome, listener) {
      listeners.set(nome, listener);
    }
  };

  const window = {
    PortalGeapaNavigation: {
      getRotaAtual() {
        return rotaAtual;
      }
    }
  };

  const context = vm.createContext({ document, window, console, setTimeout });
  vm.runInContext(appCode, context, { filename: 'web/app.js' });

  context.lerSessaoLocal = () => tokenAtual;
  context.renderizarCarregandoSituacao = () => {
    container.innerHTML = 'loading';
  };
  context.renderizarErroSituacao = (_, mensagem) => {
    erroRenderizado = mensagem;
    container.innerHTML = `error:${mensagem}`;
  };
  context.renderizarMinhaSituacao = (_, dados) => {
    container.innerHTML = `success:${dados.usuario.nome}`;
  };
  context.aplicarUsuarioAtual = () => {
    chamadasAplicarUsuario += 1;
  };
  context.rotaAindaAtual = (idRota) => rotaAtual === idRota;
  context.carregarMinhaSituacao = () => {
    chamadasMinhaSituacao += 1;

    if (resultado === 'falha') {
      return Promise.reject(new Error('Falha simulada ao carregar Minha situação.'));
    }

    if (resultado === 'pendente') {
      return new Promise((resolve) => {
        resolverCarregamento = resolve;
      });
    }

    return Promise.resolve({ usuario: { nome: 'Pessoa Teste' } });
  };

  assert.equal(typeof context.configurarRotaMinhaSituacao, 'function');
  context.configurarRotaMinhaSituacao(container);

  return {
    container,
    listeners,
    setRotaAtual(valor) {
      rotaAtual = valor;
    },
    setSessao(valor) {
      tokenAtual = valor;
    },
    abrirRota(idRota) {
      rotaAtual = idRota;
      listeners.get('portal:navigationchange')({ detail: { rota: { id: idRota } } });
    },
    resolverCarregamento(dados = { usuario: { nome: 'Pessoa Teste' } }) {
      resolverCarregamento(dados);
    },
    getChamadasMinhaSituacao() {
      return chamadasMinhaSituacao;
    },
    getChamadasAplicarUsuario() {
      return chamadasAplicarUsuario;
    },
    getErroRenderizado() {
      return erroRenderizado;
    }
  };
}

async function aguardarRenderizacao() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

const rotaInicial = criarCenario({ rotaInicial: 'minha-situacao' });
await aguardarRenderizacao();
assert.equal(rotaInicial.getChamadasMinhaSituacao(), 1, 'a rota atual deve carregar imediatamente');
assert.match(rotaInicial.container.innerHTML, /^success:/, 'o sucesso deve substituir o placeholder');

const navegacao = criarCenario();
navegacao.abrirRota('atividades');
await aguardarRenderizacao();
assert.equal(navegacao.getChamadasMinhaSituacao(), 0, 'outra rota não deve carregar Minha situação');
navegacao.abrirRota('minha-situacao');
await aguardarRenderizacao();
assert.equal(navegacao.getChamadasMinhaSituacao(), 1, 'abrir Minha situação deve disparar o carregamento');
assert.equal(navegacao.getChamadasAplicarUsuario(), 1, 'o usuário atual deve ser aplicado após o sucesso');

const semSessao = criarCenario({ sessao: '' });
semSessao.abrirRota('minha-situacao');
await aguardarRenderizacao();
assert.match(semSessao.container.innerHTML, /^error:/, 'sessão ausente deve mostrar erro');

const falha = criarCenario({ resultado: 'falha' });
falha.abrirRota('minha-situacao');
await aguardarRenderizacao();
assert.match(falha.container.innerHTML, /^error:/, 'falha da API deve mostrar erro');
assert.match(falha.getErroRenderizado(), /Falha simulada/);

const concorrente = criarCenario({ resultado: 'pendente' });
concorrente.abrirRota('minha-situacao');
concorrente.abrirRota('minha-situacao');
await Promise.resolve();
assert.equal(concorrente.getChamadasMinhaSituacao(), 1, 'eventos concorrentes devem compartilhar a chamada');
concorrente.resolverCarregamento();
await aguardarRenderizacao();
assert.match(concorrente.container.innerHTML, /^success:/);

console.log('OK: rota Minha situação, estados de sessão, sucesso, erro e concorrência validados.');
