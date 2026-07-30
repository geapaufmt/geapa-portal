/**
 * Ponte segura entre o Portal e os contratos cadastrais do GEAPA-CORE.
 * A identidade-alvo sempre vem da sessao oficial resolvida no backend.
 */

function portalMeuPerfilAtualizar(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'portal:acessar');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadAtualizacao_(payload);
  if (!dados.ok) return dados.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreAtualizarMeuPerfilParaPortal',
    [dados.payload, acesso.contexto],
    'MEU_PERFIL_ATUALIZADO',
    'Perfil atualizado com sucesso.',
    inicio
  );
}

function portalMeuPerfilSolicitarCorrecao(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'portal:acessar');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadCorrecao_(payload);
  if (!dados.ok) return dados.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreSolicitarCorrecaoMeuPerfilParaPortal',
    [dados.payload, acesso.contexto],
    'CORRECAO_CADASTRAL_SOLICITADA',
    'Solicitacao cadastral enviada para analise.',
    inicio,
    {
      requestId: dados.requestId,
      campo: dados.payload.campo,
      details: dados.details
    }
  );
}

function portalMeuPerfilListarSolicitacoes(token) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'portal:acessar');
  if (!acesso.ok) return acesso.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreListarMinhasSolicitacoesCadastraisPortal',
    [acesso.contexto],
    'MINHAS_SOLICITACOES_CADASTRAIS',
    'Solicitacoes cadastrais carregadas.',
    inicio
  );
}

function portalMeuPerfilConsultarSolicitacao(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'portal:acessar');
  if (!acesso.ok) return acesso.resposta;
  var consulta = portalPerfilCorrecoesPayloadConsulta_(payload);
  if (!consulta.ok) return consulta.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreConsultarMinhaSolicitacaoCadastralPortal',
    [consulta.payload, acesso.contexto],
    'SOLICITACAO_CADASTRAL_CONFIRMADA',
    'Consulta de confirmacao concluida.',
    inicio,
    { requestId: consulta.requestId, campo: '', details: consulta.details }
  );
}

function portalAdminCorrecoesCadastraisListar(token, filtros) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'membros:analisar_correcoes');
  if (!acesso.ok) return acesso.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreListarSolicitacoesCadastraisAdministracaoPortal',
    [portalPerfilCorrecoesFiltrosAdmin_(filtros), acesso.contexto],
    'CORRECOES_CADASTRAIS_ADMIN',
    'Solicitacoes cadastrais carregadas para analise.',
    inicio
  );
}

function portalAdminCorrecoesCadastraisDetalhe(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'membros:analisar_correcoes');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadDetalhe_(payload);
  if (!dados.ok) return dados.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreDetalharSolicitacaoCadastralAdministracaoPortal',
    [dados.payload, acesso.contexto],
    'CORRECAO_CADASTRAL_DETALHE',
    'Detalhe cadastral carregado.',
    inicio
  );
}

function portalAdminCorrecoesCadastraisAnalisar(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'membros:analisar_correcoes');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadAnalise_(payload);
  if (!dados.ok) return dados.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreAnalisarSolicitacaoCadastralPortal',
    [dados.payload, acesso.contexto],
    'CORRECAO_CADASTRAL_ANALISADA',
    'Analise cadastral registrada.',
    inicio
  );
}

function portalAdminCorrecoesCadastraisAplicar(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'membros:analisar_correcoes');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadAplicacao_(payload);
  if (!dados.ok) return dados.resposta;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreAplicarSolicitacaoCadastralAprovadaPortal',
    [dados.payload, acesso.contexto],
    'CORRECAO_CADASTRAL_APLICADA',
    'Correcao cadastral aplicada com sucesso.',
    inicio
  );
}

function portalAdminCorrecoesCadastraisAprovarAplicar(token, payload) {
  var inicio = portalAgoraMs_();
  var acesso = portalPerfilCorrecoesResolverAcesso_(token, 'membros:analisar_correcoes');
  if (!acesso.ok) return acesso.resposta;
  var dados = portalPerfilCorrecoesPayloadAplicacao_(payload);
  if (!dados.ok) return dados.resposta;
  dados.payload.confirmacao = true;
  return portalPerfilCorrecoesExecutarCore_(
    'geapaCoreAprovarEAplicarSolicitacaoCadastralPortal',
    [dados.payload, acesso.contexto],
    'CORRECAO_CADASTRAL_APROVADA_APLICADA',
    'Alteracao aprovada e aplicada com sucesso.',
    inicio
  );
}

