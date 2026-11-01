import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {devAppCheck} from './dev-app-check.mjs';
const PROJECT=deployment.projectId,ENDPOINT=deployment.endpoint;
const fail=code=>{throw Object.assign(Error(code),{code,nodeProjection:true});};
export function createProjectionRecovery({auth,db,storage,config,fetchImpl=fetch,attest,wait=ms=>new Promise(r=>setTimeout(r,ms)),record=()=>{}}){
 const pending=new Map(),controllers=new Set();let epoch=0;
 const clear=()=>{epoch++;pending.clear();for(const c of controllers)c.abort();controllers.clear();};auth.listeners?.add(clear);
 const enabled=config?.enabled===true;
 const scope=route=>enabled&&(config.frequencyEnabled===true&&route==='/v2/minha-frequencia'||['/admin/atividades','/atividades/listar','/atividades/bundle','/atividades/detalhes-preload','/atividades/detalhe','/admin/atividades/detalhe'].includes(route));
 async function recover(viewId){
  if(!enabled||db.app.options.projectId!==PROJECT||config.projectId!==PROJECT||config.endpoint!==ENDPOINT||typeof config.siteKey!=='string'||!config.siteKey)fail('PROJECTION_UNAVAILABLE');
  if(!(viewId==='frequency'&&config.frequencyEnabled===true)&&viewId!=='activities'&&!/^activity_[A-Za-z0-9_-]{1,128}$/.test(viewId))fail('PROJECTION_UNAVAILABLE');
  const t=auth.capture(),e=epoch,key=t.uid+'|'+viewId,deadline=Date.now()+120000;
  const assert=()=>{auth.assert(t);if(e!==epoch)fail('STALE_AUTHORIZATION');};
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(PROJECT+'|'+key)))].map(x=>x.toString(16).padStart(2,'0')).join('');assert();
   const journal='geapa.projection.pending.v1.'+digest;let prior;
   try{prior=storage.getItem(journal);if(prior&&prior!=='PENDING')fail('PROJECTION_UNAVAILABLE');storage.setItem(journal,'PENDING');}catch{fail('PROJECTION_UNAVAILABLE');}
   async function call(action){const callStarted=Date.now();
    assert();const token=await auth.token(t),appToken=await (attest?attest(config):devAppCheck(db.app,config.siteKey));assert();
    const remaining=deadline-Date.now();if(remaining<=0)fail('PROJECTION_REBUILDING');
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),Math.min(110000,remaining));controllers.add(c);auth.pending?.add(c);
    try{const r=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Firebase-AppCheck':appToken},body:JSON.stringify({action,request:{viewId}}),credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});const v=await r.json();assert();
     if(!r.ok||v.error)fail(['AUTH_BINDING_INVALID','ACCESS_REVOKED','AUTHORIZATION_DENIED','APP_CHECK_REQUIRED','APP_CHECK_INVALID','PILOT_LIMIT_REACHED'].includes(v.error?.code)?v.error.code:'PROJECTION_UNAVAILABLE');
     if(v.viewId!==viewId||!['CURRENT','MISSING','STALE','REBUILDING'].includes(v.state))fail('PROJECTION_UNAVAILABLE');record({view:viewId==='frequency'?'frequency':viewId==='activities'?'list':'detail',action,state:v.state,priorState:v.priorState||null,httpMs:Date.now()-callStarted,metrics:Object.fromEntries(Object.entries(v.metrics||{}).filter(([k,n])=>['reads','sdkCalls','writes','attempts','transactionMs','authCalls','authMs','appCheckMs','controlReads','controlSdkCalls','totalMs'].includes(k)&&Number.isFinite(n)))});return v;
    }finally{clearTimeout(timer);controllers.delete(c);auth.pending?.delete(c);}
   }
   let v=await call(prior?'projectionStatus':'projectionRecover');
   for(let n=0;v.state==='REBUILDING'&&n<3;n++){await wait(2000);assert();v=await call('projectionStatus');}
   assert();if(v.state==='CURRENT'){storage.removeItem(journal);return v;}
   if(v.state!=='REBUILDING')storage.removeItem(journal); // Next explicit user attempt may claim an expired/failed build.
   fail('PROJECTION_REBUILDING');
  })().catch(error=>{error.nodeProjection=true;throw error;}).finally(()=>{if(pending.get(key)===task)pending.delete(key);});pending.set(key,task);return task;
 }
 function failure(error){
  if(error.code==='STALE_AUTHORIZATION')throw error;
  const code=error.code||'PROJECTION_UNAVAILABLE';
  const message=code==='PROJECTION_REBUILDING'?'As informações estão sendo atualizadas. Aguarde e atualize a consulta.':code==='PILOT_LIMIT_REACHED'?'O limite temporário de atualização foi atingido. Tente novamente mais tarde.':['AUTH_BINDING_INVALID','ACCESS_REVOKED','AUTHORIZATION_DENIED','permission-denied'].includes(code)?'Seu acesso não permite consultar estas informações.':'Não foi possível atualizar as informações. Atualize a consulta para recuperar a tentativa anterior.';
  return {ok:false,errorCode:code,message};
 }
 return {enabled,scope,recover,failure,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
