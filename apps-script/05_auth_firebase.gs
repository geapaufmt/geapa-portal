/**
 * Autenticacao do Portal GEAPA com Firebase Authentication.
 *
 * O Firebase confirma a identidade Google. A autorizacao final continua sendo
 * feita no Apps Script/GEAPA-CORE usando a base oficial do GEAPA.
 */

/**
 * Entrada do portal para login com Google.
 *
 * @param {string} idToken Firebase ID Token recebido do front-end.
 * @return {Object} Resposta padronizada com sessao curta do portal.
 */
function portalLoginFirebase(idToken) {
  var inicio = portalAgoraMs_();
  var autorizacao = corePortalAuthorizeUser(idToken);
  var firestoreSync;

  if (!autorizacao.authorized) {
    return portalRespostaErro_(
      autorizacao.code || 'ACESSO_NAO_AUTORIZADO',
      autorizacao.message || 'Acesso nao autorizado para este e-mail.',
      {
        email: autorizacao.email ? portalMascararEmail_(autorizacao.email) : '',
        sessao: autorizacao.sessao || null
      },
      portalMetaDesempenho_('login-recusado', inicio)
    );
  }

  var sessionToken = portalCriarSessaoTemporaria_(autorizacao.email);
  firestoreSync = portalSincronizarCacheFirestoreLogin_(autorizacao);

  portalRegistrarLogAuthFirebase_({
    email: autorizacao.email,
    uid: autorizacao.uid,
    perfilPortal: autorizacao.perfilPortal,
    resultado: 'AUTORIZADO',
    motivo: ''
  });

  return portalRespostaOk_(
    'PORTAL_LOGIN_FIREBASE_OK',
    'Entrada com Google validada pelo GEAPA.',
    {
      sessionToken: sessionToken,
      validadeSessaoMinutos: PORTAL_CONFIG.validadeSessaoMinutos,
      sessao: autorizacao.sessao || null,
      cacheFirestore: firestoreSync,
      usuario: {
        uid: autorizacao.uid,
        email: portalMascararEmail_(autorizacao.email),
        nome: autorizacao.nome || autorizacao.displayName || '',
        rga: autorizacao.rga || '',
        status: autorizacao.status || '',
        perfilPortal: autorizacao.perfilPortal || 'MEMBRO',
        permissoes: autorizacao.permissoes || []
      }
    },
    portalMetaDesempenho_(autorizacao.sessao ? 'sessao-core' : 'fallback-local', inicio)
  );
}

