import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {createControlledSave} from './controlled-save.mjs';
import {actFlowContracts} from './act-flow-contracts.mjs';
import {canonical,need} from './command-contract.mjs';
import {fail} from './errors.mjs';
const route='/v2/apresentacoes/material/revisar',project=deployment.projectId;
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
// Reuse the shared command client. Retain each terminal stage journal until the
// whole existing review workflow ends, so reload never prepares a second review.
export function createMaterialReviewNode({auth,db,storage,fetchImpl,clientFactory=createControlledSave}){
 let busy=false;
 return {async execute(payload,shown){
  const ticket=auth.capture(),key='geapa.cf.material-review.v1.'+await hash(project+'|'+ticket.uid+'|'+payload.idApresentacao),intent=await hash(canonical(payload));auth.assert(ticket);
  if(busy)fail('COMMAND_PENDING');busy=true;
  let saved;
  try{
   try{saved=JSON.parse(storage.getItem(key)||'null')}catch{fail('COMMAND_RECONCILIATION_REQUIRED')}
   if(saved)need(saved.version===1&&saved.intent===intent&&saved.uid===ticket.uid&&Array.isArray(saved.stages)&&saved.journals&&saved.inputs);
   else saved={version:1,uid:ticket.uid,intent,stages:payload.decisao==='DISPENSAR'?['REVIEW']:payload.decisao==='SOLICITAR_AJUSTE'?(shown.termsRevision?['TERMS']:['REVIEW','REQUEST','OPPORTUNITY']):['REVIEW','RECEIVE','EVALUATE'],basis:shown.basis,termsRevision:shown.termsRevision||null,inputs:{},journals:{}};
   const persist=()=>{auth.assert(ticket);try{storage.setItem(key,JSON.stringify(saved))}catch{fail('COMMAND_NOT_ADMITTED')}};
   const clear=()=>{auth.assert(ticket);storage.removeItem(key)};
   let priorSelector,answer;
   for(const stage of saved.stages){
    const input=saved.inputs[stage]||{idApresentacao:payload.idApresentacao,basis:saved.basis,decision:payload.decisao,publicReason:payload.observacaoPublica,internalReason:payload.observacaoInterna,stage,...(payload.decisao==='SOLICITAR_AJUSTE'?{dueCivilDate:payload.prazoCorrecao,...(saved.termsRevision?{opportunityRevision:saved.termsRevision}:{})}:{}),...(priorSelector?{priorSelector}:{})};
    saved.inputs[stage]=input;persist();
    const stageStorage={getItem:k=>saved.journals[stage]?.[k]||null,setItem:(k,v)=>{saved.journals[stage]={[k]:v};persist()},removeItem:()=>{}};
    const client=clientFactory({auth,db,storage:stageStorage,fetchImpl,flowOperations:actFlowContracts});
    answer=await client.execute(route,input);auth.assert(ticket);
    if(answer===null){if(Object.keys(saved.journals).length)fail('COMMAND_RECONCILIATION_REQUIRED');clear();return null;}
    if(answer.businessState!=='COMMIT_APPLIED'){if(answer.businessState||['COMPLETED','FAILED'].includes(answer.receipt?.state))clear();return answer;}
    const journals=Object.values(saved.journals[stage]||{});need(journals.length===1);priorSelector=JSON.parse(journals[0]).key;need(priorSelector?.operationId===answer.operationId);
   }
   clear();return answer;
  }finally{busy=false}
 }};
}
