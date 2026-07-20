/**
 * Cliente inicial do Portal GEAPA.
 *
 * Este arquivo roda no GitHub Pages, portanto deve ser tratado como publico.
 * Nao colocar dados reais, IDs sensiveis, tokens, chaves ou regras criticas de
 * autorizacao aqui. Toda validacao real devera acontecer no Apps Script.
 */

const SESSION_STORAGE_KEY = 'geapaPortal.sessionToken';
const FIREBASE_LOGIN_STATE = {
  loginEmAndamento: false
};
let minhaSituacaoCarregamentoAtual = null;
let meuPerfilCarregamentoAtual = null;
let meuPerfilDadosAtuais = null;
let meuPerfilCorrecaoPendente = null;

(function iniciarPortalGeapa() {
  if (typeof document === 'undefined') {
    return;
  }

  const form = document.getElementById('acesso-form');
  const app = document.getElementById('portal-app');
  const telaAcesso = document.getElementById('tela-acesso');
  const telaSituacao = document.getElementById('tela-situacao');
  const emailOuRga = document.getElementById('email-ou-rga');
  const codigo = document.getElementById('codigo-acesso');
  const botaoSolicitar = document.getElementById('solicitar-codigo');
  const botaoEntrarGoogle = document.getElementById('entrar-google');
  const botaoAlternarLoginCodigo = document.getElementById('alternar-login-codigo');
  const painelLoginCodigo = document.getElementById('login-codigo-panel');
  const botaoSair = document.getElementById('sair');
  const status = document.getElementById('mensagem-status');
  const situacao = document.getElementById('minha-situacao');
  const meuPerfil = document.getElementById('meu-perfil');
  const usuarioContexto = document.getElementById('usuario-contexto');

  if (!form || !app || !telaAcesso || !telaSituacao || !emailOuRga || !codigo || !botaoSolicitar || !botaoAlternarLoginCodigo || !painelLoginCodigo || !botaoSair || !status || !situacao || !meuPerfil || !usuarioContexto) {
    return;
  }

  configurarMenuGlobal();
  configurarCabecalhoRecolhivel();
  sincronizarNavegacaoPortal();
  carregarHomePublicaEditorial();
  configurarRotasConteudoPublicoEditorial();
  configurarRotaMinhaSituacao(situacao);
  configurarRotaMeuPerfil(meuPerfil);
  configurarModalCorrecaoPerfil(meuPerfil);

  botaoAlternarLoginCodigo.addEventListener('click', function aoAlternarLoginCodigo() {
    const abrir = painelLoginCodigo.hidden;
    painelLoginCodigo.hidden = !abrir;
    botaoAlternarLoginCodigo.setAttribute('aria-expanded', String(abrir));
    botaoAlternarLoginCodigo.textContent = abrir ? 'Ocultar login por código' : 'Entrar por código';
    if (abrir) emailOuRga.focus();
  });

  botaoSolicitar.addEventListener('click', async function aoSolicitarCodigo() {
    const identificador = emailOuRga.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para receber o código.');
      emailOuRga.focus();
      return;
    }

    botaoSolicitar.disabled = true;
    mostrarLoadingGlobal('Solicitando codigo...');
    atualizarStatus(status, 'Solicitando código...');

    try {
      const resposta = await solicitarCodigo(identificador);
      atualizarStatus(status, obterMensagem(resposta));
      codigo.focus();
    } catch (erro) {
      atualizarStatus(status, erro.message);
    } finally {
      botaoSolicitar.disabled = false;
      ocultarLoadingGlobal();
    }
  });

  if (botaoEntrarGoogle) {
    botaoEntrarGoogle.addEventListener('click', async function aoEntrarComGoogle() {
      const firebaseAuth = window.PortalGeapaFirebaseAuth;

      if (!firebaseAuth || !firebaseAuth.isAvailable()) {
        atualizarStatus(status, 'Login com Google ainda não está disponível neste ambiente.');
        return;
      }

      botaoEntrarGoogle.disabled = true;
      mostrarLoadingGlobal('Abrindo login com Google...');
      atualizarStatus(status, 'Abrindo login com Google...');

      try {
        const usuarioFirebase = await firebaseAuth.signInWithGoogle();

        if (usuarioFirebase) {
          atualizarMensagemLoadingGlobal('Validando acesso no GEAPA...');
          await autenticarFirebaseNoPortal(
            usuarioFirebase,
            app,
            telaAcesso,
            telaSituacao,
            situacao,
            status,
            usuarioContexto
          );
        }
      } catch (erro) {
        atualizarStatus(status, erro.message || 'Não foi possível entrar com Google.');
      } finally {
        botaoEntrarGoogle.disabled = false;
        ocultarLoadingGlobal();
      }
    });
  }

  form.addEventListener('submit', async function aoEntrar(event) {
    event.preventDefault();

    const identificador = emailOuRga.value.trim();
    const codigoInformado = codigo.value.trim();

    if (!identificador) {
      atualizarStatus(status, 'Informe um e-mail ou RGA para continuar.');
      emailOuRga.focus();
      return;
    }

    if (!codigoInformado) {
      atualizarStatus(status, 'Informe o código de acesso.');
      codigo.focus();
      return;
    }

    atualizarStatus(status, 'Validando código...');
    alternarFormularioOcupado(form, true);
    mostrarLoadingGlobal('Validando codigo...');

    try {
      let validacao = await validarCodigo(identificador, codigoInformado);
      atualizarStatus(status, obterMensagem(validacao));

      if (validacao.ok) {
        validacao = await concluirLoginCodigoComIdentidade(validacao);
        const sessionToken = obterSessionToken(validacao);
        salvarSessaoLocal(sessionToken);
        aplicarContextoSessaoInicial(validacao, usuarioContexto);
        if (obterUsuarioFirebaseAtual()) {
          salvarResumoSeguroDaResposta(validacao);
        } else {
          limparResumoSeguroLocal();
        }
        mostrarTelaInicioAposLogin(app, telaAcesso, telaSituacao);
      }
    } catch (erro) {
      atualizarStatus(status, erro.message);
    } finally {
      alternarFormularioOcupado(form, false);
      ocultarLoadingGlobal();
    }
  });

  botaoSair.addEventListener('click', async function aoSair() {
    limparSessaoLocal();
    limparResumoSeguroLocal();
    limparUsuarioAtual();
    atualizarContextoUsuario(usuarioContexto, null);
    await sairFirebaseSeDisponivel();
    form.reset();
    painelLoginCodigo.hidden = true;
    botaoAlternarLoginCodigo.setAttribute('aria-expanded', 'false');
    botaoAlternarLoginCodigo.textContent = 'Entrar por código';
    situacao.innerHTML = [
      '<p class="empty-state">',
      'A situação do membro será carregada após a autenticação.',
      '</p>'
    ].join('');
    meuPerfil.innerHTML = [
      '<p class="empty-state">',
      'Depois da entrada, esta área mostrará os dados cadastrais que o GEAPA possui sobre você.',
      '</p>'
    ].join('');
    atualizarStatus(status, 'Sessão encerrada neste navegador.');
    mostrarTelaAcesso(app, telaAcesso, telaSituacao);
    emailOuRga.focus();
  });

  restaurarSessaoSalva(app, telaAcesso, telaSituacao, situacao, status, usuarioContexto)
    .finally(function iniciarFirebaseDepoisDaSessaoCore() {
      prepararFirebaseAuthPersistente(
        app,
        telaAcesso,
        telaSituacao,
        situacao,
        status,
        usuarioContexto
      );
    });
})();

/**
 * Solicita codigo temporario ao Apps Script.
 *
 * Nesta etapa, o Apps Script envia e-mail apenas para cadastros liberados para
 * teste.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @return {Promise<{ok: boolean, mensagem: string}>}
 */
async function solicitarCodigo(emailOuRga) {
  await prepararFirebaseAntesLoginCore(emailOuRga);
  return chamarApi('solicitarCodigo', {
    emailOuRga: emailOuRga
  });
}

/**
 * Valida codigo temporario no Apps Script.
 *
 * Nesta etapa, o Apps Script valida codigos temporarios de teste.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @param {string} codigo Codigo digitado na tela.
 * @return {Promise<{ok: boolean, mensagem: string, token: string}>}
 */
async function validarCodigo(emailOuRga, codigo) {
  await prepararFirebaseAntesLoginCore(emailOuRga);
  return chamarApi('validarCodigo', {
    emailOuRga: emailOuRga,
    codigo: codigo
  });
}

function normalizarEmailIdentidade(email) {
  return String(email || '').trim().toLowerCase();
}

function emailIdentidadeComparavel(email) {
  const value = normalizarEmailIdentidade(email);
  return value.indexOf('@') > 0 && value.indexOf('*') < 0;
}

function obterUsuarioFirebaseAtual() {
  const firebaseAuth = window.PortalGeapaFirebaseAuth;
  return firebaseAuth && typeof firebaseAuth.getCurrentUser === 'function'
    ? firebaseAuth.getCurrentUser()
    : null;
}

function obterSessaoCoreOficialAtual() {
  const authAdapter = window.PortalGeapaAuthAdapter;
  const sessao = authAdapter && typeof authAdapter.getCurrentSession === 'function'
    ? authAdapter.getCurrentSession()
    : null;
  const origem = String(sessao && (sessao.origemSessao || sessao.origemSnapshot) || '').toUpperCase();

  if (!lerSessaoLocal() || !sessao || sessao.autenticado !== true) return null;
  if (sessao.validacaoOficialPendente === true) return null;
  if (origem === 'FIRESTORE_CACHE' || origem === 'LOCAL_SAFE_CACHE') return null;
  return sessao;
}

async function prepararFirebaseAntesLoginCore(identificador) {
  const firebaseAuth = window.PortalGeapaFirebaseAuth;
  if (!firebaseAuth || !firebaseAuth.isAvailable()) return;

  if (typeof firebaseAuth.ensureReady === 'function') {
    try {
      await firebaseAuth.ensureReady(5000);
    } catch (erro) {
      // A leitura de currentUser abaixo continua sendo a fonte final local.
    }
  }

  const usuarioFirebase = obterUsuarioFirebaseAtual();
  if (!usuarioFirebase) return;

  const firebaseEmail = normalizarEmailIdentidade(usuarioFirebase.email);
  const identificadorEmail = String(identificador || '').indexOf('@') >= 0
    ? normalizarEmailIdentidade(identificador)
    : '';
  const mesmoEmail = Boolean(
    identificadorEmail &&
    firebaseEmail &&
    identificadorEmail === firebaseEmail
  );

  registrarDebugAuthPortal('FIREBASE_SIGNOUT_BEFORE_CORE_LOGIN', {
    uid: usuarioFirebase.uid || '',
    code: mesmoEmail
      ? 'LOGIN_CORE_CODE_ISOLADO'
      : (identificadorEmail ? 'EMAIL_LOGIN_CORE_DIVERGENTE' : 'IDENTIFICADOR_CORE_SEM_EMAIL')
  });
  limparEstadoIdentidadeLocal();
  await firebaseAuth.signOutFromGoogle();
}

function limparEstadoIdentidadeLocal() {
  limparSessaoLocal();
  limparResumoSeguroLocal();
  limparUsuarioAtual();
}

async function verificarConsistenciaIdentidadePortal(opcoes) {
  const options = opcoes || {};
  const firebaseUser = Object.prototype.hasOwnProperty.call(options, 'firebaseUser')
    ? options.firebaseUser
    : obterUsuarioFirebaseAtual();
  const coreSession = Object.prototype.hasOwnProperty.call(options, 'coreSession')
    ? options.coreSession
    : obterSessaoCoreOficialAtual();
  const firestoreSession = window.PortalGeapaFirestoreSession;
  let snapshot = Object.prototype.hasOwnProperty.call(options, 'portalUserDoc')
    ? options.portalUserDoc
    : null;

  if (
    firebaseUser &&
    !Object.prototype.hasOwnProperty.call(options, 'portalUserDoc') &&
    firestoreSession &&
    typeof firestoreSession.buscarPortalUserSnapshot === 'function'
  ) {
    try {
      snapshot = await firestoreSession.buscarPortalUserSnapshot(firebaseUser.uid);
    } catch (erro) {
      snapshot = null;
    }
  }

  let consistency;
  if (firestoreSession && typeof firestoreSession.verificarConsistenciaIdentidade === 'function') {
    consistency = firestoreSession.verificarConsistenciaIdentidade(firebaseUser, snapshot, coreSession);
  } else {
    const firebaseEmail = normalizarEmailIdentidade(firebaseUser && firebaseUser.email);
    const coreEmail = normalizarEmailIdentidade(coreSession && coreSession.email);
    const coreAuthEmail = normalizarEmailIdentidade(coreSession && coreSession.emailAutenticacao);
    const aliasCoreConfirmado = Boolean(
      coreSession &&
      coreSession.identidadeFirebaseCoreConfirmada === true &&
      coreSession.idPessoa &&
      emailIdentidadeComparavel(firebaseEmail) &&
      emailIdentidadeComparavel(coreAuthEmail) &&
      firebaseEmail === coreAuthEmail
    );
    const match = Boolean(
      firebaseUser &&
      coreSession &&
      emailIdentidadeComparavel(firebaseEmail) &&
      emailIdentidadeComparavel(coreEmail) &&
      (firebaseEmail === coreEmail || aliasCoreConfirmado)
    );
    consistency = {
      checked: true,
      match: match,
      code: firebaseUser && coreSession
        ? (match
          ? (aliasCoreConfirmado ? 'IDENTITY_ALIAS_CORE_CONFIRMADO' : 'OK')
          : 'IDENTITY_MISMATCH_FIREBASE_CORE')
        : (firebaseUser ? 'FIREBASE_ONLY' : (coreSession ? 'CORE_ONLY' : 'NAO_AUTENTICADO'))
    };
  }

  if (consistency.code === 'IDENTITY_MISMATCH_FIREBASE_CORE') {
    limparEstadoIdentidadeLocal();
    if (options.signOutOnMismatch !== false && firebaseUser) {
      await sairFirebaseSeDisponivel();
    }
    registrarDebugAuthPortal('IDENTITY_MISMATCH_FIREBASE_CORE', {
      uid: firebaseUser && firebaseUser.uid || '',
      code: consistency.code
    });
  } else if (consistency.match === true) {
    registrarDebugAuthPortal(
      consistency.code === 'IDENTITY_ALIAS_CORE_CONFIRMADO'
        ? 'IDENTITY_ALIAS_CORE_CONFIRMADO'
        : 'IDENTITY_MATCH_OK',
      {
        uid: firebaseUser && firebaseUser.uid || '',
        code: consistency.code || 'OK'
      }
    );
  }

  return {
    consistency: consistency,
    firebaseUser: firebaseUser,
    coreSession: coreSession,
    portalUserDoc: snapshot
  };
}

async function concluirLoginCodigoComIdentidade(validacaoCodigo) {
  const coreSession = extrairSessaoPortal(validacaoCodigo, {});
  const usuarioFirebase = obterUsuarioFirebaseAtual();

  if (!usuarioFirebase) {
    registrarDebugAuthPortal('CORE_LOGIN_WITHOUT_FIREBASE_UID', {
      code: 'CORE_CODE_ONLY'
    });
    registrarDebugAuthPortal('PROVISION_SKIP_SEM_FIREBASE_AUTH', {
      code: 'PROVISION_SKIP_SEM_FIREBASE_AUTH'
    });
    return validacaoCodigo;
  }

  const identity = await verificarConsistenciaIdentidadePortal({
    firebaseUser: usuarioFirebase,
    coreSession: coreSession
  });
  if (identity.consistency.match !== true) {
    const mismatch = new Error('O login Google aberto pertence a outra pessoa. Entre novamente com a conta correta.');
    mismatch.code = 'IDENTITY_MISMATCH_FIREBASE_CORE';
    throw mismatch;
  }

  const inicio = obterTempoAtual();
  registrarDebugAuthPortal('PROVISION_START', {
    uid: usuarioFirebase.uid || '',
    code: 'LOGIN_CODIGO_COM_FIREBASE'
  });
  const idToken = await usuarioFirebase.getIdToken();
  const loginFirebase = await portalLoginFirebase(idToken, usuarioFirebase);
  const coreFirebase = extrairSessaoPortal(loginFirebase, {});
  const finalIdentity = await verificarConsistenciaIdentidadePortal({
    firebaseUser: usuarioFirebase,
    coreSession: coreFirebase,
    signOutOnMismatch: true
  });
  if (finalIdentity.consistency.match !== true) {
    const mismatch = new Error('A sessao oficial nao corresponde ao usuario Firebase autenticado.');
    mismatch.code = 'IDENTITY_MISMATCH_FIREBASE_CORE';
    throw mismatch;
  }

  const provisionado = registrarDiagnosticoProvisionamentoFirestore(loginFirebase, inicio, usuarioFirebase.uid);
  if (provisionado) {
    atualizarDiagnosticoPortalUserAposProvisionamento(window.PortalGeapaFirestoreSession, usuarioFirebase.uid);
  }
  return loginFirebase;
}

window.PortalGeapaIdentityGuard = Object.freeze({
  verificarConsistenciaIdentidadePortal: verificarConsistenciaIdentidadePortal
});

/**
 * Valida no backend o ID token emitido pelo Firebase Authentication.
 *
 * @param {string} idToken Token JWT emitido pelo Firebase Auth.
 * @return {Promise<Object>} Resposta do login do portal.
 */
function portalLoginFirebase(idToken, usuarioFirebase) {
  var user = usuarioFirebase || {};
  var providerData = Array.isArray(user.providerData) ? user.providerData : [];
  return chamarApi('portalLogin', {
    idToken: idToken,
    firebaseUser: {
      uid: String(user.uid || ''),
      email: String(user.email || ''),
      displayName: String(user.displayName || ''),
      emailVerified: user.emailVerified === true,
      providerId: providerData[0] ? String(providerData[0].providerId || '') : ''
    },
    clientSubmittedAt: new Date().toISOString()
  });
}

/**
 * Carrega a tela "Minha situacao" pelo Apps Script.
 *
 * Nesta etapa, o backend devolve o resumo operacional do proprio usuario.
 *
 * @param {string} token Token temporario retornado pelo backend.
 * @return {Promise<Object>} Dados parciais para renderizacao local.
 */
async function carregarMinhaSituacao(token) {
  const inicio = obterTempoAtual();
  let resposta;
  let situacao;

  mostrarLoadingGlobal('Carregando Minha situacao...');

  try {
    resposta = await chamarApi('minhaSituacao', {
      token: token
    });
    situacao = normalizarMinhaSituacao(resposta);
    situacao.desempenho.tempoClienteMs = Math.round(obterTempoAtual() - inicio);
  } finally {
    ocultarLoadingGlobal();
  }

  return situacao;
}

/**
 * Compartilha uma chamada de Minha situacao entre restauracao de sessao,
 * navegacao e revalidacoes do Firebase.
 *
 * @param {string} token Token temporario retornado pelo backend.
 * @return {Promise<Object>} Dados normalizados da situacao.
 */
