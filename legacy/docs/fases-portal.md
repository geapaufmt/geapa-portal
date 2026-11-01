# Fases de Evolução do Portal GEAPA

Este documento organiza a evolução do portal para que ele se torne, aos poucos,
a interface principal de operação do sistema GEAPA.

## Fase atual

O portal possui:

- login por código enviado por e-mail;
- tela "Minha situação";
- integração inicial com GEAPA-CORE;
- cache curto de desempenho;
- documentação de segurança e arquitetura.

## Fase 1: Atividades em modo mock

Objetivo: criar a primeira tela operacional sem escrita real.

Entregas:

- diagnóstico do portal atual;
- camada pública de configuração;
- camada pública de API com `MOCK_MODE`;
- camada simulada de perfil;
- lista de atividades mockada;
- modal de detalhes;
- contrato inicial de API documentado.

Fora do escopo:

- criar atividade real;
- editar atividade real;
- registrar chamada real;
- justificar falta real;
- escrever em planilhas.

## Fase 2: Contrato real de Atividades

Objetivo: preparar dados reais de atividades para leitura no portal.

Entregas previstas:

- inspecionar `geapa-atividades`;
- definir fonte oficial de atividades;
- criar função no `geapa-atividades` para listar atividades do portal;
- criar função no `geapa-atividades` para detalhar uma atividade;
- manter filtros de visibilidade no backend.

## Fase 3: Integração real de leitura

Objetivo: trocar mocks por chamadas reais ao Apps Script para listagem e
detalhes.

Entregas atuais:

- endpoint `atividadesListar`;
- endpoint `atividadeDetalhe`;
- cache curto no Apps Script;
- biblioteca `GEAPA_ATIVIDADES` em modo de desenvolvimento;
- sessão temporária obrigatória para leitura real.

Entregas ainda previstas:

- mensagens de erro estáveis;
- testes com perfis variados.

## Fase 4: Operações controladas

Objetivo: iniciar ações operacionais com escrita real, uma por vez.

Ordem recomendada:

1. criar atividade;
2. editar atividade planejada;
3. registrar chamada;
4. justificar falta;
5. revisar pendências da Diretoria.

Cada ação deve ter autorização no backend, lock, log e documentação própria.

## Fase 5: Pré-lançamento ampliado

Objetivo: testar com mais membros antes de abrir o portal amplamente.

Entregas previstas:

- checklist de implantação atualizado;
- revisão textual completa;
- testes em celular;
- testes de carga simples;
- versão fixa do GEAPA-CORE;
- plano de suporte para membros.
