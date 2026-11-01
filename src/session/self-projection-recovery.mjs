// A derived SELF view can expire while Firebase authentication remains valid.
// Hide immediately, then ask the existing Core reader to recheck authority.
// A denial never restores the view. Coalesce watcher errors and bound retries.
export function createSelfProjectionRecovery({auth,hide,read,refresh,failed,now=Date.now}){
 let pending=null,lastUid=null,lastAttempt=-Infinity;
 return function recover(){
  if(pending)return pending;
  if(auth.uid===lastUid&&now()-lastAttempt<30000){hide();return Promise.resolve(false);}
  lastUid=auth.uid;lastAttempt=now();hide();auth.clear('STALE_AUTHORIZATION');
  const uid=auth.uid;
  const task=(async()=>{try{const ticket=auth.capture();await read();auth.assert(ticket);await refresh();auth.assert(ticket);return true;}catch(error){if(auth.uid===uid){hide();await failed(error);}return false;}})();
  pending=task.finally(()=>{pending=null;});return pending;
 };
}
