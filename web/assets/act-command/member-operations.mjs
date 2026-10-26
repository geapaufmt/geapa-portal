import {exact,need} from './command-contract.mjs';
import {fail} from './errors.mjs';

const ADMIN='/admin/solicitacoes-vinculo/';
const actions=Object.freeze({'iniciar-analise':'START','solicitar-complemento':'REQUEST_COMPLEMENT','analise-preliminar':'SCHEDULE','disponibilizar-analise-final':'READY','indeferir':'DENY','cancelar':'CANCEL_ADMIN','homologar-efetivar-desligamento':'APPROVE','homologar-suspensao':'APPROVE','iniciar-suspensao':'START_SUSPENSION','registrar-retorno':'RETURN'});
export const memberReadRoutes=Object.freeze(['/meu-perfil/correcoes','/admin/correcoes-cadastrais','/admin/correcoes-cadastrais/detalhe','/admin/membros','/members/operational-context','/admin/ingressos-membros','/admin/ingressos-membros/catalogos','/meu-vinculo/opcoes','/meu-vinculo/solicitacoes','/admin/solicitacoes-vinculo','/admin/solicitacoes-vinculo/detalhe']);
export const memberWriteRoutes=Object.freeze(['/meu-perfil/correcoes/solicitar','/meu-perfil/correcoes/acao','/admin/correcoes-cadastrais/acao','/meu-perfil/salvar','/admin/membros/corrigir-perfil','/admin/ingressos-membros/cadastrar','/admin/ingressos-membros/convite','/meu-vinculo/desligamento/solicitar','/meu-vinculo/suspensao/solicitar','/meu-vinculo/solicitacao/cancelar','/meu-vinculo/solicitacao/complementar',...Object.keys(actions).map(a=>ADMIN+a)]);
// Translate the existing form only. Revisions come from the displayed reader;
// the protected prepare/admit/transaction chain remains the authority.
export function createMemberOperations({request,execute,read,auth}){
 const revisions=new Map();let semester=null;
 function clear(){revisions.clear();semester=null;}
 auth.listeners?.add(clear);
 function remember(items,ticket){for(const i of items){need(/^[a-f0-9]{32}$/.test(i.idSolicitacao)&&Number.isSafeInteger(i.revision)&&i.revision>0);revisions.set(i.idSolicitacao,{revision:i.revision,uid:ticket.uid,generation:ticket.generation});}}
 async function get(route,params={}){
  need(memberReadRoutes.includes(route));const ticket=auth.capture(),answer=await read(route,params);auth.assert(ticket);
  if(answer?.ok){const data=answer.data;
   if(route==='/meu-vinculo/opcoes')semester=data.semestre?.canonicalId||null;
   if(['/meu-vinculo/solicitacoes','/admin/solicitacoes-vinculo'].includes(route))remember(data.items||[],ticket);
   if(route==='/admin/solicitacoes-vinculo/detalhe')remember([{idSolicitacao:data.solicitacao.ID_SOLICITACAO,revision:data.revision}],ticket);
  }return answer;
 }
 function shown(id){const t=auth.capture(),v=revisions.get(id);if(!v||v.uid!==t.uid||v.generation!==t.generation)fail('STALE_REVISION');return v.revision;}
 async function post(route,payload){
  need(memberWriteRoutes.includes(route));const ticket=auth.capture();let targetRoute,body,slot='members:',subject=null;
  if(['/meu-perfil/correcoes/solicitar','/meu-perfil/correcoes/acao','/admin/correcoes-cadastrais/acao'].includes(route)){body={...payload};targetRoute=route;subject=payload.requestId||null;slot+='correction:'+(subject||payload.field);
  }else if(route==='/meu-perfil/salvar'||route==='/admin/membros/corrigir-perfil'){body={...payload};targetRoute=route;slot+='profile:'+ticket.uid+':'+(payload.personId||'SELF');
  }else if(route==='/admin/ingressos-membros/convite'){
   exact(payload,['enrollmentId','revision','action','reason']);body={...payload};targetRoute=route;slot+='invitation:'+payload.enrollmentId;
  }else if(route==='/admin/ingressos-membros/cadastrar'){
   body={...payload};delete body.chaveIdempotencia;targetRoute=route;slot+='registration';
  }else if(route==='/meu-vinculo/suspensao/solicitar'){
   exact(payload,['chaveIdempotencia','motivoCategoria','cienciaRegras','cienciaRegrasVersao','documentoReferencia','justificativa','dataInicioPretendida','dataFimPretendida']);
   need(payload.cienciaRegras===true&&payload.cienciaRegrasVersao==='PORTAL_VINCULO_V2');if(!semester)fail('UNRESOLVED_DEPENDENCY');
   body={modality:'SUSPENSAO_TEMPORARIA',reason:payload.justificativa,semesterId:semester,startDate:payload.dataInicioPretendida,endDate:payload.dataFimPretendida,submission:{reasonCategory:payload.motivoCategoria,documentReference:payload.documentoReferencia,acknowledged:true,version:payload.cienciaRegrasVersao}};
   targetRoute='/meu-vinculo/solicitar-suspensao';slot+='voluntary';
  }else if(route==='/meu-vinculo/desligamento/solicitar'){
   exact(payload,['chaveIdempotencia','motivoCategoria','cienciaRegras','cienciaRegrasVersao','documentoReferencia','modalidadeSolicitada','observacoes']);
   need(payload.cienciaRegras===true&&payload.cienciaRegrasVersao==='PORTAL_VINCULO_V2');
   need(typeof payload.motivoCategoria==='string'&&payload.motivoCategoria.trim().length>0&&typeof payload.observacoes==='string');
   body={modality:payload.modalidadeSolicitada,reason:payload.observacoes.trim()||payload.motivoCategoria,semesterId:payload.modalidadeSolicitada==='DESLIGAMENTO_FIM_SEMESTRE'?semester:null,submission:{reasonCategory:payload.motivoCategoria,documentReference:payload.documentoReferencia,acknowledged:payload.cienciaRegras,version:payload.cienciaRegrasVersao}};
   if(body.modality==='DESLIGAMENTO_FIM_SEMESTRE'&&!body.semesterId)fail('UNRESOLVED_DEPENDENCY');
   targetRoute='/meu-vinculo/solicitar-desligamento';slot+='voluntary';
  }else{
   subject=payload.idSolicitacao;const own=route.startsWith('/meu-vinculo/'),action=own?(route.endsWith('/cancelar')?'CANCEL_SELF':'COMPLEMENT'):actions[route.slice(ADMIN.length)];
   need(action);targetRoute=own?'/meu-vinculo/solicitacoes/acao':'/admin/solicitacoes-vinculo/acao';slot+='review:'+subject;
   body={requestId:subject,revision:shown(subject),action,reason:own?payload.motivo:payload.observacao,minutesReference:own?'':payload.ataReferencia||'',confirmed:own?false:payload.confirmacaoReforcada===true};
   if(route.endsWith('/homologar-suspensao'))body.graveException=payload.excecaoGravidade===true;
   if(action==='APPROVE'&&!route.endsWith('/homologar-suspensao')){need(typeof payload.justificativaAdministrativaReforcada==='string'&&payload.justificativaAdministrativaReforcada.trim().length>=20);body.externalReview={presentations:'REVIEWED',materials:'REVIEWED',functions:'REVIEWED',basis:payload.justificativaAdministrativaReforcada};}
  }
  const answer=await execute(slot,{route:targetRoute,payload:body},operationId=>request('core.members.prepare.v13',{operationId,route:targetRoute,payload:body}));auth.assert(ticket);
  if(answer.receipt?.state==='FAILED')return {ok:false,errorCode:answer.receipt.code==='REVISION_CONFLICT'?'STALE_REVISION':'FORBIDDEN',message:answer.receipt.code==='REVISION_CONFLICT'?'Os dados mudaram. Atualize o pedido antes de confirmar.':'A operação não foi autorizada ou suas condições deixaram de ser válidas.'};
  if(answer.receipt?.state!=='COMPLETED')return {ok:false,errorCode:'COMMAND_PENDING',message:'O envio ainda está sendo confirmado. Tente novamente para recuperar a mesma operação.'};
  const registration=route==='/admin/ingressos-membros/cadastrar';
  if(route==='/admin/ingressos-membros/convite')return {ok:true,message:payload.action==='CANCEL'?'Convite cancelado. O histórico foi preservado.':'Convite registrado na fila de teste DEV. Nenhum e-mail real foi enviado.',data:{enrollmentId:payload.enrollmentId,notificationMode:'DRY_RUN',emailSent:false}};
  return {ok:true,message:registration?'Pré-cadastro registrado. O vínculo ainda não está ativo.':'Ação registrada.',data:registration?{idIngresso:answer.operationId,emailQueued:false}:{idSolicitacao:subject||answer.operationId,status:subject?'ATUALIZADO':'RECEBIDO'}};
 }
 return {get,post,clear,dispose(){clear();auth.listeners?.delete(clear);}};
}
