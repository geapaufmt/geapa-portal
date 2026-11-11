type Phase='TRANSITION'|'AUTH'|'APP_CHECK'|'CONTEXT';
type Diagnostic={phase:Phase;generation:number;reason:string;elapsedMs:number;route:string;release:string;editing:boolean;at:number;correlation:string};
const events:Diagnostic[]=[];
const correlation=globalThis.crypto?.randomUUID?.()||'unavailable';
/** Bounded, in-memory diagnostics only. Payloads and identity identifiers are excluded. */
export function sessionDiagnostic(phase:Phase,generation:number,reason:string,elapsedMs=0):void {
 const doc=typeof document==='undefined'?null:document;
 const route=typeof window==='undefined'?'':(window as Window&{PortalGeapaNavigation?:{getRotaAtual?:()=>string}}).PortalGeapaNavigation?.getRotaAtual?.()||'';
 events.push({phase,generation,reason:/^[A-Z_]{1,64}$/.test(reason)?reason:'OTHER',elapsedMs:Math.max(0,Math.round(elapsedMs)),route:/^[a-z-]{1,64}$/.test(route)?route:'',release:'session-resilience-v1',editing:!!doc?.querySelector('[data-geapa-protect-draft][data-geapa-dirty="true"]'),at:Date.now(),correlation});
 if(events.length>40)events.shift();
}
export function sessionDiagnosticSnapshot():readonly Diagnostic[]{return events.map(e=>({...e}));}
