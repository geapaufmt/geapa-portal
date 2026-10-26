// UI state only: never grants access or changes an authorization result.
export function readErrorCode(error){
 const code=error?.code;
 if(['COMMAND_RECONCILIATION_REQUIRED','RECONCILIATION_REQUIRED','DESTINATION_INVALID'].includes(code))return 'SERVICE_UNAVAILABLE';
 if(['AUTH_REQUIRED','BINDING_REQUIRED','ACCESS_REVOKED','STALE_AUTHORIZATION','FORBIDDEN','QUERY_NOT_ALLOWED','OFFLINE_NOT_ALLOWED','SCHEMA_UNSUPPORTED','CONTRACT_NOT_AVAILABLE','SERVICE_QUOTA_EXHAUSTED','REQUEST_TIMEOUT'].includes(code))return code;
 return 'SERVICE_UNAVAILABLE';
}
export function accessIsPending(context){return context?.accessPending===true;}
