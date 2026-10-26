import {createControlledSave} from './controlled-save.mjs';
import {actFlowContracts} from './act-flow-contracts.mjs';
import {canonical,need} from './command-contract.mjs';
import {fail} from './errors.mjs';
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('');
// Retain the existing Core journals for each step. The only file state kept in
// session storage is an effect/receipt reference, never bytes or session URLs.
export function createStorageFlow({auth,db,storage,fetchImpl,files,clientFactory=createControlledSave}){
 let busy=false;
 return {async execute({kind,resourceId,descriptor,bytes,begin,submit,context={},notice}){
  if(!files.scope(kind==='proof'?'activityIds':'presentationIds',resourceId))return null;
  const t=auth.capture(),key='geapa.storage.flow.v1.'+await hash(t.uid+'|'+kind+'|'+resourceId),intent=await hash(canonical({kind,resourceId,descriptor,submit,notice:notice||null}));auth.assert(t);
  if(busy)fail('COMMAND_PENDING');busy=true;
  try{
   let saved;try{saved=JSON.parse(storage.getItem(key)||'null')}catch{fail('COMMAND_RECONCILIATION_REQUIRED');}
   // Preparation cannot admit a command: controlled-save persists its journal
   // before execute. Only a flow with no journal, notice or effect is replaceable.
   if(saved&&saved.version===1&&saved.uid===t.uid&&saved.intent!==intent&&!saved.effectRef&&!saved.notice&&!saved.noticeDone&&!saved.submitted&&saved.journals&&Object.keys(saved.journals).length===0)saved=null;
   if(saved)need(saved.uid===t.uid&&saved.intent===intent&&saved.version===1);
   else saved={version:1,uid:t.uid,intent,begin,submit,context,notice:notice||null,journals:{},effectRef:null,submitted:false};
   const persist=()=>{auth.assert(t);storage.setItem(key,JSON.stringify(saved));};persist();
   if(saved.notice&&!saved.noticeDone){const value=await files.notice(saved.notice);need(value.ok);saved.begin.payload.basis=value.basis;saved.noticeDone=true;persist();}
   const step=async(name,input)=>{
    const stageStorage={getItem:k=>saved.journals[name]?.[k]||null,setItem:(k,v)=>{saved.journals[name]={[k]:v};persist();},removeItem:()=>{}};
    const client=clientFactory({auth,db,storage:stageStorage,fetchImpl,flowOperations:actFlowContracts});
    const result=await client.execute(input.route,input.payload,saved.context);need(result!==null);
    // A verified terminal rejection has no business effect. Preserve the file
    // and receipt identity, but permit a new command on the next explicit click.
    if(result.businessState==='REJECTED'||result.receipt?.state==='FAILED'&&result.canonical?.state==='NOT_COMMITTED'){
     saved.lastRejected={stage:name,operationId:result.operationId};delete saved.journals[name];persist();
    }
    return result;
   };
   if(!saved.effectRef){const started=await step('begin',saved.begin);if(started.businessState!=='COMMIT_APPLIED')return started;need(started.result?.effectRef?.kind==='outbox');saved.effectRef=started.result.effectRef;persist();}
   // A final command may already have committed while its response was lost.
   // Its preserved journal is reconciled before touching the file again.
   if(!saved.journals.submit){const uploaded=await files.upload(saved.effectRef,bytes);if(uploaded.state!=='CONFIRMED')fail('COMMAND_PENDING');}
   const payload={...saved.submit.payload,[kind==='proof'?'proofUploadRef':'effectRef']:saved.effectRef};
   const answer=await step('submit',{route:saved.submit.route,payload});auth.assert(t);
   if(answer.businessState==='COMMIT_APPLIED')storage.removeItem(key);return answer;
  }finally{busy=false;}
 }};
}
