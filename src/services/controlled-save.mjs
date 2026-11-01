import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {canonical,input,need} from './command-contract.mjs';
import {result} from './result-dtos.mjs';
import {sanitized} from './admission-transport.mjs';
import {fail} from './errors.mjs';
import {devAppCheck} from './dev-app-check.mjs';
const PROJECT=deployment.projectId,EXECUTOR=deployment.executor,LEGACY=deployment.legacyExecutor,ID='CF_DEV_EDIT_ACTIVITY_V2';
const OPERATIONS={'/atividades/modelo/criar':'CREATE','/admin/atividades/salvar':'EDIT','/admin/atividades/publicar':'PUBLISH','/admin/atividades/ocultar':'HIDE','/admin/atividades/cancelar':'CANCEL','/admin/atividades/reabrir':'REOPEN','/admin/atividades/realizacao':'REALIZE'};
const TYPES=['ACT.ACTIVITY_SAVE','ACT.ACTIVITY_PUBLICATION_SET','ACT.ACTIVITY_REALIZE'];
const ENDPOINT=deployment.endpoint;
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('');
// Hosting configuration is a network dependency too. Abort it on session
// change or timeout; never route around failure or discard a pending journal.
export async function readExecutorRoute(fetchImpl,url,auth,t){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 auth.pending?.add(controller);
 try{
  auth.assert(t);
  const response=await fetchImpl(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
  need(response.ok);const config=await response.json();auth.assert(t);return config;
 }finally{clearTimeout(timer);auth.pending?.delete(controller);}
}
// Pilot-only routing. The Core's protected route and operation owner decide authority.
// The journal survives rollback/reload and never substitutes an Apps Script write.
export function createControlledSave({auth,db,storage,fetchImpl=fetch,attest,activityOperations=false,flowOperations=null}){
 let busy=false;
 async function proof(config){
  if(attest)return attest(config);
  return devAppCheck(db.app,config.siteKey);
 }
 async function call(action,request,config,t){
  const token=await auth.token(t),appToken=await proof(config);auth.assert(t);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);auth.pending?.add(controller);const start=Date.now();
  try{const response=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':appToken},body:JSON.stringify({action,request}),credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
   const value=await response.json();auth.assert(t);if(!response.ok||value.error)throw Object.assign(Error('COMMAND_FAILED'),{code:value.error?.code||'RECONCILIATION_REQUIRED'});
   return value;
  }finally{clearTimeout(timer);auth.pending?.delete(controller);console.info(JSON.stringify({component:'GEAPA_CONTROLLED_SAVE',action,operationId:request.operationId,elapsedMs:Date.now()-start}));}
 }
 const scope=(route,payload)=>flowOperations?flowOperations.routes.includes(route):activityOperations?payload?.idAtividade!==ID&&(!!OPERATIONS[route]||route==='/atividades/modelo/validar'):route==='/admin/atividades/salvar'&&payload?.idAtividade===ID;
 async function execute(route,payload,context={}){
  need(db.app.options.projectId===PROJECT);const t=auth.capture(),resource=flowOperations?'flow|'+(route.startsWith('/v2/apresentacoes/')?'presentation':route.startsWith('/v2/justificativas/')?'justification':route.includes('/janelas/')?'window':'activity')+'|'+(payload.idAtividade||payload.idApresentacao||payload.idJustificativa||payload.activityRef?.id||payload.id||'new'):activityOperations?(payload.idAtividade||'new'):ID,key='geapa.cf.pending.v1.'+await hash(PROJECT+'|'+t.uid+'|'+resource);auth.assert(t);
  let old;try{old=JSON.parse(storage.getItem(key)||'null');}catch{fail('COMMAND_RECONCILIATION_REQUIRED');}
  if(busy)fail('COMMAND_PENDING');busy=true;
  try{
   let config=await readExecutorRoute(fetchImpl,flowOperations?'/assets/act-command/act-flow-executor-routes.json':activityOperations?'/assets/act-command/activity-executor-routes.json':'/assets/act-command/executor-route.json',auth,t);
   if(flowOperations){need(config.projectId===PROJECT&&config.endpoint===ENDPOINT&&config.schemaVersion==='act-flow-executor-client-v1'&&typeof config.enabled==='boolean'&&Array.isArray(config.routes)&&typeof config.siteKey==='string');config={...config,executor:LEGACY};if(!old&&config.enabled&&config.routes.includes(route)){const routing=await call('flowRoute',{route,payload},config,t);need([EXECUTOR,LEGACY].includes(routing.executor));config={...config,executor:routing.executor};}}
   if(activityOperations){need(config.projectId===PROJECT&&config.endpoint===ENDPOINT&&config.schemaVersion==='activity-executor-client-v1'&&typeof config.enabled==='boolean'&&config.routes&&typeof config.siteKey==='string');const op=route==='/atividades/modelo/validar'?'CREATE':OPERATIONS[route],rule=config.routes[op];const eligible=rule&&(rule.resolve===true||(op==='CREATE'?rule.typeIds?.includes(payload.idConfig):rule.resourceIds?.includes(resource)));config={...config,creationOperationId:undefined,executor:config.enabled&&eligible?rule.executor:LEGACY};if(!old&&config.enabled&&rule?.resolve===true){const routing=await call('activityRoute',{route,payload},config,t);need([EXECUTOR,LEGACY].includes(routing.executor));if(routing.creationOperationId!==undefined)need(op==='CREATE'&&/^[a-f0-9]{32}$/.test(routing.creationOperationId));config={...config,executor:routing.executor,creationOperationId:routing.creationOperationId};}}
   need(config.projectId===PROJECT&&(flowOperations||activityOperations||config.activityId===ID)&&config.endpoint===ENDPOINT&&[EXECUTOR,LEGACY].includes(config.executor)&&typeof config.siteKey==='string');
   // Existing Functions journal always wins over a new Hosting route/rollback.
   if(!old&&config.executor===LEGACY){if(deployment.environment==='PROD')fail('CONTRACT_NOT_AVAILABLE');return null;}
   if((flowOperations||activityOperations)&&route==='/atividades/modelo/validar'&&!old){return (await call(flowOperations?'flowPreview':'preview',payload,config,t)).preview;}
   const mark=await hash(canonical({route,payload,...context}));auth.assert(t);
   if(old){need(old.executor===EXECUTOR&&(flowOperations?flowOperations.types.includes(old.key?.commandType):activityOperations?TYPES.includes(old.key?.commandType):old.key?.commandType==='ACT.ACTIVITY_SAVE')&&old.raw?.operationId===old.key.operationId&&(flowOperations?old.resource===resource:activityOperations?(resource==='new'?old.raw?.payload?.activityRef?.id==='act_'+old.key.operationId:old.raw?.payload?.activityRef?.id===resource):old.raw?.payload?.activityRef?.id===ID)&&old.config?.endpoint===ENDPOINT&&old.config?.projectId===PROJECT&&old.config?.siteKey===config.siteKey);}
   else{
    const operationId=config.creationOperationId||crypto.randomUUID().replaceAll('-','');
    need(/^[a-f0-9]{32}$/.test(operationId)&&(!config.creationOperationId||activityOperations&&OPERATIONS[route]==='CREATE'));
    const prepared=await call(flowOperations?'flowPortalPrepare':'prepare',{operationId,route,payload,...context},config,t),raw=input(prepared.request);
    need(raw.operationId===operationId&&(flowOperations?flowOperations.types.includes(raw.commandType):activityOperations?TYPES.includes(raw.commandType):raw.commandType==='ACT.ACTIVITY_SAVE')&&(flowOperations||raw.payload.activityRef.id===(activityOperations?(resource==='new'?'act_'+operationId:resource):ID)));
    const digest=await hash(canonical({projectId:PROJECT,...raw,ownerUid:t.uid,expectedRevisions:[]}));auth.assert(t);
    old={resource,executor:EXECUTOR,intentHash:mark,config,key:{operationId,commandType:raw.commandType,digest},raw};
    try{storage.setItem(key,JSON.stringify(old));}catch{fail('COMMAND_NOT_ADMITTED');}
   }
   let answer;
   try{answer=await call('execute',old.raw,old.config,t);}catch(e){
    // Query/recover only the persisted selector on uncertain network responses.
    if(e.code&&!['RECONCILIATION_REQUIRED'].includes(e.code))throw e;
    answer=await call('recover',old.key,old.config,t);
   }
   need(canonical(answer.key)===canonical(old.key));const decision=answer.result?.state==='RECOVERED'?answer.result.result:answer.result;
   let final=result(decision,old.key.operationId);auth.assert(t);
   if(['COMPLETED','FAILED'].includes(decision?.state)){
    // Business completion and derived-view readiness are independent. Flow
    // readers still enforce their fences; this never labels a stale view CURRENT.
    const pendingView=decision.state==='COMPLETED'&&answer.projection?.state!=='CURRENT';
    if(pendingView){
     if(!flowOperations||final.businessState!=='COMMIT_APPLIED')fail('COMMAND_PENDING');
     final=Object.freeze({...final,projection:{state:'PENDING',retryAction:'recover'}});
     // Keep the exact operation for replay/reload. A different explicit intent
     // settles this terminal operation first and requires another user action.
     if(old.intentHash!==mark)storage.removeItem(key);
    }else storage.removeItem(key);
   }
   if(old.intentHash!==mark)fail('COMMAND_NOT_ADMITTED');return final;
  }catch(e){
   if(['EXECUTOR_FENCE_CONFLICT','PILOT_DISABLED','PILOT_DRAINING'].includes(e?.code))fail('COMMAND_NOT_ADMITTED');
   throw sanitized(e);
  }finally{busy=false;}
 }
 return {scope,execute};
}