function carregarMinhaSituacaoComControle(token) {
  if (minhaSituacaoCarregamentoAtual) {
    return minhaSituacaoCarregamentoAtual;
  }

  let promessa;
  promessa = Promise.resolve()
    .then(function iniciarCarregamentoMinhaSituacao() {
      return carregarMinhaSituacao(token);
    })
    .finally(function liberarCarregamentoMinhaSituacao() {
      if (minhaSituacaoCarregamentoAtual === promessa) {
        minhaSituacaoCarregamentoAtual = null;
      }
    });

  minhaSituacaoCarregamentoAtual = promessa;
  return promessa;
}

/**
 * Carrega a tela "Meu perfil" pelo Apps Script.
 *
 * O frontend envia apenas o token temporario; o backend resolve a pessoa e
 * retorna somente dados do proprio usuario autenticado.
 *
 * @param {string} token Token temporario retornado pelo backend.
 * @return {Promise<Object>} Perfil normalizado para renderizacao.
 */
async function carregarMeuPerfil(token) {
  const inicio = obterTempoAtual();
  let resposta;
  let perfil;

  mostrarLoadingGlobal('Carregando Meu perfil...');

  try {
    resposta = await chamarApi('meuPerfil', {
      token: token
    });
    perfil = normalizarMeuPerfil(resposta);
    perfil.desempenho.tempoClienteMs = Math.round(obterTempoAtual() - inicio);
  } finally {
    ocultarLoadingGlobal();
  }

  return perfil;
}

/**
 * Faz o login do Firebase virar uma sessao curta do Portal GEAPA.
 *
 * O ID token fica apenas em memoria e e enviado ao Apps Script para validacao.
 * O front-end continua usando a sessao curta existente para as demais telas.
 *
 * @param {Object} usuarioFirebase Usuario retornado pelo Firebase Auth.
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situacao.
 * @param {HTMLElement} situacao Container da tela Minha situacao.
 * @param {HTMLElement} status Elemento de status.
 * @param {HTMLElement} usuarioContexto Elemento de contexto do usuario.
 */
async function autenticarFirebaseNoPortal(usuarioFirebase, app, telaAcesso, telaSituacao, situacao, status, usuarioContexto, opcoes) {
  const opcoesLogin = opcoes || {};
  let fastPathConcedido = false;
  let provisionamentoInicio = 0;

  if (!usuarioFirebase || FIREBASE_LOGIN_STATE.loginEmAndamento) {
    return;
  }

  FIREBASE_LOGIN_STATE.loginEmAndamento = true;
  atualizarStatus(status, opcoesLogin.restaurando ? 'Restaurando sessao neste dispositivo...' : 'Validando acesso oficial...');

  try {
    fastPathConcedido = await tentarAplicarSessaoRapidaFirestore(
      usuarioFirebase,
      app,
      telaAcesso,
      telaSituacao,
      status,
      usuarioContexto
    );

    if (fastPathConcedido) {
      ocultarLoadingGlobal();
    }

    atualizarStatus(status, 'Validando acesso oficial...');
    provisionamentoInicio = obterTempoAtual();
    registrarDebugAuthPortal('PROVISION_START', {
      uid: usuarioFirebase.uid,
      code: fastPathConcedido ? 'REVALIDACAO_BACKGROUND' : 'PRIMEIRO_ACESSO_OU_CACHE_INVALIDO'
    });
    const idToken = await usuarioFirebase.getIdToken();
    const firestoreSession = window.PortalGeapaFirestoreSession;
    const validarLoginFirebase = function validarLoginFirebase(token) {
      return portalLoginFirebase(token, usuarioFirebase);
    };
    const login = firestoreSession && typeof firestoreSession.validarSessaoOficialEmSegundoPlano === 'function'
      ? await firestoreSession.validarSessaoOficialEmSegundoPlano(idToken, validarLoginFirebase)
      : await validarLoginFirebase(idToken);

    if (login && login.ok === false) {
      throw new Error(obterMensagem(login) || 'Sua autorizacao mudou. Entre novamente.');
    }

    const officialIdentity = await verificarConsistenciaIdentidadePortal({
      firebaseUser: usuarioFirebase,
      coreSession: extrairSessaoPortal(login, {})
    });
    if (officialIdentity.consistency.match !== true) {
      const mismatch = new Error('A sessao oficial nao corresponde ao usuario Firebase autenticado.');
      mismatch.code = 'IDENTITY_MISMATCH_FIREBASE_CORE';
      throw mismatch;
    }

    const sessionToken = obterSessionToken(login);

    if (!sessionToken) {
      throw new Error('A API não retornou uma sessão válida do portal.');
    }

    salvarSessaoLocal(sessionToken);
    aplicarContextoSessaoInicial(login, usuarioContexto);
    salvarResumoSeguroDaResposta(login);
    const provisionadoAgora = registrarDiagnosticoProvisionamentoFirestore(login, provisionamentoInicio, usuarioFirebase.uid);
    if (provisionadoAgora) atualizarDiagnosticoPortalUserAposProvisionamento(firestoreSession, usuarioFirebase.uid);
    registrarDebugAuthPortal('BACKGROUND_REVALIDATION_OK', {
      uid: usuarioFirebase.uid,
      code: String(login && login.code || 'PORTAL_LOGIN_FIREBASE_OK'),
      durationMs: obterTempoAtual() - provisionamentoInicio
    });
    mostrarTelaInicioAposLogin(app, telaAcesso, telaSituacao);
    sincronizarNavegacaoPortal();
    atualizarStatus(status, opcoesLogin.restaurando ? 'Sessao restaurada.' : (obterMensagem(login) || 'Entrada com Google concluida.'));
  } catch (erro) {
    const code = obterCodigoErroPortal(erro);
    const denied = erroRepresentaNegacaoAcesso(erro);
    registrarDebugAuthPortal(denied ? 'PROVISION_DENY' : 'PROVISION_ERROR', {
      uid: usuarioFirebase && usuarioFirebase.uid || '',
      code: code,
      durationMs: provisionamentoInicio ? obterTempoAtual() - provisionamentoInicio : 0
    });
    registrarDebugAuthPortal(denied ? 'BACKGROUND_REVALIDATION_DENY' : 'BACKGROUND_REVALIDATION_ERROR', {
      uid: usuarioFirebase && usuarioFirebase.uid || '',
      code: code,
      durationMs: provisionamentoInicio ? obterTempoAtual() - provisionamentoInicio : 0
    });
    if (fastPathConcedido && !denied) {
      atualizarStatus(status, 'Acesso restaurado pelo cache seguro. A confirmacao oficial sera tentada novamente.');
      return true;
    }
    limparSessaoLocal();
    limparResumoSeguroLocal();
    limparUsuarioAtual();
    atualizarContextoUsuario(usuarioContexto, null);
    mostrarTelaAcesso(app, telaAcesso, telaSituacao);
    throw erro;
  } finally {
    FIREBASE_LOGIN_STATE.loginEmAndamento = false;
  }
}

function registrarDebugAuthPortal(eventName, details) {
  var debug = window.PortalGeapaDebugAuth;
  if (debug && typeof debug.record === 'function') debug.record(eventName, details || {});
}

function registrarDiagnosticoProvisionamentoFirestore(login, inicio, uid) {
  var data = login && login.data || {};
  var provision = data.cacheFirestore || null;
  var uidNormalizado = String(uid || '').trim();
  var successCodes = ['PROVISION_OK', 'PROVISION_ALREADY_VALID', 'PROVISION_UPDATED'];

  if (!uidNormalizado) {
    registrarDebugAuthPortal('PROVISION_SKIP_SEM_FIREBASE_AUTH', {
      code: 'PROVISION_SKIP_SEM_FIREBASE_AUTH',
      durationMs: inicio ? obterTempoAtual() - inicio : 0
    });
    return false;
  }
  if (!provision) {
    registrarDebugAuthPortal('PROVISION_ERROR', {
      uid: uidNormalizado,
      code: 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED',
      durationMs: inicio ? obterTempoAtual() - inicio : 0
    });
    return false;
  }
  var details = {
    code: String(provision.code || ''),
    synced: provision.synced === true,
    uid: uidNormalizado,
    durationMs: inicio ? obterTempoAtual() - inicio : 0
  };
  if (
    provision.ok === true &&
    provision.synced === true &&
    successCodes.indexOf(details.code) >= 0
  ) {
    registrarDebugAuthPortal('PROVISION_OK', details);
    return true;
  }
  if (details.code.indexOf('PROVISION_DENY_') === 0) {
    registrarDebugAuthPortal('PROVISION_DENY', details);
  } else if (details.code.indexOf('PROVISION_SKIP_') === 0) {
    registrarDebugAuthPortal('PROVISION_SKIP', details);
  } else {
    registrarDebugAuthPortal('PROVISION_ERROR', details);
  }
  return false;
}

function atualizarDiagnosticoPortalUserAposProvisionamento(firestoreSession, uid) {
  if (!firestoreSession || typeof firestoreSession.buscarPortalUserSnapshot !== 'function') return;
  Promise.resolve(firestoreSession.buscarPortalUserSnapshot(uid)).catch(function ignorarFalhaReleitura() {
    registrarDebugAuthPortal('PORTAL_USER_DOC_MISSING', {
      uid: uid,
      code: 'RELEITURA_APOS_PROVISIONAMENTO_FALHOU',
      validationCode: 'RELEITURA_APOS_PROVISIONAMENTO_FALHOU'
    });
  });
}

function obterCodigoErroPortal(erro) {
  return String(
    erro && erro.portalResponse && (erro.portalResponse.code || erro.portalResponse.data && erro.portalResponse.data.reasonCode) ||
    erro && (erro.code || erro.errorCode) ||
    'ERRO_NAO_CLASSIFICADO'
  );
}

function erroRepresentaNegacaoAcesso(erro) {
  var code = obterCodigoErroPortal(erro).toUpperCase();
  return [
    'USUARIO_NAO_AUTORIZADO',
    'FIREBASE_IDENTIDADE_DIVERGENTE',
    'FIREBASE_EMAIL_NAO_VERIFICADO',
    'FIREBASE_USUARIO_DESATIVADO',
    'IDENTITY_MISMATCH_FIREBASE_CORE',
    'PROVISION_DENY_IDENTITY_MISMATCH',
    'MEMBRO_NAO_AUTORIZADO_PORTAL',
    'ACESSO_NAO_AUTORIZADO'
  ].indexOf(code) >= 0;
}

/**
 * Aplica um snapshot rapido do Firestore enquanto a validacao oficial roda.
 *
 * Esse estado serve apenas para abrir a interface com baixa latencia. O Apps
 * Script/GEAPA-CORE continua sendo a fonte oficial e pode corrigir ou bloquear
 * a sessao logo em seguida.
 */
async function tentarAplicarSessaoRapidaFirestore(usuarioFirebase, app, telaAcesso, telaSituacao, status, usuarioContexto) {
  const firestoreSession = window.PortalGeapaFirestoreSession;

  if (
    !usuarioFirebase ||
    !firestoreSession ||
    typeof firestoreSession.buscarPortalUserSnapshot !== 'function' ||
    typeof firestoreSession.aplicarSessaoRapidaDoFirestore !== 'function'
  ) {
    return false;
  }

  try {
    const snapshot = await firestoreSession.buscarPortalUserSnapshot(usuarioFirebase.uid);
    const coreSession = obterSessaoCoreOficialAtual();
    const identity = await verificarConsistenciaIdentidadePortal({
      firebaseUser: usuarioFirebase,
      coreSession: coreSession,
      portalUserDoc: snapshot,
      signOutOnMismatch: true
    });
    if (identity.consistency.code === 'IDENTITY_MISMATCH_FIREBASE_CORE') {
      const mismatch = new Error('A sessao Firebase nao corresponde a sessao atual do Portal.');
      mismatch.code = 'IDENTITY_MISMATCH_FIREBASE_CORE';
      throw mismatch;
    }

    const sessao = firestoreSession.aplicarSessaoRapidaDoFirestore(snapshot, usuarioFirebase, coreSession);

    if (!sessao) {
      return false;
    }

    const usuario = normalizarUsuario({}, {}, sessao);
    aplicarUsuarioAtual({
      usuario: usuario,
      sessao: sessao
    });
    atualizarContextoUsuario(usuarioContexto, usuario);
    mostrarTelaInicioAposLogin(app, telaAcesso, telaSituacao);
    sincronizarNavegacaoPortal();
    atualizarStatus(status, 'Sessão rápida carregada. Validando acesso oficial...');
    return true;
  } catch (erro) {
    if (obterCodigoErroPortal(erro) === 'IDENTITY_MISMATCH_FIREBASE_CORE') {
      throw erro;
    }
    registrarDebugAuthPortal('FAST_PATH_BLOCKED', {
      uid: usuarioFirebase && usuarioFirebase.uid || '',
      code: 'FIRESTORE_READ_ERROR'
    });
    if (window.console && typeof window.console.debug === 'function') {
      window.console.debug('[Portal GEAPA] firestore.session', erro && erro.message ? erro.message : erro);
    }
    return false;
  }
}

/**
 * Aplica dados seguros enquanto a validacao oficial ainda esta pendente.
 *
 * @param {Object} sessao Sessao visual pendente.
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situacao.
 * @param {HTMLElement} usuarioContexto Elemento de contexto do usuario.
 */
function aplicarSessaoVisualPendente(sessao, app, telaAcesso, telaSituacao, usuarioContexto) {
  const usuario = normalizarUsuario({}, {}, sessao);

  aplicarUsuarioAtual({
    usuario: usuario,
    sessao: sessao
  });
  atualizarContextoUsuario(usuarioContexto, usuario);
  mostrarTelaInicioAposLogin(app, telaAcesso, telaSituacao);
  sincronizarNavegacaoPortal();
}

/**
 * Observa a sessao persistente do Firebase para restaurar o portal sem pedir
 * novo login Google.
 */
function prepararFirebaseAuthPersistente(app, telaAcesso, telaSituacao, situacao, status, usuarioContexto) {
  const firebaseAuth = window.PortalGeapaFirebaseAuth;

  if (!firebaseAuth || !firebaseAuth.isAvailable()) {
    return;
  }

  if (typeof firebaseAuth.getRedirectUser === 'function') {
    firebaseAuth.getRedirectUser()
      .then(function aoRetornarDoGoogle(usuarioFirebase) {
        if (!usuarioFirebase || lerSessaoLocal()) {
          return;
        }

        return autenticarFirebaseNoPortal(
          usuarioFirebase,
          app,
          telaAcesso,
          telaSituacao,
          situacao,
          status,
          usuarioContexto,
          { restaurando: true }
        );
      })
      .catch(function tratarErroRedirect(erro) {
        atualizarStatus(status, erro.message || 'Não foi possível concluir o login com Google.');
      });
  }

  firebaseAuth.observeAuthState(function aoMudarUsuarioFirebase(usuarioFirebase) {
    if (!usuarioFirebase) {
      const authAdapter = window.PortalGeapaAuthAdapter;
      const sessaoAtual = authAdapter && typeof authAdapter.getCurrentSession === 'function'
        ? authAdapter.getCurrentSession()
        : null;
      if (sessaoAtual && sessaoAtual.fastPathConcedido === true) {
        limparSessaoLocal();
        limparResumoSeguroLocal();
        limparUsuarioAtual();
        atualizarContextoUsuario(usuarioContexto, null);
        mostrarTelaAcesso(app, telaAcesso, telaSituacao);
        atualizarStatus(status, 'Sua sessao Firebase terminou. Entre novamente para continuar.');
      }
      return;
    }

    const sessaoAppsScriptExistente = Boolean(lerSessaoLocal());
    if (!sessaoAppsScriptExistente) mostrarLoadingGlobal('Restaurando sessao...');
    atualizarStatus(status, sessaoAppsScriptExistente
      ? 'Conferindo sessao em segundo plano...'
      : 'Restaurando sessao neste dispositivo...');

    autenticarFirebaseNoPortal(
      usuarioFirebase,
      app,
      telaAcesso,
      telaSituacao,
      situacao,
      status,
      usuarioContexto,
      { restaurando: true, background: sessaoAppsScriptExistente }
    ).catch(function tratarErroFirebase(erro) {
      atualizarStatus(status, erro.message || 'Não foi possível restaurar o login com Google.');
    }).finally(function finalizarRestauracaoFirebase() {
      ocultarLoadingGlobal();
    });
  });
}

/**
 * Usa a sessao persistente do Firebase para recriar a sessao curta do portal.
 */
function tentarRestaurarComFirebase(app, telaAcesso, telaSituacao, situacao, status, usuarioContexto) {
  const firebaseAuth = window.PortalGeapaFirebaseAuth;

  if (!firebaseAuth || !firebaseAuth.isAvailable()) {
    return Promise.resolve(false);
  }

  const usuarioFirebase = firebaseAuth.getCurrentUser();

  if (!usuarioFirebase) {
    return Promise.resolve(false);
  }

  return autenticarFirebaseNoPortal(
    usuarioFirebase,
    app,
    telaAcesso,
    telaSituacao,
    situacao,
    status,
    usuarioContexto,
    { restaurando: true }
  ).then(function restaurado() {
    return true;
  });
}

/**
 * Encerra tambem a sessao persistente do Firebase, quando ela existir.
 */
function sairFirebaseSeDisponivel() {
  const firebaseAuth = window.PortalGeapaFirebaseAuth;

  if (!firebaseAuth || !firebaseAuth.isAvailable()) {
    return Promise.resolve();
  }

  return firebaseAuth.signOutFromGoogle().catch(function ignorarErroSaida() {});
}

/**
 * Chama o Apps Script pelo cliente central do Portal.
 *
 * Nao adicionar chaves, tokens fixos ou IDs sensiveis neste cliente publico.
 * A autorizacao real deve continuar no Apps Script.
 *
 * @param {string} acao Nome da acao no backend.
 * @param {Object} dados Parametros da acao.
 * @return {Promise<Object>} Resposta JSON do Apps Script.
 */
async function chamarApi(acao, dados) {
  const inicio = obterTempoAtual();
  const api = window.PortalGeapaApi;
  if (!api || typeof api.callAction !== 'function') {
    throw new Error('Cliente de API do Portal GEAPA não foi carregado.');
  }

  const payload = await api.callAction(acao, dados || {});

  if (!payload.ok) {
    const erroApi = new Error(obterMensagem(payload) || 'A API retornou uma resposta inesperada.');
    erroApi.code = String(payload.code || 'API_RESPOSTA_NEGATIVA');
    erroApi.portalResponse = payload;
    throw erroApi;
  }

  registrarDesempenhoApi(acao, {
    tempoClienteMs: Math.round(obterTempoAtual() - inicio),
    tempoBackendMs: obterTempoBackendMs(payload),
    origemDados: obterOrigemDados(payload)
  });

  return payload;
}

/**
 * Adapta a resposta parcial do Apps Script para a interface.
 *
 * @param {Object} resposta Resposta da acao minhaSituacao.
 * @return {Object} Dados prontos para renderizacao.
 */
