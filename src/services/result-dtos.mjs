import {exact,need,frozen,clone} from './command-contract.mjs';
import {operation} from './errors.mjs';
// A shared authorization/revision rejection can precede the ACT domain handler.
// It is terminal even though it has no domainResult. Never infer a success.
export function sharedRejection(v,operationId){
 if(v?.state!=='FAILED'||v.domainResult)return null;
 exact(v,['state','code','revisionBefore','revisionAfter']);
 need(operation(operationId)&&['DENIED','REVISION_CONFLICT'].includes(v.code));
 need(Array.isArray(v.revisionBefore)&&v.revisionBefore.length===0&&Array.isArray(v.revisionAfter)&&v.revisionAfter.length===0);
 return frozen({operationId,receipt:{state:'FAILED',code:v.code},canonical:{state:'NOT_COMMITTED'},projection:{kind:'UNSPECIFIED',state:'NOT_CONFIRMED'}});
}
export function result(v,operationId){const rejected=sharedRejection(v,operationId);if(rejected)return rejected;if(v&&Object.keys(v).length===1&&['INGRESS_PENDING','BINDING_PENDING'].includes(v.state)){need(operation(operationId));return frozen({operationId,receipt:{state:v.state,code:'PENDING'},canonical:{state:'UNCONFIRMED'},projection:{kind:'UNSPECIFIED',state:'NOT_CONFIRMED'}});}if(v?.domainResult){const d=v.domainResult;need(d.schemaVersion==='geapa-response-v2-candidate'&&d.operationId===operationId&&d.commandType.startsWith('ACT.')&&['COMPLETED','FAILED'].includes(v.state)&&['COMMIT_APPLIED','REJECTED'].includes(d.businessState));return frozen(clone(d));}exact(v,['operationId','receipt','canonical','projection']);need(operation(operationId)&&v.operationId===operationId);exact(v.receipt,['state','code']);exact(v.canonical,['state']);exact(v.projection,['kind','state']);
 const {state,code}=v.receipt;
 need(state==='COMPLETED'?['OK','RESULT_RETAINED_AS_TOMBSTONE'].includes(code):state==='FAILED'?['DENIED','REVISION_CONFLICT','RESULT_RETAINED_AS_TOMBSTONE'].includes(code):state==='RECONCILIATION_REQUIRED'?code==='RECONCILIATION_REQUIRED':['INGRESS_PENDING','BINDING_PENDING'].includes(state)&&code==='PENDING');
 need(v.canonical.state===(state==='COMPLETED'?'COMMITTED':state==='FAILED'?'NOT_COMMITTED':'UNCONFIRMED'));
 need(['PENDING','CONFIRMED','NOT_CONFIRMED'].includes(v.projection.state));need(['OWN_DISPLAY','GOVERNANCE_REPROJECTION','UNSPECIFIED'].includes(v.projection.kind));need(v.projection.state!=='CONFIRMED'||state==='COMPLETED'&&code==='OK'&&v.projection.kind==='OWN_DISPLAY');need(v.projection.state!=='PENDING'||state==='COMPLETED'&&v.projection.kind==='GOVERNANCE_REPROJECTION');return frozen(clone(v));
}
export function resultLabel(v){result(v,v.operationId);if(v.receipt.state==='COMPLETED')return v.projection.state==='CONFIRMED'?'Comando concluído; nome de exibição próprio confirmado.':v.projection.state==='PENDING'?'Comando concluído; projeção pendente.':'Comando concluído; projeção não confirmada.';return v.receipt.state==='FAILED'?'Comando negado.':'Processamento pendente de confirmação.';}
