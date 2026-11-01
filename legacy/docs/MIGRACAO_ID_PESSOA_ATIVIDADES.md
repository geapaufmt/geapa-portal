# Migracao Para ID_PESSOA Em Atividades

## Decisao

Novas rotinas de atividades, apresentacoes, chamadas, justificativas,
certificados e participacoes devem usar `ID_PESSOA` como chave tecnica
principal. `RGA` permanece como campo auxiliar, legado e de conferencia humana.

Essa decisao evita que o sistema dependa de um identificador que atende bem a
discentes, mas nao cobre corretamente docentes, colaboradores, externos,
egressos, pessoas sem RGA ou historicos com mudanca de vinculo.

## Impacto No Portal

O Portal deve consumir `idPessoa` quando ele vier do backend e repassa-lo em
payloads operacionais. O campo `rga` continua sendo enviado em paralelo durante
a migracao para preservar compatibilidade com endpoints atuais.

O Portal nao deve resolver `ID_PESSOA` lendo planilhas. Essa resolucao pertence
ao GEAPA-CORE e aos modulos de backend.

## Impacto Em Geapa-Atividades

O modulo `geapa-atividades` deve:

- incluir `ID_PESSOA` nas views `PORTAL_*` de atividades, chamadas,
  apresentacoes, justificativas, certificados e participacoes;
- resolver dados legados por RGA, e-mail ou nome apenas no backend;
- manter `RGA` como campo de apoio enquanto houver dados historicos;
- gravar novos registros com `ID_PESSOA` sempre que possivel;
- validar autorizacao real por sessao/permissao, nao por identificador enviado
  pelo navegador;
- evitar expor `RGA`, e-mail e observacoes internas em respostas publicas.

## Prompt Para Geapa-Atividades/Core

```text
Estamos migrando as rotinas de atividades/apresentacoes/chamadas do Portal
GEAPA para usar ID_PESSOA como chave tecnica principal, mantendo RGA apenas
como campo legado e de conferencia.

Objetivo:
- Atualizar geapa-atividades para que chamadas, apresentacoes, justificativas,
  certificados e participacoes usem ID_PESSOA sempre que disponivel.
- Manter compatibilidade temporaria com registros antigos baseados em RGA.
- Nao expor dados sensiveis ao Portal.

Regras:
- O navegador nao deve resolver ID_PESSOA lendo planilhas.
- A resolucao RGA/e-mail/nome -> ID_PESSOA deve ocorrer no GEAPA-CORE ou no
  backend autorizado.
- Novas views PORTAL_* devem retornar idPessoa como identificador principal.
- RGA pode continuar no retorno apenas quando for necessario para contexto
  interno ou conferencia, nunca como chave estrutural nova.
- Escritas novas devem gravar ID_PESSOA e, se necessario, RGA legado em coluna
  auxiliar.
- Autorizacao real continua validada no Apps Script/backend.

Tarefas:
1. Auditar abas/views de geapa-atividades que usam RGA como chave.
2. Adicionar colunas ID_PESSOA onde faltarem, sem remover RGA.
3. Criar ou ajustar resolver central para obter ID_PESSOA via GEAPA-CORE.
4. Atualizar PORTAL_ATIVIDADES_CALENDARIO e endpoints de chamada para retornar
   idPessoa nos participantes.
5. Atualizar payload de salvamento de chamada para priorizar idPessoa e aceitar
   rga como fallback legado.
6. Planejar migracao dos registros historicos com status:
   - RESOLVIDO
   - AMBIGUO
   - NAO_ENCONTRADO
7. Documentar quais campos sao publicos, internos e sensiveis.

Critérios de aceite:
- Participantes de chamada retornam idPessoa quando disponivel.
- Salvamento aceita idPessoa como chave principal.
- RGA continua funcionando como fallback temporario.
- Nenhuma rotina concede acesso apenas porque recebeu idPessoa/rga do front-end.
- Views publicas nao expõem e-mail, RGA ou observacoes sensiveis sem permissao.
```