function portalPerfilCorrecoesResolverAcesso_(token, permissao) {
  var tokenNormalizado = String(token || '').trim();
  if (!tokenNormalizado || !portalSessaoTemporariaValida_(tokenNormalizado)) {
    return {
      ok: false,
      resposta: portalRespostaErro_('SESSAO_INVALIDA_OU_EXPIRADA', 'Sessao invalida ou expirada. Entre novamente.', {})
    };
  }

  var identificador = portalGetIdentificadorSessao_(tokenNormalizado);
  var ambiente = portalPerfilCorrecoesAmbiente_();
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, {
    origem: 'perfilCorrecoes' + ambiente
  });
  if (!sessao || sessao.ok === false || sessao.autenticado === false || sessao.portalAtivo === false || !sessao.email) {
    return {
      ok: false,
      resposta: portalRespostaErro_('SESSAO_CORE_INVALIDA', 'Nao foi possivel confirmar sua sessao oficial.', {})
    };
  }

  var permissoes = Array.isArray(sessao.permissoes) ? sessao.permissoes : [];
  var desejada = String(permissao || '').trim().toLowerCase();
  var autorizado = !desejada || permissoes.some(function temPermissao(item) {
    return String(item || '').trim().toLowerCase() === desejada;
  });
  if (!autorizado) {
    return {
      ok: false,
      resposta: portalRespostaErro_('PERMISSAO_INSUFICIENTE', 'Seu perfil nao possui permissao para esta operacao.', {})
    };
  }

  return {
    ok: true,
    sessao: sessao,
    contexto: {
      ambientePortal: ambiente,
      sessaoOficial: { email: String(sessao.email || '').trim().toLowerCase() }
    }
  };
}

function portalPerfilCorrecoesAmbiente_() {
  var config = typeof PORTAL_CONFIG !== 'undefined' ? PORTAL_CONFIG : {};
  var ambiente = String(config.ambientePerfilCadastral || '').trim().toUpperCase();
  if (ambiente !== 'HOMOLOG' && ambiente !== 'PROD') {
    throw new Error('AMBIENTE_PERFIL_CADASTRAL_INVALIDO');
  }
  return ambiente;
}

function portalPerfilCorrecoesExecutarCore_(nomeFuncao, argumentos, codigoSucesso, mensagemSucesso, inicio, diagnostico) {
  var diag = diagnostico || {};
  var requestId = String(diag.requestId || '').slice(0, 80);
  var resposta;
  try {
    if (typeof GEAPA_CORE === 'undefined' || typeof GEAPA_CORE[nomeFuncao] !== 'function') {
      return portalPerfilCorrecoesRespostaErroDiagnostico_(
        'CORE_CONTRATO_INDISPONIVEL',
        'O contrato cadastral ainda nao esta disponivel no GEAPA-CORE.',
        {}, diag.details || {}, requestId,
        portalMetaDesempenho_('geapa-core', inicio)
      );
    }
    resposta = GEAPA_CORE[nomeFuncao].apply(GEAPA_CORE, argumentos || []);
  } catch (erro) {
    var codigoExcecao = String(erro && erro.message || 'CORE_PERFIL_INDISPONIVEL');
    var respostaExcecao = portalPerfilCorrecoesRespostaErroDiagnostico_(
      codigoExcecao,
      portalPerfilCorrecoesMensagemErro_(codigoExcecao, 'Nao foi possivel concluir a operacao cadastral.'),
      {}, diag.details || {}, requestId,
      portalMetaDesempenho_('geapa-core', inicio)
    );
    portalPerfilCorrecoesLogSeguro_('core_exception', respostaExcecao, diag);
    return respostaExcecao;
  }

  if (!resposta || resposta.ok !== true) {
    var codigoErro = String(resposta && (resposta.errorCode || resposta.code) || 'ERRO_CADASTRAL');
    var mensagemCore = String(resposta && resposta.message || '');
    var mensagemErro = portalPerfilCorrecoesMensagemErro_(codigoErro, mensagemCore);
    var respostaErro = portalPerfilCorrecoesRespostaErroDiagnostico_(
      codigoErro,
      mensagemErro,
      resposta && resposta.fieldErrors || {},
      diag.details || {},
      requestId,
      portalMetaDesempenho_('geapa-core', inicio)
    );
    portalPerfilCorrecoesLogSeguro_('core_rejected', respostaErro, diag);
    return respostaErro;
  }

  var dadosCore = resposta.data && typeof resposta.data === 'object' ? resposta.data : {};
  var invalidacaoInterna = dadosCore._cacheInvalidation;
  if (invalidacaoInterna) portalPerfilCorrecoesInvalidarCachesAlvo_(invalidacaoInterna);
  var dadosResposta = Object.keys(dadosCore).reduce(function copiar(acumulado, chave) {
    if (chave !== '_cacheInvalidation') acumulado[chave] = dadosCore[chave];
    return acumulado;
  }, {});
  if (requestId) dadosResposta.requestId = requestId;
  return portalRespostaOk_(
    codigoSucesso,
    mensagemSucesso,
    dadosResposta,
    portalMetaDesempenho_('geapa-core', inicio)
  );
}

