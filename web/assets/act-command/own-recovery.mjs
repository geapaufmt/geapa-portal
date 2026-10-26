// One canonical SELF repair serves all concurrently requested own views.
// Secondary callers read the published projection through Firestore Rules.
export function createOwnRecovery({auth,repair,read}){
 let pending=null;
 const clear=()=>{pending=null;};auth.listeners?.add(clear);
 async function recover(view){
  const ticket=auth.capture();
  if(!['status','profile','functions','directors','functionHistory'].includes(view))return repair(view);
  if(!pending||pending.uid!==ticket.uid||pending.generation!==ticket.generation){
   const task={uid:ticket.uid,generation:ticket.generation,view,promise:null};pending=task;
   task.promise=Promise.resolve().then(()=>repair(view)).finally(()=>{if(pending===task)pending=null;});
  }
  const task=pending,result=await task.promise;auth.assert(ticket);
  if(task.view===view)return result;
  const data=await read();auth.assert(ticket);return data[view];
 }
 return {recover,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
