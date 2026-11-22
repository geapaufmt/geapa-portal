'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM}=require('jsdom');
const root=p.resolve(__dirname,'../dist/dev'),session=root+'/assets/physical-560120e5c1fbb33e';
const load=()=>import(pathToFileURL(session+'/login.mjs'));
test('DEV offers Google without disabling password validation or duplicating the button',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8')),d=dom.window.document,{configureLoginForm}=await load();
 configureLoginForm(d,'PASSWORD');configureLoginForm(d,'PASSWORD');
 const b=d.getElementById('entrar-google');a.equal(d.querySelectorAll('#entrar-google').length,1);a.equal(b.type,'submit');a.equal(b.formNoValidate,true);
 for(const id of ['email','password']){a.equal(d.getElementById(id).disabled,false);a.equal(d.getElementById(id).required,true)}
 a.equal(d.getElementById('entrar-email').formNoValidate,false);dom.window.close();
});
test('Google and password share one in-flight login and allow retry after sanitized failure',async()=>{
 const {createLogin}=await load(),calls=[],logs=[],original=console.warn;let reject;
 const sdk={GoogleAuthProvider:class{setCustomParameters(v){a.deepEqual(v,{prompt:'select_account'})}},signInWithPopup(){calls.push('google');return new Promise((_,r)=>{reject=r})},signInWithEmailAndPassword(){calls.push('password');return Promise.resolve({user:{uid:'SYNTHETIC'}})}};
 console.warn=v=>logs.push(JSON.parse(v));
 try{const login=createLogin({}, {projectId:'geapa-convergencia-dev'},sdk),pending=login.signInGoogle();a.equal(login.signIn('fixture@example.invalid','synthetic'),pending);reject(Object.assign(Error('private details'),{code:'auth/popup-closed-by-user',email:'private@example.invalid',credential:'secret'}));await a.rejects(pending);await login.signIn('fixture@example.invalid','synthetic');a.deepEqual(calls,['google','password']);a.deepEqual(logs,[{stage:'DEV_SIGN_IN',method:'GOOGLE',code:'auth/popup-closed-by-user'}]);}finally{console.warn=original}
});
test('password errors retain only an allowlisted Firebase code, never the provider payload',async()=>{
 const {createLogin,loginErrorMessage}=await load(),logs=[],original=console.warn;console.warn=v=>logs.push(JSON.parse(v));
 try{for(const code of ['auth/invalid-credential','malicious@example.invalid']){const error=Object.assign(Error('private payload'),{code});const login=createLogin({}, {projectId:'geapa-convergencia-dev'},{signInWithEmailAndPassword(){return Promise.reject(error)}});await a.rejects(login.signIn('fixture@example.invalid','synthetic'),e=>e===error)}a.deepEqual(logs.map(x=>x.code),['auth/invalid-credential','SIGN_IN_FAILED']);a.equal(loginErrorMessage({code:'auth/invalid-credential'}),loginErrorMessage({code:'auth/user-not-found'}));a.match(loginErrorMessage({code:'auth/operation-not-allowed'}),/habilitado/);}finally{console.warn=original}
});
test('DEV restores popup support and restricts CSP to its authorized helper',async()=>{
 const {restoreAuthentication}=await import(pathToFileURL(session+'/auth-persistence.mjs'));let options;
 await restoreAuthentication({}, {projectId:'geapa-convergencia-dev'},{initializeAuth(_,v){options=v;return {authStateReady:async()=>{}}},browserPopupRedirectResolver:'popup',browserLocalPersistence:'local',browserSessionPersistence:'session',inMemoryPersistence:'memory',setPersistence:async()=>{}});
 a.equal(options.popupRedirectResolver,'popup');a.deepEqual(options.persistence,['local','session','memory']);
 const h=fs.readFileSync(root+'/index.html','utf8');a(h.includes("script-src 'self' https://apis.google.com "));a(h.includes('frame-src https://geapa-convergencia-dev.firebaseapp.com '));a(!h.includes('https://portal-geapa.firebaseapp.com'));
 const app=fs.readFileSync(session+'/app.mjs','utf8'),services=fs.readFileSync(session+'/browser-services.mjs','utf8');a(app.includes("button.id==='entrar-google'?portal.signInGoogle():portal.signIn("));a(services.includes('signInGoogle:login.signInGoogle'));a(app.includes('await signingIn;'));a(!app.includes('deadline(signingIn)'));
});
