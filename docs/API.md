# Contrato da API do Portal GEAPA

Este documento descreve o contrato inicial entre o front-end publico do Portal
GEAPA e o backend em Google Apps Script.

Nesta etapa, a API ja resolve sessoes pelo `GEAPA_CORE`, autentica pelo Firebase
ou por codigo temporario, carrega a tela "Minha situacao", integra atividades
operacionais e expoe endpoints V2 somente leitura para frequencia,
apresentacoes, justificativas, atividades, pendencias, painel da diretoria e
status das views. O upload de comprovante de justificativa passa pelo Apps
Script e pelo modulo Atividades. Certificados e edicao de atividade seguem fora
do contrato do Portal.

O backend prioriza o resolvedor oficial de sessao do GEAPA-CORE:

- `corePortalResolverUsuarioAtual(entrada, opts)`, usado para obter a sessao
  canonica do usuario atual, incluindo perfil efetivo e permissoes.

Tambem existem pontos de integracao legados mantidos por compatibilidade:

- `geapaCoreBuscarMembroParaPortal(emailOuRga)`, usado no fluxo de codigo para
  localizar o e-mail cadastrado do membro;
- `geapaCoreBuscarMinhaSituacaoParaPortal(emailOuRga)`, usado para carregar a
  tela "Minha situacao".

Essas funcoes podem estar copiadas no mesmo projeto Apps Script ou expostas por
biblioteca com identificador `GEAPA_CORE`. Se essa integracao nao existir no
ambiente, a API usa `PORTAL_MEMBROS_TESTE_JSON` e monta uma resposta parcial
local como fallback.

## URL base

```text
https://script.google.com/macros/s/AKfycbxf-vC0VFALa45AlT1ycKJcL44EB6LiCFBwVy3LIPvrWGxyd5_1U2XKRM03_7rsh-k/exec
```

## Formato de envio

O front-end envia requisicoes `POST` como formulario simples:

```http
Content-Type: application/x-www-form-urlencoded
```

Campo obrigatorio comum:

```text
acao=<nome-da-acao>
```

Esse formato reduz complexidade de CORS nesta fase inicial.

## Envelope de resposta

Todas as respostas devem seguir este formato:

```json
{
  "ok": true,
  "code": "CODIGO_DA_RESPOSTA",
  "message": "Mensagem para exibição ou debug controlado.",
  "data": {},
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly"
  }
}
```

Campos:

- `ok`: indica sucesso ou falha da operação.
- `code`: codigo estavel para o front-end tratar respostas.
- `message`: mensagem curta e não sensível.
- `data`: dados especificos da acao.
- `meta`: informações técnicas não sensíveis.

## Sessao resolvida do Portal

Quando uma acao precisar atualizar navegacao, rotas protegidas ou contexto do
usuario, o backend retorna a sessao resolvida pelo GEAPA-CORE em `data.sessao`.
Isso vale para `validarCodigo`, `portalLogin` e `minhaSituacao` quando o CORE
estiver disponivel.

Contrato canonico:

```json
{
  "autenticado": true,
  "idPessoa": "PES-0001",
  "nomeExibicao": "Membro GEAPA",
  "email": "membro@example.org",
  "perfilPortalEfetivo": "MEMBRO",
  "perfisPortal": ["MEMBRO"],
  "permissoes": ["portal:acessar", "situacao:ver_propria"],
  "portalAtivo": true,
  "tipoVinculoAtual": "MEMBRO",
  "statusVinculoAtual": "ATIVO",
  "cargoFuncaoAtual": "",
  "cargosAtuais": []
}
```

O contrato detalhado esta em `docs/SESSAO_PORTAL_CORE.md`. O Portal nao calcula
perfil, vinculo, cargo ou permissao; ele apenas consome a sessao ja resolvida
pelo CORE.

## Acao: portalLogin

Entrada:

```text
acao=portalLogin
idToken=<FIREBASE_ID_TOKEN>
```

O backend valida o ID Token no Firebase e autoriza o e-mail autenticado pela
base oficial do GEAPA/GEAPA-CORE. Se o acesso for autorizado, a API retorna uma
sessao curta do Portal, mantendo compatibilidade com as telas ja existentes.

Resposta esperada:

```json
{
  "ok": true,
  "code": "PORTAL_LOGIN_FIREBASE_OK",
  "message": "Entrada com Google validada pelo GEAPA.",
  "data": {
    "sessionToken": "sessao-temporaria",
    "validadeSessaoMinutos": 120,
    "sessao": {
      "autenticado": true,
      "idPessoa": "PES-0001",
      "nomeExibicao": "Membro GEAPA",
      "email": "membro@example.org",
      "perfilPortalEfetivo": "MEMBRO",
      "perfisPortal": ["MEMBRO"],
      "permissoes": ["portal:acessar", "situacao:ver_propria"],
      "portalAtivo": true,
      "tipoVinculoAtual": "MEMBRO",
      "statusVinculoAtual": "ATIVO",
      "cargoFuncaoAtual": "",
      "cargosAtuais": []
    },
    "usuario": {
      "uid": "firebase-uid",
      "email": "me***@exemplo.org",
      "nome": "Membro GEAPA",
      "rga": "202311801000",
      "status": "ATIVO",
      "perfilPortal": "MEMBRO",
      "permissoes": []
    }
  }
}
```

O ID Token completo nao deve ser registrado em logs nem salvo em planilhas,
`localStorage` ou `PropertiesService`.

## GET de saude

Requisicao:

```http
GET /exec
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "PORTAL_API_OK",
  "message": "API do Portal GEAPA ativa.",
  "data": {
    "acoesDisponiveis": [
      "solicitarCodigo",
      "validarCodigo",
      "portalLogin",
      "conteudoPublicoSnapshot",
      "minhaSituacao",
      "atividadesBundle",
      "atividadesListar",
      "atividadesDetalhesPreload",
      "atividadeDetalhe",
      "atividadeChamada",
      "atividadeSalvarChamada",
      "minhaFrequencia",
      "minhasApresentacoes",
      "minhasJustificativas",
      "proximasAtividades",
      "historicoAtividades",
      "pendenciasDiretoria",
      "painelDiretoriaV2",
      "statusViewsV2"
    ]
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly"
  }
}
```

## Acao: conteudoPublicoSnapshot

Entrada:

```text
acao=conteudoPublicoSnapshot
forceRefresh=true|false
```

`forceRefresh` e opcional e deve ser usado apenas em testes ou manutencao para
ignorar o cache curto do backend.

