import {input,SCHEMA} from './command-contract.mjs';
import {fail} from './errors.mjs';
// Command type is an explicit UI choice, never an actor/capability selector.
export class MembersService {
 constructor(repositories,commands,directory=null){this.repositories=repositories;this.commands=commands;this.directory=directory;}
 profile(){return this.repositories.own('profile');}
 status(){return this.repositories.own('status');}
 functions(){return this.repositories.currentFunctions();}
 directors(){return this.repositories.currentFunctions('memberCurrentDirectors');}
 selfContact(){return this.repositories.privateSelf();}
 caseView(viewId,personId){return this.repositories.privateCase(viewId,personId,'case');}
 auditView(viewId,personId){return this.repositories.privateCase(viewId,personId,'audit');}
 publicPeople(cursor=null){return this.publicDirectory(cursor);}
 publicDirectory(cursor=null){if(!this.directory)fail('CONTRACT_NOT_AVAILABLE');return this.directory.page(cursor);}
 submit(value){return this.commands.submit(input(value));}
 result(selector){return this.commands.status(selector);}
 async updateContact(operationId,contactEmail){const own=await this.selfContact();return this.submit({schemaVersion:SCHEMA,operationId,commandType:'members.self.update',target:{personId:own.data.idPessoa},payload:{patch:{contactEmail}},evidenceRefs:[],decisionRef:null});}
}
