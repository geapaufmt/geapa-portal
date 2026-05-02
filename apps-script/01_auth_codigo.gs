/**
 * Fluxo inicial de autenticacao por codigo temporario.
 *
 * Esta etapa permite envio real de codigo apenas para e-mails de teste
 * configurados nas propriedades do Apps Script. Ainda nao ha consulta real a
 * planilhas, validacao de cadastro oficial ou autorizacao definitiva.
 */

/**
 * Solicita um codigo temporario para o e-mail cadastrado do membro.
 *
 * Futuramente:
 * - aceitar e-mail ou RGA;
 * - localizar o cadastro oficial via GEAPA-CORE;
 * - gerar codigo temporario;
 * - enviar o codigo ao e-mail cadastrado;
 * - armazenar somente dados temporarios e com expiracao.
 *
 * @param {string} emailOuRga E-mail ou RGA informado pelo membro.
 * @return {Object} Resultado simulado da solicitacao.
 */
function portalSolicitarCodigo(emailOuRga) {
  var identificador = portalNormalizarIdentificador_(emailOuRga);

  if (!identificador) {
    return portalRespostaErro_(
      'IDENTIFICADOR_OBRIGATORIO',
      'Informe um e-mail ou RGA para solicitar o código.',
      {}
    );
  }

  var membro = portalBuscarMembroPorEmailOuRga_(identificador);

  if (!membro) {
    return portalRespostaErro_(
      'MEMBRO_NAO_ENCONTRADO_TESTE',
      'Cadastro de teste não encontrado para o e-mail ou RGA informado.',
      {}
    );
  }

  var config = portalGetAuthRuntimeConfig_();

  if (!config.envioEmailHabilitado) {
    return portalRespostaErro_(
      'ENVIO_EMAIL_DESABILITADO',
      'O envio real de código ainda não está habilitado.',
      {}
    );
  }

  if (!portalEmailPermitidoParaTeste_(membro.emailCadastrado, config.emailsTeste)) {
    return portalRespostaErro_(
      'EMAIL_FORA_DA_LISTA_TESTE',
      'Este e-mail não está liberado para testes do portal.',
      {}
    );
  }

  var cache = CacheService.getScriptCache();
  var identificadorSessao = membro.emailCadastrado;
  var chaveRateLimit = portalCacheKey_('rate', identificadorSessao);

  if (cache.get(chaveRateLimit)) {
    return portalRespostaErro_(
      'AGUARDE_NOVA_SOLICITACAO',
      'Aguarde alguns instantes antes de solicitar outro código.',
      {}
    );
  }

  var codigo = portalGerarCodigo_();
  var chaveCodigo = portalCacheKey_('codigo', identificadorSessao);
  var chaveTentativas = portalCacheKey_('tentativas', identificadorSessao);
  var validadeSegundos = PORTAL_CONFIG.validadeCodigoMinutos * 60;

  cache.put(chaveCodigo, portalHashCodigo_(identificadorSessao, codigo), validadeSegundos);
  cache.put(chaveTentativas, '0', validadeSegundos);
  cache.put(chaveRateLimit, '1', PORTAL_CONFIG.intervaloSolicitacaoSegundos);

  portalEnviarCodigoEmail_(membro.emailCadastrado, codigo);

  return portalRespostaOk_(
    'CODIGO_ENVIADO_TESTE',
    'Código enviado para o e-mail cadastrado do membro.',
    {
      identificadorRecebido: identificador,
      destino: portalMascararEmail_(membro.emailCadastrado),
      validadeMinutos: PORTAL_CONFIG.validadeCodigoMinutos
    }
  );
}

/**
 * Valida um codigo temporario informado pelo membro.
 *
 * Futuramente:
 * - conferir se o codigo existe;
 * - validar expiracao;
 * - validar quantidade de tentativas;
 * - emitir token temporario para consulta segura.
 *
 * @param {string} emailOuRga E-mail ou RGA usado na solicitacao.
 * @param {string} codigo Codigo recebido por e-mail.
 * @return {Object} Resultado simulado da validacao.
 */