function portalPerfilCorrecoesInvalidarCachesAlvo_(internal) {
  var identifiers = internal && Array.isArray(internal.identificadores)
    ? internal.identificadores
    : [];
  var cache;
  try {
    cache = CacheService.getScriptCache();
  } catch (cacheError) {
    return { ok: false, removidos: 0 };
  }
  var removidos = 0;
  identifiers.forEach(function(identifier) {
    var normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) return;
    [
      portalMontarChaveSessaoCoreCache_(normalized),
      portalCacheKey_('minhaSituacaoV2', normalized)
    ].filter(String).forEach(function(key) {
      try {
        cache.remove(key);
        removidos++;
      } catch (ignored) {}
    });
  });
  return { ok: true, removidos: removidos };
}

function portalPerfilCorrecoesMensagemErro_(codigo, fallback) {
  var code = String(codigo || '').trim().toUpperCase();
  var mensagens = {
    VALOR_SEM_ALTERACAO: 'O novo valor e igual ao valor atual.',
    RGA_INVALIDO: 'Informe um RGA valido.',
    SOLICITACAO_DUPLICADA: 'Ja existe uma solicitacao pendente para este campo.',
    SESSAO_INVALIDA: 'Sua sessao expirou. Entre novamente.',
    SESSAO_INVALIDA_OU_EXPIRADA: 'Sua sessao expirou. Entre novamente.',
    SESSAO_CORE_INVALIDA: 'Sua sessao expirou. Entre novamente.',
    DATA_NASCIMENTO_INVALIDA: 'Formato de data invalido. Use DD/MM/AAAA.',
    JUSTIFICATIVA_OBRIGATORIA: 'Explique o motivo da correcao com pelo menos 20 caracteres.',
    VALOR_SOLICITADO_OBRIGATORIO: 'Informe o novo valor solicitado.',
    CHAVE_IDEMPOTENCIA_INVALIDA: 'Atualize a pagina e tente novamente.',
    CAMPO_SENSIVEL_NAO_PERMITIDO: 'Este campo nao pode ser corrigido por este fluxo.',
    EMAIL_JA_VINCULADO_A_OUTRA_PESSOA: 'O e-mail informado ja esta associado a outra pessoa.',
    RGA_JA_VINCULADO_A_OUTRA_PESSOA: 'O RGA informado ja esta associado a outra pessoa.',
    VALOR_ATUAL_ALTERADO_INCOMPATIVEL: 'O cadastro mudou desde a solicitacao. Revise os valores antes de decidir.',
    CONFIRMACAO_APROVAR_APLICAR_OBRIGATORIA: 'Confirme a aplicacao da alteracao cadastral.',
    SOLICITACAO_TERMINAL: 'Esta solicitacao ja foi concluida e nao pode ser aplicada novamente.',
    ERRO_RECALCULO_VIEW: 'A alteracao nao foi concluida porque a atualizacao das visoes derivadas falhou.'
  };
  if (mensagens[code]) return mensagens[code];
  if (/FONTE_INDISPONIVEL|DOMAIN_|PESSOAS_V2_|REGISTRY_/.test(code)) {
    return 'Nao foi possivel acessar a fila de solicitacoes.';
  }
  var mensagem = String(fallback || '').trim();
  if (mensagem && mensagem !== 'Solicitacao invalida ou indisponivel.') return mensagem;
  return code ? 'Nao foi possivel concluir a solicitacao. Codigo: ' + code + '.' : 'Nao foi possivel concluir a solicitacao.';
}

function portalPerfilCorrecoesRespostaErroDiagnostico_(codigo, mensagem, fieldErrors, details, requestId, meta) {
  var code = String(codigo || 'ERRO_CADASTRAL');
  var detalheSeguro = details && typeof details === 'object' ? details : {};
  var id = String(requestId || '').slice(0, 80);
  var resposta = portalRespostaErro_(code, mensagem, {
    reasonCode: code,
    fieldErrors: fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : {},
    details: detalheSeguro,
    requestId: id
  }, meta);
  resposta.errorCode = code;
  resposta.reasonCode = code;
  resposta.details = detalheSeguro;
  resposta.requestId = id;
  return resposta;
}

