# Contrato Inicial de Atividades

Este documento descreve o contrato inicial para a tela de Atividades do Portal
GEAPA. O front-end pode usar dados mockados em desenvolvimento, mas o modo real
chama o Apps Script do portal, que valida a sessão e consulta o contrato público
somente leitura do módulo `geapa-atividades`.

A origem atual da leitura real é a base **ATIVIDADES INTERNAS GEAPA v2 - DEV**,
cadastrada no Registry pela key `ATIVIDADES_V2_DB`. A lista usa a aba
`PORTAL_ATIVIDADES_CALENDARIO` e `PORTAL_ATIVIDADES_DETALHES`, sempre em modo
somente leitura.

## Regras gerais

- O GitHub Pages nunca acessa planilhas diretamente.
- O front-end pode esconder botões por perfil, mas a autorização real deve ser
  sempre feita no Apps Script.
- Ações sensíveis como criar atividade, editar atividade, registrar chamada e
  justificar falta permanecem mockadas até existir backend validado.
- Nenhum mock deve conter dados pessoais reais.
- A leitura real de Atividades exige sessão válida do Portal GEAPA.
- O contexto enviado ao módulo usa a sessão oficial calculada pelo GEAPA-CORE:
  `idPessoa`, `perfilPortalEfetivo`, `perfisPortal`, `permissoes`, `email` e
  `rga` legado quando existir. `SECRETARIA` é enviado como `SECRETARIO`;
  `DIRETORIA` ou `PRESIDENCIA` são enviados como `DIRETORIA`; os demais
  usuários seguem como `MEMBRO`.
- O identificador estrutural usado pelo portal é sempre `ID_ATIVIDADE`, no
  padrão `ATV-AAAA-S-NNNN`, por exemplo `ATV-2026-1-0005`.
- IDs antigos como `ID_ATIVIDADE_GLOBAL`, `ID_ATIVIDADE_LOCAL` e
  `ID_ATIVIDADE_V1` não fazem parte do contrato do portal.

## Formato de resposta

Resposta de sucesso:

```json
{
  "ok": true,
  "message": "Operação realizada com sucesso.",
  "data": {}
}
```

Resposta de erro:

```json
{
  "ok": false,
  "errorCode": "PERMISSAO_NEGADA",
  "message": "Você não tem permissão para executar esta ação."
}
```

## Listar atividades

Fluxo preferencial para a primeira renderizacao:

```text
GET /atividades/listar
```

No Apps Script atual, a acao equivalente e:

```text
acao=atividadesListar
token=sessao-temporaria
```

Depois que a lista aparecer, o Portal destaca a proxima atividade e prepara
detalhes em segundo plano de forma progressiva: primeiro itens prioritarios e
depois cards que entram perto da area visivel durante a rolagem. O bundle
continua existindo como contrato de apoio, mas nao deve bloquear a primeira
renderizacao da aba Atividades. Se um detalhe ainda nao estiver em cache quando
o usuario clicar, o Portal chama `atividadeDetalhe` somente para aquele
`ID_ATIVIDADE`.

Contrato lógico:

```text
GET /atividades/listar
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadesListar
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
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
      "statusPublico": "REALIZADA",
      "eixoTematicoPrincipal": "Direito Penal",
      "eixoTematicoSecundario": "Criminologia",
      "nomePessoaPrincipalPublico": "Nome publico",
      "papelPessoaPrincipal": "Apresentador",
      "tipoPessoaPrincipal": "Membro",
      "qtdApresentacoes": 1,
      "resumoApresentacoesPublico": "Resumo curto das apresentacoes.",
      "possuiApresentacoes": true,
      "ehApresentacao": true,
      "visibilidadePortal": "MEMBROS",
      "podeVerDetalhes": true,
      "podeJustificarFalta": false,
      "podeRegistrarChamada": true,
      "podeEditar": true
    }
  ]
}
```

## Detalhar atividade

Contrato lógico:

