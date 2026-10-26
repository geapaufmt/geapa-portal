export function clearPrivateStorage(){
 const exact=['geapaPortal.sessionToken','geapaPortal.safeUserSummary'];
 for(const storage of [localStorage,sessionStorage]){const keys=Object.keys(storage);for(const key of keys)if(exact.includes(key)||key.startsWith('geapaPortal.atividadesLeitura.v17.'))storage.removeItem(key);}
 // No IndexedDB persistence is enabled for the candidate. Never delete unrelated databases or pending operation journals.
}
export async function startPublicPwa(){if('serviceWorker'in navigator)await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});}