function portalSincronizarCacheFirestoreLogin_(autorizacao) {
  var dados = autorizacao || {};
  var email = String(dados.email || '').trim();
  var uid = String(dados.uid || '').trim();
  var resultado;

  if (!email || !uid) {
    return {
      ok: false,
      synced: false,
      code: 'FIRESTORE_LOGIN_SYNC_DADOS_AUSENTES'
    };
  }

  try {
    if (typeof corePortalSyncFirestoreUserByEmail === 'function') {
      resultado = corePortalSyncFirestoreUserByEmail(email, {
        uid: uid,
        sessao: dados.sessao || null
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      typeof GEAPA_CORE.corePortalSyncFirestoreUserByEmail === 'function'
    ) {
      resultado = GEAPA_CORE.corePortalSyncFirestoreUserByEmail(email, {
        uid: uid,
        sessao: dados.sessao || null
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      GEAPA_CORE.portal &&
      GEAPA_CORE.portal.access &&
      typeof GEAPA_CORE.portal.access.syncFirestoreUserByEmail === 'function'
    ) {
      resultado = GEAPA_CORE.portal.access.syncFirestoreUserByEmail(email, {
        uid: uid,
        sessao: dados.sessao || null
      });
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-FIRESTORE-LOGIN-SYNC ' + JSON.stringify({
      ok: false,
      code: 'FIRESTORE_LOGIN_SYNC_EXCEPTION',
      erro: erro && erro.message ? erro.message : String(erro)
    }));
    return {
      ok: false,
      synced: false,
      code: 'FIRESTORE_LOGIN_SYNC_EXCEPTION'
    };
  }

  if (!resultado) {
    return {
      ok: false,
      synced: false,
      code: 'FIRESTORE_LOGIN_SYNC_INDISPONIVEL'
    };
  }

  return {
    ok: resultado.ok === true,
    synced: resultado.synced === true,
    writer: resultado.writer || '',
    code: resultado.code || '',
    httpStatus: resultado.httpStatus || ''
  };
}

/**
 * Valida o Firebase ID Token pela Identity Toolkit REST API.
 *
 * @param {string} idToken Firebase ID Token.
 * @return {Object} Dados seguros do usuario autenticado.
 */
function coreAuthVerifyFirebaseUser(idToken) {
  var token = String(idToken || '').trim();

  if (!token) {
    return {
      ok: false,
      code: 'FIREBASE_ID_TOKEN_OBRIGATORIO',
      message: 'Token de autenticacao ausente.'
    };
  }

  var apiKey = portalGetFirebaseWebApiKey_();

  if (!apiKey) {
    return {
      ok: false,
      code: 'FIREBASE_API_KEY_NAO_CONFIGURADA',
      message: 'Chave publica do Firebase nao configurada no Apps Script.'
    };
  }

  var respostaHttp;

  try {
    respostaHttp = UrlFetchApp.fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          idToken: token
        }),
        muteHttpExceptions: true
      }
    );
  } catch (erro) {
    return {
      ok: false,
      code: 'FIREBASE_HTTP_ERRO',
      message: 'Nao foi possivel validar o login Google no Firebase.'
    };
  }

  var status = respostaHttp.getResponseCode();
  var corpo = respostaHttp.getContentText() || '{}';
  var dados = portalParseJsonSeguro_(corpo);

  if (status < 200 || status >= 300) {
    return {
      ok: false,
      code: portalMapearErroFirebase_(dados),
      message: 'Token Firebase invalido ou expirado.'
    };
  }

  if (!dados || !Array.isArray(dados.users) || !dados.users.length) {
    return {
      ok: false,
      code: 'FIREBASE_USUARIO_NAO_ENCONTRADO',
      message: 'Usuario Firebase nao encontrado.'
    };
  }

  var usuario = dados.users[0] || {};
  var email = portalNormalizarIdentificador_(usuario.email || '');

  if (!email) {
    return {
      ok: false,
      code: 'FIREBASE_EMAIL_AUSENTE',
      message: 'Login Google sem e-mail validavel.'
    };
  }

  return {
    ok: true,
    uid: String(usuario.localId || ''),
    email: email,
    emailVerified: usuario.emailVerified === true,
    displayName: String(usuario.displayName || ''),
    photoUrl: String(usuario.photoUrl || ''),
    disabled: usuario.disabled === true,
    providerData: Array.isArray(usuario.providerUserInfo)
      ? usuario.providerUserInfo.map(portalNormalizarProviderFirebase_)
      : []
  };
}

/**
 * Autoriza o usuario autenticado na base oficial do GEAPA.
 *
 * @param {string} idToken Firebase ID Token.
 * @return {Object} Autorizacao normalizada.
 */
