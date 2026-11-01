import {functionLabel} from './private-dtos.mjs';
import {resultLabel} from './result-dtos.mjs';
// textContent only. No imported SDK, session, command, or network on module evaluation.
export function renderFunctions(node,rows){node.replaceChildren();for(const row of rows){const item=node.ownerDocument.createElement('li');item.textContent=functionLabel(row);node.append(item);}}
export function renderResult(node,value){node.textContent=resultLabel(value);}
export async function showFunctions(node,members){const value=await members.functions();renderFunctions(node,value.data);return value;}
export async function mountContactForm(node,members,operationId){
 const own=await members.selfContact(); // No form if the contracted private profile is absent/denied.
 const document=node.ownerDocument,form=document.createElement('form'),email=document.createElement('input'),button=document.createElement('button'),message=document.createElement('p');
 email.type='email';email.required=true;email.maxLength=180;email.value=own.data.contactEmail;button.type='submit';button.textContent='Atualizar contato';
 form.append(email,button,message);form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;try{await members.updateContact(operationId,email.value);message.textContent='Solicitação recebida; resultado ainda não confirmado.';}catch{message.textContent='Não foi possível confirmar a operação. Consulte o resultado da mesma solicitação.';}});node.replaceChildren(form);return form;
}
export function mountLocalApp(node,{identity,members},operationId){
 let disposed=false;const clear=()=>node.replaceChildren();
 identity.listeners.add(clear);
 return Object.freeze({
  async functions(){const ticket=identity.capture();const result=await members.functions();identity.assert(ticket);if(!disposed){identity.listeners.add(clear);renderFunctions(node,result.data);}},
  async contact(){const ticket=identity.capture();const own=await members.selfContact();identity.assert(ticket);if(disposed)return;identity.listeners.add(clear);return mountContactForm(node,{selfContact:async()=>own,updateContact:(...args)=>{identity.assert(ticket);return members.updateContact(...args)}},operationId);},
  dispose(){disposed=true;identity.listeners.delete(clear);clear();}
 });
}
