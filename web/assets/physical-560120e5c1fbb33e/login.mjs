// Authentication method is a deployment choice, never institutional authority.
export function createLogin(auth,config,sdk){
 const mode=config.projectId==='portal-geapa'?'GOOGLE':config.projectId==='geapa-convergencia-dev'?'PASSWORD':null;
 if(!mode)throw Error('FIREBASE_CONFIG_REJECTED');
 let active=null;
 function signIn(email,password){
  if(active)return active;
  let work;
  if(mode==='GOOGLE'){
   const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
   // Popup preserves the existing PROD Google login and does not require
   // cross-site redirect storage. No Drive scope or inferred role is requested.
   work=sdk.signInWithPopup(auth,provider);
  }else{
   if(typeof email!=='string'||!email.includes('@')||typeof password!=='string'||!password)return Promise.reject(Object.assign(Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'}));
   work=sdk.signInWithEmailAndPassword(auth,email,password);
  }
  active=Promise.resolve(work).finally(()=>{active=null});return active;
 }
 return Object.freeze({mode,signIn});
}
export function configureLoginForm(document,mode){
 if(mode!=='GOOGLE')return;
 for(const id of ['email','password']){const input=document.getElementById(id);input.hidden=true;input.disabled=true;input.required=false;input.value='';document.querySelector('label[for="'+id+'"]').hidden=true;}
 document.getElementById('entrar-email').textContent='Entrar com Google';
 const eyebrow=document.querySelector('#tela-acesso .eyebrow');if(eyebrow)eyebrow.textContent='Acesso';
}
export function loginErrorMessage(error){
 if(error?.code==='auth/popup-blocked')return 'Permita a janela de login do Google neste navegador e tente novamente.';
 if(['auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(error?.code))return 'Login não concluído. Clique em Entrar com Google para tentar novamente.';
 return null;
}
