import {validateProfilePatch} from './profile-fields.mjs';
import {fail,id,operation} from './errors.mjs';
export const SCHEMA='geapa-members-command-v13';
export const TYPES=Object.freeze(['members.voluntary.submit','members.voluntary.review','members.self.update','members.profile.correct','members.ingress.execute','members.discipline.suspend','members.discipline.dismiss','members.membership.voluntaryExit','members.governance.appoint','members.governance.endFunction','members.governance.boardTerm','members.onboarding.complete']);
export const scopes=Object.freeze(['PRESIDENCIA','ADMINISTRACAO','RECURSOS_HUMANOS','FINANCAS','COMUNICACAO','EXTENSAO','EVENTOS']);
export const need=ok=>{if(!ok)fail('SCHEMA_UNSUPPORTED');};
export function exact(v,keys){need(v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));}
export function canonical(v){if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);if(typeof v==='number'){need(Number.isSafeInteger(v));return String(v)}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';need(v&&Object.getPrototypeOf(v)===Object.prototype);return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
export function frozen(v){if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v)}return v;}
export const clone=v=>JSON.parse(canonical(v));
const text=(v,max)=>need(typeof v==='string'&&v.length<=max&&!/[\x00-\x1f<>]/.test(v));
const civil=v=>{need(typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v));need(new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);};
const interval=(a,z)=>{civil(a);if(z!==null){civil(z);need(z>=a)}};
export const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
// This is input validation, never an authorization predicate. E revalidates the act.
export function input(v){
 if(v?.schemaVersion==='geapa-act-command-v13')return actInput(v);
 exact(v,['schemaVersion','operationId','commandType','target','payload','evidenceRefs','decisionRef']);
 need(v.schemaVersion===SCHEMA&&operation(v.operationId));
 if(['members.binding.associate','members.binding.revoke'].includes(v.commandType))fail('CONTRACT_NOT_AVAILABLE');
 need(TYPES.includes(v.commandType));need(Array.isArray(v.evidenceRefs)&&v.evidenceRefs.every(id)&&new Set(v.evidenceRefs).size===v.evidenceRefs.length&&(v.decisionRef===null||id(v.decisionRef)));
 const t=v.target,p=v.payload,type=v.commandType;
 if(['members.self.update','members.profile.correct'].includes(type)&&p.operation==='CORRECTION_REQUEST'){
  exact(t,['personId']);need(id(t.personId));exact(p,['operation','action','requestId','field','value','reason']);need(operation(p.requestId)&&['displayName','cpf','rga','birthDate','countryCode','courseId'].includes(p.field));need(typeof p.reason==='string'&&p.reason.length<=1000&&!/[<>]/.test(p.reason));
  const self=type==='members.self.update';need((self?['SUBMIT','COMPLEMENT','CANCEL_SELF']:['REVIEW','REQUEST_COMPLEMENT','REJECT','APPLY']).includes(p.action));if(self)need(v.decisionRef===null&&v.evidenceRefs.length===0);
  if(p.action==='SUBMIT')need(p.requestId===v.operationId&&typeof p.value==='string'&&p.value.length<=2000);else need(p.value===null);
 }else if(type==='members.governance.boardTerm'){

  exact(t,['boardId','termId','relationId','scopeKey']);need(id(t.boardId)&&scopes.includes(t.scopeKey));
  const a=p?.action;need(['CREATE_BOARD','END_BOARD','CREATE_TERM','END_TERM','CREATE_RELATION','END_RELATION'].includes(a));
  need(a.endsWith('BOARD')?t.termId===null&&t.relationId===null:a.endsWith('TERM')?id(t.termId)&&t.relationId===null:id(t.termId)&&id(t.relationId));
  exact(p,a.startsWith('END_')?['action','endDate']:a==='CREATE_RELATION'?['action','startDate','endDate']:['action','name','startDate','endDate']);civil(p.endDate);if(a.startsWith('CREATE_'))interval(p.startDate,p.endDate);if(Object.hasOwn(p,'name'))text(p.name,120);
 }else if(['members.voluntary.submit','members.voluntary.review'].includes(type)){
  exact(t,['personId','linkId','requestId']);need(id(t.personId)&&id(t.linkId)&&operation(t.requestId)&&v.decisionRef===null);
  if(type==='members.voluntary.submit'){exact(p,['modality','reason','semesterId',...(p.modality==='SUSPENSAO_TEMPORARIA'?['startDate','endDate']:[]),...(Object.hasOwn(p,'submission')?['submission']:[])]);if(p.submission){exact(p.submission,['reasonCategory','documentReference','acknowledged','version']);text(p.submission.reasonCategory,120);text(p.submission.documentReference,500);need(p.submission.acknowledged===true&&p.submission.version==='PORTAL_VINCULO_V2');}need(t.requestId===v.operationId&&['DESLIGAMENTO_APOS_HOMOLOGACAO','DESLIGAMENTO_FIM_SEMESTRE','SUSPENSAO_TEMPORARIA'].includes(p.modality));need(p.modality!=='DESLIGAMENTO_APOS_HOMOLOGACAO'?id(p.semesterId):p.semesterId===null);if(p.modality==='SUSPENSAO_TEMPORARIA'){interval(p.startDate,p.endDate);need(!!p.submission)};text(p.reason,4000);need(p.reason.trim().length>0&&v.evidenceRefs.length===0);}
  else{exact(p,['action','reason','minutesReference','confirmed',...(Object.hasOwn(p,'requestKind')?['requestKind']:[]),...(Object.hasOwn(p,'graveException')?['graveException']:[])]);need(!p.requestKind||p.requestKind==='SUSPENSAO_TEMPORARIA');need(['START','REQUEST_COMPLEMENT','COMPLEMENT','SCHEDULE','READY','CANCEL_SELF','CANCEL_ADMIN','DENY',...(p.requestKind==='SUSPENSAO_TEMPORARIA'?['APPROVE','START_SUSPENSION','RETURN']:[])].includes(p.action));if(Object.hasOwn(p,'graveException'))need(typeof p.graveException==='boolean'&&p.requestKind==='SUSPENSAO_TEMPORARIA');text(p.reason,4000);text(p.minutesReference,500);need(p.reason.trim().length>0&&typeof p.confirmed==='boolean');need(['CANCEL_SELF','COMPLEMENT'].includes(p.action)?v.evidenceRefs.length===0:v.evidenceRefs.length>0);}
 }else if(type==='members.onboarding.complete'&&p?.operation==='ENROLLMENT'){
  exact(t,['personId','enrollmentId']);need(id(t.personId)&&operation(t.enrollmentId)&&v.evidenceRefs.length===0&&v.decisionRef===null);
  need(['ACCEPT','DECLINE','SAVE','ACKNOWLEDGE','IMAGE','COMPLETE'].includes(p.action));
  exact(p,['operation','action',...(p.action==='SAVE'?['profile']:p.action==='ACKNOWLEDGE'?['accepted','termVersion','documents']:p.action==='IMAGE'?['choice','termVersion']:[])]);
  if(p.action==='SAVE'){need(p.profile&&Object.getPrototypeOf(p.profile)===Object.prototype&&Object.keys(p.profile).every(k=>['cpf','birthDate','countryCode','stateCode','city','municipalityCode','courseId','displayName','instagram','lattes','orcid','linkedin','website','photoUrl','academicBio','interestAxisIds','optionalCommunications'].includes(k)));canonical(p.profile);}
  if(p.action==='ACKNOWLEDGE'){need(p.accepted===true&&id(p.termVersion)&&Array.isArray(p.documents)&&p.documents.length>0&&p.documents.length<=20);for(const d of p.documents){exact(d,['id','version']);need(id(d.id)&&id(d.version));}}
  if(p.action==='IMAGE')need(['GRANTED','DECLINED','REVOKED'].includes(p.choice)&&id(p.termVersion));
 }else if(type==='members.ingress.execute'&&p?.operation==='MANAGE_INVITATION'){
  exact(t,['personId','linkId']);need(id(t.personId)&&t.linkId===null&&id(v.decisionRef)&&v.evidenceRefs.length>0);
  exact(p,['operation','enrollmentId','action','reason']);need(operation(p.enrollmentId)&&['SEND','RESEND','CANCEL'].includes(p.action));text(p.reason,500);need(p.reason.trim().length>0);
 }else if(type==='members.ingress.execute'&&p?.operation==='PRE_REGISTER'){
  exact(t,['personId','linkId']);need(id(t.personId)&&t.linkId===null&&id(v.decisionRef)&&v.evidenceRefs.length>0);
  exact(p,['operation','identity','identifiers','registration','profile','approvalRef']);need(id(p.approvalRef));
  if(p.identity!==null){exact(p.identity,['displayName']);text(p.identity.displayName,120);}
  exact(p.registration,['fullName','email','rga','phone']);text(p.registration.fullName,180);text(p.registration.email,180);text(p.registration.rga,30);text(p.registration.phone,20);
  need(Array.isArray(p.identifiers));for(const row of p.identifiers){exact(row,['id','kind','value']);need(id(row.id)&&['EMAIL','RGA'].includes(row.kind)&&typeof row.value==='string');}
  need(p.profile&&Object.getPrototypeOf(p.profile)===Object.prototype);canonical(p.profile);
 }else{
  const link=['members.ingress.execute','members.discipline.suspend','members.discipline.dismiss','members.membership.voluntaryExit'].includes(type),fn=['members.governance.appoint','members.governance.endFunction'].includes(type);
  exact(t,link?['personId','linkId']:fn?['personId','functionId']:['personId']);Object.values(t).forEach(x=>need(id(x)));
  if(type==='members.self.update'){exact(p,['patch']);validateProfilePatch(p.patch);need(v.decisionRef===null&&v.evidenceRefs.length===0)}
  else if(type==='members.profile.correct'){exact(p,['corrections','justification']);text(p.justification,120);need(p.justification.trim().length>0);need(p.corrections&&Object.keys(p.corrections).length>0);validateProfilePatch(p.corrections,false)}
  else if(type==='members.ingress.execute'){exact(p,['operation','identity','identifiers','startDate','endDate','originalEventId']);need(['RECORD_INGRESS','RECORD_EFFECTIVATION','RETIFICACAO'].includes(p.operation));interval(p.startDate,p.endDate);if(p.identity!==null){exact(p.identity,['displayName']);text(p.identity.displayName,120);need(p.identity.displayName.trim().length>0)}need(Array.isArray(p.identifiers));for(const x of p.identifiers){exact(x,['id','kind','value']);need(id(x.id)&&['EMAIL','RGA','CPF'].includes(x.kind)&&typeof x.value==='string')}need(p.operation==='RETIFICACAO'?id(p.originalEventId):p.originalEventId===null)}
  else if(type==='members.governance.appoint'){exact(p,['idVinculo','idCargo','scopeKey','idDiretoria','idTermo','startDate','endDatePlanned']);for(const k of ['idVinculo','idCargo','idDiretoria','idTermo'])need(id(p[k]));need(p.scopeKey===null||scopes.includes(p.scopeKey));need(p.endDatePlanned!==null);interval(p.startDate,p.endDatePlanned)}
  else if(type==='members.governance.endFunction'){exact(p,['endDateReal']);civil(p.endDateReal)}
  else if(type==='members.onboarding.complete'){exact(p,['childOperations']);exact(p.childOperations,['C','J']);for(const x of Object.values(p.childOperations)){exact(x,['operationId','digest','receiptRef']);need(operation(x.operationId)&&hex(x.digest)&&x.receiptRef==='commandReceipts/'+x.operationId)}need(v.decisionRef===null&&v.evidenceRefs.length===0)}
  else{exact(p,type==='members.discipline.suspend'?['effectiveDate','endDate']:['effectiveDate']);civil(p.effectiveDate);if(type==='members.discipline.suspend')interval(p.effectiveDate,p.endDate)}
 }
 if(!['members.voluntary.submit','members.voluntary.review','members.self.update','members.onboarding.complete'].includes(type))need(v.evidenceRefs.length>0);
 if(type==='members.membership.voluntaryExit')need(v.decisionRef===null);
 else if(!['members.voluntary.submit','members.voluntary.review','members.self.update','members.onboarding.complete','members.profile.correct'].includes(type))need(id(v.decisionRef));
 need(new TextEncoder().encode(canonical(v)).length<=65536);return frozen(clone(v));
}
// Preconditions are supplied by protected admission, never selected by a form.
export function revisions(rows){need(Array.isArray(rows));let previous='';const allowed=['memberProfileCorrections','memberProfileCorrectionIndexes','memberEnrollmentFacts','memberAuthBindings','memberAuthzSubjects','memberEnrollments','memberEnrollmentIndexes','memberVoluntaryRequests','memberVoluntaryIndexes','memberAggregateHeads','memberBoardHeads','memberIdentities','memberPrivateProfiles','memberIdentifiers','memberLinks','memberEvents','memberFunctions','memberGovernanceBoards','memberGovernanceTerms','memberGovernanceBoardTerms'];for(const row of rows){exact(row,['resourceType','id','revision']);const key=row.resourceType+'/'+row.id;need(allowed.includes(row.resourceType)&&id(row.id)&&Number.isSafeInteger(row.revision)&&row.revision>=0&&key>previous);previous=key;}return rows;}

