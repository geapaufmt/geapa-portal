import {validateProjection} from "./projection-validator.mjs";
import {decode as decodeM12} from "./m12-dtos.mjs";
import {fail} from "./errors.mjs";
// Only projection fields explicitly present in approved M04 fixtures. No raw control documents.
const models=Object.freeze({
 portal:{schema:'portal-authz-v1',fields:{uid:'string',idPessoa:'string',ativo:'boolean',podeAcessarPortal:'boolean',stale:'boolean',bindingVersion:'integer',accessEpoch:'integer',sourceRevision:'integer',policyVersion:'integer',startsAt:'timestamp',validUntil:'timestamp',technicalAccount:'boolean'}},
 profile:{schema:'safe-profile-v1',fields:{ownerUid:'string',idPessoa:'string',displayLabel:'string',revision:'integer'}},
 status:{schema:'safe-status-v1',fields:{ownerUid:'string',state:'string',egressEndsAtExclusive:'nullableTimestamp'}},
 access:{schema:'portal-access-status-v1',fields:{status:'string',updatedAt:'timestamp',validUntil:'timestamp'}},
 justification:{schema:'safe-own-justification-v1',fields:{ownerUid:'string',justificationId:'string',activityId:'string',status:'string',submittedAt:'timestamp',updatedAt:'timestamp',reason:'string',analysisSummary:'string'}},
 activity:{schema:'safe-activity-v1',fields:{ownerUid:'string',activityId:'string',title:'string'}},
 review:{schema:'safe-review-v1',fields:{activityId:'string',reviewId:'string'}},
 editorial:{schema:'safe-editorial-v1',fields:{scopeKey:'string',pageId:'string'}},
 history:{schema:'safe-egress-history-v1',fields:{ownerUid:'string',occurredAt:'timestamp',kind:'string'}}
});
function decode(kind,data){if(({portal:'portal-binding-v11',profile:'safe-profile-v11',status:'safe-status-v11'})[kind]===data?.schemaVersion)return decodeM12(data);if(kind==='justification')validateProjection('justification',data);const m=models[kind];if(!m||!data||data.schemaVersion!==m.schema)fail('SCHEMA_UNSUPPORTED');const result={schemaVersion:m.schema};for(const[k,t]of Object.entries(m.fields)){const v=data[k];if(t==='nullableTimestamp'){if(v!==null&&!v?.toMillis)fail('SCHEMA_UNSUPPORTED');result[k]=v===null?null:v.toDate().toISOString();continue;}if(t==='timestamp'?!(v&&typeof v.toMillis==='function'):t==='integer'?!Number.isSafeInteger(v):typeof v!==t)fail('SCHEMA_UNSUPPORTED');result[k]=t==='timestamp'?v.toDate().toISOString():v;}return Object.freeze(result);}
const states=['RECEIVED','PROCESSING','COMPLETED','FAILED','RECONCILIATION_REQUIRED'];
function receipt(data,uid,operationId){if(!data||data.ownerUid!==uid||data.operationId!==operationId||!states.includes(data.state))fail('FORBIDDEN');if(!['ACCEPTED','OK','DENIED','REVISION_CONFLICT','RECONCILIATION_REQUIRED'].includes(data.code))fail('SCHEMA_UNSUPPORTED');for(const key of ['acceptedAt','updatedAt','purgeAfter'])if(!data[key]?.toDate)fail('SCHEMA_UNSUPPORTED');return Object.freeze({operationId,state:data.state,code:data.code,revisionBefore:data.revisionBefore,revisionAfter:data.revisionAfter,acceptedAt:data.acceptedAt.toDate().toISOString(),updatedAt:data.updatedAt.toDate().toISOString(),resultRef:data.resultRef,reconcileAfter:data.reconcileAfter?.toDate().toISOString()??null});}
export {models,decode,receipt,states};
