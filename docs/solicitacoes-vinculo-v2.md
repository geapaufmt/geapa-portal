# Solicitações voluntárias de vínculo V2 no Portal

O Portal é somente consumidor. A sessão é validada no Apps Script, o ambiente
`DEV` ou `PROD` vem de `portalResolverAmbienteDadosV2_()` e o GEAPA Membros
repete identidade e autorização. O navegador nunca envia pessoa ou vínculo
como alvo confiável.

Na primeira entrega, `ENABLE_VINCULO_REQUESTS` fica `true` apenas em
`config.homolog.js` e `false` em PROD. O bloco do membro integra a tela Minha
Situação; apenas a Diretoria/Secretaria autorizada recebe a subárea
Gestão do GEAPA > Membros > Solicitações de vínculo.

## Decisão administrativa e regra de ata

O painel usa `requisitosDecisaoFinal`, retornado pelo detalhe protegido do
Membros, para informar e validar se a referência oficial de ata é obrigatória.
O frontend não presume a regra. Se snapshot e valor vigente divergirem, a
exigência é recalculada apenas depois da escolha explícita entre
`APLICAR_SNAPSHOT` e `APLICAR_VIGENTE`; o backend repete toda a validação.

Para desligamento imediato em `RECEBIDO`, ficam disponíveis tanto "Iniciar
análise" quanto "Deferir, homologar e efetivar desligamento". Para desligamento
de fim de semestre em `RECEBIDO`, o painel permite registrar a análise
preliminar e agendar a decisão final, sem produzir efeito no vínculo. Essas
opções não ampliam permissões: homologação e execução continuam validadas no
backend.

## Conferência manual de validações

O detalhe administrativo apresenta separadamente vínculo, semestre,
apresentação, arquivos, obrigações, função e resultado geral. Estados
`NAO_VERIFICADO`, `PENDENTE`, `ATIVA` ou `CONFLITO` ficam sinalizados para
conferência humana. `NAO_VERIFICADO` não significa função ativa: significa
somente que a integração automática não concluiu a verificação.

Em decisão final com função não resolvida, o Portal exige justificativa
administrativa reforçada e envia `confirmacaoFuncaoRegularizada`. A confirmação
não autoriza ignorar uma função ativa: a pessoa autorizada deve antes confirmar
nas fontes oficiais que ela foi encerrada, substituída ou transferida. Permissão,
override e auditoria continuam sob autoridade do backend.

## Ordem de publicação e estado atual

1. Core mesclado e publicado na versão imutável 19;
2. Membros fixado no Core 20, sem `developmentMode`, e publicado na versão
   imutável 6;
3. manifest do Portal fixado no Core 20 e Membros 7, ambos sem
   `developmentMode`;
4. configurar no snapshot Apps Script HOMOLOG `ambienteDadosV2: DEV` e
   `ambientePerfilCadastral: HOMOLOG`;
5. confirmar as entradas DEV do Registry e executar apenas os setups
   previamente revisados, fora desta entrega;
6. publicar backend e frontend apenas em HOMOLOG, gerar `config:homolog` e
   validar cache `portal-geapa-pwa-v117` e o asset
   `admin-solicitacoes-vinculo.js?v=4`;
7. manter PROD com a feature desligada até nova promoção formal.

O manifest desta branch já referencia as versões que contêm os contratos V2.
Isso não publica nem habilita o Portal PROD.
