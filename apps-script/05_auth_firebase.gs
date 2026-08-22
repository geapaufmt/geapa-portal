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
function portalLoginFirebase(idToken, firebaseUser, clientSubmittedAt) {
  var inicio = portalAgoraMs_();
  var autorizacao = corePortalAuthorizeUser(idToken, firebaseUser || {});
  var firestoreSync;

  if (!autorizacao.authorized) {
    firestoreSync = autorizacao.firebaseIdentityVerified === true
      ? portalMarcarCacheFirestoreLoginNegado_(autorizacao)
      : null;
    return portalRespostaErro_(
      autorizacao.firebaseIdentityVerified === true ? 'USUARIO_NAO_AUTORIZADO' : (autorizacao.code || 'ACESSO_NAO_AUTORIZADO'),
      autorizacao.message || 'Acesso nao autorizado para este e-mail.',
      {
        email: autorizacao.email ? portalMascararEmail_(autorizacao.email) : '',
        sessao: autorizacao.sessao || null,
        reasonCode: autorizacao.code || 'ACESSO_NAO_AUTORIZADO',
        cacheFirestore: firestoreSync
      },
      portalMetaDesempenho_('login-recusado', inicio)
    );
  }

  var identityConsistency = portalConferirFirebaseComSessaoCore_(autorizacao);
  if (!identityConsistency.ok) {
    return portalRespostaErro_(
      'IDENTITY_MISMATCH_FIREBASE_CORE',
      'A identidade Firebase nao corresponde a pessoa oficial resolvida pelo GEAPA-CORE.',
      {
        reasonCode: 'IDENTITY_MISMATCH_FIREBASE_CORE',
        cacheFirestore: {
          ok: false,
          synced: false,
          code: 'PROVISION_DENY_IDENTITY_MISMATCH'
        }
      },
      portalMetaDesempenho_('identidade-divergente', inicio)
    );
  }

  autorizacao = Object.assign({}, autorizacao, {
    sessao: portalAnotarSessaoFirebaseCore_(
      autorizacao.sessao,
      autorizacao.email,
      identityConsistency
    )
  });

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
      warnings: firestoreSync && firestoreSync.synced !== true ? [{
        code: 'FIRESTORE_USER_PROVISION_PENDENTE',
        message: 'O cache privado do usuario sera atualizado em uma proxima validacao.'
      }] : [],
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
  var inicio = portalAgoraMs_();
  var dados = autorizacao || {};
  var email = String(dados.email || '').trim();
  var uid = String(dados.uid || '').trim();
  var resultado;

  if (!uid) {
    portalRegistrarLogProvisionamentoFirestore_({
      acao: 'PORTAL_FIRESTORE_USER_PROVISION_SKIP',
      resultado: 'SKIP',
      motivo: 'PROVISION_SKIP_SEM_FIREBASE_AUTH',
      duracaoMs: portalAgoraMs_() - inicio
    });
    return {
      ok: true,
      synced: false,
      code: 'PROVISION_SKIP_SEM_FIREBASE_AUTH'
    };
  }

  if (!email || !dados.sessao || !String(dados.sessao.idPessoa || '').trim()) {
    portalRegistrarLogProvisionamentoFirestore_({
      acao: 'PORTAL_FIRESTORE_USER_PROVISION_DENY',
      resultado: 'DENY',
      uid: uid,
      email: email,
      motivo: 'PROVISION_DENY_EMAIL_NAO_ENCONTRADO',
      duracaoMs: portalAgoraMs_() - inicio
    });
    return {
      ok: false,
      synced: false,
      code: 'PROVISION_DENY_EMAIL_NAO_ENCONTRADO'
    };
  }

  try {
    var identity = {
      uid: uid,
      email: email,
      emailVerified: dados.emailVerified === true,
      providerId: dados.providerId || ''
    };
    var provisionOptions = {
      ambiente: portalResolverAmbienteDadosV2_(),
      uid: uid,
      sessao: dados.sessao || null,
      identityVerified: true,
      lastLoginAt: dados.timestampLogin || new Date().toISOString(),
      dryRun: false
    };
    if (typeof corePortalProvisionarFirestoreUserAutenticado === 'function') {
      resultado = corePortalProvisionarFirestoreUserAutenticado(identity, provisionOptions);
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      typeof GEAPA_CORE.corePortalProvisionarFirestoreUserAutenticado === 'function'
    ) {
      resultado = GEAPA_CORE.corePortalProvisionarFirestoreUserAutenticado(identity, provisionOptions);
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      GEAPA_CORE.portal &&
      GEAPA_CORE.portal.access &&
      typeof GEAPA_CORE.portal.access.provisionarFirestoreUserAutenticado === 'function'
    ) {
      resultado = GEAPA_CORE.portal.access.provisionarFirestoreUserAutenticado(identity, provisionOptions);
    } else if (typeof corePortalSyncFirestoreUserByEmail === 'function') {
      resultado = corePortalSyncFirestoreUserByEmail(email, {
        ambiente: portalResolverAmbienteDadosV2_(),
        uid: uid,
        sessao: dados.sessao || null,
        dryRun: false
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      typeof GEAPA_CORE.corePortalSyncFirestoreUserByEmail === 'function'
    ) {
      resultado = GEAPA_CORE.corePortalSyncFirestoreUserByEmail(email, {
        ambiente: portalResolverAmbienteDadosV2_(),
        uid: uid,
        sessao: dados.sessao || null,
        dryRun: false
      });
    } else if (
      typeof GEAPA_CORE !== 'undefined' &&
      GEAPA_CORE.portal &&
      GEAPA_CORE.portal.access &&
      typeof GEAPA_CORE.portal.access.syncFirestoreUserByEmail === 'function'
    ) {
      resultado = GEAPA_CORE.portal.access.syncFirestoreUserByEmail(email, {
        ambiente: portalResolverAmbienteDadosV2_(),
        uid: uid,
        sessao: dados.sessao || null,
        dryRun: false
      });
    }
  } catch (erro) {
    Logger.log('GEAPA-PORTAL-FIRESTORE-LOGIN-SYNC ' + JSON.stringify({
      ok: false,
      code: 'FIRESTORE_LOGIN_SYNC_EXCEPTION',
      erro: erro && erro.message ? erro.message : String(erro)
    }));
    portalRegistrarLogProvisionamentoFirestore_({
      acao: 'PORTAL_FIRESTORE_USER_PROVISION_ERROR',
      resultado: 'ERROR',
      uid: uid,
      email: email,
      idPessoa: dados.sessao && dados.sessao.idPessoa || '',
      perfilPortal: dados.perfilPortal || '',
      motivo: 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED',
      duracaoMs: portalAgoraMs_() - inicio
    });
    return {
      ok: false,
      synced: false,
      code: 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED'
    };
  }

  if (!resultado) {
    portalRegistrarLogProvisionamentoFirestore_({
      acao: 'PORTAL_FIRESTORE_USER_PROVISION_ERROR',
      resultado: 'ERROR',
      uid: uid,
      email: email,
      idPessoa: dados.sessao && dados.sessao.idPessoa || '',
      perfilPortal: dados.perfilPortal || '',
      motivo: 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED',
      duracaoMs: portalAgoraMs_() - inicio
    });
    return {
      ok: false,
      synced: false,
      code: 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED'
    };
  }

  var provisionCode = portalNormalizarCodigoProvisionamento_(resultado);
  var provisionOk = [
    'PROVISION_OK',
    'PROVISION_ALREADY_VALID',
    'PROVISION_UPDATED'
  ].indexOf(provisionCode) >= 0 && resultado.ok === true && resultado.synced === true;
  var provisionDeny = provisionCode.indexOf('PROVISION_DENY_') === 0;

  portalRegistrarLogProvisionamentoFirestore_({
    acao: provisionOk
      ? 'PORTAL_FIRESTORE_USER_PROVISION_OK'
      : (provisionDeny ? 'PORTAL_FIRESTORE_USER_PROVISION_DENY' : 'PORTAL_FIRESTORE_USER_PROVISION_ERROR'),
    resultado: provisionOk ? 'OK' : (provisionDeny ? 'DENY' : 'ERROR'),
    uid: uid,
    email: email,
    idPessoa: dados.sessao && dados.sessao.idPessoa || '',
    perfilPortal: dados.perfilPortal || '',
    motivo: provisionCode,
    duracaoMs: portalAgoraMs_() - inicio
  });

  return {
    ok: provisionOk,
    synced: provisionOk,
    confirmed: provisionOk,
    writer: resultado.writer || '',
    code: provisionCode,
    httpStatus: resultado.httpStatus || ''
  };
}

function portalConferirFirebaseComSessaoCore_(autorizacao) {
  var dados = autorizacao || {};
  var sessao = dados.sessao || {};
  var firebaseEmail = portalNormalizarIdentificador_(dados.email || '');
  var coreEmail = portalNormalizarIdentificador_(sessao.email || sessao.emailNormalizado || '');
  var idPessoa = String(sessao.idPessoa || '').trim();
  var emailDireto = Boolean(firebaseEmail && coreEmail && firebaseEmail === coreEmail);
  var aliasConfirmado = Boolean(
    firebaseEmail &&
    coreEmail &&
    idPessoa &&
    dados.identidadeCoreResolvidaPorEmailFirebase === true
  );

  return {
    ok: Boolean(idPessoa && (emailDireto || aliasConfirmado)),
    code: emailDireto
      ? 'IDENTITY_MATCH_FIREBASE_CORE'
      : (aliasConfirmado
        ? 'IDENTITY_ALIAS_CORE_CONFIRMADO'
        : (firebaseEmail && coreEmail && firebaseEmail !== coreEmail
          ? 'IDENTITY_MISMATCH_FIREBASE_CORE'
          : 'IDENTIDADE_CORE_INCOMPLETA')),
    emailDireto: emailDireto,
    aliasConfirmado: aliasConfirmado
  };
}

function portalAnotarSessaoFirebaseCore_(sessao, firebaseEmail, identityConsistency) {
  var base = sessao || {};
  var consistency = identityConsistency || {};
  return Object.assign({}, base, {
    emailAutenticacao: portalNormalizarIdentificador_(firebaseEmail || ''),
    identidadeFirebaseCoreConfirmada: consistency.ok === true,
    identidadeFirebaseCoreCodigo: String(consistency.code || '')
  });
}

function portalNormalizarCodigoProvisionamento_(resultado) {
  var dados = resultado || {};
  var raw = String(dados.code || '').trim().toUpperCase();

  if (dados.ok === true && dados.synced === true) {
    if (raw.indexOf('ALREADY') >= 0 || raw.indexOf('VALID') >= 0 || raw.indexOf('UNCHANGED') >= 0) {
      return 'PROVISION_ALREADY_VALID';
    }
    if (raw.indexOf('UPDATED') >= 0 || raw.indexOf('ATUALIZ') >= 0) {
      return 'PROVISION_UPDATED';
    }
    return 'PROVISION_OK';
  }
  if (raw.indexOf('MISMATCH') >= 0 || raw.indexOf('DIVERG') >= 0) {
    return 'PROVISION_DENY_IDENTITY_MISMATCH';
  }
  if (raw.indexOf('EMAIL') >= 0 || raw.indexOf('PESSOA') >= 0 || raw.indexOf('MEMBRO') >= 0) {
    return 'PROVISION_DENY_EMAIL_NAO_ENCONTRADO';
  }
  return 'PROVISION_ERROR_FIRESTORE_WRITE_FAILED';
}

function portalMarcarCacheFirestoreLoginNegado_(autorizacao) {
  var inicio = portalAgoraMs_();
  var dados = autorizacao || {};
  var uid = String(dados.uid || '').trim();
  var resultado = null;
  if (!uid) return { ok: true, synced: false, code: 'UID_FIREBASE_AUSENTE' };
  var options = {
    identityVerified: true,
    staleReason: dados.code || 'USUARIO_NAO_AUTORIZADO',
    dryRun: false
  };
  try {
    if (typeof corePortalMarcarFirestoreUserInativoPorUid === 'function') {
      resultado = corePortalMarcarFirestoreUserInativoPorUid(uid, options);
    } else if (typeof GEAPA_CORE !== 'undefined' && typeof GEAPA_CORE.corePortalMarcarFirestoreUserInativoPorUid === 'function') {
      resultado = GEAPA_CORE.corePortalMarcarFirestoreUserInativoPorUid(uid, options);
    } else if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE.portal && GEAPA_CORE.portal.access && typeof GEAPA_CORE.portal.access.marcarFirestoreUserInativoPorUid === 'function') {
      resultado = GEAPA_CORE.portal.access.marcarFirestoreUserInativoPorUid(uid, options);
    }
  } catch (erro) {
    resultado = { ok: false, synced: false, code: 'FIRESTORE_USER_INVALIDACAO_EXCEPTION' };
  }
  resultado = resultado || { ok: true, synced: false, code: 'FIRESTORE_USER_INVALIDACAO_INDISPONIVEL' };
  portalRegistrarLogProvisionamentoFirestore_({
    acao: 'PORTAL_FIRESTORE_USER_PROVISION_DENY',
    resultado: 'DENY',
    uid: uid,
    email: dados.email || '',
    idPessoa: dados.sessao && dados.sessao.idPessoa || '',
    perfilPortal: dados.sessao && dados.sessao.perfilPortalEfetivo || '',
    motivo: dados.code || 'USUARIO_NAO_AUTORIZADO',
    duracaoMs: portalAgoraMs_() - inicio
  });
  return resultado;
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
  var claims = portalDecodificarFirebaseIdToken_(token);
  var projectId = portalGetFirebaseProjectId_();

  if (
    !claims ||
    String(claims.aud || '') !== projectId ||
    String(claims.iss || '') !== 'https://securetoken.google.com/' + projectId ||
    String(claims.sub || '') !== String(usuario.localId || '')
  ) {
    return {
      ok: false,
      code: 'FIREBASE_TOKEN_PROJETO_DIVERGENTE',
      message: 'Token Firebase emitido para outro projeto ou usuario.'
    };
  }

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
      : [],
    providerId: usuario.providerUserInfo && usuario.providerUserInfo[0]
      ? String(usuario.providerUserInfo[0].providerId || '')
      : ''
  };
}