function normalizarMinhaSituacao(resposta) {
  const dados = (resposta.data && resposta.data.situacao) || resposta.dados || {};
  const pendencias = Array.isArray(dados.pendencias) ? dados.pendencias : [];
  const participacao = dados.participacao || {};
  const diretoria = dados.diretoria || {};
  const usuario = dados.usuario || {};
  const resumoOperacional = normalizarResumoOperacionalMinhaSituacao(dados.resumoOperacional || {});
  const sessao = extrairSessaoPortal(resposta, dados);
  const desempenho = (resposta.meta && resposta.meta.desempenho) || {};

  return {
    modo: (resposta.meta && resposta.meta.modo) || resposta.modo || 'placeholder',
    nomeExibicao: dados.nomeExibicao || 'Membro GEAPA',
    situacaoGeral: dados.situacaoGeral || 'Simulada',
    vinculo: dados.vinculo || 'Vínculo em preparação',
    rga: dados.rga || 'RGA-SIMULADO',
    usuario: normalizarUsuario(usuario, dados, sessao),
    sessao: sessao,
    dadosCadastraisReais: Boolean(dados.dadosCadastraisReais),
    blocosComplementares: dados.blocosComplementares || 'em-preparacao',
    ultimaAtualizacao: dados.ultimaAtualizacao || dados.atualizadoEm || '',
    resumo: dados.resumo || {},
    resumoOperacional: resumoOperacional,
    pendencias: pendencias,
    participacao: {
      frequenciaGeral: participacao.frequenciaGeral || '',
      atividadesRecentes: Array.isArray(participacao.atividadesRecentes)
        ? participacao.atividadesRecentes
        : [],
      apresentacoes: normalizarApresentacoes(participacao.apresentacoes)
    },
    diretoria: normalizarDiretoria(diretoria),
    certificados: dados.certificados || [],
    desempenho: {
      origemDados: desempenho.origemDados || '',
      tempoBackendMs: normalizarNumeroNaoNegativo(desempenho.tempoMs),
      tempoClienteMs: 0
    },
    avisos: dados.avisos || [
      'O resumo operacional é carregado pelo backend do portal.',
      'Nenhum dado real de membro está no GitHub Pages.',
      'Campos vazios podem aparecer como Em atualização enquanto as views oficiais sao recalculadas.'
    ]
  };
}

/**
 * Adapta a resposta do Apps Script para a tela "Meu perfil".
 *
 * @param {Object} resposta Resposta da acao meuPerfil.
 * @return {Object} Perfil normalizado.
 */
function normalizarMeuPerfil(resposta) {
  const data = resposta && resposta.data ? resposta.data : {};
  const perfil = data.perfil || {};
  const desempenho = (resposta.meta && resposta.meta.desempenho) || {};

  return {
    somenteLeitura: data.somenteLeitura !== false,
    avisos: Array.isArray(data.avisos) ? data.avisos : [],
    perfil: {
      nomeCompleto: perfil.nomeCompleto || '',
      nomeExibicao: perfil.nomeExibicao || '',
      rga: perfil.rga || '',
      cpf: perfil.cpf || '',
      dataNascimento: perfil.dataNascimento || '',
      telefone: perfil.telefone || '',
      email: perfil.email || '',
      instagram: perfil.instagram || '',
      linkLattes: perfil.linkLattes || '',
      linksPerfis: normalizarLinksPerfis(perfil.linksPerfis),
      cidadeOrigem: perfil.cidadeOrigem || '',
      ufOrigem: perfil.ufOrigem || '',
      paisOrigemCodigo: perfil.paisOrigemCodigo || '',
      paisOrigemNome: perfil.paisOrigemNome || '',
      municipioOrigemCodigo: perfil.municipioOrigemCodigo || '',
      regiaoOrigem: perfil.regiaoOrigem || '',
      cursoId: perfil.cursoId || '',
      cursoNome: perfil.cursoNome || '',
      instituicaoEnsino: perfil.instituicaoEnsino || '',
      campus: perfil.campus || '',
      nivelCurso: perfil.nivelCurso || '',
      periodoIngressoCurso: perfil.periodoIngressoCurso || '',
      semestreAtualCursoCalculado: perfil.semestreAtualCursoCalculado || '',
      semestreAtualCursoCalculadoEm: perfil.semestreAtualCursoCalculadoEm || '',
      statusCompletudeCadastral: perfil.statusCompletudeCadastral || 'PENDENTE',
      explicacaoSemestreAtualCurso: perfil.explicacaoSemestreAtualCurso || '',
      historicoAcademico: perfil.historicoAcademico || perfil.resumoAcademico || '',
      statusCadastral: perfil.statusCadastral || ''
    },
    desempenho: {
      origemDados: desempenho.origemDados || '',
      tempoBackendMs: normalizarNumeroNaoNegativo(desempenho.tempoMs),
      tempoClienteMs: 0
    }
  };
}

/**
 * Normaliza os links do proprio perfil recebidos pelo backend seguro.
 * @param {Object[]} links Lista recebida do GEAPA-CORE.
 * @return {Object[]} Links validos e sem duplicidade para exibicao.
 */
function normalizarLinksPerfis(links) {
  const vistos = {};
  const normalizados = (Array.isArray(links) ? links : []).map(function(link) {
    const tipo = String((link && link.tipo) || 'OUTRO').trim().toUpperCase();
    const url = normalizarUrlPerfil(link && link.url);
    const rotulo = String((link && link.rotulo) || rotuloPadraoLinkPerfil(tipo)).trim();
    const chave = tipo + '|' + url.toLowerCase();

    if (!url || vistos[chave]) {
      return null;
    }
    vistos[chave] = true;
    return { tipo: tipo, url: url, rotulo: rotulo };
  }).filter(Boolean);

  return normalizados.sort(function(a, b) {
    const prioridadeA = a.tipo === 'LATTES' ? 0 : 1;
    const prioridadeB = b.tipo === 'LATTES' ? 0 : 1;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
    return a.rotulo.localeCompare(b.rotulo);
  });
}

/** Retorna o rotulo padrao para os tipos de links reconhecidos pelo Portal. */
function rotuloPadraoLinkPerfil(tipo) {
  const rotulos = {
    LATTES: 'Curriculo Lattes',
    LINKEDIN: 'LinkedIn',
    ORCID: 'ORCID',
    INSTAGRAM: 'Instagram',
    SITE_PESSOAL: 'Site pessoal',
    GOOGLE_SCHOLAR: 'Google Scholar',
    RESEARCHGATE: 'ResearchGate',
    OUTRO: 'Link externo'
  };
  return rotulos[tipo] || rotulos.OUTRO;
}

/**
 * Normaliza o resumo operacional vindo de PESSOAS_RESUMO_OPERACIONAL via Core.
 *
 * @param {Object} resumo Dados brutos do backend.
 * @return {Object} Resumo operacional seguro para a tela Minha situacao.
 */
function normalizarResumoOperacionalMinhaSituacao(resumo) {
  const dados = resumo || {};

  return {
    statusVinculo: String(dados.statusVinculo || '').trim(),
    tipoVinculo: String(dados.tipoVinculo || '').trim(),
    cargoFuncaoAtual: String(dados.cargoFuncaoAtual || '').trim(),
    tempoEfetivoNoGrupo: String(dados.tempoEfetivoNoGrupo || '').trim(),
    qtdSemestresNoGrupo: dados.qtdSemestresNoGrupo === 0 || dados.qtdSemestresNoGrupo
      ? String(dados.qtdSemestresNoGrupo)
      : '',
    frequenciaResumida: String(dados.frequenciaResumida || '').trim(),
    qtdApresentacoesRealizadas: dados.qtdApresentacoesRealizadas === 0 || dados.qtdApresentacoesRealizadas
      ? String(dados.qtdApresentacoesRealizadas)
      : '',
    periodoUltimaApresentacao: String(dados.cicloUltimaApresentacao || dados.periodoUltimaApresentacao || '').trim(),
    certificadosDisponiveis: dados.certificadosDisponiveis === 0 || dados.certificadosDisponiveis
      ? String(dados.certificadosDisponiveis)
      : '',
    pendenciasAbertas: String(dados.pendenciasAbertas || '').trim()
  };
}

/**
 * Aplica sessao retornada por login/validacao antes de carregar Minha situacao.
 *
 * @param {Object} resposta Resposta de validarCodigo ou portalLogin.
 * @param {HTMLElement} usuarioContexto Elemento de contexto do usuario.
 */
function aplicarContextoSessaoInicial(resposta, usuarioContexto) {
  const dados = resposta && resposta.data ? resposta.data : {};
  const sessao = extrairSessaoPortal(resposta, {});

  if (!sessao) {
    return;
  }

  const usuario = normalizarUsuario(dados.usuario || {}, {}, sessao);

  aplicarUsuarioAtual({
    usuario: usuario,
    sessao: sessao
  });
  registrarSessaoCoreDebug(
    sessao,
    resposta && resposta.meta && resposta.meta.desempenho && resposta.meta.desempenho.origemDados
  );
  atualizarContextoUsuario(usuarioContexto, usuario);
}

function registrarSessaoCoreDebug(sessao, origemDados) {
  const dados = sessao || {};
  registrarDebugAuthPortal('CORE_SESSION_CHANGED', {
    loggedIn: Boolean(dados.idPessoa || dados.id || dados.email || dados.autenticado === true),
    idPessoa: dados.idPessoa || dados.id || '',
    email: dados.email || dados.emailNormalizado || '',
    emailAutenticacao: dados.emailAutenticacao || '',
    identidadeFirebaseCoreConfirmada: dados.identidadeFirebaseCoreConfirmada === true,
    identidadeFirebaseCoreCodigo: dados.identidadeFirebaseCoreCodigo || '',
    perfil: dados.perfilPortalEfetivo || dados.perfilPrincipal || dados.perfil || '',
    origemDados: origemDados || dados.origemDados || dados.origemSessao || 'GEAPA_CORE'
  });
}

/**
 * Persiste apenas um resumo visual seguro, sem tokens ou dados sensiveis.
 *
 * @param {Object} resposta Resposta oficial do backend.
 */
function salvarResumoSeguroDaResposta(resposta) {
  const firestoreSession = window.PortalGeapaFirestoreSession;
  const sessao = extrairSessaoPortal(resposta, {});

  if (
    !sessao ||
    !firestoreSession ||
    typeof firestoreSession.salvarResumoSeguro !== 'function'
  ) {
    return;
  }

  firestoreSession.salvarResumoSeguro(sessao);
}

/**
 * Remove o resumo visual seguro usado na restauracao entre visitas.
 */
function limparResumoSeguroLocal() {
  if (
    window.PortalGeapaFirestoreSession &&
    typeof window.PortalGeapaFirestoreSession.limparResumoSeguro === 'function'
  ) {
    window.PortalGeapaFirestoreSession.limparResumoSeguro();
  }
}

/**
 * Obtem mensagem considerando o contrato novo e o legado.
 *
 * @param {Object} resposta Resposta da API.
 * @return {string} Mensagem da resposta.
 */
function obterMensagem(resposta) {
  const data = resposta && resposta.data ? resposta.data : {};
  const sessao = data.sessao || data.session || data.usuarioAtual || {};

  return resposta.message ||
    resposta.mensagem ||
    data.mensagemBloqueio ||
    sessao.mensagemBloqueio ||
    '';
}

/**
 * Obtem token de sessao considerando o contrato novo e o legado.
 *
 * @param {Object} resposta Resposta da API.
 * @return {string} Token temporario placeholder.
 */
function obterSessionToken(resposta) {
  return (resposta.data && resposta.data.sessionToken) || resposta.token || '';
}

/**
 * Extrai a sessao resolvida do contrato novo do CORE, quando disponivel.
 *
 * @param {Object} resposta Resposta completa da API.
 * @param {Object=} dadosSituacao Bloco situacao, quando a acao for minhaSituacao.
 * @return {Object|null} Sessao resolvida do portal.
 */
function extrairSessaoPortal(resposta, dadosSituacao) {
  const data = resposta && resposta.data ? resposta.data : {};
  const dados = dadosSituacao || {};

  return data.sessao ||
    data.session ||
    data.usuarioAtual ||
    dados.sessao ||
    dados.session ||
    null;
}

/**
 * Renderiza a area "Minha situacao".
 *
 * @param {HTMLElement} container Elemento que recebera a tela.
 * @param {Object} dados Dados parciais retornados por carregarMinhaSituacao.
 */
function renderizarMinhaSituacao(container, dados) {
  const resumoOperacional = dados.resumoOperacional || {};
  const apresentacoes = dados.participacao.apresentacoes || {};
  const pendenciasTexto = resumoOperacional.pendenciasAbertas && resumoOperacional.pendenciasAbertas !== 'SEM_PENDENCIAS'
    ? resumoOperacional.pendenciasAbertas
    : String(dados.resumo.pendenciasAbertas || dados.pendencias.length || 0);

  container.innerHTML = [
    '<div class="member-header">',
    '<div>',
    '<p class="simulation-title">' + escaparHtml(dados.nomeExibicao) + '</p>',
    '<p class="member-subtitle">Painel operacional resumido do seu vínculo no GEAPA</p>',
    '</div>',
    '<span class="status-pill">' + escaparHtml(valorResumoOperacional('statusVinculo', resumoOperacional.statusVinculo || dados.situacaoGeral)) + '</span>',
    '</div>',
    '<p class="section-note">Dados consolidados pelo GEAPA-CORE a partir de PESSOAS_RESUMO_OPERACIONAL e demais views oficiais. Dados cadastrais detalhados ficam em Meu perfil.</p>',
    '<dl class="summary-grid">',
    montarResumoOperacionalItem('Status do vínculo', 'statusVinculo', resumoOperacional.statusVinculo || dados.situacaoGeral),
    montarResumoOperacionalItem('Tipo de vínculo', 'tipoVinculo', resumoOperacional.tipoVinculo || dados.vinculo),
    montarResumoOperacionalItem('Cargo/função atual', 'cargoFuncaoAtual', resumoOperacional.cargoFuncaoAtual),
    montarResumoOperacionalItem('Tempo efetivo no grupo', 'tempoEfetivoNoGrupo', resumoOperacional.tempoEfetivoNoGrupo),
    montarResumoOperacionalItem('Quantidade de semestres', 'qtdSemestresNoGrupo', resumoOperacional.qtdSemestresNoGrupo),
    montarResumoOperacionalItem('Frequência resumida', 'frequenciaResumida', resumoOperacional.frequenciaResumida || dados.resumo.frequencia || dados.participacao.frequenciaGeral),
    montarResumoOperacionalItem('Apresentações realizadas', 'qtdApresentacoesRealizadas', resumoOperacional.qtdApresentacoesRealizadas || formatarQuantidadeApresentacoes(apresentacoes.quantidadeRealizadas)),
    montarResumoOperacionalItem('Período da última apresentação', 'periodoUltimaApresentacao', resumoOperacional.periodoUltimaApresentacao || apresentacoes.periodoUltimaApresentacao),
    montarResumoOperacionalItem('Certificados disponíveis', 'certificadosDisponiveis', resumoOperacional.certificadosDisponiveis || String(dados.resumo.certificadosDisponiveis || dados.certificados.length || 0)),
    montarResumoOperacionalItem('Pendências abertas', 'pendenciasAbertas', pendenciasTexto),
    '</dl>',
    '<div class="situation-section">',
    '<h3>Atalhos</h3>',
    montarAtalhosMinhaSituacao(),
    '</div>',
    '<div class="situation-section">',
    '<h3>Pendências</h3>',
    montarPendencias(dados.pendencias),
    '</div>',
    '<div class="situation-section">',
    '<h3>Avisos</h3>',
    montarListaOuVazio(dados.avisos, 'Nenhum aviso registrado nesta etapa.'),
    '</div>',
    dados.ultimaAtualizacao
      ? '<p class="updated-at">Atualizado em: ' + escaparHtml(formatarData(dados.ultimaAtualizacao)) + '</p>'
      : ''
  ].join('');
}

/**
 * Renderiza a tela "Meu perfil" em modo somente leitura.
 *
 * @param {HTMLElement} container Elemento que recebera a tela.
 * @param {Object} dados Perfil normalizado retornado por carregarMeuPerfil.
 */
function renderizarMeuPerfil(container, dados) {
  const perfil = (dados && dados.perfil) || {};
  const localOrigem = perfil.paisOrigemCodigo === 'BR'
    ? [perfil.cidadeOrigem, perfil.ufOrigem, perfil.paisOrigemNome].filter(Boolean).join(' / ')
    : [perfil.cidadeOrigem, perfil.regiaoOrigem, perfil.paisOrigemNome].filter(Boolean).join(' / ');
  const avisos = (dados && dados.avisos && dados.avisos.length)
    ? dados.avisos
    : ['Dados carregados pelo backend seguro do Portal GEAPA.'];

  container.innerHTML = [
    '<div class="member-header">',
    '<div>',
    '<p class="simulation-title">' + escaparHtml(perfil.nomeExibicao || perfil.nomeCompleto || 'Meu perfil') + '</p>',
    '<p class="member-subtitle">Dados cadastrais e solicitações de correção</p>',
    '</div>',
    '<div class="profile-header-actions"><span class="status-pill">' + escaparHtml(perfil.statusCadastral || 'Status nao informado') + '</span>',
    perfilEdicaoHabilitada() ? '<button class="secondary-button compact-button" type="button" data-profile-edit>Editar perfil</button>' : '', '</div>',
    '</div>',
    '<div id="profile-persistent-feedback" class="portal-feedback-slot" hidden></div>',
    '<p class="section-note">Confira os dados que o GEAPA possui sobre voce. Campos vazios aparecem destacados para facilitar a regularizacao.</p>',
    '<h3 class="profile-section-title">Identidade</h3>',
    '<dl class="summary-grid">',
    montarPerfilItemSensivel('Nome completo', perfil.nomeCompleto, 'NOME_COMPLETO'),
    montarPerfilItem('Nome de exibicao', perfil.nomeExibicao),
    montarPerfilItemSensivel('RGA', perfil.rga, 'RGA'),
    montarPerfilItemSensivel('CPF', perfil.cpf, 'CPF'),
    montarPerfilItemSensivel('Data de nascimento', perfil.dataNascimento, 'DATA_NASCIMENTO'),
    montarPerfilItem('Status cadastral', perfil.statusCadastral),
    '</dl>',
    '<h3 class="profile-section-title">Contato e redes</h3>',
    '<dl class="summary-grid">',
    montarPerfilItemSensivel('E-mail principal', perfil.email, 'EMAIL_PRINCIPAL'),
    montarPerfilItem('Telefone', perfil.telefone),
    montarPerfilItem('Instagram', perfil.instagram),
    '</dl>',
    '<h3 class="profile-section-title">Links academicos e perfis</h3>',
    '<p class="section-note">Links ativos do seu cadastro. A exibicao publica exige autorizacao especifica.</p>',
    montarPerfilLinks(perfil.linksPerfis),
    '<h3 class="profile-section-title">Origem e historico academico</h3>',
    '<dl class="summary-grid">',
    montarPerfilItem('Cidade/UF de origem', localOrigem),
    montarPerfilItem('Historico academico', perfil.historicoAcademico),
    '</dl>',
    '<h3 class="profile-section-title">Formação acadêmica</h3>',
    '<dl class="summary-grid">',
    montarPerfilItemSensivel('Curso', perfil.cursoNome, 'CURSO_ID'),
    montarPerfilItem('Instituição / campus', [perfil.instituicaoEnsino, perfil.campus].filter(Boolean).join(' / ')),
    montarPerfilItem('Nível', perfil.nivelCurso),
    montarPerfilItem('Período de ingresso no curso', perfil.periodoIngressoCurso),
    montarPerfilItem('Semestre atual estimado', perfil.semestreAtualCursoCalculado ? perfil.semestreAtualCursoCalculado + 'º semestre' : ''),
    montarPerfilItem('Completude cadastral', perfil.statusCompletudeCadastral),
    '</dl>',
    '<p class="section-note">' + escaparHtml(perfil.explicacaoSemestreAtualCurso || 'Estimativa calculada pelo período de ingresso registrado no RGA e pelo calendário acadêmico. Pode não refletir trancamentos ou alterações individuais.') + '</p>',
    '<div class="situation-section">',
    '<h3>Avisos</h3>',
    montarListaOuVazio(avisos, 'Nenhum aviso registrado.'),
    '</div>',
    '<section class="situation-section" aria-labelledby="minhas-solicitacoes-title">',
    '<h3 id="minhas-solicitacoes-title">Minhas solicitações cadastrais</h3>',
    '<div data-profile-requests><p class="empty-state">Carregando solicitações...</p></div>',
    '</section>'
  ].join('');

  carregarSolicitacoesMeuPerfil(container);
}

