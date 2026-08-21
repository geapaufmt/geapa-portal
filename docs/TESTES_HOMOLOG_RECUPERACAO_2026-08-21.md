# Testes HOMOLOG da recuperacao de 2026-08-21

## Estado publicado

- Backend Portal HOMOLOG: versao 104.
- Core: versao 24 (`9b2d3cd`).
- Membros: versao 9 (`f2a76e8`).
- Atividades: versao 20 (`e22a4b0`).
- Backend e dados resolvidos como `DEV`.
- PROD permanece no Portal 100 e nao faz parte destes testes.

O frontend HOMOLOG deve ser publicado a partir da branch
`recuperacao-live-2026-07-30`, gerando `config.js` com o perfil `homolog`.

## Verificacoes automatizadas locais

No repositorio `geapa-portal`:

```powershell
npm run check:configs
npm run check:auth-fast-path
npm run test:minha-situacao-route
npm run test:profile-modal
npm run test:profile-correction-submit
npm run test:profile-correction-ack
npm run test:profile-homolog
npm run test:profile-prod
npm run test:v2-environment
npm run test:vinculo-v2
npm run test:egress-feedback
npm run test:member-registration
```

Nos demais repositorios:

```powershell
# geapa-core
node tests/core_domain_resolver.test.cjs
node tests/core_member_profile_v2.test.cjs
node tests/core_normative_parameters.test.cjs
node tests/core_portal_session_environment.test.cjs

# geapa-membros
npm test

# geapa-atividades
node tests/atividades_v2_environment.test.cjs
```

Todos devem terminar com exit code zero.

## Smoke test da API

Abrir a URL HOMOLOG do Apps Script sem parametros. O retorno esperado contem:

- `ok: true`;
- `code: PORTAL_API_OK`;
- `meta.ambiente: DEV`;
- as acoes `adminCorrecoesCadastraisAprovarAplicar`,
  `adminIngressosMembrosCadastrar`, `avaliacaoEgressoConsultar` e
  `avaliacaoEgressoResponder`.

Nao usar `solicitarCodigo` durante smoke automatizado, pois essa acao pode enviar
e-mail.

## Roteiro manual no frontend HOMOLOG

Use exclusivamente contas e registros de teste autorizados na base DEV. Registre
resultado, horario, usuario de teste e protocolo retornado, sem copiar dados pessoais
para issues ou logs publicos.

### 1. Ambiente e autenticacao

1. Abrir o canal HOMOLOG e confirmar o selo `HOMOLOG`.
2. Entrar com uma conta de teste autorizada.
3. Confirmar que Minha Situacao e Meu Perfil exibem somente dados DEV.
4. Encerrar a sessao, reutilizar um token expirado e confirmar rejeicao segura.

### 2. Core e correcoes cadastrais

1. Alterar um campo diretamente editavel de uma pessoa de teste.
2. Confirmar normalizacao e persistencia apenas na fonte DEV.
3. Criar solicitacao de correcao de campo sensivel.
4. Como administrador de teste, executar separadamente:
   - solicitar complemento;
   - indeferir outra solicitacao;
   - aprovar e aplicar uma terceira solicitacao.
5. Na aprovacao, confirmar que a UI usa a operacao unica
   `aprovar-aplicar` e que nao deixa a solicitacao apenas como `APROVADA`.
6. Repetir a mesma chave/idempotencia e confirmar que nao ha escrita duplicada.

### 3. Cadastro de membros

1. Abrir Gestao do GEAPA > Membros e carregar os catalogos.
2. Executar um cadastro rapido com identidade sintetica de teste.
3. Executar um cadastro completo com telefone, data, Instagram e origem validos.
4. Confirmar telefone canonico `+55...`, data `AAAA-MM-DD` e Instagram normalizado.
5. Repetir com telefone, data futura e Instagram invalidos; todos devem ser
   rejeitados sem criar pessoa, vinculo ou ingresso.
6. Reenviar a mesma requisicao e confirmar idempotencia.
7. Nao processar a fila de e-mails, salvo se houver caixa de teste e autorizacao
   especifica.

### 4. Avaliacao de egresso

1. Abrir um convite DEV em estado `ENVIADO` e enviar uma unica resposta.
2. Reabrir o mesmo token e confirmar `CONVITE_AVALIACAO_RESPONDIDO`.
3. Testar convites `CANCELADO`, `ERRO_ENVIO`, `PENDENTE_ENVIO`, expirado e token
   inexistente; nenhum pode registrar avaliacao.
4. Confirmar que a resposta e a tela nao expõem ID de pessoa, RGA ou e-mail.

### 5. Atividades

1. Carregar calendario, detalhe, frequencia, apresentacoes e justificativas.
2. Confirmar nos diagnosticos que o ambiente e `DEV`.
3. Com perfil autorizado, criar uma atividade sintetica e repetir a requisicao para
   conferir idempotencia.
4. Validar chamada, justificativa e material usando apenas registros DEV.
5. Executar os diagnosticos publicos corrigidos e confirmar:
   - diagnostico generico sem ambiente falha fechado;
   - diagnostico generico com `DEV` usa DEV;
   - wrappers com sufixo `Dev` continuam em DEV mesmo se receberem `PROD`.
6. Nao executar processadores de e-mail, triggers ou sincronizacoes Firestore sem
   autorizacao especifica.

### 6. Permissoes e regressao

1. Membro comum nao deve acessar rotas administrativas.
2. Administrador sem a permissao especifica deve receber `PERMISSAO_NEGADA`.
3. Atualizar a pagina durante uma submissao e confirmar resposta recuperavel, sem
   duplicidade.
4. Testar viewport desktop e celular e recarregamento com service worker ativo.

## Criterio de aprovacao

HOMOLOG somente pode ser aprovado quando:

- todos os testes automatizados estiverem verdes;
- todos os fluxos manuais acima tiverem evidencia;
- nenhuma leitura ou escrita PROD aparecer nos logs;
- nao houver envio de e-mail real, trigger ou Firestore fora do escopo aprovado;
- idempotencia e permissoes estiverem confirmadas;
- os responsaveis funcionais aprovarem ingresso, egresso, perfil e atividades.

## Rollback

Se houver falha bloqueante:

1. retornar somente o deployment HOMOLOG do Portal para a versao 103;
2. restaurar o frontend HOMOLOG para o release anterior;
3. manter as bibliotecas 24, 9 e 20 publicadas, pois versoes imutaveis nao precisam
   ser apagadas;
4. nao alterar o deployment PROD 100;
5. registrar o caso, corrigir em novo commit e criar novas versoes, sem reutilizar
   numeros ja publicados.
