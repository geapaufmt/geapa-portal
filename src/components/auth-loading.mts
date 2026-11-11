type LoadingUi={mostrarLoading(message:string):void;ocultarLoading():void;atualizarMensagemLoading(message:string):void};
/** Visual ownership only. Never grants access or changes authentication. */
export function createAuthLoadingView(doc:Document,ui:LoadingUi){
 const overlay=doc.getElementById('portal-global-loading');
 let savedFocus:HTMLElement|null=null,observer:MutationObserver|undefined;
 const inert=new Map<HTMLElement,boolean>();let previousZ='',previousTab:string|null=null;
 const lock=()=>{for(const el of Array.from(doc.body.children))if(el instanceof HTMLElement&&el!==overlay&&!inert.has(el)){inert.set(el,el.inert);el.inert=true;}};
 const block=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();if(event.type==='keydown')overlay?.focus();};
 const focus=(event:FocusEvent)=>{if(overlay&&!overlay.contains(event.target as Node))overlay.focus();};
 return {show(message:string){if(!overlay)return;savedFocus=doc.activeElement as HTMLElement;previousZ=overlay.style.zIndex;previousTab=overlay.getAttribute('tabindex');ui.mostrarLoading(message);overlay.style.zIndex='2147483000';overlay.tabIndex=-1;lock();observer=new MutationObserver(lock);observer.observe(doc.body,{childList:true});for(const event of ['click','pointerdown','keydown','submit'])doc.addEventListener(event,block,true);doc.addEventListener('focusin',focus,true);overlay.focus();},message(message:string){ui.atualizarMensagemLoading(message);},hide(){if(!overlay)return;observer?.disconnect();for(const event of ['click','pointerdown','keydown','submit'])doc.removeEventListener(event,block,true);doc.removeEventListener('focusin',focus,true);for(const [el,value] of inert)el.inert=value;inert.clear();ui.ocultarLoading();overlay.style.zIndex=previousZ;if(previousTab===null)overlay.removeAttribute('tabindex');else overlay.setAttribute('tabindex',previousTab);const target=savedFocus?.isConnected&&!savedFocus.closest('[hidden],[inert]')&&savedFocus!==doc.body?savedFocus:doc.querySelector<HTMLElement>('main h1, main h2, #entrar-email');if(target){const tab=target.getAttribute('tabindex');target.tabIndex=-1;target.focus();if(tab===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',tab);}savedFocus=null;}};
}
export function createAuthLoading(view:{show(message:string):void;message(message:string):void;hide():void}){
 let serial=0,ticket=0,identity:string|null=null,established=false,mode:'restore'|'login'='restore';
 const message=()=>mode==='login'?'Entrando no Portal GEAPA…':'Restabelecendo seu acesso…';
 function begin(next:'restore'|'login'){mode=next;if(!ticket){ticket=++serial;view.show(message());}else view.message(message());return ticket;}
 return {begin,get ticket(){return ticket;},account(uid:string|null){if(uid!==identity){identity=uid;established=false;if(ticket)ticket=++serial;}if(!uid){this.finish(ticket,false);return;}if(!established)begin(mode);},finish(expected:number,ready:boolean){if(!expected||expected!==ticket)return;ticket=0;established=ready;view.hide();},reset(){identity=null;established=false;this.finish(ticket,false);}};
}
