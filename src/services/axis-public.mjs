import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {initializeFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {loadConfig} from '../physical-560120e5c1fbb33e/config.mjs';
import {deploymentProfile} from '../deployment-profile.mjs';
import {devAppCheck} from './dev-app-check.mjs';
import {specializedReadersConfig} from './specialized-readers-config.mjs';
let ready;
async function database(){return ready??=(async()=>{const config=await loadConfig();if(config.projectId!==deploymentProfile.projectId)throw Error('DESTINATION_INVALID');const app=getApps().find(a=>a.name==='GEAPA_PUBLIC_AXES')||initializeApp(config,'GEAPA_PUBLIC_AXES');await devAppCheck(app,specializedReadersConfig.siteKey);return initializeFirestore(app,{experimentalForceLongPolling:true});})().catch(e=>{ready=null;throw e;});}
// No Firebase Auth instance or administrative credentials in this public client.
export async function readPublicAxes(){const db=await database(),prefix='' ;const read=async id=>{const snap=await getDocFromServer(doc(db,prefix+'publicPages/'+id));if(!snap.exists())throw Error('Conteúdo ainda não publicado.');return snap.data();};const index=await read('eixos-tematicos');if(!Array.isArray(index.sections)||index.sections.length!==8||index.sections.some(s=>!/^EIXOS_[0-9]{8}_EIXO_0[1-8]$/.test(s.id)))throw Error('PROJECTION_INVALID');const pages=await Promise.all(index.sections.map(s=>read(s.id)));return {index,pages};}