Resposta esperada:

```json
{
  "ok": true,
  "code": "CONTEUDO_PUBLICO_CORE",
  "message": "Conteudo publico carregado pelo GEAPA-CORE.",
  "data": {
    "pages": {
      "home": {
        "blocos": [],
        "atualizadoEm": ""
      },
      "sobre": {
        "blocos": [],
        "atualizadoEm": ""
      },
      "historia": {
        "marcos": [],
        "atualizadoEm": ""
      },
      "parceiros": {
        "itens": [],
        "atualizadoEm": ""
      }
    },
    "documents": [],
    "media": [],
    "config": {},
    "boardComplements": [],
    "peopleComplements": [],
    "managementComplements": [],
    "peopleConfig": {}
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly",
    "desempenho": {
      "origemDados": "geapa-core",
      "tempoMs": 0,
      "cacheConteudoPublicoSegundos": 300
    }
  }
}
```

Essa acao consome preferencialmente
`GEAPA_CORE.corePortalPublicContentBuildPublicSnapshot()` e nao acessa planilhas
diretamente pelo front-end. O CORE resolve o Registry, le por cabecalho, filtra
apenas linhas publicaveis e retorna dados sanitizados.

Enquanto a modelagem publica de pessoas e gestoes estiver em transicao no CORE,
o backend do portal pode montar um snapshot parcial chamando as funcoes
read-only especificas do CORE. Nesse caso, paginas como `home` e `sobre`
continuam sendo entregues mesmo se uma parte opcional do snapshot completo
ainda nao estiver pronta. A origem tecnica aparece em
`meta.conteudoPublico.core.origem` como `GEAPA_CORE_PARCIAL`.

`PORTAL_CONTEUDO_PUBLICO` e CMS editorial publico. Nao e fonte oficial de
atividades, apresentacoes, membros, diretoria oficial, frequencia ou permissoes.
Agenda, historico e apresentacoes vinculadas continuam pertencendo ao modulo
`geapa-atividades` e aos contratos de atividades do Portal.

`boardComplements` existe apenas por compatibilidade com a antiga modelagem de
diretoria. A modelagem publica nova usa:

- `peopleComplements`, para complementos editoriais de pessoas publicaveis;
- `managementComplements`, para complementos editoriais de gestoes/diretorias;
- `peopleConfig`, para configuracoes publicas ligadas a pessoas.

O portal aplica cache curto ao snapshot sanitizado. Quando o cache e usado, o
codigo da resposta passa a ser `CONTEUDO_PUBLICO_CACHE`.

## Acao: solicitarCodigo

Entrada:

```text
acao=solicitarCodigo
emailOuRga=valor-informado-pelo-membro
```

Resposta em modo de teste com envio habilitado:

```json
{
  "ok": true,
  "code": "CODIGO_ENVIADO_TESTE",
  "message": "Código enviado para o e-mail autorizado de teste.",
  "data": {
    "identificadorRecebido": "valor-informado-pelo-membro",
    "destino": "me***@exemplo.org",
    "validadeMinutos": 10
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly"
  }
}
```

## Acao: validarCodigo

Entrada:

```text
acao=validarCodigo
emailOuRga=valor-informado-pelo-membro
codigo=123456
```

Resposta em modo de teste:

```json
{
  "ok": true,
  "code": "CODIGO_VALIDADO_TESTE",
  "message": "Código validado em modo de teste.",
  "data": {
    "sessionToken": "sessao-temporaria",
    "validadeSessaoMinutos": 120,
    "sessao": {
      "autenticado": true,
      "idPessoa": "PES-0001",
      "nomeExibicao": "Membro GEAPA",
      "email": "membro@example.org",
      "perfilPortalEfetivo": "MEMBRO",
      "perfisPortal": ["MEMBRO"],
      "permissoes": ["portal:acessar", "situacao:ver_propria"],
      "portalAtivo": true,
      "tipoVinculoAtual": "MEMBRO",
      "statusVinculoAtual": "ATIVO",
      "cargoFuncaoAtual": "",
      "cargosAtuais": []
    },
    "identificadorRecebido": "valor-informado-pelo-membro"
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly"
  }
}
```

## Acao: minhaSituacao

Entrada:

```text
acao=minhaSituacao
token=sessao-temporaria
```

Resposta quando a situacao vem do GEAPA-CORE:

```json
{
  "ok": true,
  "code": "MINHA_SITUACAO_CORE",
  "message": "Minha situação carregada pelo GEAPA-CORE.",
  "data": {
    "sessao": {
      "autenticado": true,
      "idPessoa": "PES-0001",
      "nomeExibicao": "Membro GEAPA",
      "email": "membro@example.org",
      "perfilPortalEfetivo": "DIRETORIA",
      "perfisPortal": ["MEMBRO", "DIRETORIA", "SECRETARIA"],
      "permissoes": [
        "portal:acessar",
        "situacao:ver_propria",
        "atividades:gerir",
        "membros:ler",
        "presencas:gerir"
      ],
      "portalAtivo": true,
      "tipoVinculoAtual": "MEMBRO",
      "statusVinculoAtual": "ATIVO",
      "cargoFuncaoAtual": "Secretario(a) Geral",
      "cargosAtuais": []
    },
    "situacao": {
      "nomeExibicao": "Membro GEAPA",
      "situacaoGeral": "Cadastro localizado",
      "vinculo": "Membro em acompanhamento",
      "usuario": {
        "id": "202311801000",
        "nomeExibicao": "Membro GEAPA",
        "rga": "202311801000",
        "perfilPrincipal": "DIRETORIA",
        "perfis": ["MEMBRO", "DIRETORIA", "SECRETARIA"],
        "cargosAtuais": [
          {
            "cargoKey": "SECRETARIO_GERAL",
            "cargoNome": "Secretário(a) Geral",
            "grupoCargo": "SECRETARIA",
            "fonte": "VIGENCIAS_DIRETORES",
            "idDiretoria": "2026-2027",
            "dataInicio": "2026-05-19",
            "dataFimPrevista": "2027-05-18"
          }
        ],
        "permissoes": {
          "podeVerAreaDiretoria": true,
          "podeGerenciarAtividades": true,
          "podeRegistrarChamada": true,
          "podeEditarAtividade": true,
          "podeAnalisarJustificativas": true,
          "podeGerenciarCertificados": false,
          "podeGerenciarComunicacao": false,
          "podeGerenciarConfiguracoes": false
        }
      },
      "dadosCadastraisReais": true,
      "blocosComplementares": "geapa-core",
      "ultimaAtualizacao": "2026-04-30T00:00:00.000Z",
      "resumo": {
        "frequencia": "Em preparação",
        "pendenciasAbertas": 1,
        "certificadosDisponiveis": 0
      },
      "pendencias": [
        {
          "tipo": "cadastro",
          "titulo": "RGA não informado",
          "descricao": "Procure a Diretoria para atualizar seu RGA no cadastro do GEAPA.",
          "severidade": "media",
          "status": "pendente"
        }
      ],
      "participacao": {
        "frequenciaGeral": "Participação e frequência serão integradas em uma próxima etapa.",
        "atividadesRecentes": [],
        "apresentacoes": {
          "periodoUltimaApresentacao": "GEAPA_2025",
          "quantidadeRealizadas": 2
        }
      },
      "diretoria": {
        "statusElegibilidade": "APTO",
        "diasComputados": 0,
        "limiteDias": 549,
        "saldoDias": 549,
        "dataLimiteEstimada": "18/05/2027"
      },
      "certificados": [],
      "avisos": [
        "Dados carregados pelo GEAPA-CORE.",
        "Frequência, certificados e histórico serão exibidos conforme forem integrados ao core."
      ]
    }
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "apps-script",
    "versaoContrato": "v2-readonly",
    "desempenho": {
      "origemDados": "geapa-core",
      "tempoMs": 820,
      "cacheMinhaSituacaoSegundos": 120
    }
  }
}
```

