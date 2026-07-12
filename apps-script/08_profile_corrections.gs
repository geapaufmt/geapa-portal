/**
 * Ponte segura entre o Portal HOMOLOG e os contratos cadastrais do GEAPA-CORE.
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
    inicio
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

function portalPerfilCorrecoesResolverAcesso_(token, permissao) {
  var tokenNormalizado = String(token || '').trim();
  if (!tokenNormalizado || !portalSessaoTemporariaValida_(tokenNormalizado)) {
    return {
      ok: false,
      resposta: portalRespostaErro_('SESSAO_INVALIDA_OU_EXPIRADA', 'Sessao invalida ou expirada. Entre novamente.', {})
    };
  }

  var identificador = portalGetIdentificadorSessao_(tokenNormalizado);
  var sessao = portalResolverSessaoAtualViaGeapaCore_(identificador, {
    origem: 'perfilCorrecoesHOMOLOG'
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
      ambientePortal: 'HOMOLOG',
      sessaoOficial: { email: String(sessao.email || '').trim().toLowerCase() }
    }
  };
}

function portalPerfilCorrecoesExecutarCore_(nomeFuncao, argumentos, codigoSucesso, mensagemSucesso, inicio) {
  var resposta;
  try {
    if (typeof GEAPA_CORE === 'undefined' || typeof GEAPA_CORE[nomeFuncao] !== 'function') {
      return portalRespostaErro_(
        'CORE_CONTRATO_INDISPONIVEL',
        'O contrato cadastral ainda nao esta disponivel no GEAPA-CORE HOMOLOG.',
        {}
      );
    }
    resposta = GEAPA_CORE[nomeFuncao].apply(GEAPA_CORE, argumentos || []);
  } catch (erro) {
    return portalRespostaErro_(
      'CORE_PERFIL_INDISPONIVEL',
      'Nao foi possivel concluir a operacao cadastral.',
      { reasonCode: erro && erro.message ? String(erro.message) : 'ERRO_CORE' },
      portalMetaDesempenho_('geapa-core-head', inicio)
    );
  }

  if (!resposta || resposta.ok !== true) {
    return portalRespostaErro_(
      String(resposta && (resposta.errorCode || resposta.code) || 'ERRO_CADASTRAL'),
      String(resposta && resposta.message || 'Nao foi possivel concluir a operacao cadastral.'),
      {
        fieldErrors: resposta && resposta.fieldErrors || {},
        reasonCode: resposta && (resposta.errorCode || resposta.code) || 'ERRO_CADASTRAL'
      },
      portalMetaDesempenho_('geapa-core-head', inicio)
    );
  }

  return portalRespostaOk_(
    codigoSucesso,
    mensagemSucesso,
    resposta.data || {},
    portalMetaDesempenho_('geapa-core-head', inicio)
  );
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

function portalPerfilCorrecoesPayloadCorrecao_(valor) {
  var origem = portalPerfilCorrecoesLerObjeto_(valor);
  var permitidos = ['NOME_COMPLETO', 'NOME_CIVIL', 'CPF', 'RGA', 'DATA_NASCIMENTO', 'EMAIL_PRINCIPAL'];
  var campo = String(origem.campo || '').trim().toUpperCase();
  var payload = {
    chaveIdempotencia: portalPerfilCorrecoesChave_(origem.chaveIdempotencia),
    campo: campo,
    valorSolicitado: String(origem.valorSolicitado == null ? '' : origem.valorSolicitado).trim().slice(0, 500),
    justificativa: String(origem.justificativa == null ? '' : origem.justificativa).trim().slice(0, 1000)
  };
  if (permitidos.indexOf(campo) < 0 || payload.chaveIdempotencia.length < 8) {
    return { ok: false, resposta: portalRespostaErro_('SOLICITACAO_INVALIDA', 'Revise os dados da solicitacao.', {}) };
  }
  return { ok: true, payload: payload };
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
