import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {devAppCheck} from './dev-app-check.mjs';
import {canonical,need} from './command-contract.mjs';
import {fail} from './errors.mjs';
const PROJECT=deployment.projectId,ENDPOINT=deployment.endpoint;
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const terminal=v=>['COMPLETED','FAILED'].includes(v?.receipt?.state);
export function createMemberNode({auth,db,storage,config,fetchImpl=fetch,attest}){
 const active=new Set(),controllers=new Set();
 const scope=intent=>config.enabled&&config.admissionsEnabled!==false&&config.actorUids.includes(auth.uid)&&(!config.portalRoutes||config.portalRoutes.includes(intent.route))&&(intent.route?.startsWith('/admin/')||config.selfUids.includes(auth.uid));
 function clear(){for(const c of controllers)c.abort();controllers.clear();}
 auth.listeners?.add(clear);
 async function request(action,value,t=auth.capture()){
  need(config.enabled&&db.app.options.projectId===PROJECT&&config.projectId===PROJECT&&config.endpoint===ENDPOINT&&config.actorUids.includes(t.uid)&&config.siteKey);
  const token=await auth.token(t),app=await(attest?attest():devAppCheck(db.app,config.siteKey));auth.assert(t);
  const started=performance.now(),c=new AbortController(),timer=setTimeout(()=>c.abort(),110000);controllers.add(c);auth.pending?.add(c);
  try{const r=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':app},body:JSON.stringify({action,request:value}),credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});const v=await r.json();auth.assert(t);if(!r.ok||v.error){const code=v.error?.code==='DOMAIN_STATE_INVALID'?'INVALID_STATE_TRANSITION':v.error?.code||'COMMAND_RECONCILIATION_REQUIRED';throw Object.assign(Error(code),{code});}const metrics=Object.fromEntries(Object.entries(v.metrics||{}).filter(([k,n])=>['reads','writes','sdkCalls','transactionAttempts','totalMs','firestoreMs'].includes(k)&&Number.isFinite(n)));console.info(JSON.stringify({stage:'MEMBERS_NODE_DEV',action,httpMs:Math.round(performance.now()-started),...metrics}));return v;
  }finally{clearTimeout(timer);controllers.delete(c);auth.pending?.delete(c);}
 }
 async function execute(slot,intent,retain=false){
  const t=auth.capture(),name='geapa.members.node.v1.'+await hash(PROJECT+'|'+t.uid+'|'+slot);auth.assert(t);
  let entry;try{entry=JSON.parse(storage.getItem(name)||'null')}catch{fail('COMMAND_RECONCILIATION_REQUIRED')}
  if(!entry&&!scope(intent))return null;
  if(active.has(name))fail('COMMAND_PENDING');active.add(name);
  const persist=()=>{auth.assert(t);try{storage.setItem(name,JSON.stringify(entry))}catch{fail('COMMAND_RECONCILIATION_REQUIRED')}};
  try{
   const mark=await hash(canonical(intent));auth.assert(t);
   if(entry){need(entry.uid===t.uid&&entry.version===1&&/^[a-f0-9]{32}$/.test(entry.operationId)&&/^[a-f0-9]{64}$/.test(entry.intentHash));
    if(entry.key){let prior;try{prior=await request('memberRecover',entry.key,t)}catch(e){if(e.code!=='NOT_FOUND')throw e;}
     if(prior){need(prior.dto?.operationId===entry.operationId);if(terminal(prior.dto)&&!retain)storage.removeItem(name);if(entry.intentHash!==mark)fail(terminal(prior.dto)?'COMMAND_NOT_ADMITTED':'COMMAND_PENDING');return prior.dto;}
    }
    if(entry.intentHash!==mark){storage.removeItem(name);fail('COMMAND_NOT_ADMITTED');}
   }else{entry={version:1,uid:t.uid,operationId:crypto.randomUUID().replaceAll('-',''),intentHash:mark,key:null};persist();}
   // Preparation is idempotent and has no admission effect. Preserve its ID
   // after a lost response; never turn an uncertain command into a fresh one.
   const q=await request(slot.startsWith('enrollment:')?'memberEnrollmentPrepare':'memberPrepare',{operationId:entry.operationId,...intent},t);
   need(q.key?.operationId===entry.operationId&&q.request?.operationId===entry.operationId);
   if(entry.key)need(canonical(entry.key)===canonical(q.key));entry.key=q.key;persist();
   const result=await request('memberExecute',q.request,t);need(result.dto?.operationId===entry.operationId);
   if(terminal(result.dto)&&!retain)storage.removeItem(name);return result.dto;
  }finally{active.delete(name)}
 }
 return {execute,scope,async enrollment(action){if(!scope({}))return null;const v=await request(action==='open'?'memberEnrollmentOpen':'memberEnrollmentRead',{});return v.result;},dispose(){clear();auth.listeners?.delete(clear);}};
}