function corePortalAuthorizeUser(idToken) {
  var usuario = coreAuthVerifyFirebaseUser(idToken);

  if (!usuario.ok) {
    return {
      authorized: false,
      code: usuario.code,
      message: usuario.message
    };
  }

  if (usuario.disabled) {
    portalRegistrarLogAuthFirebase_({
      email: usuario.email,
      uid: usuario.uid,
      perfilPortal: '',
      resultado: 'RECUSADO',
      motivo: 'USUARIO_FIREBASE_DESATIVADO'
    });

    return {
      authorized: false,
      code: 'FIREBASE_USUARIO_DESATIVADO',
      message: 'Usuario Firebase desativado.',
      email: usuario.email
    };
  }

  if (!usuario.emailVerified) {
    portalRegistrarLogAuthFirebase_({
      email: usuario.email,
      uid: usuario.uid,
      perfilPortal: '',
      resultado: 'RECUSADO',
      motivo: 'EMAIL_NAO_VERIFICADO'
    });

    return {
      authorized: false,
      code: 'FIREBASE_EMAIL_NAO_VERIFICADO',
      message: 'E-mail Google ainda nao verificado.',
      email: usuario.email
    };
  }

  var autorizacaoCore = portalAutorizarFirebaseViaGeapaCore_(usuario);

  if (autorizacaoCore) {
    return autorizacaoCore;
  }

  var membro = portalBuscarMembroPorEmailOuRga_(usuario.email);

  if (!membro) {
    portalRegistrarLogAuthFirebase_({
      email: usuario.email,
      uid: usuario.uid,
      perfilPortal: '',
      resultado: 'RECUSADO',
      motivo: 'MEMBRO_NAO_ENCONTRADO'
    });

    return {
      authorized: false,
      code: 'MEMBRO_NAO_AUTORIZADO_PORTAL',
      message: 'E-mail autenticado nao localizado na base do GEAPA.',
      email: usuario.email
    };
  }

  return {
    authorized: true,
    uid: usuario.uid,
    email: usuario.email,
    emailVerified: usuario.emailVerified,
    displayName: usuario.displayName,
    nome: membro.nomeExibicao,
    rga: membro.rga,
    status: membro.situacaoGeral,
    perfilPortal: 'MEMBRO',
    permissoes: [],
    timestampLogin: new Date().toISOString()
  };
}

