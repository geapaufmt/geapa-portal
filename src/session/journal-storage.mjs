// Read-only Portal stays usable when storage is denied. Mutations must retain
// their recovery journal before admission, so they fail closed without storage.
export function journalStorage(root=globalThis){
 const unavailable=()=>{throw Object.assign(Error('Armazenamento indisponível. Abra o Portal em um navegador com armazenamento permitido antes de enviar alterações.'),{code:'COMMAND_RECONCILIATION_REQUIRED'});};
 return {getItem(k){try{return root.localStorage.getItem(k);}catch{return null;}},setItem(k,v){try{root.localStorage.setItem(k,v);}catch{unavailable();}},removeItem(k){try{root.localStorage.removeItem(k);}catch{unavailable();}}};
}
