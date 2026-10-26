const instances=new WeakMap();
export async function devAppCheck(app,siteKey){
 const sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js');
 let entry=instances.get(app);
 if(entry&&entry.siteKey!==siteKey)throw Object.assign(Error('APP_CHECK_INVALID'),{code:'APP_CHECK_INVALID'});
 if(!entry){entry={siteKey,instance:sdk.initializeAppCheck(app,{provider:new sdk.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:false})};instances.set(app,entry);}
 return (await sdk.getToken(entry.instance,false)).token;
}
