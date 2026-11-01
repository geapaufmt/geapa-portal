export const PROJECT='geapa-convergencia-dev';
const keys=['apiKey','appId','messagingSenderId','authDomain','projectId'];
export function validateConfig(c){if(!c||Object.getPrototypeOf(c)!==Object.prototype||Object.keys(c).length!==keys.length||!keys.every(k=>typeof c[k]==='string'&&c[k].length>0))throw Error('FIREBASE_CONFIG_REQUIRED');
 if(c.projectId!==PROJECT||c.authDomain!==PROJECT+'.firebaseapp.com'||!/^AIza[0-9A-Za-z_-]{35}$/.test(c.apiKey)||!/^1:520248492623:web:[0-9a-f]+$/.test(c.appId)||c.messagingSenderId!=='520248492623')throw Error('FIREBASE_CONFIG_REJECTED');return Object.freeze({...c});}
export async function loadConfig(){const r=await fetch('/firebase-config.json',{cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok)throw Error('FIREBASE_CONFIG_REQUIRED');return validateConfig(await r.json());}
