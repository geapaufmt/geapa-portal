import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {initializeFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {loadConfig} from '../physical-560120e5c1fbb33e/config.mjs';
import {createPublicDirectory,renderPublicPeople} from './public-directory.mjs';
const button=document.getElementById('more'),message=document.getElementById('message'),node=document.getElementById('people');
let cursor=null,items=[];
try{const app=initializeApp(await loadConfig(),'MEMBERS_PUBLIC_DEV'),db=initializeFirestore(app,{experimentalForceLongPolling:true}),directory=createPublicDirectory({db,sdk:{doc,getDocFromServer}});button.addEventListener('click',async()=>{button.disabled=true;message.textContent='Carregando…';try{const page=await directory.page(cursor);items.push(...page.items);renderPublicPeople(node,items);cursor=page.nextCursor;button.hidden=!cursor;message.textContent=items.length?'':'Nenhuma pessoa publicada no momento.';}catch{items=[];node.replaceChildren();cursor=null;button.hidden=false;message.textContent='Diretório temporariamente indisponível. Tente novamente.';}finally{button.disabled=false;}});button.click();}catch{button.disabled=true;message.textContent='Não foi possível preparar o diretório.';}
