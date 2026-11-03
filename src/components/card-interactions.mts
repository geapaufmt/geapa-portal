/** UI-only delegation. The existing primary control remains the sole action. */
const installations=new WeakMap<Document|HTMLElement,()=>void>();
export function cardMainAction(target:Element,root:Document|HTMLElement=document):HTMLElement|null {
 const card=target.closest<HTMLElement>('[data-geapa-card]');
 if(!card||!root.contains(card)||target.closest('button,a,input,select,textarea,summary,label,[contenteditable],[role="button"],[role="link"],[data-geapa-options]'))return null;
 if(card.closest('[hidden],[inert],[aria-busy="true"],[aria-disabled="true"]'))return null;
 return [...card.querySelectorAll<HTMLElement>('[data-geapa-primary]')].find(el=>el.closest('[data-geapa-card]')===card&&!el.matches(':disabled,[aria-disabled="true"]')&&!el.closest('[hidden],[inert]'))??null;
}
export function installCardInteractions(root:Document|HTMLElement=document):()=>void {
 const existing=installations.get(root);if(existing)return existing;
 const click=(event:Event)=>{
  const e=event as MouseEvent;
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||!(e.target instanceof Element)||window.getSelection()?.toString())return;
  cardMainAction(e.target,root)?.click();
 };
 const key=(event:Event)=>{
  const e=event as KeyboardEvent;
  if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||!['Enter',' '].includes(e.key)||!(e.target instanceof HTMLElement)||!e.target.matches('[data-geapa-card]')||window.getSelection()?.toString())return;
  const action=cardMainAction(e.target,root);if(action){e.preventDefault();action.click();}
 };
 const dispose=()=>{root.removeEventListener('click',click);root.removeEventListener('keydown',key);installations.delete(root);};
 root.addEventListener('click',click);root.addEventListener('keydown',key);installations.set(root,dispose);return dispose;
}
