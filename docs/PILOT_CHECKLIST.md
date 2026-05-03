# Checklist de Piloto do Portal GEAPA

Este checklist orienta a liberação controlada da V1 do Portal GEAPA para um
grupo pequeno de membros-piloto.

## Objetivo do piloto

Validar, com poucos membros, se o portal:

- envia código para o e-mail cadastrado correto;
- restaura sessão ao atualizar a página;
- mostra somente dados do próprio membro;
- exibe informações compreensíveis;
- não expõe dados sensíveis;
- lida bem com sessões expiradas e erros.

## Antes de liberar membros-piloto

- [ ] Confirmar que o GitHub Pages publica apenas a pasta `web/`.
- [ ] Confirmar que o front-end não contém dados reais, tokens ou IDs sensíveis.
- [ ] Confirmar que `API_URL` aponta para a implantação correta do Apps Script.
- [ ] Confirmar que o Apps Script está executando como a conta institucional adequada.
- [ ] Confirmar que `GEAPA_CORE` está configurado como biblioteca.
- [ ] Confirmar se `GEAPA_CORE` ainda está em `developmentMode` ou se já usa versão fixa.
- [ ] Confirmar que `PORTAL_ENVIO_EMAIL_HABILITADO=true`.
- [ ] Revisar `PORTAL_EMAILS_TESTE` com apenas e-mails autorizados para o piloto.
- [ ] Confirmar que `PORTAL_CODIGO_SALT` está configurado fora do repositório.
- [ ] Confirmar que `PORTAL_MEMBROS_TESTE_JSON`, se existir, não contém dados sensíveis desnecessários.
- [ ] Conferir a matriz de dados em `docs/DATA_MATRIX.md`.

## Script Properties esperadas

Configurar no projeto Apps Script do portal:

```text
PORTAL_ENVIO_EMAIL_HABILITADO=true
PORTAL_EMAILS_TESTE=email1@exemplo.org,email2@exemplo.org
PORTAL_CODIGO_SALT=valor-aleatorio-longo
PORTAL_DIAGNOSTICO_IDENTIFICADOR=email-ou-rga-para-teste
```

`PORTAL_MEMBROS_TESTE_JSON` deve ser usado apenas como fallback temporário.

## Testes por membro-piloto

Para cada membro-piloto:

- [ ] Solicitar código usando e-mail cadastrado.
- [ ] Solicitar código usando RGA.
- [ ] Confirmar que o código chega no e-mail cadastrado correto.
- [ ] Validar o código dentro do prazo.
- [ ] Confirmar que a tela "Minha situação" abre.
- [ ] Confirmar que nome, RGA, vínculo e situação geral pertencem ao membro correto.
- [ ] Confirmar que pendências cadastradas fazem sentido.
- [ ] Confirmar que apresentações batem com a fonte oficial.
- [ ] Confirmar que elegibilidade para Diretoria aparece como informação orientativa.
- [ ] Atualizar a página e verificar se a sessão é restaurada.
- [ ] Clicar em "Sair" e confirmar que a sessão local é encerrada.
- [ ] Testar código incorreto e verificar mensagem.
- [ ] Aguardar expiração da sessão, quando possível, e confirmar novo login.

## O que observar

Registrar feedback sobre:

- mensagens difíceis de entender;
- dados exibidos com grafia ou acentuação incorreta;
- campos que geram dúvida;
- informações que parecem sensíveis demais;
- divergências entre portal e planilha oficial;
- lentidão no envio de código ou carregamento da tela;
- comportamento em celular.

## Critérios para ampliar o piloto

Ampliar para mais membros somente se:

- nenhum membro viu dados de outra pessoa;
- nenhum dado sensível fora da matriz foi exibido;
- códigos foram enviados ao e-mail cadastrado correto;
- a restauração de sessão funcionou sem criar acesso permanente;
- as mensagens de erro foram compreensíveis;
- a Diretoria revisou a lista de campos exibidos.

## Critérios para pausar o piloto

Pausar se ocorrer qualquer um destes casos:

- membro visualiza dados de outro membro;
- CPF, telefone, data de nascimento, suspensão ou observações internas aparecem;
- código é enviado para e-mail errado;
- sessão permanece válida após sair;
- o Apps Script retorna erro recorrente;
- a fonte oficial do GEAPA-CORE fica inconsistente.

## Próximos passos após piloto

- Consolidar feedback dos membros-piloto.
- Revisar textos públicos.
- Decidir se `GEAPA_CORE` deve sair de `developmentMode`.
- Definir se novos blocos entram na V2, como frequência detalhada ou certificados.
- Revisar política de acesso antes de liberar para todo o grupo.
