import {fail} from "./errors.mjs";
const models={
'portal-binding-v11':{uid:'string',idPessoa:'string',active:'boolean',bindingVersion:'integer',sourceRevision:'integer',policyVersion:'integer',technicalAccount:'boolean'},
'safe-profile-v11':{idPessoa:'string',displayLabel:'string',sourceRevision:'integer'},
'safe-status-v11':{idPessoa:'string',state:'string',egressEndsAtExclusive:'nullableTimestamp',sourceRevision:'integer'},
'access-binding-v12':{idPessoa:'string',active:'boolean',bindingVersion:'integer'},
'member-function-index-v12':{idPessoa:'string',kind:'string',ids:'ids',sourceRevision:'integer',asOf:'timestamp',validUntil:'timestamp'},
'safe-member-function-v12':{idPessoa:'string',idVigencia:'string',roleKey:'string',group:'string',scopeKey:'string',idDiretoria:'string',idTermo:'string',startDate:'string',endDatePlanned:'nullableString',endDateReal:'nullableString'}
};
function decode(data){const model=models[data?.schemaVersion];if(!model||Object.keys(data).length!==Object.keys(model).length+1)fail('SCHEMA_UNSUPPORTED');const out={schemaVersion:data.schemaVersion};for(const [key,type]of Object.entries(model)){const v=data[key];if(type==='ids'){if(!Array.isArray(v)||new Set(v).size!==v.length||v.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(x)))fail('SCHEMA_UNSUPPORTED');out[key]=Object.freeze([...v]);continue}if(type.startsWith('nullable')&&v===null){out[key]=null;continue}const t=type==='nullableTimestamp'?'timestamp':type==='nullableString'?'string':type;if(t==='timestamp'?!v?.toMillis:t==='integer'?!Number.isSafeInteger(v):typeof v!==t)fail('SCHEMA_UNSUPPORTED');out[key]=t==='timestamp'?v.toDate().toISOString():v;}return Object.freeze(out)}
export {decode,models};
