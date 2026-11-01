// Firebase alone owns credentials. No token copying or custom session storage.
export async function restoreAuthentication(app,config,sdk,report=()=>{}){
 if(!['portal-geapa','geapa-convergencia-dev'].includes(config.projectId))throw Error('FIREBASE_CONFIG_REJECTED');
 const modes=[sdk.browserLocalPersistence,sdk.browserSessionPersistence,sdk.inMemoryPersistence];
 const auth=sdk.initializeAuth(app,{persistence:modes,...(config.projectId==='portal-geapa'?{popupRedirectResolver:sdk.browserPopupRedirectResolver}:{})});
 await auth.authStateReady();
 // Upgrade an existing SESSION login using the SDK, preserving the restored user.
 let mode='MEMORY';
 for(const [i,persistence]of modes.entries()){
  try{await sdk.setPersistence(auth,persistence);mode=['LOCAL','SESSION','MEMORY'][i];break;}
  catch(error){if(!['auth/web-storage-unsupported','auth/operation-not-supported-in-this-environment'].includes(error?.code)&&error?.name!=='SecurityError')throw error;}
 }
 report(mode);return auth;
}
export function persistenceNotice(mode){return mode==='LOCAL'?'':mode==='SESSION'?'Este navegador mantém o login apenas nesta sessão. Para permanecer conectado ao reabrir, use um navegador com armazenamento local permitido.':'Este navegador bloqueia o armazenamento do login. Será necessário entrar novamente ao reabrir. Abra o Portal no navegador padrão para manter a sessão, quando permitido.';}
