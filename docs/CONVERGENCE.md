# Convergência verificada — 01/11/2026

O head oficial anterior (`208c890c67124e298b3933e1b3606c16d03d83af`) não continha a UI efetivamente publicada. A integração parte desse head, preserva sua história e recupera seletivamente as fontes atuais, sem mesclar o PR #33 desatualizado sobre o runtime.

| Ambiente | Hosting | Arquivos verificados |
|---|---|---:|
| PROD | 92c96b8261a219b0 | 111 |
| DEV | 697d5fb589e8d7c6 | 112 |

Os arquivos foram confrontados com a listagem e os hashes do Firebase Hosting, incluindo o hash gzip usado pelo serviço. As três fontes TypeScript do checkpoint atual foram recompiladas e produziram os mesmos módulos publicados. Os demais módulos JavaScript não minificados foram recuperados exatamente do release verificado, organizados em fontes editáveis e comparados byte a byte. A configuração nominal foi extraída para overlay privado; o manifesto público registra hashes sem valores.

O checkpoint de origem mais recente é `0ce48f4`; ele serve como proveniência local, não como dependência do build oficial. A relação completa entre caminho editável e URL está em `config/assets.json`. São preservados login persistente, menu contextual, cards administrativos, Design System, detalhes, Apresentações, Frequência, Membros e integração Gen2/Storage.

## PRs anteriores

| PR | Tratamento |
|---|---|
| Portal #33 / Core #25 | Checkpoints de outubro superados pelas fontes publicadas verificadas; preservar branches e encerrar após a nova integração. |
| Portal #32 / Core #24 | Aprovação cadastral sobre Apps Script/Sheets; não mesclar ao executor canônico. Preservar como referência histórica, sem afirmar equivalência integral de todos os detalhes. |
| Portal #26 | Visualização de estados terminais existe no frontend atual; preservar histórico do PR sem restaurar sua implementação antiga. |
| Portal #28/#29 | Localidades e cadastro administrativo estão nos consumidores canônicos atuais; catálogos e permissões permanecem definidos pelo Core. Não importar flags/contratos Sheets. |
| Portal #30 | Integração/PWA da cadeia legada superada; seus deploys e Libraries não se aplicam ao Portal atual. |
| Portal #27 / Membros #19 | Avaliação de egressos e comunicação externa não foram declaradas portadas. Manter propostas preservadas para decisão e adaptação futura; não ativar o fluxo legado. |
| Membros #20 | Ingresso sobre Sheets superado pelo contrato canônico; preservar branch, não integrar segunda autoridade. |
| Membros #21 / Atividades #1 | Documentação de compatibilidade atualizada, sem mudança de código operacional. |

A revisão incluiu heads e arquivos alterados, não apenas os títulos dos PRs. Nenhuma campanha institucional foi reexecutada. PRs encerrados não têm suas branches apagadas. O código de recuperação dos módulos legados permanece preservado.

## Limites

Não houve deploy, mudança de dados, policy, identidade, IAM ou configuração remota de Firebase. Os workflows antigos foram substituídos por CI sem publicação; não houve desativação pela API. Os testes físicos anteriores são reutilizados porque os bytes entregues permanecem iguais. Esta campanha valida rastreabilidade e build, não inventa nova homologação de negócio.
