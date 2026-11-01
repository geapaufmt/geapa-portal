// Read-only access to existing voluntary cases after membership restriction.
// No institutional capabilities or mutable facade are created by this adapter.
export function createMemberTracking({auth,read,now=Date.now}){
 let value=null,ticket=null,pending=null;
 const denied=()=>Object.assign(Error('ACCESS_REVOKED'),{code:'ACCESS_REVOKED'});
 function clear(){value=null;ticket=null;}
 auth.listeners?.add(clear);
 function current(){try{if(!value||now()>=value.validUntil)return false;auth.assert(ticket);return true;}catch{return false;}}
 async function open(){
  if(pending)return pending;const observed=auth.capture();
  const task=(async()=>{try{
   const response=await read();auth.assert(observed);const d=response?.data;
   if(!response?.ok||d?.restrictedTracking!==true||!['SUSPENSO','DESLIGADO'].includes(d.state)||!Number.isSafeInteger(d.validUntil)||d.validUntil<=now()||!Number.isSafeInteger(d.sourceRevision)||!d.personId||!Array.isArray(d.requests?.items)||!d.requests.items.length||d.options?.opcoes?.suspensaoDisponivel!==false||d.options?.opcoes?.desligamentoDisponivel!==false||d.requests.items.some(v=>v.podeCancelar!==false||v.podeComplementar!==false))throw denied();
   value=d;ticket=observed;return true;
  }catch(e){clear();throw e;}})();pending=task.finally(()=>{pending=null;});return pending;
 }
 async function get(route,params={}){
  if(!['/meu-vinculo/opcoes','/meu-vinculo/solicitacoes'].includes(route)||!params||Object.keys(params).length)throw denied();
  await open();if(!current())throw denied();return {ok:true,data:route.endsWith('/opcoes')?value.options:value.requests};
 }
 function status(){if(!current())throw denied();return {data:{schemaVersion:'safe-status-v11',idPessoa:value.personId,state:value.state,sourceRevision:value.sourceRevision,egressEndsAtExclusive:null},validUntil:value.validUntil};}
 return {open,get,current,status,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
