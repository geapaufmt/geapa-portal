import {sessionDiagnostic} from './session-diagnostics.mjs';
// Uses the existing session and App Check ports; never stores a token.
type Ticket={uid:string;generation?:number};
type Auth={capture:()=>Ticket;assert:(t:Ticket)=>void;assertIdentity?:(t:Ticket)=>void;token:(t:Ticket)=>Promise<string>;requestTokenRefresh?:(t:Ticket)=>void;pending?:Set<AbortController>};
type Config={projectId:string;endpoint:string;siteKey:string};
type Key={operationId:string;digest:string};
type Request=Key&{input:unknown;documentHash:string;epoch:number;controlRevision:number;validUntil:number};
type Result={state?:string;preview?:unknown;request?:Request;operationId?:string;revision?:number};
const locks=new Map<string,Promise<unknown>>();
async function journalLock<T>(name:string,work:()=>Promise<T>):Promise<T>{if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request(name,work);const prior=locks.get(name)||Promise.resolve();const task=prior.catch(()=>{}).then(work);locks.set(name,task);try{return await task;}finally{if(locks.get(name)===task)locks.delete(name);}}
export function createInstitutionalEditor({auth,storage,config,projectId,endpoint,attest,fetchImpl=fetch,mode='contact'}:{auth:Auth;storage:Storage;config:Config;projectId:string;endpoint:string;attest:()=>Promise<string>;fetchImpl?:typeof fetch;mode?:'contact'|'visibility'|'parameter'|'governance'}){
 let busy=false;const prefix=mode==='governance'?'institutionalGovernance':mode==='parameter'?'institutionalParameter':mode==='visibility'?'institutionalVisibility':'institutional';
 const fail=(code:string):never=>{throw Object.assign(Error(code),{code});};
 async function call(action:string,request:unknown,t:Ticket):Promise<Result>{
  if(config.projectId!==projectId||config.endpoint!==endpoint)fail('DESTINATION_INVALID');
  const token=await auth.token(t),started=performance.now();let check;try{check=await attest();sessionDiagnostic('APP_CHECK',t.generation||0,'VERIFIED',performance.now()-started);}catch(error){sessionDiagnostic('APP_CHECK',t.generation||0,'UNAVAILABLE',performance.now()-started);throw error;}auth.assert(t);
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),60000);auth.pending?.add(c);
  try{const r=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':check},body:JSON.stringify({action,request}),credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});const v=await r.json();(auth.assertIdentity||auth.assert).call(auth,t);if(r.status===401)auth.requestTokenRefresh?.(t);if(!r.ok||v.error)fail(v.error?.code||'RECONCILIATION_REQUIRED');if(!v.result)fail('SCHEMA_UNSUPPORTED');return v.result;}
  finally{clearTimeout(timer);auth.pending?.delete(c);}
 }
 async function run(phase:'preview'|'execute'|'status'|'document'|'attachment',payload:unknown):Promise<Result>{
  if(busy)fail('COMMAND_PENDING');busy=true;
  try{
   const t=auth.capture();if(phase==='document'||phase==='attachment'){if(mode!=='governance')fail('COMMAND_TYPE_INVALID');return call(prefix+(phase==='document'?'Document':'Attachment'),payload,t);}
   const encoded=new TextEncoder().encode(projectId+'|'+t.uid),digest=await crypto.subtle.digest('SHA-256',encoded),name=(mode==='governance'?'geapa.institutional.governance.pending.v1.':mode==='contact'?'geapa.institutional.pending.v1.':mode==='parameter'?'geapa.institutional.parameter.pending.v1.':'geapa.institutional.visibility.pending.v1.')+[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');auth.assert(t);
   return await journalLock(name,async()=>{auth.assert(t);let pending:Key|null=null;try{pending=JSON.parse(storage.getItem(name)||'null');}catch{fail('COMMAND_RECONCILIATION_REQUIRED');}
   if(pending&&(!/^[a-f0-9]{32}$/.test(pending.operationId)||!/^[a-f0-9]{64}$/.test(pending.digest)||Object.keys(pending).sort().join()!=='digest,operationId'))fail('COMMAND_RECONCILIATION_REQUIRED');
   if(!pending&&phase==='status'){try{pending=JSON.parse(storage.getItem(name+'.last')||'null');}catch{fail('COMMAND_RECONCILIATION_REQUIRED');}if(pending&&(!/^[a-f0-9]{32}$/.test(pending.operationId)||!/^[a-f0-9]{64}$/.test(pending.digest)||Object.keys(pending).sort().join()!=='digest,operationId'))fail('COMMAND_RECONCILIATION_REQUIRED');}
   if(pending){const r=await call(prefix+'Status',pending,t);if(['COMPLETED','NOT_ADMITTED'].includes(r.state||'')){(auth.assertIdentity||auth.assert).call(auth,t);storage.setItem(name+'.last',JSON.stringify(pending));storage.removeItem(name);}if(phase!=='status')fail(r.state==='COMPLETED'?'PREVIOUS_OPERATION_COMPLETED':r.state==='NOT_ADMITTED'?'COMMAND_NOT_ADMITTED':r.state==='FAILED'?'COMMAND_FAILED':'COMMAND_PENDING');return r;}
   if(phase==='status')return {state:'NOT_ADMITTED'};
   if(phase==='preview')return await call(prefix+'Preview',{operationId:crypto.randomUUID().replaceAll('-',''),input:payload},t);
   const r=payload as Request;if(!r||!/^[a-f0-9]{32}$/.test(r.operationId)||!/^[a-f0-9]{64}$/.test(r.digest)||r.validUntil<=Date.now())fail('STALE_REVISION');
   // Persist only the opaque selector before any admission can be committed.
   storage.setItem(name,JSON.stringify({operationId:r.operationId,digest:r.digest}));auth.assert(t);
   const answer=await call(prefix+'Execute',r,t);if(answer.state==='COMPLETED'){(auth.assertIdentity||auth.assert).call(auth,t);storage.setItem(name+'.last',JSON.stringify({operationId:r.operationId,digest:r.digest}));storage.removeItem(name);}return answer;});
  }finally{busy=false;}
 }
 return {run};
}
