// UI state only: never grants access or changes an authorization result.
export function readErrorCode(error){
 const code=error?.code;
 if(typeof code==='string'&&code.startsWith('appCheck/'))return 'APP_CHECK_UNAVAILABLE';
 if(['COMMAND_RECONCILIATION_REQUIRED','RECONCILIATION_REQUIRED','DESTINATION_INVALID'].includes(code))return 'SERVICE_UNAVAILABLE';
 if(['AUTH_REFRESH_REQUIRED','AUTH_REQUIRED','BINDING_REQUIRED','ACCESS_REVOKED','STALE_AUTHORIZATION','FORBIDDEN','QUERY_NOT_ALLOWED','OFFLINE_NOT_ALLOWED','SCHEMA_UNSUPPORTED','CONTRACT_NOT_AVAILABLE','SERVICE_QUOTA_EXHAUSTED','REQUEST_TIMEOUT'].includes(code))return code;
 return 'SERVICE_UNAVAILABLE';
}
export function accessIsPending(context){return context?.accessPending===true;}

// Retry only the failed attestation of a context READ, never a command, denied
// token exchange or SDK throttle. Persistent failure requires explicit recovery.
export async function recoverContextRead({read,isCurrent,visible,online,wait=()=>new Promise(resolve=>setTimeout(resolve,1000))}){
 try{return await read();}
 catch(error){
  if(error?.code!=='appCheck/recaptcha-error'||!isCurrent()||!visible()||!online())throw error;
  await wait();
  if(!isCurrent()||!visible()||!online())throw error;
  return read();
 }
}
