export function clearPrivateStorage(){
 const exact=['geapaPortal.sessionToken','geapaPortal.safeUserSummary'];
 for(const name of ['localStorage','sessionStorage'])try{const storage=globalThis[name],keys=Object.keys(storage);for(const key of keys)if(exact.includes(key)||key.startsWith('geapaPortal.atividadesLeitura.v17.'))storage.removeItem(key);}catch{/* Storage can be denied in embedded/private browsers. */}
 // Never remove Firebase credentials, unrelated databases, or operation journals.
}
export async function startPublicPwa(){if('serviceWorker'in navigator)await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});}
