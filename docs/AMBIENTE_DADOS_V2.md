# Ambiente de dados V2 no Portal

O navegador nao envia ambiente, key, ID de planilha ou nome de aba. O Apps
Script do Portal fixa `PORTAL_CONFIG.ambienteDadosV2` e valida somente `DEV` ou
`PROD`.

- publicacao HOMOLOG: `ambienteDadosV2: 'DEV'`;
- publicacao PROD: `ambienteDadosV2: 'PROD'`.

O backend inclui `ambienteBackend` no contexto autenticado encaminhado ao
modulo Atividades. As chaves de cache de Atividades e views incluem o ambiente.
Fallbacks de views usam `coreReadDomainRecords('ATIVIDADES', logicalSheet, ...)`
e nao conhecem keys especificas.

Teste local:

```powershell
npm.cmd run test:v2-environment
```

Ao publicar, gere o frontend pelo comando de ambiente normal, mas nao derive o
ambiente de dados do `config.js` do navegador. Ele continua pertencendo ao
backend versionado.
