const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {checkInventory,checkApproval,checkPlan}=require('../scripts/hosting-dev.cjs');
const project='geapa-convergencia-dev', h='1'.repeat(64), next='2'.repeat(64);
const plan={project,portalCommit:'a'.repeat(40),coreRevision:'geapacommanddevpilot-00170-luw',
  baselineVersion:'sites/'+project+'/versions/abc',baselineRelease:'sites/'+project+'/channels/live/releases/123',
  manifestSha256:h,coreReceiptSha256:next,hostingConfigUnchanged:true,files:2,added:[],removed:[],
  changed:[{path:'/b',liveGzipSha256:h,candidateGzipSha256:next}]};
test('exact Hosting inventory detects concurrent edits, omitted assets and partial publication',()=>{
  const local=new Map([['/a',{gzipHash:h}],['/b',{gzipHash:next}]]);
  const baseline=new Map([['/a',h],['/b',h]]);
  checkInventory(plan,baseline,local,false);
  assert.throws(()=>checkInventory(plan,baseline,local,true));
  checkInventory(plan,new Map([['/a',h],['/b',next]]),local,true);
  for(const live of [new Map([['/b',h]]),new Map([['/a',next],['/b',h]]),new Map([['/x',h],['/b',h]])])
    assert.throws(()=>checkInventory(plan,live,local,false));
});
test('receipt, prior live release, manifest, reviewed commit and three checks bind approval',()=>{
  const checks=['contratoDocumentalRH','recusaSemEscopo','recuperacaoPeloProprietario'];
  const proof={project,decisao:'APROVADO',portalCommit:plan.portalCommit,sha256ManifestoPortal:h,
    sha256ReciboCore:next,releaseAnterior:plan.baselineRelease,responsavel:'teste local',
    verificacoes:Object.fromEntries(checks.map(k=>[k,{aprovado:true,evidencia:'amostra de teste'}]))};
  checkApproval(proof,checkPlan(plan),plan.baselineRelease);
  for(const k of ['sha256ManifestoPortal','sha256ReciboCore','portalCommit','project','decisao','releaseAnterior'])
    assert.throws(()=>checkApproval({...proof,[k]:'outro'},plan,plan.baselineRelease));
  for(const k of checks)assert.throws(()=>checkApproval({...proof,verificacoes:{...proof.verificacoes,[k]:{aprovado:true}}},plan,plan.baselineRelease));
  for(const delta of [{project:'portal-geapa'},{baselineVersion:'sites/portal-geapa/versions/a'},{removed:['/a']},{hostingConfigUnchanged:false}])
    assert.throws(()=>checkPlan({...plan,...delta}));
});
test('credentialed workflow only on main, with pinned actions and no candidate-selected ref',()=>{
  const workflow=fs.readFileSync(path.resolve(__dirname,'../.github/workflows/hosting-dev.yml'),'utf8');
  assert.doesNotMatch(workflow,/pull_request|secrets: inherit|contents: write/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/environment: geapa-dev/);
  for(const match of workflow.matchAll(/uses: (.+)/g))assert.match(match[1],/@[a-f0-9]{40}$/);
  assert.match(workflow,/ref: \$\{\{ steps.preflight.outputs.commit \}\}/);
});