function portalValidarCodigo(emailOuRga, codigo) {
  var identificador = portalNormalizarIdentificador_(emailOuRga);
  var codigoNormalizado = String(codigo || '').trim();

  if (!identificador || !codigoNormalizado) {
    return portalRespostaErro_(
      'DADOS_VALIDACAO_OBRIGATORIOS',
      'Informe e-mail/RGA e código para entrar.',
      {}
    );
  }

  var membro = portalBuscarMembroPorEmailOuRga_(identificador);

  if (!membro) {
    return portalRespostaErro_(
      'MEMBRO_NAO_ENCONTRADO_TESTE',
      'Cadastro de teste não encontrado para o e-mail ou RGA informado.',
      {}
    );
  }

  var identificadorSessao = membro.emailCadastrado;
  var cache = CacheService.getScriptCache();
  var chaveCodigo = portalCacheKey_('codigo', identificadorSessao);
  var chaveTentativas = portalCacheKey_('tentativas', identificadorSessao);
  var hashSalvo = cache.get(chaveCodigo);

  if (!hashSalvo) {
    return portalRespostaErro_(
      'CODIGO_EXPIRADO_OU_INEXISTENTE',
      'Código expirado ou inexistente. Solicite um novo código.',
      {}
    );
  }

  var tentativas = Number(cache.get(chaveTentativas) || '0');

  if (tentativas >= PORTAL_CONFIG.maxTentativasCodigo) {
    cache.remove(chaveCodigo);
    cache.remove(chaveTentativas);
    return portalRespostaErro_(
      'TENTATIVAS_EXCEDIDAS',
      'Limite de tentativas excedido. Solicite um novo código.',
      {}
    );
  }

  if (hashSalvo !== portalHashCodigo_(identificadorSessao, codigoNormalizado)) {
    cache.put(
      chaveTentativas,
      String(tentativas + 1),
      PORTAL_CONFIG.validadeCodigoMinutos * 60
    );
    return portalRespostaErro_(
      'CODIGO_INVALIDO',
      'Código inválido. Confira o e-mail recebido e tente novamente.',
      {
        tentativasRestantes: Math.max(
          PORTAL_CONFIG.maxTentativasCodigo - tentativas - 1,
          0
        )
      }
    );
  }

  cache.remove(chaveCodigo);
  cache.remove(chaveTentativas);

  var sessionToken = portalCriarSessaoTemporaria_(identificadorSessao);

  return portalRespostaOk_(
    'CODIGO_VALIDADO_TESTE',
    'Código validado em modo de teste.',
    {
      sessionToken: sessionToken,
      identificadorRecebido: identificador,
      membro: {
        nomeExibicao: membro.nomeExibicao,
        rga: membro.rga
      }
    }
  );
}

/**
 * Le configuracoes privadas mantidas nas propriedades do Apps Script.
 *
 * @return {Object} Configuracao de autenticacao em tempo de execucao.
 */
function portalGetAuthRuntimeConfig_() {
  var propriedades = PropertiesService.getScriptProperties();
  var envio = propriedades.getProperty(
    PORTAL_CONFIG.propriedades.envioEmailHabilitado
  );
  var emails = propriedades.getProperty(PORTAL_CONFIG.propriedades.emailsTeste);

  return {
    envioEmailHabilitado: String(envio || '').toLowerCase() === 'true',
    emailsTeste: portalSepararLista_(emails)
  };
}

/**
 * Normaliza e-mails e identificadores informados no portal.
 *
 * @param {string} valor Valor informado pelo membro.
 * @return {string} Valor normalizado.
 */
function portalNormalizarIdentificador_(valor) {
  return String(valor || '').trim().toLowerCase();
}

/**
 * Verifica se o identificador parece um e-mail.
 *
 * @param {string} valor Identificador normalizado.
 * @return {boolean} Resultado da validacao simples.
 */
