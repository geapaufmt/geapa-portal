import {deploymentProfile as deployment} from '../deployment-profile.mjs';
export const PROJECT=deployment.projectId;
const keys=['apiKey','appId','messagingSenderId','authDomain','projectId'];
export function validateConfig(c){
 if(!c||Object.getPrototypeOf(c)!==Object.prototype||![keys.length,keys.length+1].includes(Object.keys(c).length)||Object.keys(c).some(k=>!keys.includes(k)&&k!=='storageBucket')||!keys.every(k=>typeof c[k]==='string'&&c[k].length>0))throw Error('FIREBASE_CONFIG_REQUIRED');
 if(Object.hasOwn(c,'storageBucket')&&c.storageBucket!==PROJECT+'.firebasestorage.app')throw Error('FIREBASE_CONFIG_REJECTED');
 const appPattern=new RegExp('^1:'+deployment.projectNumber+':web:[0-9a-f]+$');
 if(c.projectId!==PROJECT||c.authDomain!==PROJECT+'.firebaseapp.com'||!/^AIza[0-9A-Za-z_-]{35}$/.test(c.apiKey)||!appPattern.test(c.appId)||c.messagingSenderId!==deployment.projectNumber)throw Error('FIREBASE_CONFIG_REJECTED');
 return Object.freeze({...c});
}
export async function loadConfig(){const r=await fetch('/firebase-config.json',{cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok)throw Error('FIREBASE_CONFIG_REQUIRED');return validateConfig(await r.json());}
