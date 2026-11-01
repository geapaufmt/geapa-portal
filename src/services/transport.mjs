import {fail,PortalError} from './errors.mjs';
import {admitPath} from './destination.mjs';
import {exact,need} from './command-contract.mjs';
// Separate from admission. Get-only, fixed demo, Rules-enforced local port.
export class Transport {
 #auth; #read;
 constructor(auth,read,config){exact(config,['environment','projectId']);need(config.environment==='SYNTHETIC_LOCAL'&&config.projectId==='demo-geapa-m13-local'&&typeof read==='function');this.#auth=auth;this.#read=read;}
 async get(path,ticket,optional=false){
 this.#auth.assert(ticket);this.readsInFlight??=new Map();const key=JSON.stringify([ticket.uid,ticket.generation,path,optional]);
 if(this.readsInFlight.has(key))return this.readsInFlight.get(key);
 const task=this.getUnshared(path,ticket,optional).then(value=>{this.#auth.assert(ticket);return value}).finally(()=>{if(this.readsInFlight.get(key)===task)this.readsInFlight.delete(key)});
 this.readsInFlight.set(key,task);return task;
 }
 async getUnshared(path,ticket){admitPath(path);this.#auth.assert(ticket);try{const v=await this.#read(path,ticket);this.#auth.assert(ticket);const deadline=v?.expiresAt||v?.validUntil;if(typeof deadline?.toMillis==='function')this.#auth.observeDeadline?.(deadline.toMillis());return v;}catch(e){const code=e instanceof PortalError?e.code:e?.code==='permission-denied'?'FORBIDDEN':'OFFLINE_NOT_ALLOWED';this.#auth.clear(code);fail(code);}}
 async query(){fail('QUERY_NOT_ALLOWED');}
 async request(){fail('QUERY_NOT_ALLOWED');}
 async admit(){fail('COMMAND_NOT_ADMITTED');}
 async anonymous(){fail('CONTRACT_NOT_AVAILABLE');}
}