Quando a mesma tela for consultada novamente dentro do cache curto do backend,
o `code` pode ser `MINHA_SITUACAO_CACHE` e `meta.desempenho.origemDados` pode
vir como `cache`. Esse cache fica somente no Apps Script, expira rapidamente e
guarda apenas a resposta ja filtrada do proprio membro.

As pendencias retornadas nesta etapa sao apenas cadastrais ou administrativas
objetivas. Nao devem incluir observacoes internas, motivos disciplinares,
motivos de suspensao ou avaliacao subjetiva.

O bloco `participacao.apresentacoes` usa apenas campos objetivos da aba
`Membros Atuais`: periodo da ultima apresentacao e quantidade consolidada de
apresentacoes. A coluna `QTD_APRESENTACOES_REALIZADAS` ja inclui a base legado,
entao o portal nao soma campos separados de legado. Ele nao inclui frequencia
detalhada nem lista de presenca.

O bloco `sessao` e o contrato preferencial para navegacao protegida. O bloco
legado `situacao.usuario` continua aceito temporariamente para compatibilidade.
Ambos devem vir do GEAPA-CORE e usar Vigencias como fonte oficial de cargos
atuais. O front-end usa perfis, cargos e permissoes apenas para montar
navegacao e esconder ou mostrar areas. A autorizacao real de qualquer acao
sensivel continua obrigatoriamente no Apps Script/backend.

O bloco `diretoria` e orientativo e usa apenas campos objetivos da aba
`Membros Atuais`: status de elegibilidade, dias computados, limite, saldo e data
limite estimada. Decisoes finais continuam sendo da Diretoria.

## Acao: atividadesBundle

Entrada:

```text
acao=atividadesBundle
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "ATIVIDADES_BUNDLE_CARREGADO",
  "message": "Atividades carregadas em pacote unico.",
  "data": {
    "modo": "LEVE",
    "calendario": [],
    "detalhesPorId": {},
    "ultimaAtualizacao": "2026-05-29T12:00:00.000Z"
  }
}
```

Essa acao fica disponivel como contrato de apoio, mas nao deve ser a primeira
chamada da aba Atividades quando o pacote completo incluir detalhes de todas as
atividades. A primeira renderizacao deve usar `atividadesListar`, que retorna
somente o calendario/resumo leve.

O front-end guarda esse pacote em `sessionStorage` por 5 minutos, com chave
derivada da sessao atual. Para medir a melhoria, abrir o console do navegador e
filtrar por `GEAPA-PORTAL-PERF`.

Observacao de performance: a aba Atividades chama `atividadesListar` primeiro,
renderiza a lista e a proxima atividade em destaque, e so depois prepara
detalhes em segundo plano. O bundle completo nao deve bloquear a primeira
renderizacao.

Controle de concorrencia no front-end:

- preloads oportunistas de detalhes sao limitados a 2 atividades prioritarias;
- a fila executa no maximo 2 detalhes simultaneos;
- detalhes por `idAtividade` usam cache-first e mapa de promise em voo, evitando
  dois `fallback_backend` simultaneos para o mesmo ID;
- abrir, salvar, finalizar ou reabrir chamada pausa novos preloads e bloqueia
  fallback de detalhe nao essencial enquanto a chamada esta ativa;
- logs esperados incluem `atividades.detalhe.cache_memoria`,
  `atividades.detalhe.cache_sessao`, `atividades.detalhe.inflight_reuse`,
  `atividades.detalhe.preload_skip_chamada_ativa` e
  `atividades.detalhe.fallback_backend`.

As respostas de Atividades podem incluir `meta.desempenho` com:

- `origemDados`: `geapa-atividades-bundle`, `fallback-lista`,
  `geapa-atividades-chamada` ou `cache`;
- `tempoMs`: tempo aproximado de processamento no Apps Script;
- `cacheAtividadesSegundos`: duracao configurada para o cache do backend.

## Acao: atividadesDetalhesPreload

Entrada:

```text
acao=atividadesDetalhesPreload
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "ATIVIDADES_DETALHES_PRELOAD_CARREGADO",
  "message": "Detalhes de atividades carregados para preload.",
  "data": {
    "detalhesPorId": {},
    "ultimaAtualizacao": "2026-05-29T12:00:00.000Z"
  }
}
```

Essa acao aquece o cache de detalhes depois que a lista ja apareceu na tela,
quando existir uma versao leve no backend. O Portal tambem pode carregar
detalhes individualmente em segundo plano conforme prioridade e rolagem da
tela. Se um detalhe ainda nao estiver em cache quando o usuario clicar, o portal
usa `atividadeDetalhe` apenas para aquele `ID_ATIVIDADE`.

Importante: esta acao nao deve cair para `atividadesBundle` como fallback,
porque o bundle tambem le calendario e detalhes e pode atrasar o primeiro uso
percebido da aba. Se o preload leve nao estiver disponivel, o portal mantem a
lista renderizada e busca detalhes individualmente sob demanda.

