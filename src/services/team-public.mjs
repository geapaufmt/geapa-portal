import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {initializeFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {loadConfig,PROJECT} from '../physical-560120e5c1fbb33e/config.mjs';
import {devAppCheck} from './dev-app-check.mjs';
import {specializedReadersConfig} from './specialized-readers-config.mjs';
import {createPublicDirectory} from './public-directory.mjs';
let ready;
async function directory(){return ready??=(async()=>{const config=await loadConfig();if(config.projectId!==PROJECT)throw Error('DESTINATION_INVALID');const app=getApps().find(a=>a.name==='GEAPA_PUBLIC_TEAM')||initializeApp(config,'GEAPA_PUBLIC_TEAM');await devAppCheck(app,specializedReadersConfig.siteKey);return createPublicDirectory({db:initializeFirestore(app,{experimentalForceLongPolling:true}),sdk:{doc,getDocFromServer}});})().catch(e=>{ready=null;throw e;});}
// Reads only approved public DTOs. No Auth, private reader, or administrative fallback.
export async function readPublicTeam(){const reader=await directory(),items=[];let cursor=null;for(let page=0;page<42;page++){const result=await reader.page(cursor);items.push(...result.items);if(items.length>500)throw Error('DIRECTORY_LIMIT');if(!result.nextCursor)return items;cursor=result.nextCursor;}throw Error('DIRECTORY_LIMIT');}