```text
GET /atividades/detalhe?idAtividade=ATV-2026-1-0005
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadeDetalhe&idAtividade=ATV-2026-1-0005
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
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
      "eixoTematicoPrincipal": "Direito Penal",
      "eixoTematicoSecundario": "Criminologia",
      "nomePessoaPrincipalPublico": "Nome publico",
      "papelPessoaPrincipal": "Apresentador",
      "tipoPessoaPrincipal": "Membro",
      "qtdApresentacoes": 1,
      "resumoApresentacoesPublico": "Resumo curto das apresentacoes.",
      "apresentacoesPublicas": [
        {
          "idApresentacao": "APR-2026-1-0001",
          "nomeApresentadorPublico": "Nome publico",
          "tituloApresentacao": "Titulo publico",
          "eixoTematicoPrincipal": "Direito Penal",
          "eixoTematicoSecundario": "Criminologia",
          "statusApresentacao": "PUBLICADA",
          "statusArquivoPublico": "PUBLICO",
          "linkPublico": "https://example.org/material"
        }
      ],
      "envolvidosPublicos": [
        {
          "nomePublico": "Nome publico",
          "papel": "Apresentador",
          "tipoPessoa": "Membro"
        }
      ],
      "linkMaterialPublico": "",
      "linkAtaPublica": "",
      "linkFotosPublico": ""
  }
}
```

## Apresentacoes dentro de atividades

Atividades sao o eixo central do contrato. O Portal nao consome uma view
paralela de apresentacoes. A lista, os cards e o historico usam o payload de
`PORTAL_ATIVIDADES_CALENDARIO`; o modal/detalhe usa
`PORTAL_ATIVIDADES_DETALHES`.

Campos minimos esperados na lista/calendario:

- `eixoTematicoPrincipal`
- `eixoTematicoSecundario`
- `nomePessoaPrincipalPublico`
- `papelPessoaPrincipal`
- `tipoPessoaPrincipal`
- `qtdApresentacoes`
- `resumoApresentacoesPublico`
- `possuiApresentacoes`
- `ehApresentacao`

Campos minimos esperados no detalhe:

- `apresentacoesPublicas`
- `envolvidosPublicos`
- `qtdApresentacoes`
- `resumoApresentacoesPublico`
- `linkMaterialPublico`
- `linkAtaPublica`
- `linkFotosPublico`

`apresentacoesPublicas` e `envolvidosPublicos` podem chegar como array seguro ou
JSON serializado; o front-end tenta parsear e, se vier vazio ou invalido, omite
a secao correspondente. A aba de proximas atividades mostra apenas atividades
futuras ou em andamento. O historico e sempre historico de atividades, sem corte
fixo por ciclo no front-end, com filtros de ciclo/semestre, tipo/subtipo,
somente apresentacoes e eixo tematico. Um filtro por pessoa
principal/apresentador esta previsto para fase futura.

`Minhas apresentacoes` tambem e derivado dos detalhes de atividades. O backend
filtra por `idPessoa`, `rga` ou e-mail conforme contexto oficial da sessao e
retorna somente campos publicos/sanitizados da apresentacao vinculada.

## Endpoints futuros

- `POST /atividades/criar`
- `POST /atividades/editar`
- `GET /atividades/chamada?idAtividade=ATV-2026-1-0005`
- `POST /atividades/registrar-chamada`
- `POST /atividades/justificar-falta`
- `GET /justificativas/minhas`
- `GET /diretoria/pendencias`

As acoes de chamada operacional ja existem em modo DEV no Web App do portal; os
demais endpoints seguem fora desta entrega.

## Chamada operacional em DEV

O Portal usa duas acoes para o registro de chamada na base Atividades v2 DEV:

```text
acao=atividadeChamada
token=sessao-temporaria
idAtividade=ATV-2026-1-0005
```

```text
acao=atividadeSalvarChamada
token=sessao-temporaria
payload={...json...}
```

O front-end exibe o botao "Registrar chamada" quando o perfil visual permitir
e a atividade for elegivel para chamada (`podeRegistrarChamada`, `contaPresenca`
ou `contaFalta`). Essa regra e apenas de interface. A autorizacao real continua
no Apps Script e no modulo `geapa-atividades`, usando a sessao e as permissoes
do usuario.

O payload de salvamento e enviado em lote, com `registros` para membros e
`externos` para convidados/externos ja presentes na chamada retornada pelo
backend. O Portal nao escreve diretamente em planilhas.

Cada participante retornado pelo backend deve priorizar `idPessoa` como chave
tecnica da pessoa. O campo `rga` continua aceito como apoio legado e para
conferencia humana, mas nao deve ser a chave estrutural de novas rotinas. O
Portal preserva os dois campos no payload de salvamento para manter
compatibilidade durante a migracao:

```json
{
  "tipoParticipante": "MEMBRO",
  "idPessoa": "PES-0001",
  "rga": "202311801000",
  "nome": "Nome do membro",
  "statusPresenca": "PRESENTE_PRESENCIAL",
  "codigoPresenca": "P",
  "observacoes": ""
}
```

