# Arquitetura do Portal GEAPA

Este documento descreve a separacao entre o front-end publico hospedado no
GitHub Pages e o backend privado mantido no ecossistema Google do GEAPA.

## Papel do GitHub Pages

O GitHub Pages hospeda somente a interface estatica do portal:

- HTML;
- CSS;
- JavaScript da interface;
- manifesto PWA;
- textos institucionais;
- imagens, icones e arquivos publicos.

O GitHub Pages nao deve armazenar dados reais de membros, listas internas,
planilhas, tokens, chaves ou regras criticas de autorizacao.

## Papel do Apps Script

O Google Apps Script funciona como API/backend do portal. Ele sera responsavel
por:

- receber chamadas do front-end;
- validar identidade e sessao;
- validar permissoes;
- enviar codigos de acesso por e-mail;
- consultar dados oficiais do GEAPA;
- filtrar no backend quais dados podem ser retornados;
- devolver ao navegador apenas o minimo necessario para a tela solicitada.

## Onde ficam os dados reais

Os dados oficiais do GEAPA devem permanecer no ecossistema Google da conta
institucional:

- **Google Sheets:** dados oficiais estruturados;
- **Google Drive:** documentos, arquivos e recursos institucionais;
- **Gmail:** envio de codigos e avisos;
- **Apps Script:** regras de acesso, validacao e orquestracao.

O navegador nunca deve acessar diretamente planilhas oficiais ou arquivos
privados. Toda consulta deve passar pelo Apps Script.

## Fluxo de login por codigo

Fluxo previsto para etapa futura:

1. O membro informa e-mail ou RGA no portal.
2. O front-end chama o endpoint do Apps Script para solicitar codigo.
3. O Apps Script localiza o cadastro oficial do membro.
4. O Apps Script gera um codigo temporario com expiracao.
5. O Apps Script envia o codigo ao e-mail cadastrado.
6. O membro informa o codigo no portal.
7. O front-end chama o endpoint de validacao.
8. O Apps Script valida codigo, expiracao e tentativas.
9. O Apps Script emite uma sessao ou token temporario.

Nesta etapa, o fluxo ja envia codigos reais, mas somente para e-mails
autorizados em `PORTAL_EMAILS_TESTE`.

## Fluxo da tela "Minha situacao"

Fluxo atual e previsto:

1. O front-end envia ao Apps Script a sessao temporaria do membro.
2. O Apps Script valida a sessao.
3. O Apps Script identifica o membro associado a sessao.
4. O Apps Script tenta consultar `geapaCoreBuscarMinhaSituacaoParaPortal` no
   GEAPA-CORE.
5. O Apps Script filtra os dados no backend.
6. O Apps Script retorna somente dados do proprio membro.
7. O front-end renderiza a tela "Minha situacao".

Na fase atual, o portal ja tenta usar o contrato oficial do GEAPA-CORE para a
tela "Minha situacao". Esse contrato pode retornar pendencias cadastrais,
administrativas objetivas, um resumo de apresentacoes e informacoes orientativas
de elegibilidade para Diretoria do proprio membro. Se o contrato ainda nao
estiver disponivel no ambiente ou nao encontrar o membro, o portal usa o
cadastro basico resolvido pelo backend e monta uma resposta parcial local.
Frequencia detalhada, certificados e historico permanecem vazios ou em
preparacao ate que o GEAPA-CORE disponibilize fontes confiaveis para esses
blocos.

O front-end nao deve receber dados de outros membros para filtrar visualmente.

## Desempenho e cache

O ponto mais sensivel de desempenho da V1 e a chamada da tela "Minha situacao",
porque ela pode consultar o GEAPA-CORE e, por consequencia, dados oficiais no
ecossistema Google.

Para reduzir recarregamentos repetidos, o Apps Script usa um cache curto da
resposta ja filtrada do proprio membro. Antes de usar esse cache, o backend
continua validando a sessao temporaria. O cache nao fica no GitHub Pages e nao
substitui regras de autorizacao.

O tempo atual de cache e definido em `PORTAL_CONFIG.cacheMinhaSituacaoSegundos`.
Na configuracao inicial, ele e de 120 segundos.

O front-end registra tempos de resposta no console do navegador para ajudar a
acompanhar se novos blocos da tela estao deixando o portal lento. Esses logs
devem conter apenas tempos, origem da resposta e nome da acao, nunca dados do
membro.

## Integração prevista com GEAPA-CORE

O Portal GEAPA possui uma camada de adaptação em `apps-script/03_membros.gs`.
Essa camada tenta usar as funcoes publicas do GEAPA-CORE antes de recorrer ao
cadastro privado de teste ou ao contrato parcial local.

Contrato esperado da função futura:

```js
geapaCoreBuscarMembroParaPortal(emailOuRga)
geapaCoreBuscarMinhaSituacaoParaPortal(emailOuRga)
```

Retorno esperado:

```json
{
  "id": "identificador-interno",
  "nomeExibicao": "Nome do membro",
  "emailCadastrado": "email-cadastrado",
  "rga": "rga-do-membro",
  "situacaoGeral": "situação resumida",
  "vinculo": "descrição do vínculo"
}
```

O Apps Script do portal deve continuar filtrando os dados no backend e enviando
ao navegador somente os dados do próprio membro.

Na fase atual, o portal aceita três formas de integração:

- função `geapaCoreBuscarMembroParaPortal(emailOuRga)` copiada no mesmo projeto Apps Script;
- biblioteca Apps Script com identificador `GEAPA_CORE`, `GEAPACORE` ou `GEAPA_CORE_LIB`;
- fallback privado `PORTAL_MEMBROS_TESTE_JSON`.

O projeto já declara essa biblioteca no manifesto `apps-script/appsscript.json`
com o identificador `GEAPA_CORE`, usando o mesmo padrão dos demais módulos do
ecossistema GEAPA:

- `libraryId`: script ID público do projeto `geapa-core`;
- `userSymbol`: `GEAPA_CORE`;
- `version`: `0`;
- `developmentMode`: `true`.

Enquanto `developmentMode` estiver ativo, o portal usa a versão de
desenvolvimento do `geapa-core`. Isso facilita os testes iniciais, porque evita
criar uma nova versão da biblioteca a cada ajuste feito no core. Quando o portal
entrar em uso real, o recomendado é trocar para uma versão fixa da biblioteca.

## Regra central

O front-end nunca acessa Google Sheets diretamente. Ele chama apenas endpoints do
Apps Script, e o Apps Script decide o que pode ser devolvido.
