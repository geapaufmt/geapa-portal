import {decodeProfileDetails} from './profile-fields.mjs';
import {exact,need,frozen} from './command-contract.mjs';
import {decode} from './dtos.mjs';
import {decode as functionDto} from './m12-dtos.mjs';
import {privateView} from './private-dtos.mjs';
function time(value){need(typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);const ms=Date.parse(value);return Object.freeze({toMillis:()=>ms,toDate:()=>new Date(ms)});}
export function decodeOwnRead(value,view,now=Date.now()){
 exact(value,['view','data','validUntil','decisionEligible']);need(value.view===view&&value.decisionEligible===false&&Number.isSafeInteger(value.validUntil)&&value.validUntil>now);
 let data=value.data;
 if(view==='functions'||view==='directors'||view==='functionHistory'){need(Array.isArray(data));data=data.map(functionDto);need(new Set(data.map(x=>x.idVigencia)).size===data.length);if(view==='directors')need(data.every(x=>x.group==='DIRETORIA'&&x.scopeKey!==null));need(new Set(data.map(x=>x.idPessoa)).size<=1);}
 else if(view==='profile'&&data?.schemaVersion==='safe-own-profile-v2')data=decodeProfileDetails(data);
 else if(view==='contact'){data={...data,issuedAt:time(data.issuedAt),expiresAt:time(data.expiresAt)};data=privateView(data,{personId:data.idPessoa,kind:'self',now});}
 else{need(view==='profile'||view==='status');data=decode(view,view==='status'&&data.egressEndsAtExclusive!==null?{...data,egressEndsAtExclusive:time(data.egressEndsAtExclusive)}:data);}
 return frozen({...value,data});
}
