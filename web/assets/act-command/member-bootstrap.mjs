import {memberReadRoutes} from './member-operations.mjs';
// Transport selection only. All identity, policy and DTO decisions remain Core.
export function bootstrapRequest(action,request,isolatedLegacyFixture=false){
 // Old validation namespaces retain their original executor and data prefix.
 if(isolatedLegacyFixture)return null;
 if(action==='core.members.own-read.v13')return {route:'/members/own',params:request};
 if(action==='core.members.portal-read.v13'&&[...memberReadRoutes,'/meu-vinculo/acompanhamento'].includes(request?.route))return request;
 return null;
}
