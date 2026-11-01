export const editableProfileFields=Object.freeze(['contactEmail','phone','preferredName','instagram','lattes','orcid','linkedin','website','photoUrl','academicBio','interestAxisIds','optionalCommunications','stateCode','city','municipalityCode']);
export const sensitiveProfileFields=Object.freeze(['birthDate','countryCode','courseId','birthCity','sex']);
const check=ok=>{if(!ok)throw Object.assign(Error('SCHEMA_UNSUPPORTED'),{code:'SCHEMA_UNSUPPORTED'});};
export function validateProfilePatch(p,self=true){
 check(p&&Object.getPrototypeOf(p)===Object.prototype&&Object.keys(p).length>0);
 const keys=self?editableProfileFields:[...editableProfileFields,...sensitiveProfileFields,'displayName','academicReference'];
 for(const [k,v]of Object.entries(p)){
  check(keys.includes(k));
  if(k==='optionalCommunications')check(typeof v==='boolean');
  else if(k==='interestAxisIds')check(Array.isArray(v)&&v.length<=20&&new Set(v).size===v.length&&v.every(s=>/^[A-Za-z0-9_-]{1,48}$/.test(s)));
  else {check(typeof v==='string'&&v.length<=(k==='academicBio'?3000:['lattes','linkedin','website','photoUrl'].includes(k)?2000:180)&&!/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(v));
   if(['lattes','linkedin','website','photoUrl'].includes(k)&&v)check(/^https:\/\/[^\s/@]+(?:\/[^\s]*)?$/.test(v));
   if(k==='sex')check(v.length<=60);
   if(k==='contactEmail')check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  }
 }
 return p;
}
export function decodeProfileDetails(v){
 check(v&&Object.keys(v).sort().join()===['schemaVersion','idPessoa','displayLabel','sourceRevision','profileDetails'].sort().join()&&v.schemaVersion==='safe-own-profile-v2'&&typeof v.displayLabel==='string'&&/^[A-Za-z0-9_-]{1,48}$/.test(v.idPessoa)&&Number.isSafeInteger(v.sourceRevision)&&v.sourceRevision>0);
 const d=v.profileDetails;check(d&&Object.keys(d).sort().join()===['schemaVersion','profileRevision','personRevision','cpf','rga','fields','missing','editableFields','courseLabel'].sort().join()&&d.schemaVersion==='member-own-profile-details-v1'&&Number.isSafeInteger(d.profileRevision)&&d.profileRevision>=0&&d.personRevision===v.sourceRevision);
 check(d.courseLabel===null||typeof d.courseLabel==='string'&&d.courseLabel.length<=240);
 for(const k of ['cpf','rga'])check(d[k]===null||typeof d[k]==='string'&&/^\d{1,30}$/.test(d[k]));
 check(Array.isArray(d.editableFields)&&new Set(d.editableFields).size===d.editableFields.length&&d.editableFields.every(k=>editableProfileFields.includes(k)));
 const keys=[...editableProfileFields,...sensitiveProfileFields,'academicReference'];check(d.fields&&Object.keys(d.fields).every(k=>keys.includes(k))&&keys.filter(k=>!['birthCity','sex'].includes(k)).every(k=>Object.hasOwn(d.fields,k)));
 for(const [k,x]of Object.entries(d.fields))if(x!==null&&!(k==='contactEmail'&&x===''))validateProfilePatch({[k]:x},false);
 check(Array.isArray(d.missing)&&new Set(d.missing).size===d.missing.length&&d.missing.every(k=>['cpf','birthDate','countryCode','city','courseId','stateCode'].includes(k)));return v;
}
