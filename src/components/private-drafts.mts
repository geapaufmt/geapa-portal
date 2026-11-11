/** Private, tab-lifetime working copies. Never persisted or used as authority. */
export class PrivateDrafts<T> {
 private scope='';
 private readonly values=new Map<string,T>();
 use(scope:string):void {if(scope!==this.scope){this.values.clear();this.scope=scope;}}
 set(scope:string,key:string,value:T):void {this.use(scope);if(scope)this.values.set(key,structuredClone(value));}
 get(scope:string,key:string):T|undefined {this.use(scope);const value=this.values.get(key);return value===undefined?undefined:structuredClone(value);}
 remove(scope:string,key:string):void {if(scope===this.scope)this.values.delete(key);}
 clear():void {this.values.clear();this.scope='';}
}
export const minuteDrafts=new PrivateDrafts<{
 fields:{name:string;value:string;checked:boolean;type:string}[];
 references:{label:string;url:string;sha256:string;targetId:string|null;evidence:string}[];
 images:{mime:string;base64:string;sha256:string;caption:string}[]; attachments:ReturnType<ReturnType<typeof import('./institutional-document-files.mjs').mountFileFields>['snapshot']>|undefined; revision:number;
}>();
export function draftScope():string {return (window as Window&{PortalDevContext?:{identityScope?:string}}).PortalDevContext?.identityScope||'';}
if(typeof document!=='undefined')document.addEventListener('portal:act-session-cleared',()=>minuteDrafts.clear());