O campo `operacao` controla o estado operacional:

- `SALVAR`: grava ou atualiza registros e deixa a chamada como salva;
- `FINALIZAR`: grava registros e marca a chamada como finalizada;
- `REABRIR`: reabre uma chamada finalizada para ajustes autorizados.

Quando a chamada esta finalizada, o front-end troca o botao da lista para
"Visualizar chamada" e abre a tela em modo somente leitura. O status operacional
fica registrado em `Portal_Acoes`; os registros de presenca continuam em
`Atividades_Presencas_Registros`.

## Integração atual do portal

O Apps Script do portal chama o módulo `geapa-atividades` como biblioteca
`GEAPA_ATIVIDADES`, em modo de desenvolvimento nesta fase. As ações públicas do
Web App são:

- `atividadesBundle`
- `atividadesListar`
- `atividadesDetalhesPreload`
- `atividadeDetalhe`
- `atividadeChamada`
- `atividadeSalvarChamada`

Ambas validam a sessão temporária do portal antes de consultar atividades.
Para melhorar a primeira renderização, o Portal chama `atividadesBundle` como
preferência. Se o bundle V2 ainda não existir no módulo de atividades, o backend
retorna um fallback leve com a lista e `detalhesPorId` vazio; detalhes devem ser
carregados por preload posterior ou sob demanda ao abrir uma atividade.

## Validações obrigatórias no backend futuro

- sessão válida;
- membro ou diretor localizado;
- perfil autorizado;
- ação permitida para o status da atividade;
- prazo válido, quando houver;
- lock para evitar concorrência;
- log de ação;
- retorno estruturado e sem dados desnecessários.
## Checagens manuais do Portal

Antes de publicar uma mudanca nessa integracao, validar:

- card de atividade comum sem apresentacao nao exibe campos vazios de eixo ou
  apresentador;
- card com uma apresentacao mostra indicacao visual, apresentador, titulo/resumo
  e eixo quando disponiveis;
- card com multiplas apresentacoes mostra quantidade, resumo curto e acesso ao
  detalhe;
- modal sem `apresentacoesPublicas` nao mostra secao de apresentacoes;
- modal com uma apresentacao usa o titulo "Apresentacao vinculada";
- modal com multiplas apresentacoes usa o titulo "Apresentacoes vinculadas";
- historico mostra todas as atividades e aceita filtro por tipo/subtipo;
- historico aceita filtro "Somente apresentacoes";
- historico aceita filtro por eixo tematico;
- historico aceita filtro por ciclo/semestre quando o payload trouxer esses
  campos ou quando for possivel derivar o semestre pela data;
- `apresentacoesPublicas` em JSON serializado invalido ou vazio nao quebra a
  tela;
- busca por dependencias ativas nao deve encontrar consumo de view paralela de
  apresentacoes no Portal.

## Cache e medicao de performance

O front-end guarda a lista leve e os detalhes ja carregados em `sessionStorage`
por TTL curto de 5 minutos, usando uma chave derivada da sessao atual. Dentro
desse periodo:

- abrir a aba Atividades novamente nao deve chamar o backend;
- clicar em uma atividade com detalhe ja carregado nao deve chamar
  `/atividades/detalhe`;
- se um detalhe nao veio no cache, o portal ainda usa
  `/atividades/detalhe` como fallback e atualiza o cache local.

Para medir antes/depois, abrir o console do navegador e filtrar por:

```text
GEAPA-PORTAL-PERF
```

Eventos principais:

- `atividades.lista.renderizada`: tempo ate a primeira renderizacao da lista;
- `atividades.aba.cache`: tempo ao reabrir a aba usando cache local;
- `atividades.detalhes.preload`: tempo de preload dos detalhes;
- `atividades.detalhe.preload_unitario`: detalhe carregado em segundo plano por
  prioridade ou rolagem;
- `atividades.lista.falhou`: erro ao carregar o calendario inicial;
- `atividades.detalhe.cache`: abertura de detalhe sem nova chamada;
- `atividades.detalhe.fallback_backend`: detalhe carregado pelo endpoint antigo;
- `atividades.chamada.carregada`: abertura da tela de registro de chamada;
- `atividades.chamada.salva`: salvamento ou finalizacao da chamada.

Quando a API retornar `meta.desempenho`, os eventos tambem registram:

- `tempoBackendMs`: tempo informado pelo Apps Script;
- `origemBackend`: origem informada pelo backend, como `geapa-atividades-bundle`,
  `fallback-lista`, `geapa-atividades-chamada` ou `cache`.
