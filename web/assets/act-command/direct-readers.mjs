import {need} from './command-contract.mjs';

// Session memory only. Every miss is a server read authorized by Rules. A short
// lease avoids repeating the same projection during navigation, never offline.
export function createDirectReaders({auth,db,sdk,clock=Date.now,record=()=>{}}){
 const cache=new Map(),pending=new Map();let epoch=0;
 function clear(){epoch++;cache.clear();pending.clear();}
 auth.listeners?.add(clear);
 async function read(id,force=false,recover=null,bounded=false){
  need(/^[A-Za-z0-9_-]{1,160}$/.test(id));const ticket=auth.capture(),key=ticket.uid+'/'+ticket.generation+'/'+id,e=epoch,start=clock();auth.listeners?.add(clear);
  const cached=cache.get(key);
  if(!force&&cached&&clock()<cached.until){auth.assert(ticket);record({view:id.startsWith('activity_')?'detail':id,ms:clock()-start,reads:0,coreCalls:0,cache:true});return cached.data;}
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{try{
   let reads=0,coreCalls=0;
   const fetchView=async()=>{reads++;const request=sdk.getDocFromServer(sdk.doc(db,'portalReaderViews/'+ticket.uid+'/items/'+id));let timer,cancel;
    // The Web SDK cannot abort a get. Detach the UI safely and discard its late
    // result; a network timeout never triggers a privileged rebuild by itself.
    const boundedRequest=bounded?new Promise((resolve,reject)=>{cancel=()=>reject(Object.assign(Error('STALE_AUTHORIZATION'),{code:'STALE_AUTHORIZATION'}));auth.listeners?.add(cancel);timer=setTimeout(()=>reject(Object.assign(Error('REQUEST_TIMEOUT'),{code:'REQUEST_TIMEOUT'})),12000);request.then(resolve,reject);}):request;
    let snap;try{snap=await boundedRequest;}finally{clearTimeout(timer);if(cancel)auth.listeners?.delete(cancel);}auth.assert(ticket);need(e===epoch&&snap.exists()&&!snap.metadata.fromCache);
    const v=snap.data();need(v.schemaVersion==='portal-reader-view-v1'&&v.viewId===id&&v.basis.ownerUid===ticket.uid&&v.basis.expiresAt.toMillis()>clock());return v;};
   let v;try{v=await fetchView();}catch(error){
    if(!recover||!['permission-denied','not-found','SCHEMA_UNSUPPORTED'].includes(error.code))throw error;
    auth.assert(ticket);need(e===epoch);coreCalls++;await recover();auth.assert(ticket);need(e===epoch);
    // Recovery updates the derived document. Rules must authorize the fresh
    // server read; the Core response is never used as a cached authority.
    v=await fetchView();
   }
   cache.set(key,{data:v.data,until:Math.min(clock()+5000,v.basis.expiresAt.toMillis())});
   record({view:id.startsWith('activity_')?'detail':id,ms:clock()-start,reads,coreCalls,cache:false});return v.data;
  }catch(error){/* A denied projection clears memory, but must not invalidate other reads authorized independently by Rules. Session/command clear() still advances epoch and rejects every late response. */if(e===epoch)cache.clear();throw error;}finally{if(pending.get(key)===task)pending.delete(key);}})();pending.set(key,task);return task;
 }
 async function route(route,params={},recover=null){
  if(route==='/members/operational-context')return {ok:true,data:await read('members_context',false,recover)};
  if(route==='/admin/ingressos-membros/catalogos')return await read('members_catalog',false,recover);
  if(route==='/meu-vinculo/opcoes')return (await read('members_self',false,recover)).options;
  if(route==='/meu-vinculo/solicitacoes')return (await read('members_self',false,recover)).requests;
  if(['/atividades/listar','/atividades/bundle','/atividades/detalhes-preload','/admin/atividades'].includes(route)){
   const v=await read('activities',false,recover?()=>recover('activities'):null,!!recover);if(route==='/admin/atividades'){need(v.admin);return v.admin;}
   return route==='/atividades/listar'?{ok:true,data:v.bundle.data.calendario}:{...v.bundle,data:{...v.bundle.data,detalhesPorId:Object.fromEntries(v.bundle.data.calendario.map(d=>[d.idAtividade,d]))}};
  }
  if(['/atividades/detalhe','/admin/atividades/detalhe'].includes(route)){
   need(/^[A-Za-z0-9_-]{1,128}$/.test(params.idAtividade));const id='activity_'+params.idAtividade,v=await read(id,false,recover?()=>recover(id):null,!!recover),result=route.startsWith('/admin/')?v.admin:v.normal;need(result);return result;
  }
  if(route==='/v2/minha-frequencia')return (await read('frequency',false,recover?()=>recover('frequency'):null,!!recover)).result;
  return null;
 }
 return {read,route,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