function montarPerfilItemSensivel(rotulo, valor, campo) {
  const valorExibido = campo === 'DATA_NASCIMENTO' ? formatarDataNascimentoPerfil_(valor) : valor;
  return [
    '<div class="summary-item profile-sensitive-item">',
    '<dt>' + escaparHtml(rotulo) + '</dt>',
    '<dd>' + escaparHtml(valorExibido || 'Não informado ainda') + '</dd>',
    perfilEdicaoHabilitada() ? '<button class="btn-link profile-correction-link" type="button" data-profile-correction="' + escaparHtml(campo) + '" data-profile-current="' + escaparHtml(valorExibido || '') + '">Solicitar correção</button>' : '',
    '</div>'
  ].join('');
}

function perfilEdicaoHabilitada() {
  const config = window.PortalGeapaConfig || {};
  const ambiente = String(config.ENVIRONMENT || '').toUpperCase();
  return ['HOMOLOG', 'PROD'].indexOf(ambiente) >= 0 && config.ENABLE_PROFILE_UPDATES === true;
}

function renderizarEdicaoMeuPerfil(container, dados) {
  const perfil = (dados && dados.perfil) || {};
  const links = {};
  (perfil.linksPerfis || []).forEach(function indexar(link) { links[link.tipo] = link.url; });
  container.innerHTML = [
    '<div class="member-header"><div><p class="simulation-title">Editar meu perfil</p>',
    '<p class="member-subtitle">Os campos cadastrais sensíveis continuam sujeitos a solicitação.</p></div></div>',
    '<div id="profile-persistent-feedback" class="portal-feedback-slot" hidden></div>',
    '<form class="profile-edit-form" data-profile-edit-form>',
    '<div class="profile-form-grid">',
    campoPerfil('telefone', 'Telefone', perfil.telefone, 'tel'),
    campoPerfil('instagram', 'Instagram', perfil.instagram, 'text'),
    window.PortalGeapaLocalidades ? window.PortalGeapaLocalidades.renderFields(perfil) : '<p class="portal-feedback is-error">Catálogo de localidades indisponível.</p>',
    '</div>',
    '<label class="profile-form-wide"><span>Resumo/histórico acadêmico</span><textarea name="resumoAcademico" rows="6" maxlength="3000">' + escaparHtml(perfil.historicoAcademico || '') + '</textarea></label>',
    '<fieldset class="profile-links-fieldset"><legend>Links acadêmicos e profissionais</legend><div class="profile-form-grid">',
    campoPerfil('linkLattes', 'Currículo Lattes', links.LATTES, 'url'),
    campoPerfil('linkLinkedin', 'LinkedIn', links.LINKEDIN, 'url'),
    campoPerfil('linkOrcid', 'ORCID', links.ORCID, 'url'),
    campoPerfil('linkSite', 'Site pessoal', links.SITE_PESSOAL, 'url'),
    '</div></fieldset>',
    '<div class="profile-form-actions"><button class="secondary-button" type="button" data-profile-cancel>Cancelar</button>',
    '<button class="primary-button" type="submit">Salvar alterações</button></div>',
    '</form>'
  ].join('');
  if (window.PortalGeapaLocalidades) window.PortalGeapaLocalidades.hydrate(container.querySelector('[data-profile-edit-form]'));
}

function campoPerfil(nome, rotulo, valor, tipo, maxlength) {
  return '<label><span>' + escaparHtml(rotulo) + '</span><input name="' + escaparHtml(nome) + '" type="' + escaparHtml(tipo || 'text') + '" value="' + escaparHtml(valor || '') + '"' + (maxlength ? ' maxlength="' + maxlength + '"' : '') + '></label>';
}

/**
 * Mostra carregamento na tela "Meu perfil".
 *
 * @param {HTMLElement} container Area da tela.
 */
function renderizarCarregandoMeuPerfil(container) {
  container.innerHTML = [
    '<p class="simulation-title">Carregando meu perfil</p>',
    '<p class="empty-state">Buscando dados cadastrais no backend seguro do Portal GEAPA.</p>'
  ].join('');
}

/**
 * Mostra erro dentro da tela "Meu perfil".
 *
 * @param {HTMLElement} container Area da tela.
 * @param {string} mensagem Mensagem de erro.
 */
function renderizarErroMeuPerfil(container, mensagem) {
  container.innerHTML = [
    '<p class="simulation-title">Nao foi possivel carregar meu perfil</p>',
    '<p class="empty-state">' + escaparHtml(mensagem || 'Tente sair e entrar novamente.') + '</p>'
  ].join('');
}

/**
 * Mostra um estado de carregamento para a tela de situação.
 *
 * @param {HTMLElement} container Area da tela Minha situação.
 */
function renderizarCarregandoSituacao(container) {
  container.innerHTML = [
    '<p class="simulation-title">Carregando minha situação</p>',
    '<p class="empty-state">Buscando dados no backend do Portal GEAPA.</p>'
  ].join('');
}

/**
 * Mostra erro dentro da tela de situação.
 *
 * @param {HTMLElement} container Area da tela Minha situação.
 * @param {string} mensagem Mensagem de erro.
 */
function renderizarErroSituacao(container, mensagem) {
  container.innerHTML = [
    '<p class="simulation-title">Não foi possível carregar minha situação</p>',
    '<p class="empty-state">' + escaparHtml(mensagem || 'Tente sair e entrar novamente.') + '</p>'
  ].join('');
}

/**
 * Monta um item do resumo principal.
 *
 * @param {string} rotulo Rotulo do campo.
 * @param {string} valor Valor do campo.
 * @return {string} HTML do item.
 */
function montarResumoItem(rotulo, valor) {
  return [
    '<div class="summary-item">',
    '<dt>' + escaparHtml(rotulo) + '</dt>',
    '<dd>' + escaparHtml(valor || '-') + '</dd>',
    '</div>'
  ].join('');
}

/**
 * Monta um card operacional da tela Minha situacao.
 *
 * @param {string} rotulo Rotulo visivel.
 * @param {string} campo Nome tecnico do campo.
 * @param {string} valor Valor calculado pelo backend.
 * @return {string} HTML do card.
 */
function montarResumoOperacionalItem(rotulo, campo, valor) {
  const texto = valorResumoOperacional(campo, valor);
  const vazio = texto === 'Em atualização';

  return [
    '<div class="summary-item',
    vazio ? ' empty-value' : '',
    '">',
    '<dt>' + escaparHtml(rotulo) + '</dt>',
    '<dd>' + escaparHtml(texto) + '</dd>',
    vazio ? '<p class="profile-note">Aguardando atualização do resumo operacional.</p>' : '',
    '</div>'
  ].join('');
}

/**
 * Normaliza valor operacional vazio e registra aviso tecnico no console.
 *
 * @param {string} campo Nome tecnico do campo.
 * @param {string} valor Valor bruto.
 * @return {string} Valor pronto para exibicao.
 */
function valorResumoOperacional(campo, valor) {
  const texto = String(valor == null ? '' : valor).trim();

  if (texto) {
    return texto;
  }

  registrarAvisoResumoOperacional(campo);
  return 'Em atualização';
}

/**
 * Emite aviso tecnico sem quebrar a tela quando o resumo operacional esta incompleto.
 *
 * @param {string} campo Nome tecnico do campo incompleto.
 */
function registrarAvisoResumoOperacional(campo) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[Portal GEAPA][Minha Situação] Campo vazio em PESSOAS_RESUMO_OPERACIONAL:', campo);
  }
}

/**
 * Monta botoes de direcionamento do painel operacional.
 *
 * @return {string} HTML dos atalhos.
 */
function montarAtalhosMinhaSituacao() {
  const atalhos = [
    { rota: 'meu-perfil', label: 'Meu perfil' },
    { rota: 'frequencia', label: 'Minha frequência' },
    { rota: 'minhas-apresentacoes', label: 'Minhas apresentações' },
    { rota: 'certificados', label: 'Meus certificados' }
  ];

  return [
    '<div class="situation-actions">',
    atalhos.map(function montarAtalho(atalho) {
      return [
        '<button class="secondary-button" type="button" data-route-target="',
        escaparHtml(atalho.rota),
        '">',
        escaparHtml(atalho.label),
        '</button>'
      ].join('');
    }).join(''),
    '</div>'
  ].join('');
}

/**
 * Monta um item da tela "Meu perfil", destacando campos vazios.
 *
 * @param {string} rotulo Rotulo do campo.
 * @param {string} valor Valor do campo.
 * @param {Object=} opcoes Opcoes de renderizacao.
 * @return {string} HTML do item.
 */
function montarPerfilItem(rotulo, valor, opcoes) {
  const configuracao = opcoes || {};
  const texto = String(valor || '').trim();
  const vazio = !texto;
  const url = configuracao.link ? normalizarUrlPerfil(texto) : '';
  const conteudo = vazio
    ? 'Não informado ainda'
    : texto;
  const conteudoHtml = !vazio && url
    ? '<a href="' + escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escaparHtml(texto) + '</a>'
    : escaparHtml(conteudo);

  return [
    '<div class="summary-item',
    vazio ? ' empty-value' : '',
    '">',
    '<dt>' + escaparHtml(rotulo) + '</dt>',
    '<dd>' + conteudoHtml + '</dd>',
    vazio ? '<p class="profile-note">Atualização recomendada.</p>' : '',
    '</div>'
  ].join('');
}

/** Monta os links academicos e publicos vinculados ao proprio perfil. */
function montarPerfilLinks(links) {
  const lista = Array.isArray(links) ? links : [];

  if (!lista.length) {
    return '<p class="empty-state">Nenhum link academico ou de perfil informado ainda.</p>';
  }

  return [
    '<dl class="summary-grid">',
    lista.map(function(link) {
      return montarPerfilItem(link.rotulo || rotuloPadraoLinkPerfil(link.tipo), link.url, { link: true });
    }).join(''),
    '</dl>'
  ].join('');
}

/**
 * Normaliza URLs de perfil antes de montar links clicaveis.
 *
 * @param {string} valor Valor informado no cadastro.
 * @return {string} URL segura ou vazio.
 */
function normalizarUrlPerfil(valor) {
  const texto = String(valor || '').trim();

  if (!texto) {
    return '';
  }

  if (/^https?:\/\//i.test(texto)) {
    return texto;
  }

  if (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(texto)) {
    return 'https://' + texto;
  }

  return '';
}

/**
 * Normaliza o bloco de apresentacoes retornado pelo GEAPA-CORE.
 *
 * @param {Object} apresentacoes Dados brutos de apresentacoes.
 * @return {Object} Dados normalizados.
 */
function normalizarApresentacoes(apresentacoes) {
  const dados = apresentacoes || {};

  return {
    periodoUltimaApresentacao: String(dados.periodoUltimaApresentacao || '').trim(),
    quantidadeRealizadas: normalizarNumeroNaoNegativo(dados.quantidadeRealizadas)
  };
}

/**
 * Normaliza o bloco orientativo de elegibilidade para Diretoria.
 *
 * @param {Object} diretoria Dados brutos de diretoria.
 * @return {Object} Dados normalizados.
 */
function normalizarDiretoria(diretoria) {
  const dados = diretoria || {};

  return {
    statusElegibilidade: String(dados.statusElegibilidade || '').trim(),
    diasComputados: normalizarNumeroNaoNegativo(dados.diasComputados),
    limiteDias: normalizarNumeroNaoNegativo(dados.limiteDias),
    saldoDias: normalizarNumeroNaoNegativo(dados.saldoDias),
    dataLimiteEstimada: String(dados.dataLimiteEstimada || '').trim()
  };
}

/**
 * Normaliza o usuario autenticado retornado pelo backend.
 *
 * @param {Object} usuario Dados de perfil vindos do Apps Script/Core.
 * @param {Object} dadosSituacao Dados principais da tela Minha situacao.
 * @param {Object|null} sessao Sessao resolvida pelo CORE, quando disponivel.
 * @return {Object} Usuario seguro para controlar a interface.
 */
function normalizarUsuario(usuario, dadosSituacao, sessao) {
  const dados = usuario || {};
  const situacao = dadosSituacao || {};
  const dadosSessao = sessao || {};
  let perfisBrutos = dados.perfisPortal || dados.perfis;

  if (Array.isArray(dadosSessao.perfis) && dadosSessao.perfis.length) {
    perfisBrutos = dadosSessao.perfis;
  }

  if (Array.isArray(dadosSessao.perfisPortal) && dadosSessao.perfisPortal.length) {
    perfisBrutos = dadosSessao.perfisPortal;
  }

  const perfis = Array.isArray(perfisBrutos) && perfisBrutos.length
    ? perfisBrutos.map(normalizarPerfil)
    : ['VISITANTE'];
  const perfilPrincipal = dadosSessao.perfilPortalEfetivo ||
    dados.perfilPortalEfetivo ||
    dados.perfilPrincipal ||
    dados.perfilPortal;

  return {
    id: String(dados.id || dadosSessao.idPessoa || situacao.rga || '').trim(),
    idPessoa: String(dados.idPessoa || dadosSessao.idPessoa || dados.id || situacao.rga || '').trim(),
    nomeExibicao: String(dados.nomeExibicao || dadosSessao.nomeExibicao || situacao.nomeExibicao || 'Usuário GEAPA').trim(),
    email: String(dados.email || dadosSessao.email || '').trim(),
    rga: String(dados.rga || situacao.rga || '').trim(),
    perfilPrincipal: normalizarPerfil(perfilPrincipal || perfis[0] || 'VISITANTE'),
    perfis: removerDuplicados(perfis),
    perfisPortal: removerDuplicados(perfis),
    cargosAtuais: Array.isArray(dados.cargosAtuais)
      ? dados.cargosAtuais.map(normalizarCargoUsuario)
      : Array.isArray(dadosSessao.cargosAtuais)
        ? dadosSessao.cargosAtuais.map(normalizarCargoUsuario)
        : [],
    portalAtivo: dados.portalAtivo !== false && dadosSessao.portalAtivo !== false,
    modoAcesso: String(dados.modoAcesso || dadosSessao.modoAcesso || '').trim(),
    motivoBloqueio: String(dados.motivoBloqueio || dadosSessao.motivoBloqueio || '').trim(),
    mensagemBloqueio: String(dados.mensagemBloqueio || dadosSessao.mensagemBloqueio || '').trim(),
    tipoVinculoAtual: String(dados.tipoVinculoAtual || dadosSessao.tipoVinculoAtual || '').trim(),
    statusVinculoAtual: String(dados.statusVinculoAtual || dadosSessao.statusVinculoAtual || '').trim(),
    cargoFuncaoAtual: String(dados.cargoFuncaoAtual || dadosSessao.cargoFuncaoAtual || '').trim(),
    permissoes: normalizarPermissoesUsuario(
      dadosSessao.permissoes ||
      dadosSessao.permissoesEfetivas ||
      dados.permissoes ||
      dados.permissoesEfetivas
    )
  };
}

/**
 * Normaliza perfil operacional conhecido.
 *
 * @param {string} perfil Perfil bruto.
 * @return {string} Perfil normalizado.
 */
function normalizarPerfil(perfil) {
  const normalizado = String(perfil || 'VISITANTE').trim().toUpperCase();
  const permitidos = [
    'VISITANTE',
    'PARTICIPANTE_EXTERNO',
    'EXTERNO',
    'COLABORADOR',
    'EGRESSO',
    'MEMBRO',
    'DIRETORIA',
    'PRESIDENCIA',
    'SECRETARIA',
    'COMUNICACAO',
    'CONSELHO',
    'ASSESSORIA',
    'ADMIN',
    'ADMIN_TECNICO'
  ];

  return permitidos.indexOf(normalizado) >= 0 ? normalizado : 'MEMBRO';
}

/**
 * Normaliza cargo atual do usuario.
 *
 * @param {Object} cargo Cargo bruto.
 * @return {Object} Cargo normalizado.
 */
function normalizarCargoUsuario(cargo) {
  const dados = cargo || {};

  return {
    cargoKey: String(dados.cargoKey || '').trim(),
    cargoNome: String(dados.cargoNome || '').trim(),
    grupoCargo: String(dados.grupoCargo || '').trim(),
    fonte: String(dados.fonte || '').trim(),
    idDiretoria: String(dados.idDiretoria || '').trim(),
    dataInicio: String(dados.dataInicio || '').trim(),
    dataFimPrevista: String(dados.dataFimPrevista || '').trim()
  };
}

/**
 * Normaliza permissoes booleanas do usuario.
 *
 * @param {Object} permissoes Permissoes brutas.
 * @return {Object} Permissoes normalizadas.
 */
function normalizarPermissoesUsuario(permissoes) {
  const dados = permissoes || {};
  const chaves = [
    'podeVerAreaDiretoria',
    'podeGerenciarAtividades',
    'podeRegistrarChamada',
    'podeEditarAtividade',
    'podeAnalisarJustificativas',
    'podeGerenciarCertificados',
    'podeGerenciarComunicacao',
    'podeGerenciarConfiguracoes'
  ];
  const saida = {};

  if (Array.isArray(permissoes)) {
    permissoes.forEach(function guardarPermissao(permissao) {
      if (permissao) {
        saida[String(permissao).trim()] = true;
      }
    });

    chaves.forEach(function garantirLegado(chave) {
      if (saida[chave] !== true) {
        saida[chave] = false;
      }
    });

    return saida;
  }

  chaves.forEach(function normalizarPermissao(chave) {
    saida[chave] = dados[chave] === true;
  });

  Object.keys(dados).forEach(function copiarPermissaoCanonica(chave) {
    if (chaves.indexOf(chave) < 0) {
      saida[chave] = dados[chave] === true;
    }
  });

  return saida;
}

