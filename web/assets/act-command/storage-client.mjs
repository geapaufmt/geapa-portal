import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {devAppCheck} from './dev-app-check.mjs';
const PROJECT=deployment.projectId,ENDPOINT=deployment.endpoint,CHUNK=4*1024*1024,MAX=50*1024*1024;
const fail=code=>{throw Object.assign(Error(code),{code});};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=bytes=>{let s='';for(let n=0;n<bytes.length;n+=32768)s+=String.fromCharCode(...bytes.subarray(n,n+32768));return btoa(s);};
export function createStorageClient({auth,db,config,fetchImpl=fetch,attest}){
 const controllers=new Set();const clear=()=>{for(const c of controllers)c.abort();controllers.clear();};auth.listeners?.add(clear);
 const enabled=()=>config.enabled===true&&config.projectId===PROJECT&&db.app.options.projectId===PROJECT&&config.endpoint===ENDPOINT;
 async function call(action,request,ticket){
  if(!enabled())fail('CONTRACT_NOT_AVAILABLE');const token=await auth.token(ticket),app=await(attest?attest():devAppCheck(db.app,config.siteKey));auth.assert(ticket);
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),110000);controllers.add(c);auth.pending?.add(c);
  try{const r=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':app},body:JSON.stringify({action,request}),cache:'no-store',credentials:'omit',redirect:'error',signal:c.signal});const v=await r.json();auth.assert(ticket);if(!r.ok||v.error)fail(v.error?.code||'COMMAND_PENDING');return v;}
  finally{clearTimeout(timer);controllers.delete(c);auth.pending?.delete(c);}
 }
 async function upload(effectRef,bytes){
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX)fail('VALIDATION_ERROR');
  const t=auth.capture();let progress=await call('storageStart',{effectRef},t);if(progress.state==='CONFIRMED')return progress;
  for(let attempts=0;progress.state==='UPLOADING'&&attempts<16;attempts++){
   const offset=progress.offset;if(!Number.isSafeInteger(offset)||offset<0||offset>=bytes.length)fail('COMMAND_PENDING');
   progress=await call('storageChunk',{effectRef,offset,contentBase64:b64(bytes.subarray(offset,Math.min(offset+CHUNK,bytes.length)))},t);
  }
  if(progress.state!=='UPLOADED')fail('COMMAND_PENDING');return call('storageFinalize',{effectRef},t);
 }
 const scope=(kind,id)=>enabled()&&(config[kind]?.includes(id)||config.resourceScope==='CANONICAL_CYCLE'&&['activityIds','presentationIds'].includes(kind)&&typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)&&config.actorUids?.includes(auth.capture().uid));
 function scopeDownload(route,params){return enabled()&&config.actorUids?.includes(auth.capture().uid)&&['/v2/justificativas/documento/arquivo','/v2/apresentacoes/material/arquivo','/v2/apresentacoes/foto/arquivo'].includes(route);}
 async function download(route,params){
  if(!scopeDownload(route,params))fail('CONTRACT_NOT_AVAILABLE');const t=auth.capture(),first=await call('storageDownload',{route,params,offset:0,length:0},t),d=first.data;
  if(first.state==='LEGACY_DRIVE')return {legacyDrive:true};
  if(!d||!Number.isSafeInteger(d.size)||d.size<1||d.size>MAX||!/^[a-f0-9]{64}$/.test(d.sha256))fail('SCHEMA_UNSUPPORTED');const bytes=new Uint8Array(d.size);
  for(let offset=0;offset<d.size;offset+=CHUNK){const length=Math.min(CHUNK,d.size-offset),v=await call('storageDownload',{route,params,offset,length},t);if(v.data?.sha256!==d.sha256||v.data.size!==d.size||v.data.offset!==offset)fail('STALE_REVISION');const part=Uint8Array.from(atob(v.data.contentBase64),c=>c.charCodeAt(0));if(part.length!==length)fail('SCHEMA_UNSUPPORTED');bytes.set(part,offset);}
  if(hex(await crypto.subtle.digest('SHA-256',bytes))!==d.sha256)fail('UNRESOLVED_DEPENDENCY');auth.assert(t);
  return {ok:true,data:{name:d.name,mime:d.mime,size:d.size,sha256:d.sha256,contentBase64:b64(bytes)}};
 }
 return {scope,scopeDownload,upload,download,notice:request=>call('storageNotice',request,auth.capture()),dispose(){clear();auth.listeners?.delete(clear);}};
}
