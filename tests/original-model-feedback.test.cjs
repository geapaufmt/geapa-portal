const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function mounted(send,done=()=>{}){
 const fields={},attributes={},feedback={textContent:'',focus(){this.focused=true}},button={disabled:false},modal={setAttribute(k,v){attributes[k]=v},removeAttribute(k){delete attributes[k]}},handlers={};
 const form={elements:{namedItem:k=>fields[k]??={}},reportValidity:()=>true,addEventListener(n,fn){handlers[n]=fn},setAttribute(){},removeAttribute(){},closest:s=>s==='.modal-backdrop'?modal:{parentElement:modal},querySelector:()=>feedback,querySelectorAll:()=>[button]};
 const container={innerHTML:'',querySelector:()=>form};
 const data=new Map(Object.entries({name:'Synthetic original',type:'ORGANIZACIONAL',subtype:'SYN_DYNAMIC',purpose:'Fixture',organizer:'Fixture',durationMinutes:'120',maxMaterialMb:'0',participantTypes:['MEMBRO'],allowedFormats:['PRESENCIAL'],allowedPrincipalTypes:[],materialExtensions:[],visibility:'MEMBERS',reason:'Synthetic test',confirm:'on'}));
 class FormData{get(k){const v=data.get(k);return Array.isArray(v)?v[0]??null:v??null}getAll(k){const v=data.get(k);return Array.isArray(v)?v:v?[v]:[]}has(k){return data.has(k)}}
 const ctx={FormData,Error};vm.createContext(ctx);vm.runInContext(fs.readFileSync('build/typescript/model-frequency-editor.mjs','utf8').replace(/^export /gm,''),ctx);
 ctx.mountOriginalModel(container,undefined,[],{canDraft:true,canApprove:false,canSetAvailability:false},send,done);
 return {container,feedback,button,fields,attributes,submit:()=>handlers.submit({preventDefault(){}})};
}
test('failed save preserves form and values, announces error, never refreshes catalog',async()=>{
 let calls=0,done=0;const h=mounted(async()=>{calls++;throw Error('Core rejeitou: campos inválidos')},()=>done++),before=h.container.innerHTML;
 await h.submit();a.equal(calls,1);a.equal(done,0);a.equal(h.container.innerHTML,before);a.match(h.feedback.textContent,/campos inválidos/);a(h.feedback.focused);a.equal(h.button.disabled,false);a(!h.attributes['aria-busy']);
});
test('pending command blocks double submit and closes only after confirmed result',async()=>{
 let release,calls=0,done=0;const h=mounted(()=>{calls++;return new Promise(r=>release=r)},()=>done++);
 const pending=h.submit();a.equal(h.attributes['aria-busy'],'true');await h.submit();a.equal(calls,1);a.equal(done,0);
 release({typeRef:{kind:'activityType',id:'SYN_DRAFT'}});await pending;a.equal(done,1);a.equal(h.button.disabled,true);await h.submit();a.equal(calls,1);
});
test('successful commit followed by catalog failure never permits duplicate save',async()=>{
 let calls=0;const h=mounted(async()=>{calls++;return {}},()=>{throw Error('READ_TIMEOUT')});await h.submit();a.match(h.feedback.textContent,/registro foi salvo/);a.match(h.feedback.textContent,/não envie novamente/);await h.submit();a.equal(calls,1);
});
test('model form offers canonical optional principal and file choices and technical bounds',()=>{
 const h=mounted(async()=>{});a.equal(h.fields.maxMaterialMb.max,'30');a.equal(h.fields.durationMinutes.min,'1');a.equal(h.fields.durationMinutes.max,'1440');a.equal(h.fields.name.maxLength,120);
 a.match(h.container.innerHTML,/<select name="allowedPrincipalTypes" multiple\s*>/);a(!h.container.innerHTML.includes('separados por vírgula'));a.match(h.container.innerHTML,/Diretoria é uma função/);a.equal(h.attributes['data-geapa-protect-draft'],'');
});
test('canonical validation error is distinct from authorization failure',async()=>{
 const {actDomainFailure}=await import('../dist/dev/assets/act-command/act-browser-client.mjs');
 a.match(actDomainFailure({code:'VALIDATION_ERROR'}).message,/campos enviados/);a.match(actDomainFailure({code:'FORBIDDEN'}).message,/acesso/);
 a.match(actDomainFailure({code:'INCOMPLETE_REQUEST',reasonCode:'MATERIAL_MODEL_REQUIRED'}).message,/desmarque Exige material/);
});