## Acao: atividadesListar

Entrada:

```text
acao=atividadesListar
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "ATIVIDADES_CARREGADAS",
  "message": "Atividades carregadas pelo módulo GEAPA Atividades.",
  "data": [
    {
      "idAtividade": "ATV-2026-1-0005",
      "dataAtividade": "2026-04-16",
      "diaSemana": "quinta-feira",
      "horarioInicio": "18h30",
      "horarioFim": "20h30",
      "tituloPublico": "Apresentação de Membro",
      "tipoPublico": "Apresentação",
      "subtipoAtividade": "APRESENTACAO_MEMBRO",
      "local": "Auditório 7, Xingú I",
      "formato": "PRESENCIAL",
      "classificacaoAcesso": "ABERTA",
      "publicoAlvo": "Membros",
      "contaPresenca": true,
      "contaFalta": true,
      "geraCertificado": true,
      "cargaHoraria": 2,
      "statusOperacional": "REALIZADA",
      "statusPublico": "REALIZADA",
      "eixoTematicoPrincipal": "Direito Penal",
      "eixoTematicoSecundario": "Criminologia",
      "nomePessoaPrincipalPublico": "Nome publico",
      "papelPessoaPrincipal": "Apresentador",
      "tipoPessoaPrincipal": "Membro",
      "qtdApresentacoes": 1,
      "resumoApresentacoesPublico": "Resumo curto das apresentacoes.",
      "possuiApresentacoes": true,
      "ciclo": "2026",
      "ano": 2026,
      "semestre": 1,
      "rotuloSemestre": "2026/1",
      "visibilidadePortal": "MEMBROS",
      "podeVerDetalhes": true,
      "podeJustificarFalta": false,
      "podeJustificarAusenciaFutura": true,
      "justificativaPreviaEnviada": false,
      "idJustificativaPrevia": "",
      "statusJustificativaPrevia": "",
      "motivoJustificativaPreviaIndisponivel": "",
      "mensagemJustificativaPrevia": "",
      "podeRegistrarChamada": false,
      "podeEditar": false
    }
  ]
}
```

Essa ação exige sessão válida e chama o contrato público somente leitura do
módulo `geapa-atividades`. O perfil enviado ao módulo vem do bloco `usuario`
retornado pelo GEAPA-CORE:

- `SECRETARIA` vira `SECRETARIO`;
- `DIRETORIA` ou `PRESIDENCIA` vira `DIRETORIA`;
- demais usuários seguem como `MEMBRO`.

`statusOperacional` é a fonte preferencial para badges, filtros de status e
histórico visual. O Portal apenas exibe o valor retornado pelo backend/views e
não infere `REALIZADA` por data/hora. `statusPublico` continua disponível como
compatibilidade visual quando `statusOperacional` ainda não vier no payload.

A origem atual da leitura real é a base **ATIVIDADES INTERNAS GEAPA v2 - DEV**,
cadastrada no Registry como `ATIVIDADES_V2_DB`. A listagem usa
`PORTAL_ATIVIDADES_CALENDARIO`. O único ID estrutural retornado é
`ID_ATIVIDADE`, exposto no JSON como `idAtividade`, no padrão
`ATV-AAAA-S-NNNN`.

### Criar atividade

O Pacote 4A expoe a criacao segura de atividade pelo Apps Script:

```text
POST /atividades/criar
acao=atividadeCriar
```

O front-end envia `payload` JSON com `dryRun: true` e `atividade`. O backend
`geapa-atividades` valida contexto/permissao, gera a previa de `ID_ATIVIDADE` e
retorna os defaults seguros. Apos confirmacao do usuario, o Portal reenvia o
mesmo payload com `dryRun: false`.

Campos obrigatorios do formulario: `tituloPublico`, `dataAtividade`,
`horarioInicio`, `horarioFim`, `tipoAtividade`, `subtipoAtividade`, `formato`,
`local`, `contaPresenca`, `contaFalta`, `geraCertificado`, `cargaHoraria`,
`exigeListaPresenca` e `permiteJustificativa`.

O Portal nao gera ID, nao publica a atividade, nao altera chamada, frequencia ou
justificativas e nao escreve diretamente em `PORTAL_*`. A atividade nasce como
`PLANEJADA`, `RASCUNHO` e `DIRETORIA`. Apos criacao real, o Portal invalida cache
local de atividades e recarrega a lista pelo backend.

Apresentacoes nao sao consumidas por view propria no Portal. Cards, agenda e
historico usam os campos publicos do calendario (`eixoTematicoPrincipal`,
`eixoTematicoSecundario`, `nomePessoaPrincipalPublico`,
`papelPessoaPrincipal`, `tipoPessoaPrincipal`, `qtdApresentacoes`,
`resumoApresentacoesPublico`, `possuiApresentacoes`, `ciclo`, `ano`,
`semestre` e `rotuloSemestre`). O
detalhe/modal usa `PORTAL_ATIVIDADES_DETALHES`, especialmente
`apresentacoesPublicas`, `envolvidosPublicos`, `linkMaterialPublico`,
`linkPastaDrive`, `linkAtaPublica` e `linkFotosPublico`. A aba de proximas atividades filtra
apenas atividades futuras ou em andamento. O historico nao aplica corte fixo de
ciclo no front-end e oferece filtros por ciclo/semestre, tipo/subtipo,
apresentacoes e eixo tematico. O filtro de semestre usa `rotuloSemestre` apenas
quando o valor final segue `AAAA/1` ou `AAAA/2`; valores de fuso, horario, data
ou texto livre sao ignorados. Como fallback, o Portal tenta `ano` + "/" +
`semestre`; quando nada valido vier no payload, usa "Sem semestre definido". O
Portal nao infere semestre letivo por divisao civil do ano, exceto como fallback
visual temporario quando o backend nao enviar ano/semestre validos. Cards da
lista mostram apenas o resumo agregado do calendario; a
lista completa de apresentacoes fica restrita ao detalhe/modal.

No detalhe, `linkMaterialPublico` no nivel da atividade e o material geral da
atividade, e `linkPastaDrive` aponta para a pasta geral. Em cada item de
`apresentacoesPublicas`, `linkMaterialPublico`, `statusMaterial`,
`idArquivoMaterial`, `nomeArquivoMaterial` e `versaoMaterial` pertencem ao
material especifico daquela apresentacao.

A tela `Minhas apresentacoes` usa um recorte desse contrato com Data,
Semestre, Tema, Eixos, Status, Pasta da atividade, material da apresentacao e
acoes permitidas pelo backend.

