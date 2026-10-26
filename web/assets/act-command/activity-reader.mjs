import {need} from './command-contract.mjs';

// Public-to-members agenda data is read from the server. Personal actions still
// use the shared Core and its current Members authority. No disk cache or writer.
export function createActivityReader({auth,db,sdk,root,request}){
 const routes=new Set(['/atividades/listar','/atividades/bundle','/atividades/detalhes-preload','/atividades/detalhe']);
 return async function read(route,params,context){
  if(!routes.has(route)||context?.activityAgendaDirect!==true||context.board||context.materialOnly||!sdk.getDocsFromServer)return null;
  const ticket=auth.capture(),rows=[];let cursor;
  const head=await request('core.act.portal-read.v13',{route:'/atividades/acoes-proprias',params:{items:[]}});auth.assert(ticket);need(head.ok&&Number.isSafeInteger(head.sourceEpoch));
  const collection=sdk.collection(db,root+'/activityAgendaViews');
  if(route==='/atividades/detalhe'){
   need(/^[A-Za-z0-9_-]{1,128}$/.test(params.idAtividade));
   const doc=await sdk.getDocFromServer(sdk.doc(collection,params.idAtividade));auth.assert(ticket);need(doc.exists()&&!doc.metadata.fromCache);rows.push(doc.data());
  }else{
   for(let page=0;page<=20;page++){
    const constraints=[sdk.where('schemaVersion','==','act-activity-agenda-v1'),sdk.where('publicationStatus','==','PUBLICADO'),sdk.where('visibility','in',['PUBLIC','MEMBERS']),sdk.orderBy(sdk.documentId()),sdk.limit(20)];if(cursor)constraints.push(sdk.startAfter(cursor));
    const snapshot=await sdk.getDocsFromServer(sdk.query(collection,...constraints));auth.assert(ticket);need(!snapshot.metadata.fromCache&&page<20);rows.push(...snapshot.docs.map(d=>d.data()));if(snapshot.size<20)break;cursor=snapshot.docs.at(-1);
   }
  }
  for(const row of rows)need(row.schemaVersion==='act-activity-agenda-v1'&&row.id===row.data?.idAtividade&&row.publicationStatus==='PUBLICADO'&&['PUBLIC','MEMBERS'].includes(row.visibility)&&Number.isSafeInteger(row.sourceActivityRevision)&&Number.isSafeInteger(row.sourceCollectionRevision));
  // Read every personal overlay, including past requests shown by the old UI.
  const overlays={};for(let start=0;start<Math.max(1,rows.length);start+=32){const items=rows.slice(start,start+32).map(({id,sourceActivityRevision,sourceCollectionRevision})=>({id,sourceActivityRevision,sourceCollectionRevision}));const value=await request('core.act.portal-read.v13',{route:'/atividades/acoes-proprias',params:{items}});auth.assert(ticket);need(value.ok&&value.data&&value.sourceEpoch===head.sourceEpoch);for(const item of items)need(Object.hasOwn(value.data,item.id));Object.assign(overlays,value.data);}
  const list=rows.map(row=>({...row.data,...overlays[row.id]}));auth.assert(ticket);
  return {ok:true,data:route==='/atividades/detalhe'?list[0]:route==='/atividades/listar'?list:{calendario:list,detalhesPorId:Object.fromEntries(list.map(d=>[d.idAtividade,d])),ultimaAtualizacao:new Date().toISOString()}};
 };
}
