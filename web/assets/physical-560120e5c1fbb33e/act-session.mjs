import {createContextRefresh} from './context-refresh.mjs';
import {createMemberTracking} from './member-tracking.mjs';
import {createActBrowserClient} from '../act-command/act-browser-client.mjs';
import {memberReadRoutes,memberWriteRoutes} from '../act-command/member-operations.mjs';
import {ACT_ENABLED,actUid} from './act-environment.mjs';
import {installActFacade} from './guard.mjs';

// Current Portal screens receive their existing facade. UI hints never authorize a writer.
export async function attachActivities(portal,db,sdk){
 const {auth}=portal,client=createActBrowserClient({auth,db,sdk,storage:localStorage,enabled:ACT_ENABLED});
 const tracking=createMemberTracking({auth,read:()=>client.memberTracking()});
 let context=null,contextPaused=false,refreshing=null,contextEpoch=0,members=null,memberRefresh=null;
 const renewal=createContextRefresh({visibility:document,renew:async()=>{if(await refresh(true))await refreshMembers();},invalidate:()=>{contextPaused=true;window.PortalDevContext.act=null;}});
 const current=()=>!contextPaused&&!!context&&actUid(auth.uid)&&Date.now()<context.validUntil;
 function badge(profile){let el=document.getElementById('dev-admin-profile');if(profile==='DEV_ADMIN'){if(!el){el=document.createElement('span');el.id='dev-admin-profile';el.className='status-pill';document.getElementById('estado-acesso')?.after(el);}el.textContent='Administrador DEV';}else el?.remove();}
 function clear(){tracking.clear();badge(null);contextEpoch++;context=null;contextPaused=false;refreshing=null;memberRefresh=null;renewal.cancel();client.clear();window.PortalDevContext.act=null;members=null;window.PortalDevContext.members=null;document.dispatchEvent(new CustomEvent('portal:act-session-cleared'));window.PortalGeapaNavigation?.atualizarMenu();}
 async function refresh(force=false){
  if(!ACT_ENABLED||!actUid(auth.uid)){clear();return false;}
  if(current()&&!force)return true;
  if(refreshing)return refreshing.promise;
  const ticket=auth.capture(),epoch=contextEpoch,task={promise:null};refreshing=task;
  task.promise=(async()=>{try{
   const value=await client.context(force);auth.assert(ticket);
   if(epoch!==contextEpoch)return false;
   if(value?.schemaVersion!=='act-portal-context-v1'||typeof value.board!=='boolean'||!Number.isFinite(value.validUntil)||value.validUntil<=Date.now())throw Error('ACT_CONTEXT_INVALID');
   const changed=!context||['accessProfile','idPessoa','board','materialOnly','canCreateActivity','canRegisterAttendance','canManageActivity','canRealizeActivity','canConfigureActivity'].some(k=>context[k]!==value[k]);
   if(context&&changed)clear();
   context=value;contextPaused=false;badge(value.accessProfile);window.PortalDevContext.act={available:true,board:value.board,materialOnly:value.materialOnly===true};
   renewal.schedule(value.validUntil);
   if(changed){const navigation=window.PortalGeapaNavigation;navigation?.atualizarMenu();const route=navigation?.getRotaAtual?.();if(['atividades','historico-atividades','frequencia','minhas-apresentacoes','admin-apresentacoes','admin-justificativas','admin-atividades','admin-ciclos-semestres'].includes(route))navigation.irPara(route,{atualizarHash:false});}
   return true;
  }catch{if(epoch===contextEpoch)clear();return false;}
  finally{if(refreshing===task)refreshing=null;}})();return task.promise;
 }
 async function refreshMembers(){
  if(memberRefresh)return memberRefresh.promise;
  if(!current()&&!await refresh())return false;
  const ticket=auth.capture(),epoch=contextEpoch,task={promise:null};memberRefresh=task;
  task.promise=(async()=>{try{
   const response=await client.apiGet('/members/operational-context',{});auth.assert(ticket);
   // A timer may expire ACT while the independent Members read is in flight.
   // Renew the server context before accepting the hint; expiry is not denial.
   if(!current()&&!await refresh())throw Error('MEMBERS_CONTEXT_INVALID');
   auth.assert(ticket);
   if(epoch!==contextEpoch)return false;
   if(!current()||!response?.ok||!response.data)throw Error('MEMBERS_CONTEXT_INVALID');
   const changed=!members||JSON.stringify(members)!==JSON.stringify(response.data);members=response.data;
   window.PortalDevContext.members={available:true,...members};
   if(changed){const navigation=window.PortalGeapaNavigation;navigation?.atualizarMenu();const route=navigation?.getRotaAtual?.();if(['admin-membros','admin-correcoes-cadastrais','admin-solicitacoes-vinculo'].includes(route))navigation.irPara(route,{atualizarHash:false});document.dispatchEvent(new CustomEvent('portal:members-session-ready'));}
   return true;
  }catch{if(epoch===contextEpoch){members=null;window.PortalDevContext.members=null;const nav=window.PortalGeapaNavigation;nav?.atualizarMenu();if(['admin-membros','admin-correcoes-cadastrais','admin-solicitacoes-vinculo'].includes(nav?.getRotaAtual?.()))nav.restoreCurrentRoute?.();}return false;}
  finally{if(memberRefresh===task)memberRefresh=null;}})();return task.promise;
 }
 const routes=new Set([...memberReadRoutes,...memberWriteRoutes,'/admin/ciclos-semestres','/admin/ciclos-semestres/semestre','/admin/ciclos-semestres/ciclo','/admin/justificativas/janelas','/admin/justificativas/janelas/abrir','/admin/justificativas/janelas/encerrar','/v2/apresentacoes/foto/registrar','/v2/apresentacoes/foto/revisar','/v2/apresentacoes/foto/arquivo','/v2/justificativas/documento/arquivo','/atividades/modelo/membros-apresentadores','/admin/apresentacoes/entrega-publicacao','/admin/apresentacoes/entrega-publicacao/salvar','/admin/apresentacoes/regras','/admin/apresentacoes/regras/salvar','/admin/apresentacoes/cotas','/admin/apresentacoes/cotas/salvar','/v2/apresentacoes/compatibilidade','/v2/apresentacoes/reorganizacao','/admin/apresentacoes/incidencia','/admin/apresentacoes/incidencia/salvar','/admin/apresentacoes/configuracao/salvar','/admin/apresentacoes/planejamento','/admin/apresentacoes/planejamento/salvar','/v2/apresentacoes/finalizacao','/v2/apresentacoes/agenda','/v2/apresentacoes/dinamica','/admin/atividades/configuracoes','/admin/atividades/configuracoes/salvar','/v2/apresentacoes/realizacao','/v2/apresentacoes/material/arquivo','/v2/apresentacoes/material/historico','/v2/apresentacoes/material/revisar','/v2/apresentacoes/material/registrar','/v2/minhas-apresentacoes','/v2/apresentacoes/pendencias','/v2/apresentacoes/eixos','/v2/apresentacoes/titulo-eixo/enviar','/v2/apresentacoes/titulo-eixo/revisar','/v2/apresentacoes/titulo-eixo/reprovar','/v2/apresentacoes/titulo-eixo/retirar','/v2/apresentacoes/titulo-eixo/natureza','/v2/minha-frequencia','/v2/justificativas/pendencias','/v2/justificativas/config','/v2/justificativas/enviar','/v2/justificativas/analisar','/atividades/listar','/atividades/bundle','/atividades/detalhes-preload','/atividades/detalhe','/atividades/modelos','/atividades/chamada','/atividades/chamada/salvar','/atividades/modelo/validar','/atividades/modelo/criar','/admin/atividades','/admin/atividades/detalhe','/admin/atividades/salvar','/admin/atividades/realizacao','/admin/atividades/conferencia','/admin/atividades/publicar','/admin/atividades/ocultar','/admin/atividades/cancelar','/admin/atividades/reabrir']);
 const messages={REQUEST_TIMEOUT:'O tempo de espera terminou. Tente novamente para recuperar o mesmo envio.',HUMAN_DECISION_REQUIRED:'Esta ação depende de uma decisão da Diretoria. Confira os dados e as condições da apresentação.',UNRESOLVED_DEPENDENCY:'Há uma etapa anterior ainda não confirmada. Atualize os dados para conferir a situação.',VALIDATION_ERROR:'Confira os campos informados.',INCOMPLETE_REQUEST:'Preencha os campos obrigatórios.',STALE_REVISION:'Os dados mudaram desde a abertura da tela. Atualize antes de confirmar.',DEADLINE_VIOLATION:'O prazo desta ação não está aberto.',FORBIDDEN:'Seu acesso não permite esta ação.',STALE_AUTHORIZATION:'O acesso mudou. Atualize a página para continuar.',COMMAND_PENDING:'A operação está sendo confirmada. Tente novamente para consultar o mesmo envio.',COMMAND_RECONCILIATION_REQUIRED:'Não foi possível confirmar a resposta. Tente novamente para recuperar o mesmo envio.',CONTRACT_NOT_AVAILABLE:'Esta função ainda não está habilitada neste ambiente.',COMMAND_NOT_ADMITTED:'Esta tentativa não foi admitida para execução. Atualize os dados antes de tentar novamente.'};
 async function call(method,route,params){try{if(tracking.current()&&route.startsWith('/meu-vinculo/')){if(method!=='apiGet')throw Object.assign(Error(),{code:'ACCESS_REVOKED'});return await tracking.get(route,params);}if(!routes.has(route)||!await refresh())throw Object.assign(Error(),{code:'CONTRACT_NOT_AVAILABLE'});const ticket=auth.capture(),epoch=contextEpoch,answer=await client[method](route,params,context);auth.assert(ticket);if(epoch!==contextEpoch||!current())throw Object.assign(Error(),{code:'STALE_AUTHORIZATION'});return answer;}catch(e){return {ok:false,errorCode:e.code||'COMMAND_RECONCILIATION_REQUIRED',message:method==='apiGet'&&['COMMAND_RECONCILIATION_REQUIRED','REQUEST_TIMEOUT','OFFLINE_NOT_ALLOWED'].includes(e.code)?'Não foi possível carregar as informações. Atualize a consulta para tentar novamente.':messages[e.code]||'Não foi possível concluir a ação. Atualize os dados e tente novamente.'};}}
 installActFacade({apiGet:(route,params)=>call('apiGet',route,params),apiPost:(route,params)=>call('apiPost',route,params)});
 window.PortalGeapaConfig=Object.freeze({DATA_ENVIRONMENT:'DEV',READ_ONLY_MODE:false,MOCK_MODE:false,ENABLE_ACTIVITY_MANAGEMENT:true,ENABLE_JUSTIFICATIVAS:true,ENABLE_PROFILE_UPDATES:true,ENABLE_MEMBER_REGISTRATION:true,ENABLE_VINCULO_REQUESTS:true,ATIVIDADES_CACHE_TTL_MS:60000});
 window.PortalGeapaAuth=Object.freeze({hasPermissao:cap=>current()&&(cap==='membros:cadastrar_novos_membros'?members?.canRegister:cap==='membros:analisar_solicitacoes_vinculo'?members?.canReview:cap==='membros:analisar_correcoes'?members?.canReviewCorrections:false),getUsuarioAtual:()=>current()?{idPessoa:context.idPessoa,nome:context.nome,autenticado:true,portalAtivo:true,perfilPortalEfetivo:context.board?'DIRETORIA':'MEMBRO',perfisPortal:[context.board?'DIRETORIA':'MEMBRO']}:null,canCreateActivity:()=>current()&&context.canCreateActivity,canRegisterAttendance:()=>current()&&context.canRegisterAttendance,canConfigureActivity:()=>current()&&context.canConfigureActivity,canViewActivityDetails:()=>current()});
 await import('../act-ui/ui.js');await import('../act-ui/atividades.js');await import('../act-ui/admin-atividades.js');await import('../act-ui/portal-v2-readonly.js');await import('../act-ui/functional-governance.mjs');await import('../act-ui/admin-cadastro-membros.js');await import('../act-ui/admin-membros.js');await import('../act-ui/admin-correcoes-cadastrais.js');await import('../act-ui/vinculo-solicitacoes.js');await import('../act-ui/admin-solicitacoes-vinculo.js');
 const originalClear=auth.clear.bind(auth);auth.clear=code=>{clear();originalClear(code)};
 return {tracking,enrollment:client.enrollment,refreshMembers,refresh:async(...args)=>{const result=await refresh(...args);if(result)void refreshMembers();return result;},clear,memberOwn:client.memberOwn,dispose:()=>{renewal.dispose();clear();tracking.dispose();client.dispose();}};
}