## Acoes V2 do portal

As acoes abaixo consomem contratos V2 pelo Apps Script. Todas exigem `token` de
sessao temporaria, validam a sessao no backend e retornam ou alteram apenas o
necessario para a tela. O Portal nao escreve diretamente em planilhas.

```text
acao=minhaFrequencia
acao=minhasApresentacoes
acao=minhasJustificativas
acao=justificativasConfig
acao=justificativaEnviar
acao=justificativaAnalisar
acao=justificativasPendenciasDiretoria
acao=proximasAtividades
acao=historicoAtividades
acao=pendenciasDiretoria
acao=painelDiretoriaV2
acao=statusViewsV2
token=sessao-temporaria
```

Contratos de resposta:

- `minhaFrequencia`: retorna `data.resumoGeral`, `data.cicloAtual`,
  `data.ciclos[]`, `data.registros[]` e `data.ultimaAtualizacao`. Cada registro
  pode trazer `acaoJustificativa`, `podeEnviarJustificativa`,
  `podeVerJustificativa`, `podeComplementarJustificativa`, `mensagemPortal` e
  os identificadores necessarios para abrir o fluxo de justificativa. O contrato
  esperado e `MINHA_FREQUENCIA_DETALHADA_V2`; payload antigo/resumido nao deve
  gerar cards de atividade.
- `minhasApresentacoes`: retorna `data.apresentacoes`, `data.resumo` e
  `data.ultimaAtualizacao`; o backend prefere
  `atividadesV2_portalGetMinhasApresentacoes(contexto)` e filtra por
  `idPessoa`, `rga` ou e-mail da sessao, sem consumir uma view paralela de
  apresentacoes. A tela pessoal renderiza botoes somente a partir de
  `apresentacao.acoesMembro`.
- `minhasJustificativas`: retorna `data.faltasJustificaveis`,
  `data.justificativas`, `data.resumo` e `data.ultimaAtualizacao`; a tela mostra
  faltas justificaveis e justificativas ja enviadas.
- `justificativasConfig`: retorna motivos padronizados e regras de comprovante.
  Motivos aceitos: `SAUDE`, `COMPROMISSO_ACADEMICO`,
  `COMPROMISSO_PROFISSIONAL`, `MOTIVO_PESSOAL_RELEVANTE`, `FORCA_MAIOR` e
  `OUTRO`. Upload aceito inicialmente: PDF, JPG/JPEG, PNG, DOC/DOCX ate 10 MB,
  conforme configuracao do backend.
- `justificativaEnviar`: envia justificativa ao modulo Atividades. Payload:
  `idRegistroPresenca`, `idAtividade`, `motivoDeclarado`,
  `descricaoJustificativa`, `possuiDocumentoComprobatorio`,
  `linkDocumentoComprobatorio`, `documentoComprobatorio`,
  `confirmouCienciaForaPrazo` e `observacoes`.
  `documentoComprobatorio` usa `{ nomeArquivo, mimeType, conteudoBase64 }`.
  Para ausencia futura em `Proximas atividades`, `idRegistroPresenca` e enviado
  vazio e o backend registra a justificativa como `PREVIA`. Para falta ja
  registrada em `Minhas justificativas`, o payload deve conter
  `idRegistroPresenca`.
- `justificativasPendenciasDiretoria`: retorna justificativas pendentes de
  analise para perfis com `justificativas:analisar`; o backend preferido e
  `atividadesV2_portalListarJustificativasPendentesDiretoria(contexto)`.
- `justificativaAnalisar`: registra decisao `DEFERIR`, `ABONAR`,
  `INDEFERIR` ou `SOLICITAR_AJUSTE`; observacao e obrigatoria para indeferir
  ou solicitar ajuste.
- `proximasAtividades` e `historicoAtividades`: retornam `data.atividades`,
  `data.resumo` e `data.ultimaAtualizacao`.
- `pendenciasDiretoria`: retorna `data.pendencias`, `data.resumo` e
  `data.ultimaAtualizacao`, somente para perfil/permissao autorizado.
- `painelDiretoriaV2`: retorna `data.blocos`, `data.resumo`,
  `data.ultimaAtualizacao`, `data.avisos` e `data.viewsDesatualizadas`, somente
  para diretoria, secretaria, admin ou admin tecnico autorizados pelo backend.
- `statusViewsV2`: retorna `data.views`, `data.resumo` e
  `data.ultimaAtualizacao`, somente para perfil/permissao autorizado.

### Acoes de apresentacoes V2

Endpoints frontend e acoes Apps Script:

- `GET /v2/apresentacoes/eixos` -> `apresentacoesListarEixos`.
- `POST /v2/apresentacoes/titulo-eixo/enviar` ->
  `apresentacaoEnviarTituloEixo`.
- `POST /v2/apresentacoes/material/registrar` ->
  `apresentacaoRegistrarMaterial`.
- `GET /v2/apresentacoes/pendencias` ->
  `apresentacoesPendenciasDiretoria`.
- `POST /v2/apresentacoes/titulo-eixo/revisar` ->
  `apresentacaoRevisarTituloEixo`.
- `POST /v2/apresentacoes/titulo-eixo/reprovar` ->
  `apresentacaoReprovarTituloEixo`.
- `POST /v2/apresentacoes/material/revisar` ->
  `apresentacaoRevisarMaterial`.

`apresentacoesListarEixos` chama
`atividadesV2_portalListarEixosTematicos(contexto)`. O select do Portal usa
`rotuloFormulario` como texto visivel e envia o valor selecionado ao backend.

As acoes da tela pessoal devem vir apenas de:

```json
{
  "acoesMembro": {
    "podeEditarTituloEixo": true,
    "podeEnviarMaterial": false,
    "podeReenviarMaterial": false,
    "podeAbrirMaterial": true,
    "podeAbrirPastaAtividade": true
  }
}
```

As acoes da tela de gestao devem vir apenas de:

```json
{
  "acoesGestao": {
    "podeAprovarTituloEixo": true,
    "podeEditarAprovarTituloEixo": true,
    "podeSolicitarAjusteTituloEixo": true,
    "podeReprovarTituloEixo": true,
    "podeAprovarMaterial": false,
    "podeSolicitarAjusteMaterial": false,
    "podeDispensarMaterial": true
  }
}
```

