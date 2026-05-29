/**
 * Camada publica de API do Portal GEAPA.
 *
 * Em MOCK_MODE, retorna dados ficticios para desenvolvimento da interface. Em
 * modo real, devera chamar o Apps Script Web App, sem acessar planilhas
 * diretamente pelo navegador.
 */

(function configurarApiPortal(global) {
  var config = global.PortalGeapaConfig || {};

  var atividadesMock = [
    {
      idAtividade: 'ATV-2026-1-0005',
      dataAtividade: '2026-04-16',
      diaSemana: 'quinta-feira',
      horarioInicio: '18h30',
      horarioFim: '20h30',
      tituloPublico: 'Apresentação de Membro',
      tipoPublico: 'Apresentação',
      subtipoAtividade: 'APRESENTACAO_MEMBRO',
      local: 'Auditório 7, Xingú I',
      formato: 'PRESENCIAL',
      classificacaoAcesso: 'ABERTA',
      publicoAlvo: 'Membros',
      contaPresenca: true,
      contaFalta: true,
      geraCertificado: true,
      cargaHoraria: 2,
      statusPublico: 'REALIZADA',
      visibilidadePortal: 'MEMBROS',
      podeVerDetalhes: true,
      podeJustificarFalta: false,
      podeRegistrarChamada: false,
      podeEditar: false
    },
    {
      idAtividade: 'ATV-2026-1-0006',
      dataAtividade: '2026-05-21',
      diaSemana: 'quinta-feira',
      horarioInicio: '18h30',
      horarioFim: '20h00',
      tituloPublico: 'Reunião Ordinária',
      tipoPublico: 'Reunião',
      subtipoAtividade: 'REUNIAO_ORDINARIA',
      local: 'Sala de reuniões do GEAPA',
      formato: 'PRESENCIAL',
      classificacaoAcesso: 'INTERNA',
      publicoAlvo: 'Membros',
      contaPresenca: true,
      contaFalta: true,
      geraCertificado: false,
      cargaHoraria: 1.5,
      statusPublico: 'PLANEJADA',
      visibilidadePortal: 'MEMBROS',
      podeVerDetalhes: true,
      podeJustificarFalta: false,
      podeRegistrarChamada: false,
      podeEditar: false
    },
    {
      idAtividade: 'ATV-2026-1-0007',
      dataAtividade: '2026-06-04',
      diaSemana: 'quinta-feira',
      horarioInicio: '19h00',
      horarioFim: '21h00',
      tituloPublico: 'Oficina Temática',
      tipoPublico: 'Oficina',
      subtipoAtividade: 'OFICINA_TEMATICA',
      local: 'Ambiente virtual',
      formato: 'REMOTO',
      classificacaoAcesso: 'ABERTA',
      publicoAlvo: 'Membros e convidados',
      contaPresenca: true,
      contaFalta: false,
      geraCertificado: true,
      cargaHoraria: 2,
      statusPublico: 'PUBLICADA',
      visibilidadePortal: 'PUBLICA',
      podeVerDetalhes: true,
      podeJustificarFalta: false,
      podeRegistrarChamada: false,
      podeEditar: false
    }
  ];

  var detalhesMock = {
    'ATV-2026-1-0005': {
      idAtividade: 'ATV-2026-1-0005',
      tituloPublico: 'Apresentação de Membro',
      descricaoPublica: 'Atividade acadêmica semanal do GEAPA com apresentação e discussão coletiva.',
      dataAtividade: '2026-04-16',
      horarioCompleto: '18h30 às 20h30',
      local: 'Auditório 7, Xingú I',
      formato: 'PRESENCIAL',
      tipoAtividade: 'ACADEMICA',
      subtipoAtividade: 'APRESENTACAO_MEMBRO',
      classificacaoReuniao: 'ORDINARIA',
      classificacaoAcesso: 'ABERTA',
      responsavelPublico: 'Coordenação de Atividades',
      contaPresenca: true,
      contaFalta: true,
      geraCertificado: true,
      cargaHoraria: 2,
      statusPublico: 'REALIZADA',
      linkMaterialPublico: '',
      linkAtaPublica: ''
    },
    'ATV-2026-1-0006': {
      idAtividade: 'ATV-2026-1-0006',
      tituloPublico: 'Reunião Ordinária',
      descricaoPublica: 'Reunião interna para encaminhamentos acadêmicos e administrativos do grupo.',
      dataAtividade: '2026-05-21',
      horarioCompleto: '18h30 às 20h00',
      local: 'Sala de reuniões do GEAPA',
      formato: 'PRESENCIAL',
      tipoAtividade: 'ADMINISTRATIVA',
      subtipoAtividade: 'REUNIAO_ORDINARIA',
      classificacaoReuniao: 'ORDINARIA',
      classificacaoAcesso: 'INTERNA',
      responsavelPublico: 'Diretoria GEAPA',
      contaPresenca: true,
      contaFalta: true,
      geraCertificado: false,
      cargaHoraria: 1.5,
      statusPublico: 'PLANEJADA',
      linkMaterialPublico: '',
      linkAtaPublica: ''
    },
    'ATV-2026-1-0007': {
      idAtividade: 'ATV-2026-1-0007',
      tituloPublico: 'Oficina Temática',
      descricaoPublica: 'Oficina remota com conteúdo formativo para membros e convidados.',
      dataAtividade: '2026-06-04',
      horarioCompleto: '19h00 às 21h00',
      local: 'Ambiente virtual',
      formato: 'REMOTO',
      tipoAtividade: 'FORMATIVA',
      subtipoAtividade: 'OFICINA_TEMATICA',
      classificacaoReuniao: 'NAO_SE_APLICA',
      classificacaoAcesso: 'ABERTA',
      responsavelPublico: 'Coordenação de Atividades',
      contaPresenca: true,
      contaFalta: false,
      geraCertificado: true,
      cargaHoraria: 2,
      statusPublico: 'PUBLICADA',
      linkMaterialPublico: '',
      linkAtaPublica: ''
    }
  };

  function apiGet(route, params) {
    if (config.MOCK_MODE) {
      return apiGetMock(route, params || {});
    }

    return chamarAppsScript(route, params || {});
  }

  function apiPost(route, payload) {
    if (config.MOCK_MODE) {
      return apiPostMock(route, payload || {});
    }

    return chamarAppsScript(route, payload || {});
  }

  function chamarAppsScript(route, params) {
    var acao = obterAcaoAppsScript(route);
    var corpo = new URLSearchParams();

    if (!acao) {
      return Promise.resolve({
        ok: false,
        errorCode: 'ROTA_NAO_MAPEADA',
        message: 'Rota não mapeada para a API do Portal GEAPA.'
      });
    }

    corpo.set('acao', acao);
    Object.keys(params || {}).forEach(function adicionarCampo(chave) {
      if (params[chave] !== undefined && params[chave] !== null) {
        corpo.set(chave, params[chave]);
      }
    });

    var token = obterTokenSessaoLocal();
    if (token && !corpo.has('token')) {
      corpo.set('token', token);
    }

    return fetch(config.GEAPA_API_BASE_URL, {
      method: 'POST',
      body: corpo
    })
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error('Não foi possível falar com a API do Portal GEAPA.');
        }

        return resposta.json();
      })
      .catch(handleApiError);
  }

  function obterAcaoAppsScript(route) {
    var rotas = {
      '/atividades/bundle': 'atividadesBundle',
      '/atividades/listar': 'atividadesListar',
      '/atividades/detalhes-preload': 'atividadesDetalhesPreload',
      '/atividades/detalhe': 'atividadeDetalhe'
    };

    return rotas[route] || '';
  }

  function obterTokenSessaoLocal() {
    try {
      return window.sessionStorage.getItem('geapaPortal.sessionToken') || '';
    } catch (erro) {
      return '';
    }
  }

  function apiGetMock(route, params) {
    if (route === '/atividades/bundle') {
      return Promise.resolve({
        ok: true,
        data: {
          calendario: atividadesMock.slice(),
          detalhesPorId: Object.assign({}, detalhesMock),
          ultimaAtualizacao: new Date().toISOString()
        }
      });
    }

    if (route === '/atividades/listar') {
      return Promise.resolve({
        ok: true,
        data: atividadesMock.slice()
      });
    }

    if (route === '/atividades/detalhes-preload') {
      return Promise.resolve({
        ok: true,
        data: {
          detalhesPorId: Object.assign({}, detalhesMock),
          ultimaAtualizacao: new Date().toISOString()
        }
      });
    }

    if (route === '/atividades/detalhe') {
      var detalhe = detalhesMock[params.idAtividade];

      if (!detalhe) {
        return Promise.resolve({
          ok: false,
          errorCode: 'ATIVIDADE_NAO_ENCONTRADA',
          message: 'Atividade não encontrada.'
        });
      }

      return Promise.resolve({
        ok: true,
        data: detalhe
      });
    }

    return Promise.resolve({
      ok: false,
      errorCode: 'ROTA_MOCK_NAO_IMPLEMENTADA',
      message: 'Rota mockada não implementada.'
    });
  }

  function apiPostMock(route) {
    return Promise.resolve({
      ok: true,
      message: 'Ação simulada com sucesso em modo de desenvolvimento.',
      data: {
        route: route
      }
    });
  }

  function handleApiError(error) {
    return Promise.resolve({
      ok: false,
      errorCode: 'ERRO_API',
      message: error && error.message
        ? error.message
        : 'Erro inesperado ao chamar a API.'
    });
  }

  function buildQueryString(params) {
    var chaves = Object.keys(params || {});

    if (!chaves.length) {
      return '';
    }

    var query = new URLSearchParams();

    chaves.forEach(function adicionarParametro(chave) {
      if (params[chave] !== undefined && params[chave] !== null) {
        query.set(chave, params[chave]);
      }
    });

    return '?' + query.toString();
  }

  global.PortalGeapaApi = {
    apiGet: apiGet,
    apiPost: apiPost,
    handleApiError: handleApiError,
    buildQueryString: buildQueryString
  };
})(window);