function portalPerfilCorrecoesLogSeguro_(evento, resposta, diagnostico) {
  var diag = diagnostico || {};
  var result = resposta || {};
  Logger.log('[portal][perfil-correcoes] ' + JSON.stringify({
    evento: String(evento || ''),
    campo: String(diag.campo || ''),
    httpStatus: Number(result.httpStatus || 0),
    ok: result.ok === true,
    code: String(result.code || ''),
    errorCode: String(result.errorCode || ''),
    reasonCode: String(result.reasonCode || ''),
    requestId: String(diag.requestId || result.requestId || '')
  }));
}

function portalPerfilCorrecoesLerObjeto_(valor) {
  if (valor && typeof valor === 'object') return valor;
  try {
    return JSON.parse(String(valor || '{}')) || {};
  } catch (erro) {
    return {};
  }
}

function portalPerfilCorrecoesChave_(valor) {
  return String(valor || '').trim().slice(0, 120);
}

function portalPerfilCorrecoesPayloadAtualizacao_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var links = Array.isArray(origem.links) ? origem.links.slice(0, 10).map(function mapear(link) {
    return {
      tipo: String(link && link.tipo || '').trim().slice(0, 40),
      url: String(link && link.url || '').trim().slice(0, 500),
      rotulo: String(link && link.rotulo || '').trim().slice(0, 100)
    };
  }) : [];
  var payload = {
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia),
    telefone: String(origem.telefone == null ? '' : origem.telefone).trim().slice(0, 40),
    instagram: String(origem.instagram == null ? '' : origem.instagram).trim().slice(0, 80),
    cidadeOrigem: String(origem.cidadeOrigem == null ? '' : origem.cidadeOrigem).trim().slice(0, 150),
    ufOrigem: String(origem.ufOrigem == null ? '' : origem.ufOrigem).trim().slice(0, 2),
    resumoAcademico: String(origem.resumoAcademico == null ? '' : origem.resumoAcademico).trim().slice(0, 3000),
    links: links
  };
  if (payload.chaveIdempotencia.length < 8) {
    return { ok: false, resposta: portalRespostaErro_('CHAVE_IDEMPOTENCIA_INVALIDA', 'Atualize a tela e tente novamente.', {}) };
  }
  return { ok: true, payload: payload };
}

function portalPerfilCorrecoesPayloadConsulta_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var payload = {
    idSolicitacao: String(origem.idSolicitacao || '').trim().slice(0, 100),
    requestId: String(origem.requestId || '').trim().slice(0, 100),
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia)
  };
  if (!payload.idSolicitacao && !payload.requestId && !payload.chaveIdempotencia) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('CONSULTA_SOLICITACAO_INVALIDA', 'Informe a referencia da solicitacao.', {}, {}, payload.requestId) };
  }
  return {
    ok: true,
    payload: payload,
    requestId: payload.requestId,
    details: {
      idSolicitacaoPresente: payload.idSolicitacao.length > 0,
      chaveIdempotenciaPresente: payload.chaveIdempotencia.length > 0,
      chaveIdempotenciaTamanho: payload.chaveIdempotencia.length
    }
  };
}