/**
 * Remove repeticoes mantendo a ordem.
 *
 * @param {string[]} valores Lista de valores.
 * @return {string[]} Lista sem repeticoes.
 */
function removerDuplicados(valores) {
  const vistos = {};
  const saida = [];

  valores.forEach(function adicionarUnico(valor) {
    if (!valor || vistos[valor]) {
      return;
    }

    vistos[valor] = true;
    saida.push(valor);
  });

  return saida.length ? saida : ['MEMBRO'];
}

/**
 * Tenta restaurar a sessao temporaria ao atualizar a pagina.
 *
 * A sessao fica apenas no sessionStorage do navegador e continua dependendo da
 * validade definida no Apps Script. Ao expirar, o Portal tenta restaurar pelo
 * Firebase Auth persistente antes de pedir nova entrada.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situacao.
 * @param {HTMLElement} situacao Container da tela Minha situacao.
 * @param {HTMLElement} status Elemento de status.
 */
async function restaurarSessaoSalva(app, telaAcesso, telaSituacao, situacao, status, usuarioContexto) {
  const token = lerSessaoLocal();

  if (!token) {
    return false;
  }

  renderizarCarregandoSituacao(situacao);

  try {
    const minhaSituacao = await carregarMinhaSituacaoComControle(token);
    aplicarUsuarioAtual(minhaSituacao);
    atualizarContextoUsuario(usuarioContexto, minhaSituacao.usuario);
    renderizarMinhaSituacao(situacao, minhaSituacao);
    atualizarStatus(status, 'Sessão restaurada neste navegador.');
    registrarSessaoCoreDebug(minhaSituacao.sessao, minhaSituacao.desempenho && minhaSituacao.desempenho.origemDados);
    return true;
  } catch (erro) {
    limparSessaoLocal();
    limparResumoSeguroLocal();
    limparUsuarioAtual();
    atualizarContextoUsuario(usuarioContexto, null);
    atualizarStatus(status, 'Sua sessão expirou. Conferindo o login Google...');
    return false;
  }
}

/**
 * Salva token temporario somente para a aba atual do navegador.
 *
 * @param {string} token Token temporario retornado pelo backend.
 */
function salvarSessaoLocal(token) {
  if (!token) {
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch (erro) {
    // Se o navegador bloquear storage, o portal continua funcionando sem restauracao.
  }
}

/**
 * Le token temporario salvo para a aba atual.
 *
 * @return {string} Token salvo ou vazio.
 */
function lerSessaoLocal() {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch (erro) {
    return '';
  }
}

/**
 * Remove token temporario salvo no navegador.
 */
function limparSessaoLocal() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (erro) {
    // Nada a fazer: storage indisponivel nao deve quebrar o portal.
  }
}

/**
 * Monta pendencias cadastrais ou administrativas retornadas pelo GEAPA-CORE.
 *
 * @param {Array<string|Object>} pendencias Pendencias retornadas pela API.
 * @return {string} HTML das pendencias.
 */
