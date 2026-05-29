# AGENTS.md

Diretrizes permanentes para desenvolvimento do Sistema GEAPA neste repositorio.

## Prioridade principal

Antes de criar novas funcionalidades, avaliar o impacto de performance. O Portal GEAPA deve continuar leve, responsivo e previsivel para membros e diretorias.

Metas de performance:

- Pagina inicial: 1,5 a 3 s.
- Aba Atividades: 1 a 2,5 s.
- Detalhes de atividade: 0,5 a 1,5 s.
- Troca entre telas ja carregadas: instantanea ou quase instantanea.

## Arquitetura obrigatoria

- GitHub Pages e apenas front-end estatico: HTML, CSS, JavaScript, assets publicos e chamadas genericas para API.
- Apps Script e o backend/API: autenticacao, permissoes, leitura, escrita, logs, envio de e-mails e integracao com modulos GEAPA.
- Google Sheets e banco interno do sistema, nao a interface principal de operacao.
- O navegador nunca deve acessar planilhas, IDs sensiveis, tokens ou regras criticas diretamente.
- Toda autorizacao real deve ser validada no Apps Script, mesmo que o front-end esconda botoes por perfil.

## Performance e dados

- Priorizar views `PORTAL_*` para leitura rapida pelo Portal.
- Evitar cruzamentos pesados em tempo real no Apps Script.
- Preferir dados ja materializados, normalizados e seguros para consumo do front-end.
- Reduzir chamadas ao backend: carregar dados em blocos uteis e reutilizar respostas ja obtidas.
- Usar cache no front-end e no Apps Script quando fizer sentido, com invalidez clara.
- Em Apps Script, usar leitura e escrita em lote sempre que possivel.
- Evitar abrir muitas planilhas, percorrer abas inteiras repetidamente ou buscar detalhes linha a linha sem cache.

## Seguranca e integridade

- Nao alterar producao sem instrucao explicita.
- Nao incluir dados reais sensiveis, e-mails em massa, RGAs, IDs privados, tokens ou chaves no repositorio.
- Nao remover views existentes sem migracao documentada.
- Em escritas sensiveis, usar `LockService` para evitar concorrencia.
- Registrar acoes relevantes no backend quando houver escrita, alteracao de permissao ou decisao administrativa.
- Membro comum deve receber apenas os proprios dados.
- Permissoes de diretoria, secretaria, presidencia e demais funcoes devem ser aplicadas no backend.

## Evolucao do portal

- Preservar o que ja funciona antes de refatorar.
- Fazer mudancas pequenas, testaveis e documentadas.
- Manter compatibilidade com GitHub Pages.
- Preferir interfaces simples, responsivas e sem dependencias externas desnecessarias.
- Separar codigo de configuracao, API, autenticacao, UI e modulos funcionais.
- Documentar contratos de API, fluxos relevantes e decisoes de arquitetura.

## Documentacao

Documentar mudancas relevantes em `README.md` ou em `docs/`, especialmente quando envolver:

- novos endpoints;
- mudanca de contrato de API;
- nova view `PORTAL_*`;
- nova regra de permissao;
- alteracao de fluxo operacional;
- migracao entre bases ou abas;
- impacto esperado em performance.
