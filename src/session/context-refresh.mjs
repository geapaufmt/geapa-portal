// Proactive renewal and a separate hard deadline. No proof is ever extended.
export function createContextRefresh({visibility,renew,invalidate,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}){
 let proactive=null,expiry=null,retry=null,paused=false,disposed=false,generation=0,inflight=null,attempt=0;
 const clear=()=>{clearTimer(proactive);clearTimer(expiry);clearTimer(retry);proactive=expiry=retry=null;};
 const request=()=>{
  if(disposed||visibility.hidden){paused=true;return;}
  if(inflight)return inflight;
  const epoch=generation;
  const task=Promise.resolve().then(renew).catch(()=>{}).finally(()=>{
   if(inflight===task)inflight=null;
   if(!disposed&&epoch===generation)retry=setTimer(()=>request(),Math.min(30000,2000*2**Math.min(attempt++,4)));
  });inflight=task;return task;
 };
 const changed=()=>{if(!disposed&&!visibility.hidden&&paused){paused=false;void request();}};
 visibility.addEventListener('visibilitychange',changed);
 return {
  schedule(validUntil){clear();const epoch=++generation;if(disposed)return;paused=false;attempt=0;
   const remaining=Math.max(0,Math.min(2147483647,validUntil-now()));
   proactive=setTimer(()=>{if(epoch===generation)void request();},Math.max(0,remaining-Math.min(30000,remaining/2)));
   expiry=setTimer(()=>{if(disposed||epoch!==generation)return;invalidate();paused=!!visibility.hidden;if(!paused)void request();},remaining);
  },
  cancel(){generation++;clear();paused=false;},
  dispose(){generation++;disposed=true;clear();visibility.removeEventListener('visibilitychange',changed);}
 };
}
