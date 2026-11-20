const instances=new WeakMap();
export function appCheckFailureDiagnostic(error){
 const codes=['appCheck/recaptcha-error','appCheck/fetch-status-error','appCheck/fetch-network-error','appCheck/fetch-parse-error','appCheck/throttled','appCheck/initial-throttle','appCheck/use-before-activation'];
 const code=codes.includes(error?.code)?error.code:'APP_CHECK_OTHER';
 const status=Number(error?.customData?.httpStatus);
 return {stage:code==='appCheck/recaptcha-error'?'RECAPTCHA_EXECUTE':code.startsWith('appCheck/fetch-')?'APP_CHECK_TOKEN_EXCHANGE':'APP_CHECK_TOKEN',code,...(Number.isInteger(status)&&status>=400&&status<=599?{status}:{})};
}
export function appCheckResourcePhase(name){
 let url;
 try{url=new URL(name);}catch{return null;}
 if(url.protocol!=='https:')return null;
 if(url.hostname==='www.gstatic.com'&&url.pathname.endsWith('/firebase-app-check.js'))return 'SDK';
 if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/recaptcha/releases/'))return 'RECAPTCHA_SCRIPT';
 if(['www.google.com','recaptcha.google.com','www.recaptcha.net'].includes(url.hostname)){
  if(url.pathname==='/recaptcha/enterprise.js')return 'RECAPTCHA_SCRIPT';
  if(url.pathname==='/recaptcha/enterprise/anchor')return 'RECAPTCHA_FRAME';
 }
 if(url.hostname==='content-firebaseappcheck.googleapis.com'&&url.pathname.endsWith(':exchangeRecaptchaEnterpriseToken'))return 'APP_CHECK_TOKEN_EXCHANGE';
 return null;
}
export async function devAppCheck(app,siteKey){
 const dev=app.options.projectId==='geapa-convergencia-dev';
 const started=dev?performance.now():0;
 let phase='APP_CHECK_SDK';
 try{
  const sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js');
  phase='APP_CHECK_INIT';
  let entry=instances.get(app);
  if(entry&&entry.siteKey!==siteKey)throw Object.assign(Error('APP_CHECK_INVALID'),{code:'APP_CHECK_INVALID'});
  if(!entry){entry={siteKey,instance:sdk.initializeAppCheck(app,{provider:new sdk.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:false})};instances.set(app,entry);}
  phase='APP_CHECK_TOKEN';
  return (await sdk.getToken(entry.instance,false)).token;
 }catch(error){
  if(dev){
   const diagnostic=appCheckFailureDiagnostic(error);
   const resources=performance.getEntriesByType('resource').filter(entry=>entry.startTime>=started).flatMap(entry=>{
    const resource=appCheckResourcePhase(entry.name);
    if(!resource)return [];
    return [{phase:resource,ms:Math.round(entry.duration),status:entry.responseStatus||null}];
   }).slice(-12);
   console.warn(JSON.stringify({...diagnostic,stage:phase==='APP_CHECK_TOKEN'?diagnostic.stage:phase,ms:Math.round(performance.now()-started),visible:document.visibilityState==='visible',online:navigator.onLine,resources}));
  }
  throw error;
 }
}
