const {test}=require('node:test'),a=require('node:assert/strict');
const route='/admin/ingressos-membros/convite',enrollmentId='a'.repeat(32),operationId='b'.repeat(32);
const payload={enrollmentId,revision:3,action:'CONFIRM_ADMISSION',reason:'Decisão exclusivamente sintética',membershipType:'MEMBRO_INGRESSANTE',approvedOn:'2026-11-26',confirmed:true};
test('admission form payload crosses the actual member transport unchanged and requires all decision fields',async()=>{
 const {createMemberOperations}=await import('../src/services/member-operations.mjs');let seen;
 const service=createMemberOperations({auth:{capture:()=>({uid:'SYN',generation:1}),assert:()=>{}},execute:async(slot,intent)=>{seen={slot,intent};return {receipt:{state:'COMPLETED'}};}});
 const answer=await service.post(route,payload);a(answer.ok);a.match(answer.message,/Decisão de admissão/);a.deepEqual(seen,{slot:'members:invitation:'+enrollmentId,intent:{route,payload}});
 for(const field of ['membershipType','approvedOn','confirmed']){const invalid={...payload};delete invalid[field];await a.rejects(service.post(route,invalid),e=>e.code==='SCHEMA_UNSUPPORTED');}
 await a.rejects(service.post(route,{...payload,approvalRef:'FORGED'}));
});
test('command validator accepts canonical confirmation and draft invitation while rejecting invented decisions',async()=>{
 const {input,SCHEMA}=await import('../src/services/command-contract.mjs');
 const command={schemaVersion:SCHEMA,operationId,commandType:'members.ingress.execute',target:{personId:'SYN_PERSON',linkId:null},payload:{operation:'MANAGE_INVITATION',...payload},evidenceRefs:['SYN_EVIDENCE'],decisionRef:'DEC_'+operationId};delete command.payload.revision;
 a.doesNotThrow(()=>input(command));
 for(const patch of [{confirmed:false},{membershipType:'ADMIN'},{approvedOn:'invalid'},{reason:'short'}])a.throws(()=>input({...command,payload:{...command.payload,...patch}}));
 a.throws(()=>input({...command,decisionRef:null}));
 a.doesNotThrow(()=>input({...command,decisionRef:null,payload:{operation:'MANAGE_INVITATION',enrollmentId,action:'SEND',reason:'Convite sintético'}}));
 const draft={...command,decisionRef:null,payload:{operation:'PRE_REGISTER',identity:null,identifiers:[],registration:{fullName:'Pessoa sintética',email:'synthetic@example.invalid',rga:'99912345',phone:'+5566999990000'},profile:{},approvalRef:null}};
 a.doesNotThrow(()=>input(draft));a.throws(()=>input({...draft,decisionRef:'FORGED'}));
});
