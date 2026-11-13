type LoadingLease={message(message:string):void;release():void};
type LoadingUi={adquirirLoading(message:string):LoadingLease};
/** Visual ownership only. Never grants access or changes authentication. */
export function createAuthLoadingView(doc:Document,ui:LoadingUi){
 const overlay=doc.getElementById('portal-global-loading');
 let savedFocus:HTMLElement|null=null,observer:MutationObserver|undefined,lease:LoadingLease|undefined,locked=false;
 const inert=new Map<HTMLElement,boolean>();let previousZ='',previousTab:string|null=null;
 const visible=()=>{
  if(!lease||!overlay?.isConnected)return false;
  for(let el:HTMLElement|null=overlay;el;el=el.parentElement){
   const style=doc.defaultView?.getComputedStyle(el);
   if(el.hidden||el.inert||style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse'||style?.opacity==='0')return false;
  }
  return true;
 };
 function unlock(){
  if(!locked)return;locked=false;
  for(const event of ['click','pointerdown','keydown','submit'])doc.removeEventListener(event,block,true);
  doc.removeEventListener('focusin',focus,true);
  for(const [el,value] of inert)el.inert=value;inert.clear();
  if(overlay){overlay.style.zIndex=previousZ;if(previousTab===null)overlay.removeAttribute('tabindex');else overlay.setAttribute('tabindex',previousTab);}
  const target=savedFocus?.isConnected&&!savedFocus.closest('[hidden],[inert]')&&savedFocus!==doc.body?savedFocus:doc.querySelector<HTMLElement>('main h1, main h2, #entrar-email');
  savedFocus=null;
  if(target){const tab=target.getAttribute('tabindex');target.tabIndex=-1;target.focus();if(tab===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',tab);}
 }
 function sync(){
  if(!visible()){unlock();return;}
  if(!locked&&overlay){
   savedFocus=doc.activeElement as HTMLElement;previousZ=overlay.style.zIndex;previousTab=overlay.getAttribute('tabindex');locked=true;
   overlay.style.zIndex='2147483000';overlay.tabIndex=-1;
   for(const event of ['click','pointerdown','keydown','submit'])doc.addEventListener(event,block,true);
   doc.addEventListener('focusin',focus,true);
  }
  for(const el of Array.from(doc.body.children))if(el instanceof (doc.defaultView?.HTMLElement??HTMLElement)&&el!==overlay&&!inert.has(el)){inert.set(el,el.inert);el.inert=true;}
  if(overlay&&!overlay.contains(doc.activeElement))overlay.focus();
 }
 function block(event:Event){if(!visible()){unlock();return;}event.preventDefault();event.stopImmediatePropagation();if(event.type==='keydown')overlay?.focus();}
 function focus(event:FocusEvent){if(!visible()){unlock();return;}if(overlay&&!overlay.contains(event.target as Node))overlay.focus();}
 function hide(){const owner=lease;lease=undefined;observer?.disconnect();observer=undefined;doc.defaultView?.removeEventListener('resize',sync);try{unlock();}finally{owner?.release();}}
 return {show(message:string){
  if(!overlay)return;if(lease){lease.message(message);sync();return;}
  try{lease=ui.adquirirLoading(message);sync();observer=new (doc.defaultView?.MutationObserver??MutationObserver)(sync);observer.observe(doc.body,{childList:true,attributes:true,attributeFilter:['hidden','style','class']});observer.observe(overlay,{attributes:true,attributeFilter:['hidden','style','class','inert']});doc.defaultView?.addEventListener('resize',sync);}catch(error){hide();throw error;}
 },message(message:string){lease?.message(message);sync();},hide};
}
export function createAuthLoading(view:{show(message:string):void;message(message:string):void;hide():void}){
 let serial=0,ticket=0,identity:string|null=null,established=false,mode:'restore'|'login'='restore';
 const message=()=>mode==='login'?'Entrando no Portal GEAPA…':'Restabelecendo seu acesso…';
 function begin(next:'restore'|'login'){mode=next;try{if(!ticket){ticket=++serial;view.show(message());}else view.message(message());return ticket;}catch(error){ticket=0;view.hide();throw error;}}
 return {begin,get ticket(){return ticket;},account(uid:string|null){if(uid!==identity){identity=uid;established=false;if(ticket)ticket=++serial;}if(!uid){this.finish(ticket,false);return;}if(!established)begin(mode);},finish(expected:number,ready:boolean){if(!expected||expected!==ticket)return;ticket=0;established=ready;view.hide();},reset(){identity=null;established=false;this.finish(ticket,false);}};
}