O front-end nao infere botoes por perfil. Se o backend zerar uma acao, o botao
nao aparece. Mesmo quando a flag vier habilitada, o Portal so mostra revisao de
titulo/eixos para `ENVIADO`, `RECEBIDO` ou `EM_ANALISE`; para `PENDENTE`,
`APROVADO`, `HISTORICO` ou `REPROVADO`, mostra apenas estado informativo quando
aplicavel. Revisao de material so aparece para `RECEBIDO`, `REENVIADO` ou
`EM_ANALISE`; com material `PENDENTE`, pode aparecer apenas aviso e
`Dispensar material` se o backend enviar essa flag.

`Rejeitar proposta de tema` usa `apresentacaoReprovarTituloEixo`, que chama
`atividadesV2_portalReprovarTituloEixoApresentacao(payload, contexto)`. Essa
acao exige observacao publica e nao reprova a apresentacao inteira.

Para exibicao de recursos em `Minhas apresentacoes`, o Portal usa
`linkMaterialPublico` como URL preferencial do material e, se ausente,
`idArquivoMaterial` para montar `https://drive.google.com/file/d/<id>/view`.
Para a pasta geral da atividade, usa `linkPastaDrive` e, se ausente,
`idPastaDrive` para montar `https://drive.google.com/drive/folders/<id>`.
Quando nao houver material, o card mostra discretamente "Material ainda nao
enviado"; quando nao houver pasta, o bloco de pasta fica oculto.

Em `Pendencias de apresentacoes`, o apresentador deve ser renderizado a partir
de `nomeApresentador`, com fallback para `responsavelSugerido`, `responsavel`,
`nomePessoaPrincipal` ou `nomePessoaPrincipalPublico`.

Envio de titulo/eixos:

```json
{
  "idApresentacao": "APR-0001",
  "tituloApresentacao": "Titulo publico",
  "eixoTematicoPrincipal": "VIII - Temas Livres de Relevancia Agronomica",
  "eixoTematicoSecundario": "",
  "observacoes": ""
}
```

Envio de material:

```json
{
  "idApresentacao": "APR-0001",
  "nomeArquivoOriginal": "material.pdf",
  "mimeType": "application/pdf",
  "conteudoBase64": "...",
  "observacoes": ""
}
```

Revisao de titulo/eixos:

```json
{
  "idApresentacao": "APR-0001",
  "decisao": "APROVAR",
  "observacaoPublica": "",
  "observacaoInterna": ""
}
```

Revisao de material usa o mesmo formato, com `decisao` em `APROVAR`,
`SOLICITAR_AJUSTE` ou `DISPENSAR`. A seguranca final, inclusive impedir
edicao de apresentacao de outra pessoa, fica no backend `geapa-atividades`.
Nenhum fluxo de chamada/presenca e alterado por essas acoes.

Para titulo/eixos, o Portal tambem pode enviar `decisao=EDITAR_E_APROVAR`,
incluindo `tituloApresentacao`, `eixoTematicoPrincipal` e
`eixoTematicoSecundario`, quando `acoesGestao.podeEditarAprovarTituloEixo`
vier habilitado. Para rejeitar uma proposta de tema/titulo/eixos, envia
`decisao=REPROVAR`; essa acao exige observacao publica ou interna no front-end
e nao representa reprovar a apresentacao inteira.

As telas V2 reutilizaveis mantem cache em memoria por endpoint durante a sessao
por cerca de 60 segundos. Quando ha cache valido, o Portal renderiza o dado
imediatamente e atualiza em segundo plano. Eixos tematicos usam cache em memoria
mais longo, de cerca de 20 minutos. Apos acoes de apresentacao, o Portal
invalida `minhasApresentacoes`, `apresentacoes/pendencias`,
`pendenciasDiretoria` e `painelDiretoria`.

### `painelDiretoriaV2`

Endpoint frontend: `/v2/painel-diretoria`.

Permissoes aceitas no backend: `diretoria:painel_v2`,
`diretoria:pendencias`, `sistema:status_v2`, `sistema:admin`,
`atividades:gerir`, `membros:ler` ou `justificativas:analisar`.

Resposta agregada:

```json
{
  "ok": true,
  "code": "PAINEL_DIRETORIA_V2",
  "data": {
    "ultimaAtualizacao": "2026-06-15T10:00:00.000Z",
    "somenteLeitura": true,
    "viewsDesatualizadas": false,
    "niveis": ["ERRO", "ALERTA", "INFO"],
    "resumo": {
      "total": 0,
      "ERRO": 0,
      "ALERTA": 0,
      "INFO": 0,
      "viewsDesatualizadas": 0
    },
    "avisos": [],
    "blocos": [
      {
        "id": "atividadesSemChamada",
        "titulo": "Atividades sem chamada",
        "nivel": "INFO",
        "total": 0,
        "resumo": "Nenhuma ocorrencia encontrada.",
        "desatualizado": false,
        "itens": []
      }
    ]
  }
}
```

Blocos previstos: `atividadesSemChamada`, `apresentacoesPendentes`,
`justificativasPendentes`, `membrosFrequenciaCritica`,
`inconsistenciasCadastrais`, `errosCargosFuncoes`, `ultimaExecucaoJobs` e
`statusViewsPortal`.

Exemplo:

```json
{
  "ok": true,
  "contrato": "MINHA_FREQUENCIA_DETALHADA_V2",
  "code": "MINHA_FREQUENCIA_V2",
  "message": "Minha frequencia carregada pelas views V2.",
  "data": {
    "sessao": {
      "perfilPortalEfetivo": "MEMBRO",
      "perfisPortal": ["MEMBRO"],
      "portalAtivo": true
    },
    "contrato": "MINHA_FREQUENCIA_DETALHADA_V2",
    "resumoGeral": {
      "totalAtividades": 0,
      "totalPresencas": 0,
      "totalFaltas": 0,
      "percentualFrequencia": "100%"
    },
    "cicloAtual": "2026/1",
    "ciclos": [],
    "registros": [],
    "ultimaAtualizacao": "2026-06-14T12:00:00.000Z"
  },
  "meta": {
    "viewsV2": {
      "origemDados": "views-v2",
      "somenteLeitura": true
    }
  }
}
```

Campos proibidos: CPF, tokens, IDs de planilha, referencias privadas de Drive,
e-mails de terceiros e linhas brutas de planilha. O backend prefere os contratos
read-only publicados pelo modulo GEAPA Atividades; quando eles ainda nao
existem, usa fallback temporario pelas keys `ATIVIDADES_V2_PORTAL_*` no
Registry, filtrando e sanitizando antes de responder.

