const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
test('different activity intent settles only a terminal receipt even when its projection is pending',async()=>{
 const {createControlledSave}=await import('../dist/dev/assets/act-command/controlled-save.mjs');
 const config=JSON.parse(fs.readFileSync('dist/dev/assets/act-command/activity-executor-routes.json'));
 const operationId='a'.repeat(32),key={operationId,commandType:'ACT.ACTIVITY_SAVE',digest:'b'.repeat(64)};
 const original={resource:'new',executor:'CF_GEN2_DEV_EDIT_V1',intentHash:'c'.repeat(64),key,raw:{operationId,commandType:key.commandType,payload:{activityRef:{kind:'activity',id:'act_'+operationId}}},config};
 for(const state of ['COMPLETED','INGRESS_PENDING']){
  let removed=false,calls=[];const auth={capture:()=>({uid:'SYNTHETIC'}),assert:()=>{},token:async()=> 'fixture',pending:new Set()};
  const storage={getItem:()=>JSON.stringify(original),removeItem:()=>{removed=true;},setItem:()=>a.fail('must not admit another command')};
  const fetchImpl=async(url,o)=>{if(!o?.body)return {ok:true,json:async()=>config};const b=JSON.parse(o.body);calls.push(b);return {ok:true,json:async()=>({key,result:state==='COMPLETED'?{state,domainResult:{schemaVersion:'geapa-response-v2-candidate',operationId,commandType:key.commandType,businessState:'COMMIT_APPLIED',result:{}}}:{state},projection:{state:'PENDING'}})};};
  const client=createControlledSave({auth,db:{app:{options:{projectId:'geapa-convergencia-dev'}}},storage,fetchImpl,attest:async()=> 'fixture',activityOperations:true});
  await a.rejects(client.execute('/atividades/modelo/validar',{idConfig:'SYN_OTHER',dryRun:true,atividade:{}}),e=>e.code===(state==='COMPLETED'?'COMMAND_NOT_ADMITTED':'COMMAND_NOT_ADMITTED'));
  a.equal(removed,state==='COMPLETED');a.equal(calls.length,1);a.equal(calls[0].action,'execute');a.equal(calls[0].request.operationId,operationId);
 }
});
