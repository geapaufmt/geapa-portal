const CODES=Object.freeze(['SERVICE_QUOTA_EXHAUSTED','REQUEST_TIMEOUT','AUTH_REQUIRED','BINDING_REQUIRED','ACCESS_REVOKED','STALE_AUTHORIZATION','FORBIDDEN','QUERY_NOT_ALLOWED','COMMAND_NOT_ADMITTED','COMMAND_PENDING','COMMAND_FAILED','COMMAND_RECONCILIATION_REQUIRED','OFFLINE_NOT_ALLOWED','SCHEMA_UNSUPPORTED','CONTRACT_NOT_AVAILABLE']);
class PortalError extends Error { constructor(code){super(CODES.includes(code)?code:'FORBIDDEN');this.name='PortalError';this.code=this.message;} toJSON(){return {code:this.code,...(typeof this.operationId==='string'&&/^[a-f0-9]{32}$/.test(this.operationId)?{operationId:this.operationId}:{})};} }
const fail=code=>{throw new PortalError(code)};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,48}$/.test(v);
const operation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export {CODES,PortalError,fail,id,operation};