/**
 * Autoriza o usuario autenticado na base oficial do GEAPA.
 *
 * @param {string} idToken Firebase ID Token.
 * @return {Object} Autorizacao normalizada.
 */
function corePortalAuthorizeUser(idToken, firebaseUserDeclarado) {
  var usuario = coreAuthVerifyFirebaseUser(idToken);

  if (!usuario.ok) {
    return {
      authorized: false,
      code: usuario.code,
      message: usuario.message
    };
  }

  var declarado = firebaseUserDeclarado || {};
  var identityCheck = portalConferirIdentidadeFirebaseDeclarada_(usuario, declarado);
  if (!identityCheck.ok) {
    portalRegistrarLogProvisionamentoFirestore_({
      acao: 'PORTAL_FIRESTORE_USER_PROVISION_DENY',
      resultado: 'DENY',
      uid: usuario.uid,
      email: usuario.email,
      motivo: 'FIREBASE_IDENTIDADE_DIVERGENTE',
      duracaoMs: 0
    });
    return {
      authorized: false,
      firebaseIdentityVerified: false,
      code: 'FIREBASE_IDENTIDADE_DIVERGENTE',
      message: 'Os dados do login nao correspondem ao token Firebase validado.'
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
      firebaseIdentityVerified: true,
      uid: usuario.uid,
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
      firebaseIdentityVerified: true,
      uid: usuario.uid,
      code: 'FIREBASE_EMAIL_NAO_VERIFICADO',
      message: 'E-mail Google ainda nao verificado.',
      email: usuario.email
    };
  }

  var autorizacaoCore = portalAutorizarFirebaseViaGeapaCore_(usuario);

  if (autorizacaoCore) {
    return Object.assign({}, autorizacaoCore, {
      firebaseIdentityVerified: true,
      providerId: usuario.providerId || ''
    });
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
      firebaseIdentityVerified: true,
      uid: usuario.uid,
      code: 'MEMBRO_NAO_AUTORIZADO_PORTAL',
      message: 'E-mail autenticado nao localizado na base do GEAPA.',
      email: usuario.email
    };
  }

  return {
    authorized: true,
    firebaseIdentityVerified: true,
    uid: usuario.uid,
    email: usuario.email,
    emailVerified: usuario.emailVerified,
    displayName: usuario.displayName,
    providerId: usuario.providerId || '',
    nome: membro.nomeExibicao,
    rga: membro.rga,
    status: membro.situacaoGeral,
    perfilPortal: 'MEMBRO',
    permissoes: [],
    timestampLogin: new Date().toISOString()
  };
}