export const MEMBER_OPERATIONAL_TYPES=Object.freeze(['members.onboarding.complete','members.self.update','members.profile.correct','members.ingress.execute','members.voluntary.submit','members.voluntary.review','members.membership.voluntaryExit']);
export const ACT_TYPES=Object.freeze(["ACT.HISTORICAL_PREAGENDA_RECOGNIZE","ACT.PRESENTATION_CONTINUITY_CONNECT","ACT.ACTIVITY_ADMIN_REVIEW","ACT.PHOTO_UPLOAD_REQUEST","ACT.PHOTO_SUBMIT","ACT.PHOTO_REVIEW","ACT.ATTENDANCE_PROOF_UPLOAD_REQUEST","ACT.MEMBER_PRESENTATION_ACTIVITY_CREATE","ACT.CORRECTION_TERMS_REVISE","ACT.CYCLE_CREATE","ACT.CONFIG_RECORD","ACT.CONFIG_ACTIVATE","ACT.CYCLE_OPEN","ACT.SESSION_CONFIGURE","ACT.INCIDENCE_EVALUATE","ACT.CALENDAR_RESERVE","ACT.CALENDAR_RELEASE","ACT.CALENDAR_MOVE","ACT.JOINT_PROPOSE","ACT.JOINT_CONSENT","ACT.COMPOSITION_CONFIRM","ACT.CALENDAR_SWAP_CONFIRM","ACT.THEME_SUBMIT","ACT.THEME_COMPLEMENT","ACT.THEME_MATERIALITY_DECIDE","ACT.THEME_VALIDATE","ACT.THEME_WITHDRAW","ACT.COMPATIBILITY_REQUEST","ACT.COMPATIBILITY_DECIDE","ACT.DYNAMIC_SUBMIT","ACT.DYNAMIC_DECIDE","ACT.DYNAMIC_CANCEL","ACT.REALIZATION_RECOGNIZE","ACT.MATERIAL_SUBMIT","ACT.MATERIAL_REVIEW","ACT.MATERIAL_CORRECTION_REQUEST","ACT.CORRECTION_OPPORTUNITY_OPEN","ACT.MATERIAL_RECEIVE","ACT.MATERIAL_EXCEPTION","ACT.MATERIAL_CORRECTION_SUBMIT","ACT.MATERIAL_FINAL_EVALUATE","ACT.OBLIGATION_EVALUATE","ACT.FINAL_TITLE_CONFIRM","ACT.OPERATIONAL_CHECK","ACT.PUBLICATION_APPROVE","ACT.PUBLICATION_WITHDRAW","ACT.RECONSIDERATION_REQUEST","ACT.RECONSIDERATION_DECIDE","ACT.CORRECTION_NOTICE_RECORD","ACT.DRAFT_SAVE","ACT.DRAFT_DELETE","ACT.ARTIFACT_UPLOAD_REQUEST","ACT.ARTIFACT_ARCHIVE_REQUEST","ACT.PUBLICATION_COMMUNICATE","ACT.CORRECTION_NOTIFY","ACT.CAPACITY_ASSESSMENT_SEAL","ACT.ACTIVITY_TYPE_SAVE","ACT.ACTIVITY_SAVE","ACT.ACTIVITY_REALIZE","ACT.ATTENDANCE_CONFIGURE","ACT.ATTENDANCE_ENROLL","ACT.ATTENDANCE_OPEN","ACT.ATTENDANCE_CLOSE","ACT.ATTENDANCE_RECORD","ACT.ATTENDANCE_CORRECT","ACT.ATTENDANCE_JUSTIFICATION_REQUEST","ACT.ATTENDANCE_JUSTIFICATION_DECIDE","ACT.ATTENDANCE_SAVE_DRAFT","ACT.ATTENDANCE_FINALIZE","ACT.ATTENDANCE_REOPEN","ACT.ATTENDANCE_ROSTER_APPLY","ACT.ACTIVITY_PUBLICATION_SET","ACT.ACTIVITY_POLICY_SAVE","ACT.INCIDENCE_COVERAGE_APPROVE","ACT.CALENDAR_CHANGE_PROPOSE","ACT.CALENDAR_CHANGE_CONFIRM","ACT.QUOTA_CONFIGURE","ACT.THEME_WAIT_ADMIT","ACT.QUOTA_PRIORITY_RESOLVE","ACT.CYCLE_THEME_SETTINGS_RECORD","ACT.CYCLE_PUBLICATION_SETTINGS_RECORD","ACT.CYCLE_MATERIAL_SETTINGS_RECORD","ACT.ACTIVITY_SEMESTER_SAVE","ACT.CYCLE_GOVERNANCE_EDIT","ACT.ATTENDANCE_EXCEPTIONAL_WINDOW_OPEN","ACT.ATTENDANCE_EXCEPTIONAL_WINDOW_CLOSE"]);
export function actInput(v){
 exact(v,['schemaVersion','operationId','commandType','target','payload','evidenceRefs','decisionRef']);need(v.schemaVersion==='geapa-act-command-v13'&&operation(v.operationId)&&ACT_TYPES.includes(v.commandType));
 exact(v.target,['scope','expected','authorization']);const a=v.target.authorization;exact(a,['kind','sourceId','functionId','actorScope']);need(['SELF','ROLE','EXPLICIT','DEV_ADMIN'].includes(a.kind)&&id(a.sourceId)&&(a.kind==='ROLE'?id(a.functionId):a.functionId===null)&&(a.kind==='DEV_ADMIN'?[null,'SELF'].includes(a.actorScope):a.kind==='SELF'?a.actorScope===null:scopes.includes(a.actorScope)));
 need(Array.isArray(v.target.expected)&&v.target.expected.length<=64&&v.payload&&Object.getPrototypeOf(v.payload)===Object.prototype&&v.evidenceRefs.length===0&&v.decisionRef===null);need(new TextEncoder().encode(canonical(v)).length<=65536);return frozen(clone(v));
}

