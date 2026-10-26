import {fail,PortalError} from "./errors.mjs";
// Auth is authentication only. Role/custom claims are deliberately unused.
class AuthService {
 constructor(auth,sdk){this.auth=auth;this.sdk=sdk;this.generation=0;this.uid=null;this.online=true;this.error='AUTH_REQUIRED';this.privateCache=new Map();this.listeners=new Set();this.pending=new Set();this.expiry=null;this.ready=auth.authStateReady().then(()=>this.accept(auth.currentUser));this.stopAuth=sdk.onIdTokenChanged(auth,u=>this.accept(u));}
 accept(user){const next=user?.uid??null;if(next!==this.uid){this.clear('AUTH_REQUIRED');this.uid=next;}if(next&&this.error==='AUTH_REQUIRED')this.error='STALE_AUTHORIZATION';if(!next)this.error='AUTH_REQUIRED';}
 clear(code='STALE_AUTHORIZATION'){this.generation++;this.error=code;this.privateCache.clear();clearTimeout(this.expiry);for(const cancel of [...this.listeners])cancel(code);this.listeners.clear();for(const ctrl of this.pending)ctrl.abort();this.pending.clear();}
 capture(){if(!this.uid||this.auth.currentUser?.uid!==this.uid)fail('AUTH_REQUIRED');if(!this.online)fail('OFFLINE_NOT_ALLOWED');return {uid:this.uid,generation:this.generation};}
 assert(ticket){if(ticket.uid!==this.uid||ticket.generation!==this.generation)fail('STALE_AUTHORIZATION');if(!this.online)fail('OFFLINE_NOT_ALLOWED');}
 async token(ticket){this.assert(ticket);try{const result=await this.auth.currentUser.getIdTokenResult();this.assert(ticket);if(Date.parse(result.expirationTime)<=Date.now()){this.clear('AUTH_REQUIRED');fail('AUTH_REQUIRED');}return result.token;}catch(e){if(e instanceof PortalError)throw e;this.clear('AUTH_REQUIRED');fail('AUTH_REQUIRED');}}
 validated(portal){if(portal.schemaVersion==='portal-binding-v11'){if(portal.uid!==this.uid||portal.active!==true){this.clear('ACCESS_REVOKED');fail('ACCESS_REVOKED')}this.error=null;clearTimeout(this.expiry);return;}if(portal.uid!==this.uid||portal.stale||!portal.ativo||!portal.podeAcessarPortal){this.clear('STALE_AUTHORIZATION');fail('STALE_AUTHORIZATION');}const ms=Date.parse(portal.validUntil)-Date.now();if(ms<=0){this.clear('STALE_AUTHORIZATION');fail('STALE_AUTHORIZATION');}this.error=null;clearTimeout(this.expiry);this.expiry=setTimeout(()=>this.clear('STALE_AUTHORIZATION'),Math.min(ms,2147483647));this.expiry.unref?.();}
 setOnline(online){if(this.online!==Boolean(online)){this.online=Boolean(online);this.clear(online?'STALE_AUTHORIZATION':'OFFLINE_NOT_ALLOWED');}}
 async logout(){this.clear('AUTH_REQUIRED');this.uid=null;await this.sdk.signOut(this.auth);if(this.afterCleanup)await this.afterCleanup();}
 async dispose(){this.stopAuth();this.clear('AUTH_REQUIRED');this.uid=null;}
 summary(){return Object.freeze({uid:this.uid,authenticated:!!this.uid,online:this.online,error:this.error,privateItems:this.privateCache.size,listeners:this.listeners.size});}
}
export {AuthService};