function portalConferirIdentidadeFirebaseDeclarada_(usuarioVerificado, usuarioDeclarado) {
  var verified = usuarioVerificado || {};
  var declared = usuarioDeclarado || {};
  var declaredUid = String(declared.uid || '').trim();
  var declaredEmail = portalNormalizarIdentificador_(declared.email || '');
  var divergent = (declaredUid && declaredUid !== String(verified.uid || '').trim()) ||
    (declaredEmail && declaredEmail !== portalNormalizarIdentificador_(verified.email || '')) ||
    (Object.prototype.hasOwnProperty.call(declared, 'emailVerified') && declared.emailVerified !== verified.emailVerified);
  return {
    ok: !divergent,
    code: divergent ? 'FIREBASE_IDENTIDADE_DIVERGENTE' : 'FIREBASE_IDENTIDADE_CONFERIDA'
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
      identidadeCoreResolvidaPorEmailFirebase: true,
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
  var environment = portalResolverAmbienteDadosV2_();
  var propertyName = PORTAL_CONFIG.propriedades.firebaseWebApiKeyByEnvironment[environment];
  if (!propertyName) throw new Error('PORTAL_FIREBASE_WEB_API_KEY_PROPERTY_INVALIDA');
  var propriedades = PropertiesService.getScriptProperties();
  var apiKey = String(propriedades.getProperty(propertyName) || '').trim();
  if (!apiKey) throw new Error(propertyName + '_NAO_CONFIGURADA');
  return apiKey;
}

function portalGetFirebaseProjectId_() {
  var environment = portalResolverAmbienteDadosV2_();
  var firebasePropertyName = PORTAL_CONFIG.propriedades.firebaseProjectIdByEnvironment[environment];
  var corePropertyName = PORTAL_CONFIG.propriedades.coreFirestoreProjectIdByEnvironment[environment];
  if (!firebasePropertyName || !corePropertyName) {
    throw new Error('PORTAL_FIREBASE_PROJECT_ID_PROPERTIES_INVALIDAS');
  }
  var propriedades = PropertiesService.getScriptProperties();
  var firebaseProjectId = String(propriedades.getProperty(firebasePropertyName) || '').trim();
  var coreFirestoreProjectId = String(propriedades.getProperty(corePropertyName) || '').trim();
  if (!firebaseProjectId) throw new Error(firebasePropertyName + '_NAO_CONFIGURADO');
  if (!coreFirestoreProjectId) throw new Error(corePropertyName + '_NAO_CONFIGURADO');
  if (firebaseProjectId !== coreFirestoreProjectId) {
    throw new Error('PORTAL_FIREBASE_CORE_PROJECT_ID_DIVERGENTE_' + environment);
  }
  return firebaseProjectId;
}

function portalDecodificarFirebaseIdToken_(token) {
  try {
    var parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    var bytes = Utilities.base64DecodeWebSafe(parts[1]);
    return JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
  } catch (erro) {
    return null;
  }
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
    uid: portalTruncarUidFirebase_(dados.uid || ''),
    perfil: dados.perfilPortal || '',
    resultado: dados.resultado || '',
    motivo: dados.motivo || '',
    acao: 'PORTAL_LOGIN'
  }));
}

