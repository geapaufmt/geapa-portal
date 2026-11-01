// Pause background renewal, not authorization. Invalidate the UI hint at the
// same deadline; returning to the tab must obtain a fresh server decision.
export function createContextRefresh({visibility,renew,invalidate,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}){
 let timer=null,paused=false,disposed=false,generation=0;
 const changed=()=>{if(!disposed&&!visibility.hidden&&paused){paused=false;void renew();}};
 visibility.addEventListener('visibilitychange',changed);
 return {
  // The Core's deadline is not extended. Expire the UI hint before renewing;
  // private readers and commands still authorize every request server-side.
  schedule(validUntil){clearTimer(timer);const scheduled=++generation;if(disposed)return;paused=false;timer=setTimer(()=>{if(disposed||scheduled!==generation)return;timer=null;invalidate();if(visibility.hidden){paused=true;}else void renew();},Math.max(0,Math.min(2147483647,validUntil-now())));},
  cancel(){generation++;clearTimer(timer);timer=null;paused=false;},
  dispose(){generation++;disposed=true;clearTimer(timer);visibility.removeEventListener('visibilitychange',changed);}
 };
}
