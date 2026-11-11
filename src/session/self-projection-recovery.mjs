// A derived SELF view can expire while Firebase authentication remains valid.
// Hide immediately, then ask the existing Core reader to recheck authority.
// A denial never restores the view. Coalesce watcher errors and bound retries.
export function createSelfProjectionRecovery({auth,hide,read,refresh,failed,now=Date.now}){
 let pending=null,lastKey=null,lastAttempt=-Infinity;
 return function recover(){
  const key=auth.uid+':'+auth.generation;
  if(pending?.key===key)return pending.promise;
  if(key===lastKey&&now()-lastAttempt<30000){hide();return Promise.resolve(false);}
  lastKey=key;lastAttempt=now();hide();auth.clear('STALE_AUTHORIZATION');
  const uid=auth.uid,generation=auth.generation,task={key,promise:null};
  task.promise=(async()=>{try{const ticket=auth.capture();await read();auth.assert(ticket);await refresh();auth.assert(ticket);return true;}catch(error){if(auth.uid===uid&&auth.generation===generation){hide();await failed(error);}return false;}})().finally(()=>{if(pending===task)pending=null;});
  pending=task;return task.promise;
 };
}