function portalTruncarUidFirebase_(uid) {
  var value = String(uid || '').trim();
  if (!value) return '';
  return value.length <= 10 ? value : value.slice(0, 6) + '...' + value.slice(-4);
}

function portalRegistrarLogProvisionamentoFirestore_(evento) {
  var dados = evento || {};
  var emailMascarado = dados.email ? portalMascararEmail_(dados.email) : '';
  var uidTruncado = portalTruncarUidFirebase_(dados.uid || '');
  var action = String(dados.acao || 'PORTAL_FIRESTORE_USER_PROVISION_ERROR');
  var payload = {
    email: emailMascarado,
    uidFirebase: uidTruncado,
    perfilPortal: String(dados.perfilPortal || ''),
    acao: action,
    resultado: String(dados.resultado || ''),
    motivo: String(dados.motivo || '').slice(0, 160),
    origem: 'geapa-portal/apps-script',
    obs: [
      dados.idPessoa ? 'idPessoa=' + String(dados.idPessoa).slice(0, 80) : '',
      'duracaoMs=' + Math.max(0, Math.round(Number(dados.duracaoMs || 0)))
    ].filter(String).join('; ')
  };

  Logger.log(action + ' ' + JSON.stringify({
    uid: uidTruncado,
    email: emailMascarado,
    idPessoa: dados.idPessoa ? String(dados.idPessoa).slice(0, 80) : '',
    perfil: payload.perfilPortal,
    motivo: payload.motivo,
    duracaoMs: Math.max(0, Math.round(Number(dados.duracaoMs || 0)))
  }));

  try {
    if (typeof corePortalLogAccess === 'function') {
      corePortalLogAccess(payload);
    } else if (typeof GEAPA_CORE !== 'undefined' && typeof GEAPA_CORE.corePortalLogAccess === 'function') {
      GEAPA_CORE.corePortalLogAccess(payload);
    } else if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE.portal && GEAPA_CORE.portal.access && typeof GEAPA_CORE.portal.access.logAccess === 'function') {
      GEAPA_CORE.portal.access.logAccess(payload);
    }
  } catch (erro) {
    Logger.log('PORTAL_FIRESTORE_USER_PROVISION_LOG_FALHOU ' + JSON.stringify({ acao: action }));
  }
}
