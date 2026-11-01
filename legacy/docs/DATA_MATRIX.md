# Matriz de Dados do Portal GEAPA

Este documento registra quais dados podem aparecer na tela "Minha situação" e
quais devem permanecer fora do portal. A regra central é simples: o membro só
pode receber dados sobre si mesmo, filtrados pelo Apps Script e pelo
GEAPA-CORE.

## Regra de decisão

Antes de adicionar qualquer campo ao portal, verificar:

- o dado é necessário para a experiência do membro?
- o dado é objetivo ou depende de interpretação da Diretoria?
- o dado pertence somente ao membro autenticado?
- o dado pode ser mostrado sem contexto privado?
- o GEAPA-CORE já possui uma fonte confiável para esse campo?
- o front-end recebe apenas o mínimo necessário?

Se a resposta não for clara, o dado deve ficar fora da V1.

## Dados exibidos na V1

| Campo ou bloco | Origem prevista | Aparece no portal? | Sensibilidade | Observação |
| --- | --- | --- | --- | --- |
| Nome de exibição | GEAPA-CORE / Membros Atuais | Sim | Baixa | Identificação básica do próprio membro. |
| RGA | GEAPA-CORE / Membros Atuais | Sim | Média | Usado como identificação acadêmica do próprio membro. |
| Vínculo ou função atual | GEAPA-CORE / Membros Atuais | Sim | Baixa | Exibido como vínculo institucional. |
| Situação geral | GEAPA-CORE / Membros Atuais | Sim | Média | Deve ser resumida e objetiva. |
| Pendências cadastrais | GEAPA-CORE / Membros Atuais | Sim | Média | Apenas pendências objetivas e amigáveis. |
| Quantidade de apresentações | GEAPA-CORE / Membros Atuais | Sim | Baixa | Usa a quantidade consolidada retornada pelo core. |
| Período da última apresentação | GEAPA-CORE / Membros Atuais | Sim | Baixa | Exibe o período consolidado retornado pelo core. |
| Elegibilidade para Diretoria | GEAPA-CORE / Membros Atuais | Sim | Média | Informação orientativa; decisão final continua sendo da Diretoria. |
| Data limite estimada para Diretoria | GEAPA-CORE / Membros Atuais | Sim | Média | Texto exibido como estimativa, não decisão final. |

## Dados fora da V1

| Campo ou bloco | Origem prevista | Aparece no portal? | Sensibilidade | Motivo |
| --- | --- | --- | --- | --- |
| CPF | PESSOAS / Membros Atuais | Não | Alta | Dado pessoal sensível para o contexto do portal. |
| Telefone | PESSOAS / Membros Atuais | Não | Alta | Não é necessário para "Minha situação". |
| E-mail completo | GEAPA-CORE / Membros Atuais | Não | Média | Usado no backend para envio de código; no front-end, no máximo mascarado. |
| Data de nascimento | PESSOAS / Membros Atuais | Não | Alta | Dado pessoal desnecessário para a V1. |
| Instagram | PESSOAS / Membros Atuais | Não | Média | Dado de contato/rede social fora do escopo. |
| Cidade natal e UF | PESSOAS / Membros Atuais | Não | Média | Não é necessário para a tela atual. |
| Sexo | PESSOAS / Membros Atuais | Não | Média | Fora do escopo da V1. |
| Histórico de atividades acadêmicas | PESSOAS / Membros Atuais | Não | Alta | Texto livre, pode conter contexto privado ou sensível. |
| Flag de suspensão | PESSOAS / Membros Atuais | Não | Alta | Informação sensível; não exibir sem política específica. |
| Motivos de suspensão ou desligamento | Fontes futuras | Não | Alta | Fora do escopo e exige governança própria. |
| Observações internas da Diretoria | Fontes futuras | Não | Alta | Nunca devem ser expostas ao membro sem revisão específica. |
| Frequência detalhada | Fontes futuras | Não | Média | Aguardando contrato oficial e regra de cálculo. |
| Lista de presença | Fontes futuras | Não | Média | Aguardando contrato oficial; pode expor eventos e detalhes internos. |
| Certificados | Fontes futuras / Drive | Não | Média | Exige integração segura com arquivos e permissões. |

## Pendências permitidas

Na V1, as pendências devem ser apenas cadastrais ou administrativas objetivas:

- e-mail cadastrado ausente ou inválido;
- RGA não informado;
- nome de exibição não informado;
- vínculo cadastral indefinido;
- situação geral indefinida.

Não incluir:

- pendências disciplinares;
- observações internas;
- avaliações subjetivas;
- justificativas de suspensão ou desligamento;
- documentos sem fonte oficial objetiva e não sensível.

## Responsabilidade por camada

| Camada | Responsabilidade |
| --- | --- |
| GitHub Pages | Renderizar a interface pública e chamar a API. |
| Apps Script do portal | Validar sessão, chamar o GEAPA-CORE e devolver somente o necessário. |
| GEAPA-CORE | Ler fontes oficiais, normalizar contrato e filtrar dados do próprio membro. |
| Google Sheets/Drive | Armazenar dados oficiais; nunca são acessados diretamente pelo navegador. |

## Antes de adicionar novo campo

Registrar neste documento:

1. nome do campo;
2. origem oficial;
3. finalidade na tela;
4. sensibilidade;
5. regra de exibição;
6. motivo para incluir ou manter fora.