Teste manual no editor do Apps Script:

```text
portalRunTesteEndpointsReadOnlyV2()
```

O teste confirma que as oito funcoes read-only V2 roteadas existem, podem ser
chamadas sem `ReferenceError` e bloqueiam visitante sem token com
`SESSAO_OBRIGATORIA`. O alias legado `portalRunViewsV2ReadonlyTests()` chama o
mesmo teste.

O Pacote 2 inclui envio e analise de justificativas pelo Portal, sempre via
Apps Script e modulo Atividades. O frontend nao escreve em `PORTAL_*` e nao
altera chamada/presenca diretamente. O comprovante pode ser enviado como arquivo
base64 em `documentoComprobatorio` ou, quando permitido, por
`linkDocumentoComprobatorio`.

## Acao: atividadeDetalhe

Entrada:

```text
acao=atividadeDetalhe
token=sessao-temporaria
idAtividade=ATV-2026-1-0005
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "ATIVIDADE_DETALHE_CARREGADO",
  "message": "Detalhes da atividade carregados pelo módulo GEAPA Atividades.",
  "data": {
    "idAtividade": "ATV-2026-1-0005",
    "tituloPublico": "Apresentação de Membro",
    "descricaoPublica": "Atividade acadêmica semanal do GEAPA.",
    "dataAtividade": "2026-04-16",
    "horarioCompleto": "18h30 às 20h30",
    "local": "Auditório 7, Xingú I",
    "formato": "PRESENCIAL",
    "tipoAtividade": "ACADEMICA",
    "subtipoAtividade": "APRESENTACAO_MEMBRO",
    "classificacaoReuniao": "ORDINARIA",
    "classificacaoAcesso": "ABERTA",
    "responsavelPublico": "",
    "contaPresenca": true,
    "contaFalta": true,
    "geraCertificado": true,
    "cargaHoraria": 2,
    "statusPublico": "REALIZADA",
    "linkMaterialPublico": "",
    "linkPastaDrive": "",
    "linkAtaPublica": ""
  }
}
```

Detalhes internos, e-mails, observações privadas, logs, listas nominais e
presença de outros membros não devem ser retornados.

## Acao: atividadeChamada

Entrada:

```text
acao=atividadeChamada
token=sessao-temporaria
idAtividade=ATV-2026-1-0005
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "ATIVIDADE_CHAMADA_CARREGADA",
  "message": "Chamada carregada pelo modulo GEAPA Atividades.",
  "data": {
    "atividade": {},
    "participantes": [],
    "resumo": {},
    "statusChamada": "SALVA",
    "statusChamadaRotulo": "Chamada salva",
    "chamadaFinalizada": false,
    "rascunhoRestaurado": true,
    "rascunhoSalvoEm": "2026-06-22T14:00:00.000Z",
    "rascunhoSalvoPor": "Operador",
    "podeSalvar": true,
    "podeFinalizar": true,
    "podeReabrir": false,
    "performance": {
      "totalMs": 1234,
      "etapas": []
    },
    "modo": "DEV"
  }
}
```

Essa acao e operacional e somente perfis autorizados podem usa-la. O backend do
portal valida a sessao e repassa o contexto ao `geapa-atividades`, que valida a
permissao real, busca membros aplicaveis pela data da atividade e mescla
registros ja existentes. Quando a chamada ainda nao foi finalizada, o backend
pode restaurar o ultimo rascunho salvo em `Portal_Acoes` e informar
`rascunhoRestaurado`, `rascunhoSalvoEm` e `rascunhoSalvoPor`. Quando a chamada
esta finalizada, os registros oficiais prevalecem sobre qualquer rascunho
antigo.

## Acao: atividadeSalvarChamada

Entrada:

```text
acao=atividadeSalvarChamada
token=sessao-temporaria
payload={...json...}
```

O campo `payload` contem JSON serializado com:

```json
{
  "idAtividade": "ATV-2026-1-0005",
  "operacao": "SALVAR",
  "registros": [
    {
      "tipoParticipante": "MEMBRO",
      "idPessoa": "PES-0001",
      "rga": "202311801000",
      "nome": "Nome do membro",
      "statusPresenca": "PRESENTE_PRESENCIAL",
      "codigoPresenca": "P",
      "observacoes": ""
    }
  ],
  "externos": []
}
```

`idPessoa` e a chave tecnica preferencial para participantes, membros,
apresentadores, justificativas e presencas. `rga` permanece no contrato como
campo legado e de conferencia, principalmente para dados historicos e membros
discentes, mas novas rotinas nao devem depender dele como identificador
estrutural.

Operacoes aceitas:

- `SALVAR`: grava apenas um rascunho parcial em `Portal_Acoes` com
  `TIPO_ACAO = CHAMADA_RASCUNHO_SALVO`, contendo apenas participantes marcados
  como `PRESENTE_PRESENCIAL`/`P` ou `PRESENTE_REMOTO`/`R`. Nao grava presenca
  oficial, nao altera Minha frequencia, nao gera falta justificavel e nao
  promove justificativas previas;
- `FINALIZAR`: e o unico ponto que grava presenca oficial em
  `Atividades_Presencas_Registros`; confirma que sem marcacao virara falta no
  backend e muda o estado para chamada finalizada. Se o payload vier sem
  registros, o backend pode tentar usar o ultimo rascunho salvo;
- `REABRIR`: reabre uma chamada finalizada para ajustes autorizados.

O Portal nao envia manualmente pela tela de chamada estados de justificativa
como `JUSTIFICADA`, `ABONADA`, `DEFERIDA`, `INDEFERIDA` ou
`AJUSTE_SOLICITADO`. Tambem nao envia `FALTA` no rascunho; na finalizacao, os
membros aplicaveis sem marcacao sao tratados pelo backend como `FALTA`/`F`.

O retorno de `SALVAR` pode ser enxuto, por exemplo:

```json
{
  "ok": true,
  "data": {
    "rascunhoSalvo": true,
    "chamadaFinalizada": false
  },
  "escrita": {
    "rascunhoPortalAcoes": true,
    "presencasOficiais": 0
  }
}
```

O salvamento ocorre somente pela API do Apps Script e pelo modulo
`geapa-atividades`, usando a base v2 DEV. O front-end nao escreve diretamente em
planilhas. O modulo revalida permissao, atividade, membros aplicaveis, status
de presenca, `LockService` e logs. Registros de presenca ficam em
`Atividades_Presencas_Registros` somente apos `FINALIZAR`; rascunhos e estado
operacional ficam auditados em `Portal_Acoes`.