function portalAutorizarFirebaseViaGeapaCore_(usuario) {
  var sessao = portalResolverSessaoAtualViaGeapaCore_(
    {
      email: usuario.email,
      identificador: usuario.email,
      emailOuRga: usuario.email
    },
    {
      uid: usuario.uid,
      provider: 'firebase'
    }
  );

  if (sessao) {
    if (sessao.ok === false || sessao.autenticado === false || sessao.portalAtivo === false) {
      portalRegistrarLogAuthFirebase_({
        email: usuario.email,
        uid: usuario.uid,
        perfilPortal: sessao.perfilPortalEfetivo || '',
        resultado: 'RECUSADO',
        motivo: sessao.motivoBloqueio || 'CORE_NAO_AUTORIZOU'
      });

      return {
        authorized: false,
        code: sessao.motivoBloqueio || 'MEMBRO_NAO_AUTORIZADO_PORTAL',
        message: sessao.mensagemBloqueio || portalMensagemBloqueioPadrao_(),
        email: usuario.email,
        uid: usuario.uid,
        sessao: sessao
      };
    }

    return {
      authorized: true,
      uid: usuario.uid,
      email: usuario.email,
      emailVerified: usuario.emailVerified,
      displayName: usuario.displayName,
      nome: sessao.nomeExibicao || usuario.displayName,
      rga: sessao.rga || '',
      status: sessao.statusVinculoAtual || '',
      perfilPortal: sessao.perfilPortalEfetivo || 'MEMBRO',
      permissoes: sessao.permissoes || [],
      sessao: sessao,
      timestampLogin: new Date().toISOString()
    };
  }

  var resposta = null;

  try {
    if (typeof corePortalAuthorizeEmail === 'function') {
      resposta = corePortalAuthorizeEmail(usuario.email, {
        uid: usuario.uid,
        provider: 'firebase'
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      typeof GEAPA_CORE.corePortalAuthorizeEmail === 'function'
    ) {
      resposta = GEAPA_CORE.corePortalAuthorizeEmail(usuario.email, {
        uid: usuario.uid,
        provider: 'firebase'
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      GEAPA_CORE.portal &&
      typeof GEAPA_CORE.portal.authorizeEmail === 'function'
    ) {
      resposta = GEAPA_CORE.portal.authorizeEmail(usuario.email, {
        uid: usuario.uid,
        provider: 'firebase'
      });
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-FIREBASE-AUTHZ ' + JSON.stringify({
      etapa: 'corePortalAuthorizeEmail',
      erro: erro && erro.message ? erro.message : String(erro)
    }));
    return null;
  }

  if (!resposta) {
    return null;
  }

  if (resposta.authorized !== true && resposta.ok !== true) {
    portalRegistrarLogAuthFirebase_({
      email: usuario.email,
      uid: usuario.uid,
      perfilPortal: resposta.perfilPortal || resposta.perfil || '',
      resultado: 'RECUSADO',
      motivo: resposta.code || 'CORE_NAO_AUTORIZOU'
    });

    return {
      authorized: false,
      code: resposta.code || 'MEMBRO_NAO_AUTORIZADO_PORTAL',
      message: resposta.message || 'E-mail autenticado nao autorizado para o portal.',
      email: usuario.email,
      uid: usuario.uid
    };
  }

  return {
    authorized: true,
    uid: usuario.uid,
    email: usuario.email,
    emailVerified: usuario.emailVerified,
    displayName: usuario.displayName,
    nome: resposta.nome || resposta.nomeExibicao || usuario.displayName,
    rga: resposta.rga || '',
    status: resposta.status || '',
    perfilPortal: resposta.perfilPortal || resposta.perfil || 'MEMBRO',
    permissoes: resposta.permissoes || resposta.permissions || [],
    sessao: portalNormalizarSessaoPortalCore_(resposta.sessao) || null,
    timestampLogin: new Date().toISOString()
  };
}

function corePortalRequirePermission_(session, permission) {
  var permissoes = session && Array.isArray(session.permissoes)
    ? session.permissoes
    : [];
  var desejada = String(permission || '').trim().toLowerCase();

  return permissoes.some(function compararPermissao(permissao) {
    return String(permissao || '').trim().toLowerCase() === desejada;
  });
}

function portalGetFirebaseWebApiKey_() {
  var propriedades = PropertiesService.getScriptProperties();
  return propriedades.getProperty(PORTAL_CONFIG.propriedades.firebaseWebApiKey) || '';
}

function portalParseJsonSeguro_(texto) {
  try {
    return JSON.parse(texto || '{}');
  } catch (erro) {
    return {};
  }
}

function portalMapearErroFirebase_(dados) {
  var mensagem = dados && dados.error && dados.error.message
    ? String(dados.error.message)
    : '';

  if (mensagem.indexOf('TOKEN_EXPIRED') >= 0) {
    return 'FIREBASE_TOKEN_EXPIRADO';
  }

  if (mensagem.indexOf('INVALID_ID_TOKEN') >= 0 || mensagem.indexOf('INVALID_IDP_RESPONSE') >= 0) {
    return 'FIREBASE_TOKEN_INVALIDO';
  }

  if (mensagem.indexOf('USER_DISABLED') >= 0) {
    return 'FIREBASE_USUARIO_DESATIVADO';
  }

  return 'FIREBASE_TOKEN_INVALIDO';
}

function portalNormalizarProviderFirebase_(provider) {
  var dados = provider || {};

  return {
    providerId: String(dados.providerId || ''),
    federatedId: String(dados.federatedId || ''),
    email: portalNormalizarIdentificador_(dados.email || ''),
    displayName: String(dados.displayName || ''),
    photoUrl: String(dados.photoUrl || '')
  };
}

function portalRegistrarLogAuthFirebase_(evento) {
  var dados = evento || {};

  Logger.log('GEAPA-PORTAL-FIREBASE-AUTH ' + JSON.stringify({
    timestamp: new Date().toISOString(),
    email: dados.email ? portalMascararEmail_(dados.email) : '',
    uid: dados.uid || '',
    perfil: dados.perfilPortal || '',
    resultado: dados.resultado || '',
    motivo: dados.motivo || '',
    acao: 'PORTAL_LOGIN'
  }));
}
