# Gestao de Atividades

A rota `Gestao -> Atividades` consome exclusivamente os endpoints Apps Script `/admin/atividades*`. A lista e carregada uma vez e filtrada no navegador; o detalhe e buscado apenas quando uma atividade e aberta.

O front-end nunca decide autorizacao, regras de modelo ou campos editaveis. O backend devolve `camposEditaveis`, bloqueia campos sensiveis e revalida toda mutacao. Depois de salvar, publicar, ocultar, cancelar ou reabrir, o Portal invalida o detalhe em memoria e atualiza a lista automaticamente.

A criacao de atividades pertence a esta tela administrativa. `Proximas atividades` permanece como agenda confirmada e nao exibe botao de criacao. Ao concluir um novo rascunho, a tela de gestao recarrega a listagem sem enviar o registro para a agenda publica.

Campos de eixo tematico no agendamento sao `select` alimentados por `/v2/apresentacoes/eixos`. Texto livre nao e aceito; o modulo Atividades valida novamente o valor contra a base oficial ativa. Para apresentacao de membro, titulo e eixos continuam no fluxo posterior do apresentador.

Para teste visual local, use o `MOCK_MODE` do cliente. Para homologacao integrada, atualize a biblioteca `GEAPA_ATIVIDADES` usada pelo Apps Script do Portal e publique nova versao do web app antes de testar com perfis Secretaria, Diretoria e Admin.