function portalPerfilCorrecoesPayloadCorrecao_(valor) {
  var payloadType = valor && typeof valor === 'object' ? 'object' : typeof valor;
  var deserialized = true;
  var origem;
  if (valor && typeof valor === 'object') {
    origem = valor;
  } else {
    try {
      origem = JSON.parse(String(valor || '{}')) || {};
    } catch (erro) {
      origem = {};
      deserialized = false;
    }
  }
  var permitidos = ['NOME_COMPLETO', 'NOME_CIVIL', 'CPF', 'RGA', 'DATA_NASCIMENTO', 'EMAIL_PRINCIPAL'];
  var campo = String(origem.campo || '').trim().toUpperCase();
  var requestId = String(origem.requestId || '').trim().slice(0, 80);
  var payload = {
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia),
    campo: campo,
    valorSolicitado: String(origem.valorSolicitado == null ? '' : origem.valorSolicitado).trim().slice(0, 500),
    justificativa: String(origem.justificativa == null ? '' : origem.justificativa).trim().slice(0, 1000)
  };
  var details = {
    payloadType: payloadType,
    deserialized: deserialized,
    campo: campo,
    chaveIdempotenciaPresente: payload.chaveIdempotencia.length > 0,
    chaveIdempotenciaTamanho: payload.chaveIdempotencia.length,
    valorSolicitadoPresente: payload.valorSolicitado.length > 0,
    valorSolicitadoTamanho: payload.valorSolicitado.length,
    justificativaPresente: payload.justificativa.length > 0,
    justificativaTamanho: payload.justificativa.length
  };
  Logger.log('[portal][perfil-correcoes] payload ' + JSON.stringify({
    requestId: requestId,
    payloadType: details.payloadType,
    deserialized: details.deserialized,
    campo: details.campo,
    chaveIdempotenciaPresente: details.chaveIdempotenciaPresente,
    chaveIdempotenciaTamanho: details.chaveIdempotenciaTamanho,
    valorSolicitadoPresente: details.valorSolicitadoPresente,
    valorSolicitadoTamanho: details.valorSolicitadoTamanho,
    justificativaPresente: details.justificativaPresente,
    justificativaTamanho: details.justificativaTamanho
  }));
  if (!deserialized) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('SOLICITACAO_PAYLOAD_INVALIDO', 'Nao foi possivel interpretar a solicitacao.', {}, details, requestId) };
  }
  if (permitidos.indexOf(campo) < 0) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('CAMPO_SENSIVEL_NAO_PERMITIDO', portalPerfilCorrecoesMensagemErro_('CAMPO_SENSIVEL_NAO_PERMITIDO'), { campo: 'Campo nao permitido.' }, details, requestId) };
  }
  if (payload.chaveIdempotencia.length < 8) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('CHAVE_IDEMPOTENCIA_INVALIDA', portalPerfilCorrecoesMensagemErro_('CHAVE_IDEMPOTENCIA_INVALIDA'), { chaveIdempotencia: 'Chave invalida.' }, details, requestId) };
  }
  if (!payload.valorSolicitado) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('VALOR_SOLICITADO_OBRIGATORIO', portalPerfilCorrecoesMensagemErro_('VALOR_SOLICITADO_OBRIGATORIO'), { valorSolicitado: 'Informe o novo valor.' }, details, requestId) };
  }
  if (payload.justificativa.length < 20) {
    return { ok: false, resposta: portalPerfilCorrecoesRespostaErroDiagnostico_('JUSTIFICATIVA_OBRIGATORIA', portalPerfilCorrecoesMensagemErro_('JUSTIFICATIVA_OBRIGATORIA'), { justificativa: 'Informe pelo menos 20 caracteres.' }, details, requestId) };
  }
  return { ok: true, payload: payload, requestId: requestId, details: details };
}

function portalPerfilCorrecoesPayloadAnalise_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var acoes = ['EM_ANALISE', 'COMPLEMENTO_SOLICITADO', 'APROVADA', 'INDEFERIDA'];
  var acao = String(origem.acao || '').trim().toUpperCase();
  var payload = {
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia),
    idSolicitacao: String(origem.idSolicitacao || '').trim().slice(0, 100),
    acao: acao,
    motivo: String(origem.motivo == null ? '' : origem.motivo).trim().slice(0, 1000)
  };
  if (!payload.idSolicitacao || acoes.indexOf(acao) < 0 || payload.chaveIdempotencia.length < 8) {
    return { ok: false, resposta: portalRespostaErro_('ANALISE_INVALIDA', 'Revise os dados da analise.', {}) };
  }
  return { ok: true, payload: payload };
}

function portalPerfilCorrecoesPayloadDetalhe_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var payload = {
    idSolicitacao: String(origem.idSolicitacao || '').trim().slice(0, 100),
    revelarDados: origem.revelarDados === true || String(origem.revelarDados || '').toLowerCase() === 'true'
  };
  if (!payload.idSolicitacao) {
    return { ok: false, resposta: portalRespostaErro_('SOLICITACAO_NAO_INFORMADA', 'Informe a solicitacao cadastral.', {}) };
  }
  return { ok: true, payload: payload };
}

function portalPerfilCorrecoesPayloadAplicacao_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var payload = {
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia),
    idSolicitacao: String(origem.idSolicitacao || '').trim().slice(0, 100)
  };
  if (!payload.idSolicitacao || payload.chaveIdempotencia.length < 8) {
    return { ok: false, resposta: portalRespostaErro_('APLICACAO_INVALIDA', 'Revise a solicitacao aprovada.', {}) };
  }
  return { ok: true, payload: payload };
}

function portalPerfilCorrecoesFiltrosAdmin_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  return {
    status: String(origem.status || '').trim().toUpperCase().slice(0, 40),
    campo: String(origem.campo || '').trim().toUpperCase().slice(0, 40),
    pessoa: String(origem.pessoa || origem.texto || '').trim().slice(0, 120),
    pagina: Math.max(Number(origem.pagina || 1), 1),
    pageSize: Math.min(Math.max(Number(origem.pageSize || 25), 1), 100)
  };
}
