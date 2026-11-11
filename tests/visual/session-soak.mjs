// Explicit local fixtures; this does not claim an authenticated Firebase proof.
const started=Date.now();let reads=0,fail=false,slow=false;
window.PortalDevContext={identityScope:'synthetic-local:person-a:1'};
window.PortalGeapaNavigation={getRotaAtual:()=> 'institutional-governance'};
const governance={revision:1,canEdit:false,canCreateMinute:true,documentFilesEnabled:true,boards:[{id:'SYN_BOARD',name:'Gestão sintética'}],records:[],history:[],normativeVersions:[]};
window.PortalGeapaApi={apiGet:async()=>{reads++;if(slow)await new Promise(r=>setTimeout(r,40000));if(fail)throw Error('SYNTHETIC_NETWORK_UNAVAILABLE');return {ok:true,data:{schemaVersion:'institutional-consultation-v1',section:'governance',revision:1,items:[],total:0,page:1,pages:1,kinds:[],validUntil:Date.now()+60000,governance:{...governance}}};},apiPost:async()=>({ok:false,message:'Envios desabilitados neste ensaio de duração.'})};
await import('/assets/act-ui/institutional-directory.mjs');
document.dispatchEvent(new Event('portal:navigationchange'));
await new Promise(r=>setTimeout(r,200));document.querySelector('[data-minute-new]').click();
const textarea=document.querySelector('[name=fullText]');textarea.value='Texto exclusivamente sintético — preservar durante renovações, falha de rede e retorno à aba.';textarea.dispatchEvent(new Event('input',{bubbles:true}));
const expected=textarea.value;let failures=0;
// Delayed renewal crosses the original proof. Later failure is recovered normally.
setTimeout(()=>{slow=true;},75000);setTimeout(()=>{slow=false;},155000);
setTimeout(()=>{fail=true;document.dispatchEvent(new CustomEvent('portal:act-session-suspended'));},240000);
setTimeout(()=>{fail=false;document.dispatchEvent(new Event('portal:act-context-ready'));},300000);
setTimeout(()=>{governance.revision++;governance.records=[];},360000);
setInterval(()=>{if(document.querySelector('[name=fullText]')?.value!==expected)failures++;document.getElementById('evidence').textContent=JSON.stringify({localFixture:true,seconds:Math.floor((Date.now()-started)/1000),reads,failures,editorOpen:!!document.querySelector('[data-minutes-dialog]'),suspended:!!document.querySelector('[data-geapa-suspended]'),dirty:!!document.querySelector('[data-geapa-dirty]')});},1000);
