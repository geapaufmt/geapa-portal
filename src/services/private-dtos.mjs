import {exact,need,frozen,scopes} from './command-contract.mjs';
import {id} from './errors.mjs';
const timestamp=v=>{need(typeof v?.toMillis==='function'&&Number.isSafeInteger(v.toMillis()));return v.toMillis();};
export function privateView(v,{uid,personId,kind,now}){
 const self=kind==='self';exact(v,self?['schemaVersion','idPessoa','contactEmail','personRevision','profileRevision','issuedAt','expiresAt']:['schemaVersion','ownerUid','idPessoa','capability','purpose','caseId','fieldMask','data','issuedAt','expiresAt']);
 need(id(v.idPessoa)&&v.idPessoa===personId&&timestamp(v.issuedAt)<=now&&now<timestamp(v.expiresAt));
 let out;
 if(self){need(v.schemaVersion==='safe-member-self-profile-v13'&&Number.isSafeInteger(v.personRevision)&&v.personRevision>0&&Number.isSafeInteger(v.profileRevision)&&v.profileRevision>0&&typeof v.contactEmail==='string');out={...v};}
 else{
  need(v.schemaVersion==='safe-member-read-view-v13'&&v.ownerUid===uid&&v.capability===(kind==='case'?'MEMBERS_CASE_READ':kind==='audit'?'MEMBERS_PRIVATE_AUDIT':null)&&id(v.purpose)&&id(v.caseId));
  const allowed=kind==='case'?['idPessoa','displayLabel','state','currentFunctions']:['idPessoa','displayLabel','contactEmail','academicReference'];
  need(Array.isArray(v.fieldMask)&&v.fieldMask.length>0&&new Set(v.fieldMask).size===v.fieldMask.length&&v.fieldMask.every(k=>allowed.includes(k)));exact(v.data,v.fieldMask);
  for(const[k,x]of Object.entries(v.data)){if(k==='currentFunctions'){need(x&&Object.getPrototypeOf(x)===Object.prototype&&Object.entries(x).every(([key,on])=>id(key)&&on===true));}else need(typeof x==='string');if(k==='idPessoa')need(x===personId);}
  out={...v,data:{...v.data},fieldMask:[...v.fieldMask]};
 }
 out.issuedAt=new Date(timestamp(v.issuedAt)).toISOString();out.expiresAt=new Date(timestamp(v.expiresAt)).toISOString();return frozen(out);
}
export function functionLabel(row){need(row.scopeKey===null?row.group==='CONSELHO'&&row.roleKey==='CONSELHEIRO_CONSULTIVO':id(row.scopeKey)&&!['null','NO_FUNCTIONAL_SCOPE','CONSELHO'].includes(row.scopeKey));return row.roleKey.replaceAll('_',' ')+(row.scopeKey===null?' — sem área funcional':' — '+row.scopeKey.replaceAll('_',' '));}