function montarPendencias(pendencias) {
  if (!pendencias || !pendencias.length) {
    return '<p class="empty-state">Nenhuma pendência cadastral aberta.</p>';
  }

  return [
    '<ul class="pendency-list">',
    pendencias.map(function montarPendencia(pendencia) {
      if (typeof pendencia === 'string') {
        return '<li class="pendency-card">' + escaparHtml(pendencia) + '</li>';
      }

      const severidade = normalizarSeveridade(pendencia.severidade);
      const tipo = pendencia.tipo ? formatarRotuloCurto(pendencia.tipo) : 'Pendência';
      const status = pendencia.status ? formatarRotuloCurto(pendencia.status) : 'Pendente';

      return [
        '<li class="pendency-card severity-' + escaparHtml(severidade) + '">',
        '<div class="pendency-heading">',
        '<span>' + escaparHtml(pendencia.titulo || 'Pendência cadastral') + '</span>',
        '<small>' + escaparHtml(tipo + ' · ' + status) + '</small>',
        '</div>',
        pendencia.descricao
          ? '<p>' + escaparHtml(pendencia.descricao) + '</p>'
          : '',
        '<small class="severity-label">Severidade: ' + escaparHtml(formatarRotuloCurto(severidade)) + '</small>',
        '</li>'
      ].join('');
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta o bloco de apresentacoes na secao de participacao.
 *
 * @param {Object} apresentacoes Dados normalizados de apresentacoes.
 * @return {string} HTML do bloco.
 */
function montarApresentacoes(apresentacoes) {
  const possuiAtual = apresentacoes.periodoUltimaApresentacao || apresentacoes.quantidadeRealizadas > 0;

  if (!possuiAtual) {
    return '<p class="empty-state">Nenhuma apresentação registrada até o momento.</p>';
  }

  return [
    '<div class="presentation-list">',
    montarCartaoApresentacao(
      'Apresentações registradas',
      apresentacoes.quantidadeRealizadas,
      apresentacoes.periodoUltimaApresentacao
    ),
    '</div>'
  ].join('');
}

/**
 * Monta o bloco orientativo de elegibilidade para Diretoria.
 *
 * @param {Object} diretoria Dados normalizados de diretoria.
 * @return {string} HTML do bloco.
 */
function montarDiretoria(diretoria) {
  const possuiDados = diretoria.statusElegibilidade ||
    diretoria.diasComputados > 0 ||
    diretoria.limiteDias > 0 ||
    diretoria.saldoDias > 0 ||
    diretoria.dataLimiteEstimada;

  if (!possuiDados) {
    return '<p class="empty-state">Elegibilidade para Diretoria ainda não foi integrada para este cadastro.</p>';
  }

  return [
    '<p class="section-note">',
    'Informação orientativa calculada a partir dos registros disponíveis. Em caso de dúvida, confirme com a Diretoria.',
    '</p>',
    '<div class="board-grid">',
    montarBoardItem('Status', diretoria.statusElegibilidade || 'Não informado'),
    montarBoardItem('Dias computados', String(diretoria.diasComputados)),
    montarBoardItem('Limite de dias', String(diretoria.limiteDias)),
    montarBoardItem('Saldo de dias', String(diretoria.saldoDias)),
    montarBoardItem('Data limite estimada', diretoria.dataLimiteEstimada || 'Não informada'),
    '</div>'
  ].join('');
}

/**
 * Monta os cargos ou funcoes atuais do usuario autenticado.
 *
 * @param {Object[]} cargos Cargos retornados pelo backend.
 * @return {string} HTML do bloco.
 */
function montarCargosUsuario(cargos) {
  if (!cargos || !cargos.length) {
    return '<p class="empty-state">Nenhuma função institucional vigente registrada para este usuário.</p>';
  }

  return [
    '<ul class="role-list">',
    cargos.map(function montarCargo(cargo) {
      const periodo = [
        cargo.dataInicio ? 'Início: ' + formatarDataCurta(cargo.dataInicio) : '',
        cargo.dataFimPrevista ? 'Fim previsto: ' + formatarDataCurta(cargo.dataFimPrevista) : ''
      ].filter(Boolean).join(' · ');

      return [
        '<li class="role-card">',
        '<div>',
        '<span>' + escaparHtml(cargo.cargoNome || formatarPerfil(cargo.cargoKey) || 'Função institucional') + '</span>',
        '<small>' + escaparHtml(formatarPerfil(cargo.grupoCargo || cargo.fonte || '')) + '</small>',
        '</div>',
        periodo ? '<small>' + escaparHtml(periodo) + '</small>' : '',
        '</li>'
      ].join('');
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta item compacto do bloco Diretoria.
 *
 * @param {string} rotulo Rotulo do campo.
 * @param {string} valor Valor do campo.
 * @return {string} HTML do item.
 */
function montarBoardItem(rotulo, valor) {
  return [
    '<div class="board-item">',
    '<span>' + escaparHtml(rotulo) + '</span>',
    '<strong>' + escaparHtml(valor || '-') + '</strong>',
    '</div>'
  ].join('');
}

/**
 * Aplica o usuario atual na camada de autorizacao visual.
 *
 * @param {Object} dados Dados normalizados de Minha situacao.
 */
function aplicarUsuarioAtual(dados) {
  if (window.PortalGeapaAuth && typeof window.PortalGeapaAuth.setUsuarioAtual === 'function') {
    window.PortalGeapaAuth.setUsuarioAtual(dados.usuario);
  }

  if (window.PortalGeapaAuthAdapter && typeof window.PortalGeapaAuthAdapter.setResolvedSession === 'function') {
    if (dados.sessao) {
      window.PortalGeapaAuthAdapter.setResolvedSession(dados.sessao);
    } else if (typeof window.PortalGeapaAuthAdapter.clearResolvedSession === 'function') {
      window.PortalGeapaAuthAdapter.clearResolvedSession();
    }
  }
}

/**
 * Limpa o usuario atual da camada de autorizacao visual.
 */
function limparUsuarioAtual() {
  if (window.PortalGeapaAuth && typeof window.PortalGeapaAuth.limparUsuarioAtual === 'function') {
    window.PortalGeapaAuth.limparUsuarioAtual();
  }

  if (window.PortalGeapaAuthAdapter && typeof window.PortalGeapaAuthAdapter.clearResolvedSession === 'function') {
    window.PortalGeapaAuthAdapter.clearResolvedSession();
  }
  registrarDebugAuthPortal('CORE_SESSION_CLEARED', { code: 'SESSAO_CORE_LIMPA' });
}

/**
 * Atualiza o resumo de perfil exibido no topo da area interna.
 *
 * @param {HTMLElement} container Elemento do resumo.
 * @param {Object|null} usuario Usuario atual.
 */
function atualizarContextoUsuario(container, usuario) {
  if (!container) {
    return;
  }

  if (!usuario) {
    container.hidden = true;
    container.innerHTML = '';

    sincronizarNavegacaoPortal();
    return;
  }

  const perfis = Array.isArray(usuario.perfis) && usuario.perfis.length
    ? usuario.perfis.map(formatarPerfil).join(' · ')
    : 'Membro';

  container.hidden = false;
  container.innerHTML = [
    '<span>' + escaparHtml(formatarPerfil(usuario.perfilPrincipal || 'MEMBRO')) + '</span>',
    '<small>' + escaparHtml(perfis) + '</small>'
  ].join('');

  sincronizarNavegacaoPortal();
}

/**
 * Recalcula itens e estado ativo da navegacao centralizada, quando disponivel.
 */
function sincronizarNavegacaoPortal() {
  const navegacao = window.PortalGeapaNavigation;

  if (navegacao && typeof navegacao.atualizarMenu === 'function') {
    navegacao.atualizarMenu();
  }
}

/**
 * Monta um cartao de resumo de apresentacoes.
 *
 * @param {string} titulo Titulo do cartao.
 * @param {number} quantidade Quantidade de apresentacoes.
 * @param {string} periodo Periodo da ultima apresentacao.
 * @return {string} HTML do cartao.
 */
function montarCartaoApresentacao(titulo, quantidade, periodo) {
  return [
    '<div class="presentation-card">',
    '<span>' + escaparHtml(titulo) + '</span>',
    '<strong>' + escaparHtml(formatarQuantidadeApresentacoes(quantidade)) + '</strong>',
    '<small>Último período: ' + escaparHtml(periodo || 'Não registrado') + '</small>',
    '</div>'
  ].join('');
}

/**
 * Monta lista simples ou mensagem vazia.
 *
 * @param {string[]} itens Itens a exibir.
 * @param {string} vazio Mensagem de estado vazio.
 * @return {string} HTML da lista.
 */
function montarListaOuVazio(itens, vazio) {
  if (!itens || !itens.length) {
    return '<p class="empty-state">' + escaparHtml(vazio) + '</p>';
  }

  return [
    '<ul class="detail-list">',
    itens.map(function montarItem(item) {
      return '<li>' + escaparHtml(item) + '</li>';
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta atividades recentes.
 *
 * @param {Object[]} atividades Atividades retornadas pela API.
 * @return {string} HTML das atividades.
 */
function montarAtividades(atividades) {
  if (!atividades.length) {
    return '<p class="empty-state">Atividades recentes ainda não foram integradas.</p>';
  }

  return [
    '<ul class="activity-list">',
    atividades.map(function montarAtividade(atividade) {
      return [
        '<li>',
        '<span>' + escaparHtml(atividade.titulo || 'Atividade') + '</span>',
        '<small>' + escaparHtml((atividade.data || '-') + ' · ' + (atividade.status || 'Simulada')) + '</small>',
        '</li>'
      ].join('');
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Monta lista de certificados.
 *
 * @param {Object[]} certificados Certificados retornados pela API.
 * @return {string} HTML dos certificados.
 */
function montarCertificados(certificados) {
  if (!certificados.length) {
    return '<p class="empty-state">Certificados ainda não foram integrados.</p>';
  }

  return [
    '<ul class="detail-list">',
    certificados.map(function montarCertificado(certificado) {
      return '<li>' + escaparHtml(certificado.titulo || 'Certificado') + ' — ' + escaparHtml(certificado.status || 'Simulado') + '</li>';
    }).join(''),
    '</ul>'
  ].join('');
}

/**
 * Normaliza numero nao negativo vindo da API.
 *
 * @param {number|string} valor Valor retornado pelo backend.
 * @return {number} Numero seguro para exibicao.
 */
function normalizarNumeroNaoNegativo(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

/**
 * Formata quantidade de apresentacoes com pluralizacao simples.
 *
 * @param {number|string} quantidade Quantidade retornada pelo backend.
 * @return {string} Texto formatado.
 */
function formatarQuantidadeApresentacoes(quantidade) {
  const numero = normalizarNumeroNaoNegativo(quantidade);
  const rotulo = numero === 1 ? 'apresentação' : 'apresentações';

  return numero + ' ' + rotulo;
}

/**
 * Registra tempos de chamada para diagnostico local no navegador.
 *
 * Esses dados nao contem informacoes de membro e ajudam a acompanhar se o
 * portal esta ficando lento conforme novos blocos forem integrados.
 *
 * @param {string} acao Acao chamada na API.
 * @param {Object} desempenho Tempos e origem da resposta.
 */
function registrarDesempenhoApi(acao, desempenho) {
  if (typeof console === 'undefined' || typeof console.info !== 'function') {
    return;
  }

  console.info('[Portal GEAPA]', acao, {
    origemDados: desempenho.origemDados || 'api',
    tempoBackendMs: desempenho.tempoBackendMs || 0,
    tempoClienteMs: desempenho.tempoClienteMs || 0
  });
}

/**
 * Obtem origem da resposta informada pelo backend.
 *
 * @param {Object} resposta Resposta da API.
 * @return {string} Origem dos dados.
 */
function obterOrigemDados(resposta) {
  return resposta.meta &&
    resposta.meta.desempenho &&
    resposta.meta.desempenho.origemDados
    ? resposta.meta.desempenho.origemDados
    : '';
}

/**
 * Obtem tempo de backend informado pelo Apps Script.
 *
 * @param {Object} resposta Resposta da API.
 * @return {number} Tempo do backend em milissegundos.
 */
function obterTempoBackendMs(resposta) {
  return resposta.meta &&
    resposta.meta.desempenho &&
    resposta.meta.desempenho.tempoMs
    ? normalizarNumeroNaoNegativo(resposta.meta.desempenho.tempoMs)
    : 0;
}

/**
 * Retorna marcador de tempo em milissegundos.
 *
 * @return {number} Tempo atual.
 */
function obterTempoAtual() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

/**
 * Normaliza severidade recebida pelo backend para classes CSS conhecidas.
 *
 * @param {string} valor Severidade retornada pela API.
 * @return {string} Severidade normalizada.
 */
function normalizarSeveridade(valor) {
  const normalizada = String(valor || 'baixa').toLowerCase();

  if (['baixa', 'media', 'alta'].indexOf(normalizada) === -1) {
    return 'baixa';
  }

  return normalizada;
}

/**
 * Formata rotulos curtos vindos do contrato da API.
 *
 * @param {string} valor Valor em formato tecnico.
 * @return {string} Rotulo legivel.
 */
function formatarRotuloCurto(valor) {
  const texto = String(valor || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();

  if (!texto) {
    return '';
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Formata perfis, grupos e chaves de cargo para exibicao.
 *
 * @param {string} valor Valor tecnico.
 * @return {string} Rotulo em portugues.
 */
function formatarPerfil(valor) {
  const normalizado = String(valor || '').trim().toUpperCase();
  const mapa = {
    VISITANTE: 'Visitante',
    PARTICIPANTE_EXTERNO: 'Participante externo',
    MEMBRO: 'Membro',
    DIRETORIA: 'Diretoria',
    PRESIDENCIA: 'Presidência',
    SECRETARIA: 'Secretaria',
    SECRETARIO: 'Secretário',
    COMUNICACAO: 'Comunicação',
    CONSELHO: 'Conselho',
    ASSESSORIA: 'Assessoria',
    ADMIN: 'Administração do portal',
    ADMIN_TECNICO: 'Administração técnica',
    PRESIDENTE: 'Presidente',
    VICE_PRESIDENTE: 'Vice-presidente',
    SECRETARIO_GERAL: 'Secretário(a) Geral',
    SECRETARIO_EXECUTIVO: 'Secretário(a) Executivo(a)',
    DIRETOR_COMUNICACAO: 'Diretor(a) de Comunicação',
    DIRETOR_EVENTOS: 'Diretor(a) de Eventos',
    DIRETOR_ENSINO: 'Diretor(a) de Ensino',
    DIRETOR_PESQUISA: 'Diretor(a) de Pesquisa',
    DIRETOR_EXTENSAO: 'Diretor(a) de Extensão',
    ASSESSOR_COMUNICACAO: 'Assessor(a) de Comunicação',
    CONSELHEIRO_CONSULTIVO: 'Conselheiro(a) Consultivo(a)',
    VIGENCIAS_DIRETORES: 'Diretoria',
    VIGENCIAS_ASSESSORES: 'Assessoria',
    VIGENCIAS_CONSELHEIROS: 'Conselho'
  };

  if (mapa[normalizado]) {
    return mapa[normalizado];
  }

  return formatarRotuloCurto(normalizado);
}

/**
 * Formata data ISO para pt-BR quando possivel.
 *
 * @param {string} valor Data recebida da API.
 * @return {string} Data formatada.
 */
function formatarData(valor) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString('pt-BR');
}

/**
 * Formata data sem horario para exibicao curta.
 *
 * @param {string} valor Data recebida da API.
 * @return {string} Data formatada.
 */
function formatarDataCurta(valor) {
  const data = new Date(valor + 'T00:00:00');

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleDateString('pt-BR');
}

/**
 * Atualiza a mensagem de status acessivel da tela.
 *
 * @param {HTMLElement} status Elemento de status.
 * @param {string} mensagem Mensagem a exibir.
 */
function atualizarStatus(status, mensagem) {
  status.textContent = mensagem;
}

function mostrarLoadingGlobal(mensagem) {
  const ui = window.PortalGeapaUi;

  if (ui && typeof ui.mostrarLoading === 'function') {
    ui.mostrarLoading(mensagem);
  }
}

function ocultarLoadingGlobal() {
  const ui = window.PortalGeapaUi;

  if (ui && typeof ui.ocultarLoading === 'function') {
    ui.ocultarLoading();
  }
}

function atualizarMensagemLoadingGlobal(mensagem) {
  const ui = window.PortalGeapaUi;

  if (ui && typeof ui.atualizarMensagemLoading === 'function') {
    ui.atualizarMensagemLoading(mensagem);
  }
}

/**
 * Bloqueia ou libera os campos enquanto uma chamada esta em andamento.
 *
 * @param {HTMLFormElement} form Formulario de acesso.
 * @param {boolean} ocupado Estado de carregamento.
 */
function alternarFormularioOcupado(form, ocupado) {
  Array.prototype.forEach.call(form.elements, function alternarCampo(campo) {
    campo.disabled = ocupado;
  });
}

/**
 * Controla a gaveta de navegacao lateral do portal.
 */
function configurarMenuGlobal() {
  const frame = document.querySelector('.portal-frame');
  const botaoMenu = document.getElementById('menu-toggle');
  const backdrop = document.querySelector('[data-close-sidebar]');
  const sidebar = document.getElementById('portal-sidebar');

  if (!frame || !botaoMenu || !sidebar) {
    return;
  }

  botaoMenu.addEventListener('click', function alternarMenu() {
    const aberto = frame.classList.contains('sidebar-open');
    definirMenuAberto(!aberto);
  });

  if (backdrop) {
    backdrop.addEventListener('click', function fecharAoClicarFora() {
      definirMenuAberto(false);
    });
  }

  Array.prototype.forEach.call(sidebar.querySelectorAll('button'), function registrarItem(botao) {
    botao.addEventListener('click', function fecharAposNavegar() {
      definirMenuAberto(false);
    });
  });

  document.addEventListener('keydown', function fecharComEsc(event) {
    if (event.key === 'Escape') {
      definirMenuAberto(false);
    }
  });
}

/**
 * Recolhe o cabecalho ao rolar para baixo e mostra ao voltar.
 */
function configurarCabecalhoRecolhivel() {
  const header = document.querySelector('.portal-header');
  const frame = document.querySelector('.portal-frame');

  if (!header || !frame) {
    return;
  }

  let ultimoScroll = window.scrollY || 0;
  let aguardandoFrame = false;

  window.addEventListener('scroll', function aoRolar() {
    if (aguardandoFrame) {
      return;
    }

    aguardandoFrame = true;
    window.requestAnimationFrame(function atualizarCabecalho() {
      const atual = window.scrollY || 0;
      const descendo = atual > ultimoScroll;
      const longeDoTopo = atual > 90;
      const menuAberto = frame.classList.contains('sidebar-open');

      header.classList.toggle('header-collapsed', descendo && longeDoTopo && !menuAberto);
      ultimoScroll = atual;
      aguardandoFrame = false;
    });
  }, { passive: true });
}

/**
 * Abre ou fecha a gaveta lateral.
 *
 * @param {boolean} aberto Estado desejado.
 */
function definirMenuAberto(aberto) {
  const frame = document.querySelector('.portal-frame');
  const botaoMenu = document.getElementById('menu-toggle');
  const backdrop = document.querySelector('[data-close-sidebar]');
  const header = document.querySelector('.portal-header');

  if (!frame || !botaoMenu) {
    return;
  }

  frame.classList.toggle('sidebar-open', aberto);
  botaoMenu.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');

  if (backdrop) {
    backdrop.hidden = !aberto;
  }

  if (header && aberto) {
    header.classList.remove('header-collapsed');
  }
}

/**
 * Retorna à tela inicial pública após autenticar o usuário.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situação.
 */
function mostrarTelaInicioAposLogin(app, telaAcesso, telaSituacao) {
  const navegacao = window.PortalGeapaNavigation;
  const telaAtividades = document.getElementById('tela-atividades');
  const telaMeuPerfil = document.getElementById('tela-meu-perfil');

  sincronizarNavegacaoPortal();

  if (navegacao && typeof navegacao.irPara === 'function') {
    navegacao.irPara('inicio');
    return;
  }

  definirMenuAberto(false);
  app.classList.remove('view-login', 'view-situacao', 'view-atividades', 'view-meu-perfil');
  app.classList.add('view-inicio');
  telaAcesso.hidden = true;
  telaSituacao.hidden = true;

  if (telaAtividades) {
    telaAtividades.hidden = true;
  }

  if (telaMeuPerfil) {
    telaMeuPerfil.hidden = true;
  }
}

/**
 * Mostra a tela de situação após a entrada.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situação.
 */
function mostrarTelaSituacao(app, telaAcesso, telaSituacao) {
  const navegacao = window.PortalGeapaNavigation;
  const telaAtividades = document.getElementById('tela-atividades');
  const telaMeuPerfil = document.getElementById('tela-meu-perfil');

  if (navegacao && typeof navegacao.irPara === 'function') {
    navegacao.irPara('minha-situacao');
    return;
  }

  definirMenuAberto(false);
  app.classList.remove('view-login', 'view-atividades', 'view-meu-perfil');
  app.classList.add('view-situacao');
  telaAcesso.hidden = true;
  telaSituacao.hidden = false;

  if (telaAtividades) {
    telaAtividades.hidden = true;
  }

  if (telaMeuPerfil) {
    telaMeuPerfil.hidden = true;
  }
}

/**
 * Volta para a tela de acesso.
 *
 * @param {HTMLElement} app Elemento raiz.
 * @param {HTMLElement} telaAcesso Tela de acesso.
 * @param {HTMLElement} telaSituacao Tela de situação.
 */
function mostrarTelaAcesso(app, telaAcesso, telaSituacao) {
  const navegacao = window.PortalGeapaNavigation;
  const telaAtividades = document.getElementById('tela-atividades');
  const telaMeuPerfil = document.getElementById('tela-meu-perfil');

  if (navegacao && typeof navegacao.irPara === 'function') {
    navegacao.irPara('login');
    return;
  }

  definirMenuAberto(false);
  app.classList.remove('view-situacao', 'view-atividades', 'view-meu-perfil');
  app.classList.add('view-login');
  telaSituacao.hidden = true;
  telaAcesso.hidden = false;

  if (telaAtividades) {
    telaAtividades.hidden = true;
  }

  if (telaMeuPerfil) {
    telaMeuPerfil.hidden = true;
  }
}

/**
 * Enriquece a home publica com o CMS editorial, preservando o HTML estatico
 * como fallback quando o snapshot ainda estiver vazio ou indisponivel.
 */
async function carregarHomePublicaEditorial() {
  const conteudoPublico = window.PortalGeapaPublicContent;
  const home = document.getElementById('tela-inicio');

  if (!home || !conteudoPublico || typeof conteudoPublico.carregarHomePublica !== 'function') {
    return;
  }

  try {
    const resposta = await conteudoPublico.carregarHomePublica();
    const dados = resposta && resposta.data ? resposta.data : {};
    const blocos = Array.isArray(dados.blocos) ? dados.blocos : [];

    if (!blocos.length) {
      return;
    }

    aplicarBlocosHomePublica(home, blocos);
  } catch (erro) {
    // A home estatica e o fallback publico.
  }
}

function aplicarBlocosHomePublica(home, blocos) {
  const hero = escolherBlocoHeroHome(blocos);
  const cards = blocos.filter(function filtrarCards(bloco) {
    return bloco !== hero && obterTextoCampo(bloco, ['titulo', 'TITULO', 'title']);
  });

  if (hero) {
    aplicarHeroHomePublica(home, hero);
  }

  if (cards.length) {
    aplicarCardsHomePublica(home, cards);
  }
}

function escolherBlocoHeroHome(blocos) {
  const candidatos = Array.isArray(blocos) ? blocos : [];
  const hero = candidatos.find(function encontrarHero(bloco) {
    const tipo = obterTextoCampo(bloco, ['tipoBloco', 'TIPO_BLOCO', 'tipo', 'TIPO'])
      .toUpperCase();

    return tipo.indexOf('HERO') >= 0 ||
      tipo.indexOf('CAPA') >= 0 ||
      tipo.indexOf('INTRO') >= 0;
  });

  return hero || candidatos[0] || null;
}

function aplicarHeroHomePublica(home, bloco) {
  const titulo = obterTextoCampo(bloco, ['titulo', 'TITULO']);
  const subtitulo = obterTextoCampo(bloco, ['subtitulo', 'SUBTITULO', 'subtitle']);
  const texto = obterTextoCampo(bloco, ['texto', 'TEXTO', 'descricao', 'DESCRICAO']);
  const botaoTexto = obterTextoCampo(bloco, ['botaoTexto', 'BOTAO_TEXTO', 'botao_texto']);
  const botaoUrl = obterTextoCampo(bloco, ['botaoUrl', 'BOTAO_URL', 'botao_url']);
  const h1 = home.querySelector('#portal-title');
  const intro = home.querySelector('.intro');
  const acoes = home.querySelector('.home-actions');

  if (h1 && titulo) {
    h1.textContent = titulo;
  }

  if (intro && (subtitulo || texto)) {
    intro.textContent = subtitulo || texto;
  }

  if (acoes && botaoTexto && botaoUrl) {
    acoes.insertAdjacentHTML(
      'beforeend',
      '<a class="secondary-button" href="' + escaparHtml(botaoUrl) + '">' +
        escaparHtml(botaoTexto) +
      '</a>'
    );
  }
}

function aplicarCardsHomePublica(home, blocos) {
  const grid = home.querySelector('.public-home-grid');

  if (!grid) {
    return;
  }

  grid.innerHTML = blocos.slice(0, 4).map(function montarCard(bloco) {
    const tipo = obterTextoCampo(bloco, ['tipoBloco', 'TIPO_BLOCO', 'tipo', 'TIPO']);
    const titulo = obterTextoCampo(bloco, ['titulo', 'TITULO', 'title']);
    const texto = obterTextoCampo(bloco, ['texto', 'TEXTO', 'subtitulo', 'SUBTITULO', 'descricao', 'DESCRICAO']);

    return [
      '<article>',
      tipo ? '<span>' + escaparHtml(formatarRotuloPublico(tipo)) + '</span>' : '',
      '<strong>' + escaparHtml(titulo) + '</strong>',
      texto ? '<p>' + escaparHtml(texto) + '</p>' : '',
      '</article>'
    ].join('');
  }).join('');
}

function obterTextoCampo(objeto, chaves) {
  const dados = objeto || {};

  for (let i = 0; i < chaves.length; i += 1) {
    const valor = obterValorCampoFlexivel(dados, chaves[i]);

    if (valor !== undefined && valor !== null && String(valor).trim()) {
      return String(valor).trim();
    }
  }

  return '';
}

function obterValorCampoFlexivel(dados, chaveDesejada) {
  if (!dados || !chaveDesejada) {
    return undefined;
  }

  if (dados[chaveDesejada] !== undefined) {
    return dados[chaveDesejada];
  }

  const alvo = normalizarChaveConteudoPublico(chaveDesejada);
  const chaves = Object.keys(dados);

  for (let i = 0; i < chaves.length; i += 1) {
    if (normalizarChaveConteudoPublico(chaves[i]) === alvo) {
      return dados[chaves[i]];
    }
  }

  return undefined;
}

function normalizarChaveConteudoPublico(chave) {
  return String(chave || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function formatarRotuloPublico(valor) {
  const ui = window.PortalGeapaUi;

  if (ui && typeof ui.formatarRotulo === 'function') {
    return ui.formatarRotulo(valor);
  }

  return String(valor || '').replace(/_/g, ' ').trim();
}

/**
 * Carrega Minha situacao quando a rota protegida correspondente e aberta.
 *
 * @param {HTMLElement} container Area visual da tela Minha situacao.
 */
function configurarRotaMinhaSituacao(container) {
  document.addEventListener('portal:navigationchange', function aoNavegar(evento) {
    const rota = evento.detail && evento.detail.rota;

    if (!rota || rota.id !== 'minha-situacao') {
      return;
    }

    carregarERenderizarMinhaSituacao(container);
  });

  const navegacao = window.PortalGeapaNavigation;

  if (navegacao && typeof navegacao.getRotaAtual === 'function' && navegacao.getRotaAtual() === 'minha-situacao') {
    carregarERenderizarMinhaSituacao(container);
  }
}

/**
 * Executa o ciclo completo de carregamento/renderizacao de Minha situacao.
 *
 * @param {HTMLElement} container Area visual da tela Minha situacao.
 */
async function carregarERenderizarMinhaSituacao(container) {
  if (!container) {
    return;
  }

  const token = lerSessaoLocal();

  if (!token) {
    if (rotaAindaAtual('minha-situacao')) {
      renderizarErroSituacao(container, 'Sua sessao nao foi encontrada. Entre novamente.');
    }
    return;
  }

  if (minhaSituacaoCarregamentoAtual) {
    return minhaSituacaoCarregamentoAtual;
  }

  renderizarCarregandoSituacao(container);

  const carregamento = carregarMinhaSituacaoComControle(token)
    .then(function concluirMinhaSituacao(minhaSituacao) {
      aplicarUsuarioAtual(minhaSituacao);

      if (rotaAindaAtual('minha-situacao')) {
        renderizarMinhaSituacao(container, minhaSituacao);
      }

      return minhaSituacao;
    })
    .catch(function tratarErroMinhaSituacao(erro) {
      if (rotaAindaAtual('minha-situacao')) {
        renderizarErroSituacao(container, erro.message);
      }

      return null;
    });

  return carregamento;
}

/**
 * Carrega "Meu perfil" quando a rota protegida correspondente e aberta.
 *
 * @param {HTMLElement} container Area visual da tela Meu perfil.
 */
function configurarRotaMeuPerfil(container) {
  document.addEventListener('portal:navigationchange', function aoNavegar(evento) {
    const rota = evento.detail && evento.detail.rota;

    if (!rota || rota.id !== 'meu-perfil') {
      return;
    }

    carregarERenderizarMeuPerfil(container);
  });

  const navegacao = window.PortalGeapaNavigation;

  if (navegacao && typeof navegacao.getRotaAtual === 'function' && navegacao.getRotaAtual() === 'meu-perfil') {
    carregarERenderizarMeuPerfil(container);
  }

  container.addEventListener('click', tratarCliqueMeuPerfil);
  container.addEventListener('submit', tratarSubmitMeuPerfil);
}

/**
 * Executa o ciclo completo de carregamento/renderizacao da tela Meu perfil.
 *
 * @param {HTMLElement} container Area visual da tela Meu perfil.
 */
async function carregarERenderizarMeuPerfil(container) {
  const token = lerSessaoLocal();

  if (!container) {
    return;
  }

  if (!token) {
    renderizarErroMeuPerfil(container, 'Sua sessao nao foi encontrada. Entre novamente.');
    return;
  }

  if (meuPerfilCarregamentoAtual) return meuPerfilCarregamentoAtual;
  renderizarCarregandoMeuPerfil(container);

  meuPerfilCarregamentoAtual = (async function carregarPerfilAtual() {
  try {
    const perfil = await carregarMeuPerfil(token);
    meuPerfilDadosAtuais = perfil;

    if (rotaAindaAtual('meu-perfil')) {
      renderizarMeuPerfil(container, perfil);
    }
  } catch (erro) {
    if (rotaAindaAtual('meu-perfil')) {
      renderizarErroMeuPerfil(container, erro.message);
    }
  } finally {
    meuPerfilCarregamentoAtual = null;
  }
  })();

  return meuPerfilCarregamentoAtual;
}

function tratarCliqueMeuPerfil(evento) {
  if (!evento.target || typeof evento.target.closest !== 'function') return;
  const editar = evento.target.closest('[data-profile-edit]');
  const cancelar = evento.target.closest('[data-profile-cancel]');
  const corrigir = evento.target.closest('[data-profile-correction]');
  if (editar) renderizarEdicaoMeuPerfil(evento.currentTarget, meuPerfilDadosAtuais || {});
  if (cancelar) renderizarMeuPerfil(evento.currentTarget, meuPerfilDadosAtuais || {});
  if (corrigir) {
    evento.preventDefault();
    abrirModalCorrecaoPerfil(corrigir.dataset.profileCorrection, corrigir.dataset.profileCurrent || '', evento.currentTarget);
  }
}

function tratarSubmitMeuPerfil(evento) {
  const form = evento.target;
  if (!form.matches('[data-profile-edit-form]')) return;
  evento.preventDefault();
  salvarEdicaoMeuPerfil(form, evento.currentTarget);
}

async function salvarEdicaoMeuPerfil(form, container) {
  if (!window.confirm('Confirma a atualização destes dados do seu perfil?')) return;
  const dados = new FormData(form);
  const links = [
    ['LATTES', 'Currículo Lattes', dados.get('linkLattes')],
    ['LINKEDIN', 'LinkedIn', dados.get('linkLinkedin')],
    ['ORCID', 'ORCID', dados.get('linkOrcid')],
    ['SITE_PESSOAL', 'Site pessoal', dados.get('linkSite')]
  ].map(function montarLink(item) { return { tipo: item[0], rotulo: item[1], url: String(item[2] || '').trim() }; });
  const payload = {
    chaveIdempotencia: gerarChavePerfil('perfil'),
    telefone: String(dados.get('telefone') || '').trim(),
    instagram: String(dados.get('instagram') || '').trim(),
    ...(window.PortalGeapaLocalidades ? window.PortalGeapaLocalidades.serialize(form) : {}),
    resumoAcademico: String(dados.get('resumoAcademico') || '').trim(),
    links: links
  };
  const botao = form.querySelector('[type="submit"]');
  if (botao) botao.disabled = true;
  mostrarLoadingGlobal('Salvando perfil...');
  try {
    const resposta = await window.PortalGeapaApi.apiPost('/meu-perfil/atualizar', { payload: JSON.stringify(payload) });
    if (!resposta || resposta.ok !== true) throw new Error(resposta && resposta.message || 'Não foi possível atualizar o perfil.');
    window.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Perfil atualizado', message: resposta.message || 'Perfil atualizado com sucesso.' });
    meuPerfilDadosAtuais = null;
    await carregarERenderizarMeuPerfil(container);
  } catch (erro) {
    mostrarFeedbackPerfil('error', erro.message || 'Não foi possível atualizar o perfil.');
  } finally {
    if (botao) botao.disabled = false;
    ocultarLoadingGlobal();
  }
}

async function carregarSolicitacoesMeuPerfil(container, destaqueId) {
  const alvo = container && container.querySelector('[data-profile-requests]');
  if (!alvo || !window.PortalGeapaApi) return;
  try {
    const resposta = await window.PortalGeapaApi.apiGet('/meu-perfil/correcoes', {});
    if (!resposta || resposta.ok !== true) throw new Error(resposta && resposta.message || 'Solicitações indisponíveis.');
    const itens = Array.isArray(resposta.data && resposta.data.solicitacoes) ? resposta.data.solicitacoes : [];
    alvo.innerHTML = itens.length ? '<div class="profile-request-list">' + itens.map(function montar(item) { return montarSolicitacaoMeuPerfil(item, destaqueId); }).join('') + '</div>' : '<p class="empty-state">Nenhuma solicitação cadastral registrada.</p>';
    const destacado = Array.from(alvo.querySelectorAll('[data-profile-request-id]')).find(function encontrar(item) {
      return String(item.dataset.profileRequestId || '') === String(destaqueId || '');
    });
    if (destacado && typeof destacado.scrollIntoView === 'function') destacado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return itens;
  } catch (erro) {
    alvo.innerHTML = '<p class="empty-state">' + escaparHtml(erro.message || 'Não foi possível carregar as solicitações.') + '</p>';
    return [];
  }
}

function montarSolicitacaoMeuPerfil(item, destaqueId) {
  const destacado = String(item && item.id || '') === String(destaqueId || '');
  return '<article class="profile-request-card' + (destacado ? ' profile-request-card-highlight' : '') + '" data-profile-request-id="' + escaparHtml(item.id || '') + '"><div><strong>' + escaparHtml(formatarCampoCorrecao(item.campo)) + '</strong><span class="status-pill">' + escaparHtml(item.status || 'PENDENTE') + '</span></div>' +
    '<p><strong>ID:</strong> ' + escaparHtml(item.id || '-') + '</p>' +
    '<p>Solicitada em: ' + escaparHtml(formatarData(item.data) || '-') + '</p>' +
    (item.decisao ? '<p>Decisão: ' + escaparHtml(item.decisao) + '</p>' : '') +
    (item.motivoDecisao ? '<p>Motivo público: ' + escaparHtml(item.motivoDecisao) + '</p>' : '') +
    (item.aplicadoEm ? '<p>Aplicada em: ' + escaparHtml(formatarData(item.aplicadoEm)) + '</p>' : '') + '</article>';
}

function reportarModalCorrecaoPerfilIndisponivel_(container, detalhes) {
  const mensagem = 'O formulário de solicitação de correção não foi carregado. Atualize a página e tente novamente.';
  console.error('[PORTAL_PROFILE_CORRECTION_MODAL_UNAVAILABLE]', detalhes || {});

  if (container) {
    let alvo = container.querySelector('[data-profile-correction-setup-error]');
    if (!alvo && typeof document.createElement === 'function') {
      alvo = document.createElement('p');
      alvo.className = 'portal-field-error';
      alvo.setAttribute('role', 'alert');
      alvo.setAttribute('data-profile-correction-setup-error', '');
      if (typeof container.prepend === 'function') container.prepend(alvo);
    }
    if (alvo) {
      alvo.textContent = mensagem;
      alvo.hidden = false;
    }
  }

  mostrarFeedbackPerfil('error', mensagem);
  return false;
}

function fecharModalCorrecaoPerfil_(modal) {
  if (modal) modal.hidden = true;
  if (document.body) document.body.classList.remove('modal-open');
}

function abrirModalCorrecaoPerfil(campo, valorAtual, container) {
  const modal = document.getElementById('profile-correction-modal');
  const form = modal && modal.querySelector('[data-profile-correction-form]');
  const label = modal && modal.querySelector('[data-profile-correction-label]');
  const campoInput = form && form.querySelector('[name="campo"]');
  const valorAtualInput = form && form.querySelector('[name="valorAtual"]');
  const valorSolicitadoInput = form && form.querySelector('[name="valorSolicitado"]');
  const justificativaInput = form && form.querySelector('[name="justificativa"]');
  const camposObrigatorios = !!(campoInput && valorAtualInput && valorSolicitadoInput && justificativaInput);
  if (!modal || !form || !label || !camposObrigatorios) {
    return reportarModalCorrecaoPerfilIndisponivel_(container, {
      modalEncontrado: !!modal,
      formularioEncontrado: !!form,
      labelEncontrado: !!label,
      camposObrigatoriosEncontrados: !!camposObrigatorios
    });
  }
  form.reset();
  campoInput.value = campo;
  valorAtualInput.value = campo === 'DATA_NASCIMENTO' ? formatarDataNascimentoPerfil_(valorAtual) : (valorAtual || 'Não informado');
  valorSolicitadoInput.placeholder = campo === 'DATA_NASCIMENTO' ? 'DD/MM/AAAA' : '';
  valorSolicitadoInput.inputMode = campo === 'DATA_NASCIMENTO' ? 'numeric' : 'text';
  label.textContent = formatarCampoCorrecao(campo);
  const erroAlvo = form.querySelector('[data-profile-correction-error]');
  if (erroAlvo) {
    erroAlvo.textContent = '';
    erroAlvo.hidden = true;
  }
  modal.hidden = false;
  if (document.body) document.body.classList.add('modal-open');
  valorSolicitadoInput.focus();
  return true;
}

function formatarCampoCorrecao(campo) {
  const rotulos = { NOME_COMPLETO: 'Nome completo', CPF: 'CPF', RGA: 'RGA', DATA_NASCIMENTO: 'Data de nascimento', EMAIL_PRINCIPAL: 'E-mail principal', CURSO_ID: 'Curso / instituição / campus' };
  return rotulos[campo] || String(campo || '').replace(/_/g, ' ');
}

function formatarDataNascimentoPerfil_(valor) {
  const texto = String(valor || '').trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  const brasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brasileira) return texto;
  return texto;
}

function normalizarDataNascimentoCorrecao_(valor) {
  const texto = String(valor || '').trim();
  const brasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!brasileira && !iso) {
    const erroFormato = new Error('Formato de data inválido. Use DD/MM/AAAA.');
    erroFormato.code = 'DATA_NASCIMENTO_INVALIDA';
    throw erroFormato;
  }
  const ano = Number(brasileira ? brasileira[3] : iso[1]);
  const mes = Number(brasileira ? brasileira[2] : iso[2]);
  const dia = Number(brasileira ? brasileira[1] : iso[3]);
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const hoje = new Date();
  const numeroHoje = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
  const numeroInformado = ano * 10000 + mes * 100 + dia;
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > diasMes[mes - 1] || numeroInformado > numeroHoje) {
    const erroData = new Error('Formato de data inválido. Use DD/MM/AAAA.');
    erroData.code = 'DATA_NASCIMENTO_INVALIDA';
    throw erroData;
  }
  return String(ano).padStart(4, '0') + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}

function normalizarValorSolicitadoCorrecao_(campo, valor) {
  const field = String(campo || '').trim().toUpperCase();
  const texto = String(valor || '').trim();
  if (field === 'DATA_NASCIMENTO') return normalizarDataNascimentoCorrecao_(texto);
  if (field === 'RGA') {
    const rga = texto.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9.-]{4,30}$/.test(rga)) {
      const erroRga = new Error('Informe um RGA válido.');
      erroRga.code = 'RGA_INVALIDO';
      throw erroRga;
    }
    return rga;
  }
  return texto;
}

function mensagemErroCorrecaoPerfil_(respostaOuErro) {
  const resposta = respostaOuErro && respostaOuErro.portalResponse || respostaOuErro || {};
  const data = resposta.data || {};
  const codigo = String(resposta.code || resposta.errorCode || resposta.reasonCode || data.reasonCode || respostaOuErro && respostaOuErro.code || '').toUpperCase();
  const mensagens = {
    VALOR_SEM_ALTERACAO: 'O novo valor é igual ao valor atual.',
    RGA_INVALIDO: 'Informe um RGA válido.',
    SOLICITACAO_DUPLICADA: 'Já existe uma solicitação pendente para este campo.',
    SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
    SESSAO_INVALIDA_OU_EXPIRADA: 'Sua sessão expirou. Entre novamente.',
    SESSAO_CORE_INVALIDA: 'Sua sessão expirou. Entre novamente.',
    DATA_NASCIMENTO_INVALIDA: 'Formato de data inválido. Use DD/MM/AAAA.',
    JUSTIFICATIVA_OBRIGATORIA: 'Explique o motivo da correção com pelo menos 20 caracteres.',
    VALOR_SOLICITADO_OBRIGATORIO: 'Informe o novo valor solicitado.',
    CHAVE_IDEMPOTENCIA_INVALIDA: 'Atualize a página e tente novamente.',
    CAMPO_SENSIVEL_NAO_PERMITIDO: 'Este campo não pode ser corrigido por este fluxo.'
  };
  if (mensagens[codigo]) return mensagens[codigo];
  if (/FONTE_INDISPONIVEL|DOMAIN_|PESSOAS_V2_|REGISTRY_/.test(codigo)) return 'Não foi possível acessar a fila de solicitações.';
  const mensagem = String(resposta.userMessage || resposta.message || respostaOuErro && respostaOuErro.message || '').trim();
  if (mensagem && mensagem !== 'Solicitação inválida ou indisponível.') return mensagem;
  return codigo ? 'Não foi possível enviar a solicitação. Código: ' + codigo + '.' : 'Não foi possível enviar a solicitação.';
}

function diagnosticoSeguroCorrecaoPerfil_(payload) {
  const valor = String(payload && payload.valorSolicitado || '');
  const justificativa = String(payload && payload.justificativa || '');
  const chave = String(payload && payload.chaveIdempotencia || '');
  return {
    campo: String(payload && payload.campo || ''),
    valorSolicitadoPresente: valor.length > 0,
    valorSolicitadoTamanho: valor.length,
    justificativaPresente: justificativa.length > 0,
    justificativaTamanho: justificativa.length,
    chaveIdempotenciaPresente: chave.length > 0,
    chaveIdempotenciaTamanho: chave.length,
    requestId: String(payload && payload.requestId || '')
  };
}

function envelopeSeguroCorrecaoPerfil_(resposta, requestId) {
  const origem = resposta || {};
  const data = origem.data || {};
  return {
    httpStatus: Number(origem.httpStatus || 0),
    ok: origem.ok === true,
    code: String(origem.code || ''),
    errorCode: String(origem.errorCode || ''),
    reasonCode: String(origem.reasonCode || data.reasonCode || ''),
    message: String(origem.message || ''),
    fieldErrors: origem.fieldErrors || data.fieldErrors || {},
    details: origem.details || data.details || {},
    requestId: String(origem.requestId || data.requestId || requestId || '')
  };
}

function respostaCorrecaoIncerta_(respostaOuErro) {
  const origem = respostaOuErro && respostaOuErro.portalResponse || respostaOuErro || {};
  const codigo = String(origem.code || origem.errorCode || respostaOuErro && respostaOuErro.code || '').toUpperCase();
  return codigo === 'API_WRITE_TIMEOUT' || codigo === 'API_RESPOSTA_INVALIDA' || codigo === 'ERRO_API' || codigo.indexOf('API_HTTP_') === 0;
}

function aguardarConfirmacaoCorrecao_(milissegundos) {
  return new Promise(function aguardar(resolve) { window.setTimeout(resolve, milissegundos); });
}

async function reconciliarSolicitacaoCorrecao_(payload) {
  const intervalos = [0, 700, 1400];
  for (let tentativa = 0; tentativa < intervalos.length; tentativa += 1) {
    if (intervalos[tentativa]) await aguardarConfirmacaoCorrecao_(intervalos[tentativa]);
    const resposta = await window.PortalGeapaApi.apiGet('/meu-perfil/correcoes/consultar', {
      chaveIdempotencia: String(payload.chaveIdempotencia || '')
    });
    if (resposta && resposta.ok === true && resposta.data && resposta.data.encontrada === true && resposta.data.solicitacao) {
      return { encontrada: true, resposta: resposta };
    }
    if (resposta && resposta.ok === false && !respostaCorrecaoIncerta_(resposta)) return { encontrada: false, resposta: resposta };
  }
  return { encontrada: false, resposta: null };
}

async function confirmarSucessoSolicitacaoCorrecao_(modal, form, container, resposta) {
  const data = resposta && resposta.data || {};
  const solicitacao = data.solicitacao || {};
  const idSolicitacao = String(solicitacao.id || data.idSolicitacao || '');
  const status = String(solicitacao.status || data.status || 'PENDENTE');
  meuPerfilCorrecaoPendente = null;
  form.reset();
  fecharModalCorrecaoPerfil_(modal);
  const mensagem = 'Solicitação ' + (idSolicitacao || 'cadastral') + ' registrada com status ' + status + '.';
  const persistente = document.getElementById('profile-persistent-feedback');
  try {
    if (persistente && window.PortalGeapaUi && typeof window.PortalGeapaUi.mostrarMensagemPersistente === 'function') {
      window.PortalGeapaUi.mostrarMensagemPersistente(persistente, { type: 'success', message: mensagem });
    }
  } catch (erroPersistente) {
    console.error('[PORTAL_PROFILE_CORRECTION_ACK_UI]', { etapa: 'mensagem_persistente', code: String(erroPersistente && erroPersistente.message || 'ERRO_UI') });
  }
  try {
    if (window.PortalGeapaUi && typeof window.PortalGeapaUi.mostrarToast === 'function') {
      window.PortalGeapaUi.mostrarToast({ type: 'success', title: 'Solicitação registrada', message: mensagem });
    }
  } catch (erroToast) {
    console.error('[PORTAL_PROFILE_CORRECTION_ACK_UI]', { etapa: 'toast', code: String(erroToast && erroToast.message || 'ERRO_UI') });
  }
  try {
    await carregarSolicitacoesMeuPerfil(container, idSolicitacao);
  } catch (erroLista) {
    console.error('[PORTAL_PROFILE_CORRECTION_ACK_UI]', { etapa: 'lista', code: String(erroLista && erroLista.message || 'ERRO_UI') });
  }
  return { idSolicitacao: idSolicitacao, status: status };
}

function gerarChavePerfil(prefixo) {
  return String(prefixo || 'perfil') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function mostrarFeedbackPerfil(tipo, mensagem) {
  const alvo = document.getElementById('profile-persistent-feedback');
  if (alvo && window.PortalGeapaUi) window.PortalGeapaUi.mostrarMensagemPersistente(alvo, { type: tipo, message: mensagem });
  if (window.PortalGeapaUi) window.PortalGeapaUi.mostrarToast({ type: tipo, title: tipo === 'error' ? 'Não foi possível concluir' : 'Perfil', message: mensagem, persistent: tipo === 'error' });
}

function configurarModalCorrecaoPerfil(container) {
  const modal = document.getElementById('profile-correction-modal');
  const form = modal && modal.querySelector('[data-profile-correction-form]');
  if (!modal || !form) {
    return reportarModalCorrecaoPerfilIndisponivel_(container, {
      modalEncontrado: !!modal,
      formularioEncontrado: !!form,
      etapa: 'configuracao'
    });
  }
  modal.addEventListener('click', function fechar(evento) {
    if (evento.target.matches('[data-profile-correction-close]') || evento.target === modal) fecharModalCorrecaoPerfil_(modal);
  });
  modal.addEventListener('submit', async function enviar(evento) {
    const formEnviado = evento.target;
    if (!formEnviado.matches('[data-profile-correction-form]')) return;
    evento.preventDefault();
    if (formEnviado.dataset.profileSubmitting === 'true') return;
    const dados = new FormData(formEnviado);
    const campoFormulario = String(dados.get('campo') || '').trim().toUpperCase();
    const botao = formEnviado.querySelector('[type="submit"]');
    const textoOriginalBotao = botao ? String(botao.textContent || 'Enviar solicitação') : '';
    if (meuPerfilCorrecaoPendente) {
      const erroPendente = formEnviado.querySelector('[data-profile-correction-error]');
      if (erroPendente) {
        erroPendente.textContent = 'Este envio ainda aguarda confirmação. Não reenvie: consulte Minhas solicitações cadastrais.';
        erroPendente.hidden = false;
      }
      return;
    }
    if (!window.confirm('Confirma o envio desta solicitação para análise?')) return;
    const requestId = gerarChavePerfil('req');
    let payload;
    try {
      const justificativa = String(dados.get('justificativa') || '').trim();
      if (justificativa.length < 20) {
        const erroJustificativa = new Error('Explique o motivo da correção com pelo menos 20 caracteres.');
        erroJustificativa.code = 'JUSTIFICATIVA_OBRIGATORIA';
        throw erroJustificativa;
      }
      payload = {
        requestId: requestId,
        chaveIdempotencia: gerarChavePerfil('correcao'),
        campo: campoFormulario,
        valorSolicitado: normalizarValorSolicitadoCorrecao_(campoFormulario, dados.get('valorSolicitado')),
        justificativa: justificativa
      };
    } catch (erroValidacao) {
      const erroAlvoValidacao = formEnviado.querySelector('[data-profile-correction-error]');
      if (erroAlvoValidacao) {
        erroAlvoValidacao.textContent = mensagemErroCorrecaoPerfil_(erroValidacao);
        erroAlvoValidacao.hidden = false;
      }
      return;
    }
    console.info('[PORTAL_PROFILE_CORRECTION_SUBMIT]', diagnosticoSeguroCorrecaoPerfil_(payload));
    meuPerfilCorrecaoPendente = { payload: payload };
    formEnviado.dataset.profileSubmitting = 'true';
    if (botao) { botao.disabled = true; botao.textContent = 'Enviando...'; }
    mostrarLoadingGlobal('Enviando solicitação...');
    try {
      const resposta = await window.PortalGeapaApi.apiPost('/meu-perfil/correcoes/solicitar', { payload: JSON.stringify(payload) });
      const envelopeSeguro = envelopeSeguroCorrecaoPerfil_(resposta, requestId);
      console.info('[PORTAL_PROFILE_CORRECTION_RESPONSE]', envelopeSeguro);
      if (!resposta || resposta.ok !== true) {
        const erroResposta = new Error(mensagemErroCorrecaoPerfil_(resposta));
        erroResposta.code = envelopeSeguro.errorCode || envelopeSeguro.code || envelopeSeguro.reasonCode;
        erroResposta.portalResponse = resposta || {};
        throw erroResposta;
      }
      await confirmarSucessoSolicitacaoCorrecao_(modal, formEnviado, container, resposta);
    } catch (erro) {
      const erroAlvo = formEnviado.querySelector('[data-profile-correction-error]');
      if (respostaCorrecaoIncerta_(erro)) {
        let reconciliacao = { encontrada: false, resposta: null };
        try {
          reconciliacao = await reconciliarSolicitacaoCorrecao_(payload);
        } catch (erroConsulta) {
          console.error('[PORTAL_PROFILE_CORRECTION_RECONCILE]', { ok: false, code: String(erroConsulta && erroConsulta.code || 'CONSULTA_INDISPONIVEL'), requestId: requestId });
        }
        if (reconciliacao.encontrada) {
          await confirmarSucessoSolicitacaoCorrecao_(modal, formEnviado, container, reconciliacao.resposta);
        } else {
          const mensagemIncerta = 'A solicitação pode ter sido registrada, mas a confirmação demorou. Não reenvie agora; consulte Minhas solicitações cadastrais.';
          if (erroAlvo) { erroAlvo.textContent = mensagemIncerta; erroAlvo.hidden = false; }
          mostrarFeedbackPerfil('warning', mensagemIncerta);
        }
      } else {
        meuPerfilCorrecaoPendente = null;
        if (erroAlvo) { erroAlvo.textContent = mensagemErroCorrecaoPerfil_(erro); erroAlvo.hidden = false; }
      }
    } finally {
      formEnviado.dataset.profileSubmitting = 'false';
      if (botao) {
        botao.disabled = !!meuPerfilCorrecaoPendente;
        botao.textContent = meuPerfilCorrecaoPendente ? 'Aguardando confirmação' : textoOriginalBotao;
      }
      ocultarLoadingGlobal();
    }
  });
  return true;
}

function configurarRotasConteudoPublicoEditorial() {
  document.addEventListener('portal:navigationchange', function aoNavegar(evento) {
    const rota = evento.detail && evento.detail.rota;

    renderizarRotaConteudoPublicoEditorial(rota);
  });

  const navegacao = window.PortalGeapaNavigation;

  if (navegacao && typeof navegacao.getRotaAtual === 'function' && typeof navegacao.getRotas === 'function') {
    const idAtual = navegacao.getRotaAtual();
    const rotaAtual = navegacao.getRotas().find(function encontrarRota(rota) {
      return rota.id === idAtual;
    });

    renderizarRotaConteudoPublicoEditorial(rotaAtual);
  }
}

async function renderizarRotaConteudoPublicoEditorial(rota) {
  const definicao = obterDefinicaoRotaConteudoPublico(rota && rota.id);
  const container = document.getElementById('placeholder-content');
  const conteudoPublico = window.PortalGeapaPublicContent;

  if (!definicao || !container) {
    return;
  }

  container.innerHTML = montarEstadoCarregandoConteudoPublico(definicao);

  if (!conteudoPublico || typeof conteudoPublico.carregarSnapshotConteudoPublico !== 'function') {
    container.innerHTML = montarPaginaConteudoPublico(definicao, montarEstadoVazioConteudoPublico(definicao.vazio));
    return;
  }

  try {
    const resposta = await conteudoPublico.carregarSnapshotConteudoPublico();
    const snapshot = resposta && resposta.data ? resposta.data : {};
    const html = montarCorpoRotaConteudoPublico(definicao, snapshot);

    if (rotaAindaAtual(rota.id)) {
      container.innerHTML = montarPaginaConteudoPublico(definicao, html);
    }
  } catch (erro) {
    if (rotaAindaAtual(rota.id)) {
      container.innerHTML = montarPaginaConteudoPublico(
        definicao,
        montarEstadoVazioConteudoPublico('Conteúdo público indisponível no momento.')
      );
    }
  }
}

function obterDefinicaoRotaConteudoPublico(idRota) {
  const definicoes = {
    sobre: {
      titulo: 'Sobre o GEAPA',
      marcador: 'Área Pública',
      intro: 'Apresentação institucional pública do grupo.',
      tipo: 'blocos',
      pagina: 'sobre',
      vazio: 'Conteúdo institucional ainda não publicado.'
    },
    historia: {
      titulo: 'História',
      marcador: 'Área Pública',
      intro: 'Marcos institucionais publicados pelo CMS editorial.',
      tipo: 'historia',
      pagina: 'historia',
      vazio: 'Marcos históricos ainda não publicados.'
    },
    'diretoria-publica': {
      titulo: 'Diretoria',
      marcador: 'Pessoas Públicas',
      intro: 'Composição pública e complementos editoriais da gestão.',
      tipo: 'pessoas',
      grupos: ['DIRETORIA', 'EX_DIRETOR'],
      incluirLegadoDiretoria: true,
      incluirGestoes: true,
      vazio: 'Diretoria pública ainda não publicada no CMS.'
    },
    orientadores: {
      titulo: 'Orientadores',
      marcador: 'Pessoas Públicas',
      intro: 'Orientadores e professores colaboradores publicados pelo GEAPA.',
      tipo: 'pessoas',
      grupos: ['ORIENTADOR', 'PROFESSOR_COLABORADOR'],
      vazio: 'Orientadores ainda não publicados no CMS.'
    },
    'membros-publicos': {
      titulo: 'Membros',
      marcador: 'Pessoas Públicas',
      intro: 'Membros, egressos e destaques publicados com autorização editorial.',
      tipo: 'pessoas',
      grupos: ['MEMBRO_ATUAL', 'EX_MEMBRO', 'MEMBRO_FUNDADOR', 'COLABORADOR', 'DESTAQUE_INSTITUCIONAL'],
      vazio: 'Membros públicos ainda não publicados no CMS.'
    },
    normas: {
      titulo: 'Documentos e normas',
      marcador: 'Área Pública',
      intro: 'Documentos públicos, normas e materiais orientativos.',
      tipo: 'documentos',
      vazio: 'Documentos públicos ainda não publicados.'
    },
    parceiros: {
      titulo: 'Parceiros',
      marcador: 'Área Pública',
      intro: 'Instituições e parceiros públicos do GEAPA.',
      tipo: 'parceiros',
      pagina: 'parceiros',
      vazio: 'Parceiros ainda não publicados.'
    }
  };

  return definicoes[idRota] || null;
}

function montarCorpoRotaConteudoPublico(definicao, snapshot) {
  if (definicao.tipo === 'blocos') {
    const pagina = obterPaginaSnapshotConteudoPublico(snapshot, definicao.pagina);
    return montarBlocosConteudoPublico(pagina.blocos, definicao.vazio);
  }

  if (definicao.tipo === 'historia') {
    const pagina = obterPaginaSnapshotConteudoPublico(snapshot, definicao.pagina);
    return montarHistoriaConteudoPublico(pagina.marcos, definicao.vazio);
  }

  if (definicao.tipo === 'parceiros') {
    const pagina = obterPaginaSnapshotConteudoPublico(snapshot, definicao.pagina);
    return montarParceirosConteudoPublico(pagina.itens, definicao.vazio);
  }

  if (definicao.tipo === 'documentos') {
    return montarDocumentosConteudoPublico(snapshot.documents, definicao.vazio);
  }

  if (definicao.tipo === 'pessoas') {
    return montarPessoasConteudoPublico(snapshot, definicao);
  }

  return montarEstadoVazioConteudoPublico(definicao.vazio);
}

function obterPaginaSnapshotConteudoPublico(snapshot, slug) {
  const pages = snapshot && snapshot.pages ? snapshot.pages : {};

  return pages[slug] || {};
}

function montarPaginaConteudoPublico(definicao, corpoHtml) {
  return [
    '<p class="eyebrow">',
    escaparHtml(definicao.marcador),
    '</p>',
    '<div class="public-content-heading">',
    '<h2>',
    escaparHtml(definicao.titulo),
    '</h2>',
    definicao.intro ? '<p class="intro">' + escaparHtml(definicao.intro) + '</p>' : '',
    '</div>',
    corpoHtml
  ].join('');
}

function montarEstadoCarregandoConteudoPublico(definicao) {
  return montarPaginaConteudoPublico(
    definicao,
    '<p class="empty-state">Carregando conteúdo público...</p>'
  );
}

function montarEstadoVazioConteudoPublico(mensagem) {
  return '<p class="empty-state public-content-empty">' + escaparHtml(mensagem || 'Conteúdo ainda não publicado.') + '</p>';
}

function montarBlocosConteudoPublico(blocos, vazio) {
  const itens = Array.isArray(blocos) ? blocos : [];

  if (!itens.length) {
    return montarEstadoVazioConteudoPublico(vazio);
  }

  return [
    '<div class="public-editorial-grid">',
    itens.map(montarCardBlocoConteudoPublico).join(''),
    '</div>'
  ].join('');
}

function montarCardBlocoConteudoPublico(bloco) {
  const titulo = obterTextoCampo(bloco, ['titulo', 'TITULO', 'title']);
  const texto = obterTextoCampo(bloco, ['texto', 'TEXTO', 'descricao', 'DESCRICAO']);
  const subtitulo = obterTextoCampo(bloco, ['subtitulo', 'SUBTITULO', 'subtitle']);
  const imagemUrl = obterUrlPublicaConteudo(bloco, ['imagemUrl', 'IMAGEM_URL']);
  const botaoTexto = obterTextoCampo(bloco, ['botaoTexto', 'BOTAO_TEXTO']);
  const botaoUrl = obterUrlPublicaConteudo(bloco, ['botaoUrl', 'BOTAO_URL']);

  return [
    '<article class="public-editorial-card">',
    imagemUrl ? '<img src="' + escaparHtml(imagemUrl) + '" alt="" loading="lazy">' : '',
    subtitulo ? '<span>' + escaparHtml(subtitulo) + '</span>' : '',
    titulo ? '<h3>' + escaparHtml(titulo) + '</h3>' : '',
    texto ? '<p>' + escaparHtml(texto) + '</p>' : '',
    botaoTexto && botaoUrl ? montarLinkPublico(botaoUrl, botaoTexto, 'secondary-button compact-button') : '',
    '</article>'
  ].join('');
}

function montarHistoriaConteudoPublico(marcos, vazio) {
  const itens = Array.isArray(marcos) ? marcos : [];

  if (!itens.length) {
    return montarEstadoVazioConteudoPublico(vazio);
  }

  return [
    '<ol class="public-timeline">',
    itens.map(function montarMarco(marco) {
      const ano = obterTextoCampo(marco, ['ano', 'ANO', 'data', 'DATA']);
      const titulo = obterTextoCampo(marco, ['titulo', 'TITULO']);
      const texto = obterTextoCampo(marco, ['texto', 'TEXTO', 'descricao', 'DESCRICAO']);

      return [
        '<li>',
        ano ? '<span>' + escaparHtml(ano) + '</span>' : '',
        titulo ? '<h3>' + escaparHtml(titulo) + '</h3>' : '',
        texto ? '<p>' + escaparHtml(texto) + '</p>' : '',
        '</li>'
      ].join('');
    }).join(''),
    '</ol>'
  ].join('');
}

function montarParceirosConteudoPublico(parceiros, vazio) {
  const itens = Array.isArray(parceiros) ? parceiros : [];

  if (!itens.length) {
    return montarEstadoVazioConteudoPublico(vazio);
  }

  return [
    '<div class="public-people-grid">',
    itens.map(function montarParceiro(parceiro) {
      const nome = obterTextoCampo(parceiro, ['nome', 'NOME', 'titulo', 'TITULO']);
      const tipo = obterTextoCampo(parceiro, ['tipoParceiro', 'TIPO_PARCEIRO', 'tipo', 'TIPO']);
      const descricao = obterTextoCampo(parceiro, ['descricao', 'DESCRICAO', 'texto', 'TEXTO']);
      const logoUrl = obterUrlPublicaConteudo(parceiro, ['logoUrl', 'LOGO_URL', 'imagemUrl', 'IMAGEM_URL']);
      const siteUrl = obterUrlPublicaConteudo(parceiro, ['siteUrl', 'SITE_URL']);

      return montarCardPessoaOuParceiro({
        nome: nome,
        subtitulo: tipo,
        descricao: descricao,
        imagemUrl: logoUrl,
        links: siteUrl ? [montarLinkPublico(siteUrl, 'Site', 'secondary-button compact-button')] : []
      });
    }).join(''),
    '</div>'
  ].join('');
}

function montarDocumentosConteudoPublico(documentos, vazio) {
  const itens = Array.isArray(documentos) ? documentos : [];

  if (!itens.length) {
    return montarEstadoVazioConteudoPublico(vazio);
  }

  return [
    '<div class="public-document-list">',
    itens.map(function montarDocumento(documento) {
      const titulo = obterTextoCampo(documento, ['titulo', 'TITULO']);
      const tipo = obterTextoCampo(documento, ['tipoDocumento', 'TIPO_DOCUMENTO', 'tipo', 'TIPO']);
      const descricao = obterTextoCampo(documento, ['descricao', 'DESCRICAO']);
      const url = obterUrlPublicaConteudo(documento, ['urlDocumento', 'URL_DOCUMENTO', 'url', 'URL']);

      return [
        '<article class="public-document-item">',
        '<div>',
        tipo ? '<span>' + escaparHtml(formatarRotuloPublico(tipo)) + '</span>' : '',
        titulo ? '<h3>' + escaparHtml(titulo) + '</h3>' : '',
        descricao ? '<p>' + escaparHtml(descricao) + '</p>' : '',
        '</div>',
        url ? montarLinkPublico(url, 'Abrir', 'secondary-button compact-button') : '',
        '</article>'
      ].join('');
    }).join(''),
    '</div>'
  ].join('');
}

function montarPessoasConteudoPublico(snapshot, definicao) {
  const pessoas = filtrarPessoasPublicas(snapshot, definicao);
  const gestoes = definicao.incluirGestoes ? obterListaSnapshot(snapshot.managementComplements) : [];
  const blocos = [];

  if (gestoes.length) {
    blocos.push(montarGestoesConteudoPublico(gestoes));
  }

  if (pessoas.length) {
    blocos.push([
      '<div class="public-people-grid">',
      pessoas.map(montarPessoaConteudoPublico).join(''),
      '</div>'
    ].join(''));
  }

  if (!blocos.length) {
    return montarEstadoVazioConteudoPublico(definicao.vazio);
  }

  return blocos.join('');
}

function montarGestoesConteudoPublico(gestoes) {
  return [
    '<div class="public-management-list">',
    gestoes.map(function montarGestao(gestao) {
      const nome = obterTextoCampo(gestao, ['nomePublicoGestao', 'NOME_PUBLICO_GESTAO', 'titulo', 'TITULO']);
      const lema = obterTextoCampo(gestao, ['lemaPublico', 'LEMA_PUBLICO']);
      const descricao = obterTextoCampo(gestao, ['descricaoGestao', 'DESCRICAO_GESTAO', 'descricao', 'DESCRICAO']);

      return [
        '<article class="public-management-card">',
        nome ? '<h3>' + escaparHtml(nome) + '</h3>' : '',
        lema ? '<strong>' + escaparHtml(lema) + '</strong>' : '',
        descricao ? '<p>' + escaparHtml(descricao) + '</p>' : '',
        '</article>'
      ].join('');
    }).join(''),
    '</div>'
  ].join('');
}

function montarPessoaConteudoPublico(pessoa) {
  const nome = obterTextoCampo(pessoa, ['nomePublico', 'NOME_PUBLICO', 'nome', 'NOME']);
  const cargo = obterTextoCampo(pessoa, ['cargoPublico', 'CARGO_PUBLICO', 'cargo', 'CARGO']);
  const grupo = obterTextoCampo(pessoa, ['grupoPublico', 'GRUPO_PUBLICO']);
  const periodo = obterTextoCampo(pessoa, ['periodoPublico', 'PERIODO_PUBLICO']);
  const descricao = obterTextoCampo(pessoa, ['descricaoPublica', 'DESCRICAO_PUBLICA', 'descricao', 'DESCRICAO']);
  const fotoUrl = obterUrlPublicaConteudo(pessoa, ['fotoUrl', 'FOTO_URL', 'imagemUrl', 'IMAGEM_URL']);
  const links = [
    montarLinkPublico(obterUrlPublicaConteudo(pessoa, ['linkLattes', 'LINK_LATTES']), 'Lattes', 'secondary-button compact-button'),
    montarLinkPublico(obterUrlPublicaConteudo(pessoa, ['linkInstagramPublico', 'LINK_INSTAGRAM_PUBLICO']), 'Instagram', 'secondary-button compact-button'),
    montarLinkPublico(obterUrlPublicaConteudo(pessoa, ['linkLinkedinPublico', 'LINK_LINKEDIN_PUBLICO']), 'LinkedIn', 'secondary-button compact-button')
  ].filter(Boolean);

  return montarCardPessoaOuParceiro({
    nome: nome,
    subtitulo: cargo || formatarRotuloPublico(grupo),
    periodo: periodo,
    descricao: descricao,
    imagemUrl: fotoUrl,
    links: links
  });
}

function montarCardPessoaOuParceiro(item) {
  const nome = item.nome || 'GEAPA';
  const iniciais = obterIniciaisConteudoPublico(nome);

  return [
    '<article class="public-person-card">',
    item.imagemUrl
      ? '<img src="' + escaparHtml(item.imagemUrl) + '" alt="" loading="lazy">'
      : '<div class="public-person-avatar" aria-hidden="true">' + escaparHtml(iniciais) + '</div>',
    '<div>',
    item.subtitulo ? '<span>' + escaparHtml(item.subtitulo) + '</span>' : '',
    '<h3>' + escaparHtml(nome) + '</h3>',
    item.periodo ? '<small>' + escaparHtml(item.periodo) + '</small>' : '',
    item.descricao ? '<p>' + escaparHtml(item.descricao) + '</p>' : '',
    item.links && item.links.length ? '<div class="public-card-links">' + item.links.join('') + '</div>' : '',
    '</div>',
    '</article>'
  ].join('');
}

function filtrarPessoasPublicas(snapshot, definicao) {
  const grupos = definicao.grupos || [];
  const pessoas = obterListaSnapshot(snapshot.peopleComplements);
  const legado = definicao.incluirLegadoDiretoria ? obterListaSnapshot(snapshot.boardComplements) : [];
  const todos = pessoas.concat(legado);

  if (!grupos.length) {
    return todos;
  }

  return todos.filter(function filtrarPessoa(pessoa) {
    const grupo = normalizarGrupoPublico(obterTextoCampo(pessoa, ['grupoPublico', 'GRUPO_PUBLICO', 'tipo', 'TIPO']));

    if (!grupo && definicao.incluirLegadoDiretoria) {
      return true;
    }

    return grupos.indexOf(grupo) >= 0;
  });
}

function obterListaSnapshot(valor) {
  return Array.isArray(valor) ? valor : [];
}

function normalizarGrupoPublico(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function obterUrlPublicaConteudo(objeto, chaves) {
  const url = obterTextoCampo(objeto, chaves);

  return ehUrlPublicaSegura(url) ? url : '';
}

function ehUrlPublicaSegura(url) {
  const valor = String(url || '').trim();

  return /^https?:\/\//i.test(valor) || /^mailto:[^@\s]+@[^@\s]+$/i.test(valor);
}

function montarLinkPublico(url, texto, classe) {
  if (!url || !texto) {
    return '';
  }

  return [
    '<a class="',
    escaparHtml(classe || 'secondary-button compact-button'),
    '" href="',
    escaparHtml(url),
    '" target="_blank" rel="noopener noreferrer">',
    escaparHtml(texto),
    '</a>'
  ].join('');
}

function obterIniciaisConteudoPublico(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return partes.map(function obterInicial(parte) {
    return parte.charAt(0).toUpperCase();
  }).join('') || 'G';
}

function rotaAindaAtual(idRota) {
  const navegacao = window.PortalGeapaNavigation;

  return !navegacao ||
    typeof navegacao.getRotaAtual !== 'function' ||
    navegacao.getRotaAtual() === idRota;
}

/**
 * Escapa texto antes de inserir HTML gerado por simulacao.
 *
 * @param {string} valor Texto recebido da interface.
 * @return {string} Texto seguro para HTML.
 */
function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