function portalEhEmail_(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/**
 * Confere se o e-mail esta na lista de testes configurada.
 *
 * @param {string} email E-mail normalizado.
 * @param {string[]} emailsTeste Lista permitida.
 * @return {boolean} Verdadeiro se o e-mail pode receber codigo.
 */
function portalEmailPermitidoParaTeste_(email, emailsTeste) {
  return emailsTeste.indexOf(email) !== -1;
}

/**
 * Separa listas configuradas em Script Properties.
 *
 * @param {string} valor Lista separada por virgula.
 * @return {string[]} Valores normalizados.
 */
function portalSepararLista_(valor) {
  return String(valor || '')
    .split(',')
    .map(function normalizar(item) {
      return item.trim().toLowerCase();
    })
    .filter(Boolean);
}

/**
 * Gera um codigo numerico de seis digitos.
 *
 * @return {string} Codigo temporario.
 */
function portalGerarCodigo_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Cria uma chave de cache que nao expoe o e-mail em texto puro.
 *
 * @param {string} tipo Tipo da chave.
 * @param {string} identificador Identificador normalizado.
 * @return {string} Chave de cache.
 */
function portalCacheKey_(tipo, identificador) {
  return [
    'portal',
    tipo,
    portalHashTexto_(identificador).slice(0, 32)
  ].join(':');
}

/**
 * Calcula o hash do codigo associado ao identificador.
 *
 * @param {string} identificador Identificador normalizado.
 * @param {string} codigo Codigo informado.
 * @return {string} Hash hexadecimal.
 */
function portalHashCodigo_(identificador, codigo) {
  var propriedades = PropertiesService.getScriptProperties();
  var salt = propriedades.getProperty(PORTAL_CONFIG.propriedades.codigoSalt);
  var base = [salt || 'portal-geapa-dev', identificador, codigo].join('|');
  return portalHashTexto_(base);
}

/**
 * Calcula SHA-256 em hexadecimal.
 *
 * @param {string} valor Texto para hash.
 * @return {string} Hash hexadecimal.
 */
function portalHashTexto_(valor) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    valor,
    Utilities.Charset.UTF_8
  );

  return bytes.map(function paraHex(byte) {
    var inteiro = byte < 0 ? byte + 256 : byte;
    return ('0' + inteiro.toString(16)).slice(-2);
  }).join('');
}

/**
 * Envia o codigo por e-mail usando MailApp.
 *
 * @param {string} email E-mail autorizado para teste.
 * @param {string} codigo Codigo temporario.
 */
function portalEnviarCodigoEmail_(email, codigo) {
  var assunto = 'Código de acesso - Portal GEAPA';
  var corpo = [
    'Seu código de acesso ao Portal GEAPA é: ' + codigo,
    '',
    'Validade: ' + PORTAL_CONFIG.validadeCodigoMinutos + ' minutos.',
    '',
    'Se você não solicitou este código, ignore este e-mail.',
    '',
    'Esta mensagem faz parte dos testes iniciais do Portal GEAPA.'
  ].join('\n');

  MailApp.sendEmail(email, assunto, corpo);
}

/**
 * Cria uma sessao temporaria simulada apos validacao do codigo.
 *
 * @param {string} identificador Identificador normalizado.
 * @return {string} Token temporario.
 */
function portalCriarSessaoTemporaria_(identificador) {
  var token = 'sessao-' + Utilities.getUuid();
  var chave = portalCacheKey_('sessao', token);
  var validadeSegundos = PORTAL_CONFIG.validadeCodigoMinutos * 60;

  CacheService.getScriptCache().put(chave, identificador, validadeSegundos);
  return token;
}

/**
 * Retorna o identificador salvo na sessao temporaria.
 *
 * @param {string} token Token temporario.
 * @return {string} Identificador salvo, ou vazio.
 */
function portalGetIdentificadorSessao_(token) {
  var chave = portalCacheKey_('sessao', token);
  return CacheService.getScriptCache().get(chave) || '';
}

/**
 * Mascara e-mail para retorno seguro ao front-end.
 *
 * @param {string} email E-mail cadastrado.
 * @return {string} E-mail mascarado.
 */
function portalMascararEmail_(email) {
  var partes = String(email || '').split('@');

  if (partes.length !== 2) {
    return '';
  }

  var nome = partes[0];
  var dominio = partes[1];
  var prefixo = nome.slice(0, 2);

  return prefixo + '***@' + dominio;
}

/**
 * Mascara um RGA ou outro identificador sem e-mail.
 *
 * @param {string} rga RGA ou identificador textual.
 * @return {string} Identificador mascarado.
 */
function portalMascararRga_(rga) {
  var valor = String(rga || '').trim();

  if (!valor) {
    return '';
  }

  if (valor.length <= 4) {
    return '***';
  }

  return valor.slice(0, 2) + '***' + valor.slice(-2);
}

/**
 * Mascara o identificador informado no diagnostico.
 *
 * @param {string} identificador E-mail, RGA ou outro identificador.
 * @return {string} Identificador mascarado.
 */
function portalMascararIdentificador_(identificador) {
  var valor = portalNormalizarIdentificador_(identificador);

  if (!valor) {
    return '';
  }

  if (portalEhEmail_(valor)) {
    return portalMascararEmail_(valor);
  }

  return portalMascararRga_(valor);
}