## Codigos de erro previstos

- `ACAO_OBRIGATORIA`: nenhuma acao foi enviada.
- `ACAO_NAO_RECONHECIDA`: a acao enviada nao existe.
- `REQUISICAO_INVALIDA`: a requisicao nao pode ser lida.
- `ERRO_INTERNO_PORTAL`: erro inesperado ao processar requisicao do Portal.
- `IDENTIFICADOR_OBRIGATORIO`: e-mail ou RGA nao foi informado.
- `IDENTIFICADOR_NAO_SUPORTADO_NESTA_ETAPA`: nesta fase, apenas e-mails de teste sao aceitos.
- `ENVIO_EMAIL_DESABILITADO`: envio real nao foi habilitado nas propriedades.
- `EMAIL_FORA_DA_LISTA_TESTE`: e-mail nao esta na lista de teste.
- `AGUARDE_NOVA_SOLICITACAO`: ha uma solicitacao recente para o mesmo e-mail.
- `DADOS_VALIDACAO_OBRIGATORIOS`: faltam identificador ou codigo.
- `CODIGO_EXPIRADO_OU_INEXISTENTE`: nao ha codigo valido no cache.
- `CODIGO_INVALIDO`: codigo informado nao confere.
- `TENTATIVAS_EXCEDIDAS`: limite de tentativas foi atingido.
- `SESSAO_OBRIGATORIA`: token de sessao nao foi informado.
- `SESSAO_INVALIDA_OU_EXPIRADA`: sessao nao existe ou expirou.
- `MEMBRO_SESSAO_NAO_ENCONTRADO`: a sessao existe, mas o cadastro associado nao
  foi encontrado pelo core nem pelo fallback de teste.
- `ATIVIDADES_INDISPONIVEIS`: biblioteca ou contrato de atividades ainda nao
  esta disponivel para o portal.
- `ID_ATIVIDADE_OBRIGATORIO`: detalhe de atividade foi solicitado sem ID.
- `ATIVIDADE_NAO_ENCONTRADA`: atividade nao encontrada ou indisponivel para o
  perfil atual.
- `CHAMADA_INCOMPLETA`: tentativa de finalizar chamada com participante sem
  marcacao.
- `CHAMADA_FINALIZADA`: tentativa de alterar chamada ja finalizada sem reabrir.

## Propriedades privadas do Apps Script

Configurar em **Project Settings > Script properties**:

```text
PORTAL_ENVIO_EMAIL_HABILITADO=true
PORTAL_MODO_ACESSO=TESTE
PORTAL_EMAILS_TESTE=email1@exemplo.org,email2@exemplo.org
PORTAL_CODIGO_SALT=valor-aleatorio-longo
GEAPA_FIREBASE_WEB_API_KEY=api-key-publica-do-firebase-web
PORTAL_MEMBROS_TESTE_JSON=[{"emailCadastrado":"email1@exemplo.org","rga":"RGA-TESTE","nomeExibicao":"Membro de Teste","situacaoGeral":"Em simulacao","vinculo":"Membro em acompanhamento"}]
PORTAL_DIAGNOSTICO_IDENTIFICADOR=email-ou-rga-para-teste
```

Esses valores nao devem ser versionados no GitHub. `PORTAL_EMAILS_TESTE` so
deve restringir acesso quando o Core estiver em modo `TESTE`; em
`MEMBROS_ATIVOS`, a autorizacao vem da sessao oficial resolvida pelo Core.

## Validade de codigo e sessao

O codigo enviado por e-mail tem validade curta, definida em
`PORTAL_CONFIG.validadeCodigoMinutos`. A sessao temporaria criada apos validar o
codigo tem validade propria, definida em `PORTAL_CONFIG.validadeSessaoMinutos`.

Na configuracao atual:

- codigo: 10 minutos;
- sessao: 120 minutos.

O front-end salva o token apenas em `sessionStorage`, para restaurar a tela ao
atualizar a mesma aba do navegador. Quando a sessao expira no Apps Script, o
portal limpa o token local e pede novo codigo.

## Desempenho

A tela "Minha situacao" possui cache curto no Apps Script, definido por
`PORTAL_CONFIG.cacheMinhaSituacaoSegundos`. Na configuracao atual, o cache dura
120 segundos.

A sessao oficial resolvida pelo GEAPA-CORE tambem possui cache curto no Apps
Script, definido por `PORTAL_CONFIG.cacheSessaoCoreSegundos`. Na configuracao
atual, o cache dura 180 segundos e evita chamadas repetidas a
`corePortalResolverUsuarioAtual` dentro do mesmo fluxo.

Esse cache reduz chamadas repetidas ao GEAPA-CORE quando o membro atualiza a
pagina ou quando o portal recarrega a mesma tela em seguida. Ele nao substitui a
validacao de sessao: antes de ler o cache, o Apps Script valida o token
temporario.

O backend tambem pode enviar `meta.desempenho` com:

- `origemDados`: `geapa-core`, `fallback-local` ou `cache`;
- `tempoMs`: tempo aproximado de processamento no Apps Script;
- `cacheMinhaSituacaoSegundos`: duracao configurada para o cache.

Nas acoes `validarCodigo` e `portalLogin`, o backend tambem retorna
`meta.desempenho` para medir a resolucao da sessao inicial. O front-end aplica
`data.sessao` imediatamente e carrega "Minha situacao" em uma etapa seguinte.

O front-end registra esses tempos no console do navegador apenas para
diagnostico local, sem exibir informacoes tecnicas ao membro.

## Diagnostico interno de cadastro

Para descobrir se um cadastro esta sendo encontrado pelo `GEAPA_CORE`, pelo
fallback `PORTAL_MEMBROS_TESTE_JSON` ou se nao foi encontrado, use a funcao
manual:

```text
portalRunDiagnosticoCadastro
```

Antes de executar, configure a Script Property privada
`PORTAL_DIAGNOSTICO_IDENTIFICADOR` com o e-mail ou RGA de teste. A funcao
retorna apenas diagnostico mascarado, como origem do cadastro, e-mail mascarado,
RGA mascarado, status de envio de e-mail e se o e-mail cadastrado esta liberado
em `PORTAL_EMAILS_TESTE` quando o ambiente estiver em modo de teste.

Erros futuros deverao usar codigos estaveis, sem expor detalhes sensiveis ao
front-end.
