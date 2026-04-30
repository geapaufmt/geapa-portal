# Seguranca do Portal GEAPA

Este documento registra as regras de seguranca que devem orientar o
desenvolvimento do Portal GEAPA.

## Nao versionar dados sensiveis

Nao salvar no repositorio:

- dados reais de membros;
- listas de e-mails;
- RGAs reais;
- frequencia;
- pendencias;
- certificados;
- IDs sensiveis de planilhas;
- tokens;
- chaves privadas;
- codigos de acesso;
- regras criticas de autorizacao que permitam contornar o backend.

## Front-end publico

O GitHub Pages e publico. Portanto, tudo que estiver em `web/` deve ser tratado
como informacao publica.

Pode ficar no front-end:

- layout;
- textos institucionais;
- chamadas genericas para API;
- validacoes leves de formulario;
- manifesto PWA;
- icones e arquivos publicos.

Nao pode ficar no front-end:

- dados reais;
- credenciais;
- IDs sensiveis;
- autorizacoes definitivas;
- filtros que substituam validacao do backend.

## Apps Script como barreira de seguranca

O Apps Script deve:

- validar sessao antes de qualquer consulta real;
- validar identidade do membro;
- validar permissoes;
- aplicar filtros no backend;
- retornar somente os dados permitidos;
- registrar logs relevantes de operacoes sensiveis;
- limitar tentativas de codigo;
- expirar codigos temporarios.

## Envio de codigo por e-mail

Enquanto o portal estiver em desenvolvimento, envio real de codigo deve ficar
restrito a e-mails de teste configurados nas propriedades privadas do Apps
Script.

Nao versionar:

- lista de e-mails de teste;
- salts de hash;
- codigos enviados;
- tokens de sessao.

Codigos temporarios devem expirar rapidamente e nao devem aparecer em logs.

## Regra para membro comum

Um membro comum so pode receber os proprios dados. O backend nunca deve retornar
listas completas de membros para que o navegador filtre depois.

## Diretoria e edicao futura

Painel da Diretoria e edicao de dados estao fora do escopo atual.

Quando essa fase existir, ela devera ter:

- autenticacao mais forte;
- permissao por perfil;
- logs de alteracao;
- identificacao de quem alterou;
- data e hora da alteracao;
- validacoes no backend;
- revisao cuidadosa antes de publicacao.

## Principio de menor exposicao

Cada endpoint deve devolver somente o necessario para a tela atual. Se um dado
nao e necessario para a interface, ele nao deve ser enviado ao navegador.
