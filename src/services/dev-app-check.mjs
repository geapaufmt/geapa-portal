const instances=new WeakMap();
export function appCheckFailureDiagnostic(error){
 const codes=['appCheck/recaptcha-error','appCheck/fetch-status-error','appCheck/fetch-network-error','appCheck/fetch-parse-error','appCheck/throttled','appCheck/initial-throttle','appCheck/use-before-activation'];
 const code=codes.includes(error?.code)?error.code:'APP_CHECK_OTHER';
 const status=Number(error?.customData?.httpStatus);
 return {stage:code==='appCheck/recaptcha-error'?'RECAPTCHA_EXECUTE':code.startsWith('appCheck/fetch-')?'APP_CHECK_TOKEN_EXCHANGE':'APP_CHECK_TOKEN',code,...(Number.isInteger(status)&&status>=400&&status<=599?{status}:{})};
}
export async function devAppCheck(app,siteKey){
 const sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js');
 let entry=instances.get(app);
 if(entry&&entry.siteKey!==siteKey)throw Object.assign(Error('APP_CHECK_INVALID'),{code:'APP_CHECK_INVALID'});
 if(!entry){entry={siteKey,instance:sdk.initializeAppCheck(app,{provider:new sdk.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:false})};instances.set(app,entry);}
 try{return (await sdk.getToken(entry.instance,false)).token;}
 catch(error){if(app.options.projectId==='geapa-convergencia-dev')console.warn(JSON.stringify(appCheckFailureDiagnostic(error)));throw error;}
}
