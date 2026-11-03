import {deploymentProfile} from '../deployment-profile.mjs';
const instances=new WeakMap();
// Temporary DEV diagnostics: stage and fixed error classifications only.
// No tokens, keys, request bodies, credentials or provider argument values.
let diagnosticStarted=false;
function diagnose(){
 if(deploymentProfile.environment!=='DEV'||diagnosticStarted)return;
 diagnosticStarted=true;
 const record=(stage,details={})=>console.info(JSON.stringify({stage:'APP_CHECK_DIAGNOSTIC',phase:stage,...details}));
 const safeError=e=>({kind:e===null?'NULL':typeof e,code:/^[a-zA-Z_/-]{1,80}$/.test(e?.code||'')?e.code:'UNSPECIFIED',reason:/timeout/i.test(String(e?.message||e||''))?'TIMEOUT':/network|failed to fetch/i.test(String(e?.message||e||''))?'NETWORK':/site.?key|domain/i.test(String(e?.message||e||''))?'KEY_OR_DOMAIN':'UNSPECIFIED'});
 function instrument(){
  const api=window.grecaptcha?.enterprise;if(!api||api.__geapaDiagnostic)return;
  Object.defineProperty(api,'__geapaDiagnostic',{value:true});
  const render=api.render,execute=api.execute;
  api.render=function(element,options){const original=options||{};record('RECAPTCHA_RENDER');return render.call(this,element,{...original,callback:(...args)=>{record('RECAPTCHA_CALLBACK_SUCCESS');return original.callback?.(...args);},'error-callback':(...args)=>{record('RECAPTCHA_CALLBACK_ERROR');return original['error-callback']?.(...args);}});};
  api.execute=function(...args){const started=Date.now();record('RECAPTCHA_EXECUTE');return execute.apply(this,args).then(value=>{record('RECAPTCHA_EXECUTE_RESOLVED',{ms:Date.now()-started,nonempty:typeof value==='string'&&value.length>0});return value;},error=>{record('RECAPTCHA_EXECUTE_REJECTED',{ms:Date.now()-started,...safeError(error)});throw error;});};
  record('RECAPTCHA_INSTRUMENTED');
 }
 instrument();
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes){if(n.nodeName==='SCRIPT'&&n.src?.startsWith('https://www.google.com/recaptcha/enterprise.js')){record('RECAPTCHA_SCRIPT');n.addEventListener('load',()=>{record('RECAPTCHA_SCRIPT_LOADED');instrument();observer.disconnect();},true);n.addEventListener('error',()=>{record('RECAPTCHA_SCRIPT_ERROR');observer.disconnect();},{once:true});}}});
 observer.observe(document.head,{childList:true});setTimeout(()=>observer.disconnect(),30000);
 document.addEventListener('securitypolicyviolation',event=>{if(/recaptcha|firebaseappcheck/.test(event.blockedURI||''))record('CSP_BLOCK',{directive:event.effectiveDirective});});
}
export async function devAppCheck(app,siteKey){
 diagnose();
 const sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js');
 let entry=instances.get(app);
 if(entry&&entry.siteKey!==siteKey)throw Object.assign(Error('APP_CHECK_INVALID'),{code:'APP_CHECK_INVALID'});
 if(!entry){entry={siteKey,instance:sdk.initializeAppCheck(app,{provider:new sdk.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:false})};instances.set(app,entry);}
 const started=Date.now();
 try{const result=await sdk.getToken(entry.instance,false);if(deploymentProfile.environment==='DEV')console.info(JSON.stringify({stage:'APP_CHECK_DIAGNOSTIC',phase:'APP_CHECK_TOKEN_OK',ms:Date.now()-started}));return result.token;}
 catch(error){if(deploymentProfile.environment==='DEV')console.info(JSON.stringify({stage:'APP_CHECK_DIAGNOSTIC',phase:'APP_CHECK_TOKEN_FAILED',ms:Date.now()-started,code:/^[a-zA-Z_/-]{1,80}$/.test(error?.code||'')?error.code:'UNSPECIFIED',httpStatus:Number.isInteger(error?.customData?.httpStatus)?error.customData.httpStatus:null}));throw error;}
}
