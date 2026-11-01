# PWA do Portal GEAPA

O Portal GEAPA possui uma configuracao PWA leve para permitir instalacao como
semiapp em celulares e desktops compativeis.

## Escopo

- Manifesto PWA em `web/manifest.json`.
- Icones em `web/assets/icons/`.
- Registro do service worker em `web/assets/js/pwa.js`.
- Service worker em `web/service-worker.js`.
- Botao "Instalar app" exibido somente quando o navegador permitir.

## Regra de seguranca

O PWA cacheia apenas a interface publica e assets estaticos. Dados pessoais e
respostas do backend nao devem ser armazenados no cache do service worker.

Cache permitido:

- HTML publico;
- CSS;
- JavaScript da interface;
- manifesto;
- icones.

Cache proibido:

- chamadas ao Apps Script;
- respostas de "Minha situacao";
- tokens de sessao;
- Firebase Auth;
- dados de membros.

## Estrategia de cache

- Navegacao HTML: `network-first`, com fallback para `index.html` em cache.
- Assets estaticos: `cache-first`.
- Requisicoes `POST`: ignoradas pelo service worker.
- Requisicoes para outros dominios: ignoradas pelo service worker.

## Testes recomendados

- Abrir `https://portal-geapa.web.app` no Chrome Android e instalar.
- Abrir pelo icone instalado e confirmar que a tela inicial carrega.
- Entrar com Google e abrir "Minha situacao".
- Clicar em "Sair".
- Desligar a internet e reabrir o app.
- Confirmar que dados sensiveis do membro nao aparecem offline depois de sair.
- Voltar a internet e confirmar que login e Atividades continuam funcionando.

No iPhone/iPad, a instalacao geralmente ocorre pelo Safari em
**Compartilhar > Adicionar a Tela de Inicio**.
