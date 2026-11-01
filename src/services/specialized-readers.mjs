import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {devAppCheck} from './dev-app-check.mjs';
const PROJECT=deployment.projectId,ENDPOINT=deployment.endpoint;
const fail=code=>{throw Object.assign(Error(code),{code,nodeReader:true});};
// No persistent response cache: coalesce simultaneous queries within this session.
// A failed Node read is never retried through Apps Script.
export function createSpecializedReaders({auth,db,config,fetchImpl=fetch,attest,record=()=>{},action='actRead'}){
 if(!['actRead','workspaceDownload'].includes(action))fail('CONTRACT_NOT_AVAILABLE');
 const pending=new Map(),controllers=new Set();let epoch=0;
 function clear(){epoch++;pending.clear();for(const c of controllers)c.abort();controllers.clear();}
 auth.listeners?.add(clear);
 const scope=route=>config?.enabled===true&&(config.routes?.includes(route)||config.blockedRoutes?.includes(route));
 async function read(request){
  if(config?.enabled===true&&config.blockedRoutes?.includes(request.route))fail('CONTRACT_NOT_AVAILABLE');
  if(!scope(request.route)||db.app.options.projectId!==PROJECT||config.projectId!==PROJECT||config.endpoint!==ENDPOINT||!config.siteKey)fail('CONTRACT_NOT_AVAILABLE');
  const ticket=auth.capture(),e=epoch,key=JSON.stringify([ticket.uid,ticket.generation,request]);
  if(pending.has(key))return pending.get(key);
  const assert=()=>{auth.assert(ticket);if(e!==epoch)fail('STALE_AUTHORIZATION');};
  const task=(async()=>{
   const started=Date.now(),token=await auth.token(ticket),appToken=await(attest?attest(config):devAppCheck(db.app,config.siteKey));assert();
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);controllers.add(controller);auth.pending?.add(controller);
   try{
    const r=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':appToken},body:JSON.stringify({action,request}),credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
    const value=await r.json();assert();
    if(!r.ok||value.error)fail(value.error?.code||'READ_UNAVAILABLE');
    if(value.route!==request.route||!value.result)fail('SCHEMA_UNSUPPORTED');
    record({route:request.route,httpMs:Date.now()-started,...Object.fromEntries(Object.entries(value.metrics||{}).filter(([k,n])=>['reads','writes','sdkCalls','authMs','appCheckMs','firestoreMs','totalMs','controlReads','controlSdkCalls','transactionAttempts'].includes(k)&&Number.isFinite(n)))});
    return value.result;
   }finally{clearTimeout(timer);controllers.delete(controller);auth.pending?.delete(controller);}
  })().catch(e=>{e.nodeReader=true;throw e;}).finally(()=>{if(pending.get(key)===task)pending.delete(key);});
  pending.set(key,task);return task;
 }
 return {scope,read,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
