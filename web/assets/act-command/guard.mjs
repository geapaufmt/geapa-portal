import {fail} from './errors.mjs';
// No role-based allow path and no legacy transport fallback.
export function installLegacyGuard(target){Object.defineProperty(target,'PortalGeapaApi',{value:Object.freeze(Object.fromEntries(['apiGet','apiPost','callAction','queryPresentationDecision','reconcilePresentationDecision'].map(k=>[k,()=>fail('CONTRACT_NOT_AVAILABLE')]))),writable:false,configurable:false});}
