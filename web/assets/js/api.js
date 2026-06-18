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
      rotuloSemestre: '2026/1',
      eixoTematicoPrincipal: 'Direito Penal',
      eixoTematicoSecundario: 'Criminologia',
      nomePessoaPrincipalPublico: 'Membro de Teste',
      papelPessoaPrincipal: 'Apresentador',
      tipoPessoaPrincipal: 'Membro',
      qtdApresentacoes: 1,
      resumoApresentacoesPublico: 'Tema de teste sobre fundamentos penais.',
      possuiApresentacoes: true,
      ano: 2026,
      semestre: 1,
      rotuloSemestre: '2026/1',
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
      rotuloSemestre: '2026/1',
      qtdApresentacoes: 0,
      possuiApresentacoes: false,
      ano: 2026,
      semestre: 1,
      rotuloSemestre: '2026/1',
      visibilidadePortal: 'MEMBROS',
      podeVerDetalhes: true,
      podeJustificarFalta: false,
      podeRegistrarChamada: false,
      podeEditar: false
    },
    {
      idAtividade: 'ATV-2026-1-0007',
      dataAtividade: '2026-07-02',
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
      rotuloSemestre: '2026/2',
      eixoTematicoPrincipal: 'Direitos Humanos',
      eixoTematicoSecundario: 'Sistema Penal',
      nomePessoaPrincipalPublico: 'Equipe de Apresentadores',
      papelPessoaPrincipal: 'Apresentadores',
      tipoPessoaPrincipal: 'Membros',
      qtdApresentacoes: 2,
      resumoApresentacoesPublico: 'Duas apresentacoes curtas vinculadas a oficina.',
      possuiApresentacoes: true,
      ano: 2026,
      semestre: 2,
      rotuloSemestre: '2026/2',
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
      eixoTematicoPrincipal: 'Direito Penal',
      eixoTematicoSecundario: 'Criminologia',
      nomePessoaPrincipalPublico: 'Membro de Teste',
      papelPessoaPrincipal: 'Apresentador',
      tipoPessoaPrincipal: 'Membro',
      qtdApresentacoes: 1,
      resumoApresentacoesPublico: 'Tema de teste sobre fundamentos penais.',
      apresentacoesPublicas: [
        {
          idApresentacao: 'APR-TESTE-1',
          idAtividade: 'ATV-2026-1-0005',
          idPessoa: 'PESSOA-TESTE-1',
          rga: 'RGA-TESTE',
          apresentadorPublico: 'Membro de Teste',
          nomeApresentador: 'Membro de Teste',
          tema: 'Tema de teste',
          titulo: 'Tema de teste',
          eixoTematicoPrincipal: 'Direito Penal',
          eixoTematicoSecundario: 'Criminologia',
          statusApresentacao: 'REALIZADA',
          statusTituloEixo: 'VALIDADO',
          statusMaterial: 'SEM_MATERIAL_PUBLICO',
          idArquivoMaterial: '',
          nomeArquivoMaterial: '',
          linkMaterialPublico: '',
          versaoMaterial: ''
        }
      ],
      envolvidosPublicos: [
        {
          nomePublico: 'Membro de Teste',
          papel: 'Apresentador',
          tipoPessoa: 'Membro'
        }
      ],
      idPastaDrive: 'PASTA-ATV-0005',
      linkPastaDrive: 'https://example.org/pasta-atividade-0005',
      linkMaterialPublico: 'https://example.org/material-geral-atividade-0005',
      linkAtaPublica: '',
      linkFotosPublico: ''
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
      qtdApresentacoes: 0,
      resumoApresentacoesPublico: '',
      apresentacoesPublicas: [],
      envolvidosPublicos: [
        {
          nomePublico: 'Diretoria GEAPA',
          papel: 'Responsavel',
          tipoPessoa: 'Grupo'
        }
      ],
      idPastaDrive: 'PASTA-ATV-0006',
      linkPastaDrive: '',
      linkMaterialPublico: '',
      linkAtaPublica: '',
      linkFotosPublico: ''
    },
    'ATV-2026-1-0007': {
      idAtividade: 'ATV-2026-1-0007',
      tituloPublico: 'Oficina Temática',
      descricaoPublica: 'Oficina remota com conteúdo formativo para membros e convidados.',
      dataAtividade: '2026-07-02',
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
      eixoTematicoPrincipal: 'Direitos Humanos',
      eixoTematicoSecundario: 'Sistema Penal',
      nomePessoaPrincipalPublico: 'Equipe de Apresentadores',
      papelPessoaPrincipal: 'Apresentadores',
      tipoPessoaPrincipal: 'Membros',
      qtdApresentacoes: 2,
      resumoApresentacoesPublico: 'Duas apresentacoes curtas vinculadas a oficina.',
      apresentacoesPublicas: [
        {
          idApresentacao: 'APR-TESTE-2',
          idAtividade: 'ATV-2026-1-0007',
          idPessoa: 'PESSOA-TESTE-1',
          rga: 'RGA-TESTE-1',
          apresentadorPublico: 'Membro de Teste 1',
          nomeApresentador: 'Membro de Teste 1',
          tema: 'Primeira abordagem',
          titulo: 'Primeira abordagem',
          eixoTematicoPrincipal: 'Direitos Humanos',
          eixoTematicoSecundario: 'Sistema Penal',
          statusApresentacao: 'PUBLICADA',
          statusTituloEixo: 'VALIDADO',
          statusMaterial: 'PUBLICO',
          idArquivoMaterial: 'ARQ-TESTE-1',
          nomeArquivoMaterial: 'material-primeira-abordagem.pdf',
          linkMaterialPublico: 'https://example.org/material-1',
          versaoMaterial: 'v1'
        },
        {
          idApresentacao: 'APR-TESTE-3',
          idAtividade: 'ATV-2026-1-0007',
          idPessoa: 'PESSOA-TESTE-2',
          rga: 'RGA-TESTE-2',
          apresentadorPublico: 'Membro de Teste 2',
          nomeApresentador: 'Membro de Teste 2',
          tema: 'Segunda abordagem',
          titulo: 'Segunda abordagem',
          eixoTematicoPrincipal: 'Direitos Humanos',
          eixoTematicoSecundario: 'Politicas Publicas',
          statusApresentacao: 'PUBLICADA',
          statusTituloEixo: 'VALIDADO',
          statusMaterial: 'SEM_MATERIAL_PUBLICO',
          idArquivoMaterial: '',
          nomeArquivoMaterial: '',
          linkMaterialPublico: '',
          versaoMaterial: ''
        }
      ],
      envolvidosPublicos: [
        {
          nomePublico: 'Membro de Teste 1',
          papel: 'Apresentador',
          tipoPessoa: 'Membro'
        },
        {
          nomePublico: 'Membro de Teste 2',
          papel: 'Apresentador',
          tipoPessoa: 'Membro'
        }
      ],
      idPastaDrive: 'PASTA-ATV-0007',
      linkPastaDrive: 'https://example.org/pasta-atividade-0007',
      linkMaterialPublico: '',
      linkAtaPublica: '',
      linkFotosPublico: ''
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

  function callAction(acao, params) {
    return chamarAppsScriptAction(acao, params || {});
  }

  function chamarAppsScript(route, params) {
    var acao = obterAcaoAppsScript(route);

    if (!acao) {
      return Promise.resolve({
        ok: false,
        errorCode: 'ROTA_NAO_MAPEADA',
        message: 'Rota não mapeada para a API do Portal GEAPA.'
      });
    }

    return chamarAppsScriptAction(acao, params || {});
  }

  function chamarAppsScriptAction(acao, params) {
    var acaoNormalizada = String(acao || '').trim();
    var corpo = new URLSearchParams();

    if (!acaoNormalizada) {
      return Promise.resolve({
        ok: false,
        errorCode: 'ACAO_NAO_INFORMADA',
        message: 'Ação não informada para a API do Portal GEAPA.'
      });
    }

    if (!config.GEAPA_API_BASE_URL) {
      return Promise.resolve({
        ok: false,
        errorCode: 'API_BASE_URL_AUSENTE',
        message: 'URL da API do Portal GEAPA não configurada.'
      });
    }

    corpo.set('acao', acaoNormalizada);
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
      '/atividades/detalhe': 'atividadeDetalhe',
      '/atividades/chamada': 'atividadeChamada',
      '/atividades/chamada/salvar': 'atividadeSalvarChamada',
      '/conteudo-publico/snapshot': 'conteudoPublicoSnapshot',
      '/v2/minha-frequencia': 'minhaFrequencia',
      '/v2/minhas-apresentacoes': 'minhasApresentacoes',
      '/v2/minhas-justificativas': 'minhasJustificativas',
      '/v2/proximas-atividades': 'proximasAtividades',
      '/v2/historico-atividades': 'historicoAtividades',
      '/v2/pendencias-diretoria': 'pendenciasDiretoria',
      '/v2/painel-diretoria': 'painelDiretoriaV2',
      '/v2/status-views': 'statusViewsV2',
      '/v2/apresentacoes/eixos': 'apresentacoesListarEixos',
      '/v2/apresentacoes/titulo-eixo/enviar': 'apresentacaoEnviarTituloEixo',
      '/v2/apresentacoes/titulo-eixo/revisar': 'apresentacaoRevisarTituloEixo',
      '/v2/apresentacoes/material/registrar': 'apresentacaoRegistrarMaterial',
      '/v2/apresentacoes/material/revisar': 'apresentacaoRevisarMaterial',
      '/v2/apresentacoes/pendencias': 'apresentacoesPendenciasDiretoria'
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

    if (route === '/atividades/chamada') {
      return Promise.resolve(criarChamadaMock(params.idAtividade));
    }

    if (route === '/atividades/chamada/salvar') {
      return Promise.resolve({
        ok: true,
        message: 'Chamada simulada salva com sucesso.',
        data: {
          idAtividade: params.idAtividade || '',
          modo: 'MOCK'
        }
      });
    }

    if (route === '/v2/minha-frequencia') {
      return Promise.resolve(criarRespostaV2Mock('registros', [
        {
          dataAtividade: '2026-04-16',
          tituloPublico: 'Apresentacao de Membro',
          tipoPublico: 'Apresentacao',
          statusPresencaRotulo: 'Presente',
          contaPresenca: true,
          contaFalta: true
        }
      ]));
    }

    if (route === '/v2/minhas-apresentacoes') {
      return Promise.resolve(criarRespostaV2Mock('apresentacoes', criarMinhasApresentacoesMock()));
    }

    if (route === '/v2/apresentacoes/eixos') {
      return Promise.resolve(criarRespostaV2Mock('eixos', criarEixosTematicosMock()));
    }

    if (route === '/v2/minhas-justificativas') {
      return Promise.resolve(criarRespostaV2Mock('justificativas', []));
    }

    if (route === '/v2/proximas-atividades') {
      return Promise.resolve(criarRespostaV2Mock('atividades', atividadesMock.slice()));
    }

    if (route === '/v2/historico-atividades') {
      return Promise.resolve(criarRespostaV2Mock('atividades', atividadesMock.slice()));
    }

    if (route === '/v2/pendencias-diretoria') {
      return Promise.resolve(criarRespostaV2Mock('pendencias', [
        {
          tipo: 'JUSTIFICATIVA',
          titulo: 'Justificativa pendente',
          descricaoPublica: 'Ha uma justificativa aguardando analise.',
          status: 'PENDENTE',
          severidade: 'MEDIA'
        }
      ]));
    }

    if (route === '/v2/apresentacoes/pendencias') {
      return Promise.resolve(criarRespostaV2Mock('pendencias', criarPendenciasApresentacoesMock()));
    }

    if (route === '/v2/painel-diretoria') {
      return Promise.resolve({
        ok: true,
        data: criarPainelDiretoriaV2Mock(),
        meta: {
          viewsV2: {
            somenteLeitura: true,
            origemDados: 'mock'
          }
        }
      });
    }

    if (route === '/v2/status-views') {
      return Promise.resolve(criarRespostaV2Mock('views', [
        {
          view: 'PORTAL_ATIVIDADES_CALENDARIO',
          status: 'OK',
          linhas: 3,
          atualizadaEm: new Date().toISOString(),
          origem: 'MOCK'
        }
      ]));
    }

    return Promise.resolve({
      ok: false,
      errorCode: 'ROTA_MOCK_NAO_IMPLEMENTADA',
      message: 'Rota mockada não implementada.'
    });
  }

  function apiPostMock(route) {
    if (route === '/atividades/chamada/salvar') {
      return Promise.resolve({
        ok: true,
        message: 'Chamada simulada salva com sucesso.',
        data: {
          route: route,
          modo: 'MOCK'
        }
      });
    }

    if (route.indexOf('/v2/apresentacoes/') === 0) {
      return Promise.resolve({
        ok: true,
        message: 'Acao de apresentacao simulada com sucesso.',
        data: {
          route: route,
          modo: 'MOCK'
        }
      });
    }

    return Promise.resolve({
      ok: true,
      message: 'Ação simulada com sucesso em modo de desenvolvimento.',
      data: {
        route: route
      }
    });
  }

  function criarMinhasApresentacoesMock() {
    return Object.keys(detalhesMock).reduce(function coletar(lista, idAtividade) {
      var detalhe = detalhesMock[idAtividade];
      var apresentacoes = Array.isArray(detalhe.apresentacoesPublicas)
        ? detalhe.apresentacoesPublicas
        : [];

      apresentacoes.forEach(function copiar(apresentacao) {
        lista.push({
          idApresentacao: apresentacao.idApresentacao || 'APR-' + idAtividade,
          idAtividade: detalhe.idAtividade,
          dataAtividade: detalhe.dataAtividade,
          tituloPublico: detalhe.tituloPublico,
          tema: apresentacao.titulo || apresentacao.tema,
          statusApresentacao: apresentacao.statusApresentacao,
          statusTituloEixo: apresentacao.statusTituloEixo || 'PENDENTE_REVISAO',
          statusMaterial: apresentacao.statusMaterial || 'NAO_ENVIADO',
          eixoTematicoPrincipal: apresentacao.eixoTematicoPrincipal,
          eixoTematicoSecundario: apresentacao.eixoTematicoSecundario,
          periodo: detalhe.rotuloSemestre || '2026/1',
          rotuloSemestre: detalhe.rotuloSemestre || '2026/1',
          linkPastaDrive: detalhe.linkPastaDrive,
          idPastaDrive: detalhe.idPastaDrive,
          linkMaterialPublico: apresentacao.linkMaterialPublico || '',
          nomeArquivoMaterial: apresentacao.nomeArquivoMaterial || '',
          versaoMaterial: apresentacao.versaoMaterial || '',
          acoesMembro: {
            podeEditarTituloEixo: true,
            podeEnviarMaterial: !apresentacao.linkMaterialPublico,
            podeReenviarMaterial: false,
            podeAbrirMaterial: Boolean(apresentacao.linkMaterialPublico),
            podeAbrirPastaAtividade: Boolean(detalhe.linkPastaDrive || detalhe.idPastaDrive)
          }
        });
      });

      return lista;
    }, []);
  }

  function criarEixosTematicosMock() {
    return [
      {
        valor: 'VIII - Temas Livres de Relevancia Agronomica',
        rotuloFormulario: 'VIII - Temas Livres de Relevancia Agronomica',
        descricaoResumida: 'Temas atuais conectados a agronomia e sociedade.',
        palavrasChave: 'agronomia, inovacao, campo'
      },
      {
        valor: 'VI - Extensao Rural, Associativismo e Politicas Publicas',
        rotuloFormulario: 'VI - Extensao Rural, Associativismo e Politicas Publicas',
        descricaoResumida: 'Extensao, politicas publicas e organizacao social no campo.',
        exemplosTemas: 'ATER, cooperativas, politicas territoriais'
      }
    ];
  }

  function criarPendenciasApresentacoesMock() {
    return [
      {
        idPendencia: 'PEND-MOCK-1',
        tipoPendencia: 'TITULO_EIXO_AGUARDANDO_ANALISE',
        gravidade: 'MEDIA',
        idAtividade: 'ATV-MOCK-1',
        idApresentacao: 'APR-MOCK-1',
        dataAtividade: '2026-06-26',
        rotuloSemestre: '2026/1',
        tituloAtividade: 'Palestra de teste',
        tituloApresentacao: 'Agricultura Marciana e o que ela pode nos ensinar sobre a da Terra',
        nomeApresentador: 'Membro de Teste',
        statusTituloEixo: 'PENDENTE_REVISAO',
        statusMaterial: 'NAO_ENVIADO',
        eixoTematicoPrincipal: 'VIII - Temas Livres de Relevancia Agronomica',
        descricaoPendencia: 'Titulo e eixos aguardam analise da diretoria.',
        acaoRecomendada: 'Revisar titulo/eixos',
        acoesGestao: {
          podeAprovarTituloEixo: true,
          podeSolicitarAjusteTituloEixo: true,
          podeAprovarMaterial: false,
          podeSolicitarAjusteMaterial: false,
          podeDispensarMaterial: true
        }
      }
    ];
  }

  function criarChamadaMock(idAtividade) {
    var atividade = detalhesMock[idAtividade] || detalhesMock['ATV-2026-1-0005'];

    if (!atividade) {
      return {
        ok: false,
        errorCode: 'ATIVIDADE_NAO_ENCONTRADA',
        message: 'Atividade não encontrada.'
      };
    }

    return {
      ok: true,
      data: {
        atividade: {
          idAtividade: atividade.idAtividade,
          tituloPublico: atividade.tituloPublico,
          dataAtividade: atividade.dataAtividade,
          horarioCompleto: atividade.horarioCompleto,
          local: atividade.local,
          formato: atividade.formato,
          statusPublico: atividade.statusPublico,
          contaPresenca: atividade.contaPresenca,
          contaFalta: atividade.contaFalta
        },
        participantes: [
          {
            tipoParticipante: 'MEMBRO',
            idPessoa: 'PES-TESTE-1',
            rga: 'RGA-TESTE-1',
            nome: 'Membro de Teste 1',
            statusPresenca: '',
            codigoPresenca: '',
            observacoes: '',
            aplicavelNaData: true,
            contaPresenca: true,
            contaFalta: true,
            bloqueado: false,
            motivoBloqueio: ''
          },
          {
            tipoParticipante: 'MEMBRO',
            idPessoa: 'PES-TESTE-2',
            rga: 'RGA-TESTE-2',
            nome: 'Membro de Teste 2',
            statusPresenca: 'PRESENTE_PRESENCIAL',
            codigoPresenca: 'P',
            observacoes: '',
            aplicavelNaData: true,
            contaPresenca: true,
            contaFalta: true,
            bloqueado: false,
            motivoBloqueio: ''
          }
        ],
        resumo: {
          totalParticipantes: 2,
          totalPresentes: 1,
          totalFaltas: 0,
          totalNaoSeAplica: 0,
          totalSemMarcacao: 1
        },
        podeSalvar: true,
        modo: 'MOCK',
        ultimaAtualizacao: new Date().toISOString()
      }
    };
  }

  function criarPainelDiretoriaV2Mock() {
    return {
      ultimaAtualizacao: new Date().toISOString(),
      somenteLeitura: true,
      niveis: ['ERRO', 'ALERTA', 'INFO'],
      resumo: {
        total: 3,
        ERRO: 1,
        ALERTA: 1,
        INFO: 1,
        viewsDesatualizadas: 1
      },
      avisos: [],
      viewsDesatualizadas: true,
      blocos: [
        {
          id: 'atividadesSemChamada',
          titulo: 'Atividades sem chamada',
          nivel: 'ALERTA',
          total: 1,
          resumo: '1 ocorrencia em aberto.',
          ultimaAtualizacao: new Date().toISOString(),
          desatualizado: false,
          itens: [
            {
              tipo: 'CHAMADA',
              titulo: 'Reuniao ordinaria sem chamada consolidada',
              descricao: 'Atividade realizada sem fechamento de chamada na view V2.',
              status: 'PENDENTE',
              nivel: 'ALERTA',
              responsavelGrupo: 'Secretaria',
              atualizadaEm: new Date().toISOString()
            }
          ]
        },
        {
          id: 'inconsistenciasCadastrais',
          titulo: 'Inconsistencias cadastrais',
          nivel: 'ERRO',
          total: 1,
          resumo: '1 ocorrencia em aberto.',
          ultimaAtualizacao: new Date().toISOString(),
          desatualizado: false,
          itens: [
            {
              tipo: 'CADASTRO',
              titulo: 'Vinculo sem identificador publico',
              descricao: 'Registro precisa ser revisado na rotina V2 de origem.',
              status: 'ERRO',
              nivel: 'ERRO',
              responsavelGrupo: 'Admin tecnico',
              atualizadaEm: new Date().toISOString()
            }
          ]
        },
        {
          id: 'statusViewsPortal',
          titulo: 'Status das views do portal',
          nivel: 'INFO',
          total: 1,
          resumo: '1 view monitorada.',
          ultimaAtualizacao: new Date().toISOString(),
          desatualizado: true,
          itens: [
            {
              tipo: 'View',
              titulo: 'PORTAL_ATIVIDADES_CALENDARIO',
              descricao: 'Mock local',
              status: 'OK',
              nivel: 'INFO',
              linhas: 3,
              origem: 'MOCK',
              atualizadaEm: new Date().toISOString()
            }
          ]
        }
      ]
    };
  }

  function criarRespostaV2Mock(campoLista, itens) {
    var data = {
      resumo: {
        total: itens.length
      },
      ultimaAtualizacao: new Date().toISOString()
    };

    data[campoLista] = itens;

    return {
      ok: true,
      data: data,
      meta: {
        viewsV2: {
          somenteLeitura: true,
          origemDados: 'mock'
        }
      }
    };
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
    callAction: callAction,
    handleApiError: handleApiError,
    buildQueryString: buildQueryString
  };
})(window);
