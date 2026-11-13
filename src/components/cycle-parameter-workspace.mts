import type {ParametersData} from './cycle-parameters.mjs';
const names=['Identificação','Frequência','Calendário','Apresentações','Temas e Eixos','Prazos','Materiais','Histórico'];
let sequence=0;
/** Organizes the existing canonical form without remounting or copying its values. */
export function organizeParameters(root:HTMLElement,data:ParametersData):void {
 const id='cycle-workspace-'+(++sequence),form=root.querySelector<HTMLFormElement>('[data-cycle-parameters-form]')!,decisions=root.querySelector<HTMLElement>('[data-parameter-decisions]')!,history=decisions.nextElementSibling as HTMLElement;
 root.classList.add('geapa-parameter-workspace');root.closest('.modal-backdrop')?.classList.add('geapa-parameter-dialog');form.id=id;
 const intro=document.createElement('header');intro.className='geapa-parameter-intro';
 while(root.firstElementChild!==form)intro.append(root.firstElementChild!);
 const layout=document.createElement('div');layout.className='geapa-parameter-layout';const nav=document.createElement('nav');nav.setAttribute('aria-label','Seções dos parâmetros');nav.setAttribute('role','tablist');nav.setAttribute('aria-orientation','vertical');
 const viewport=document.createElement('div');viewport.className='geapa-parameter-viewport';
 const panels:HTMLElement[]=[...form.querySelectorAll<HTMLElement>('.geapa-parameter-section')].map(old=>{const panel=document.createElement('section'),summary=old.querySelector('summary')!,heading=document.createElement('h3');panel.className=old.className;heading.textContent=summary.textContent;summary.replaceWith(heading);panel.append(...old.childNodes);old.replaceWith(panel);return panel;});panels.push(history);
 const first=panels[0]!;for(const label of [...form.querySelector('fieldset')!.children].filter(el=>el.tagName==='LABEL'))first.append(label);
 const footer=document.createElement('footer');footer.className='geapa-parameter-actions';const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]');if(submit){submit.setAttribute('form',id);footer.append(submit);}
 const historyButton=document.createElement('button');historyButton.type='button';historyButton.textContent='Consultar histórico';footer.append(historyButton);
 const close=document.createElement('button');close.type='button';close.textContent='Cancelar / fechar';close.setAttribute('data-admin-modal-close','');footer.append(close);
 const tabs=panels.map((panel,i)=>{const tab=document.createElement('button');tab.type='button';tab.textContent=names[i]!;tab.id=id+'-tab-'+i;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',id+'-panel-'+i);panel.id=id+'-panel-'+i;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.tabIndex=0;
  nav.append(tab);return tab;});
 function select(index:number,focus=false){panels.forEach((panel,i)=>panel.hidden=i!==index);tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});form.hidden=index===7;decisions.hidden=index!==0;viewport.scrollTop=0;if(focus)tabs[index]!.focus();}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{const next=event.key==='Home'?0:event.key==='End'?7:['ArrowDown','ArrowRight'].includes(event.key)?(i+1)%8:['ArrowUp','ArrowLeft'].includes(event.key)?(i+7)%8:-1;if(next>=0){event.preventDefault();select(next,true);}});});
 historyButton.addEventListener('click',()=>select(7,true));
 viewport.append(form,decisions,history);layout.append(nav,viewport);root.replaceChildren(intro,layout,footer);select(0);
 form.addEventListener('invalid',event=>{const target=event.target as HTMLElement,index=panels.findIndex(p=>p.contains(target));if(index>=0)select(index);},true);
 form.addEventListener('submit',()=>{if(form.hidden)select(0);},true);
 // Feedback remains visible even while consulting history or another section.
 const feedback=form.querySelector<HTMLElement>('[data-feedback]')!;feedback.id=id+'-feedback';footer.prepend(feedback);form.dataset.feedbackId=feedback.id;
 // Opening a canonical specialized editor must not replace an unsaved form.
 root.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('[data-cycle-frequency],[data-cycle-parameter-specialized]')&&root.closest('.modal-backdrop')?.getAttribute('data-geapa-dirty')==='true'){event.preventDefault();event.stopImmediatePropagation();feedback.textContent='Salve o rascunho antes de abrir as definições vinculadas.';feedback.focus();}},true);
 // Dependents remain in the same form, retaining documentary values and dates.
 const dependencies:Record<string,[string,string]>={selfSchedulingWindow:['calendarMode','MEMBER_SELF_SCHEDULE'],preAgendaPolicyRef:['planningMode','RECOGNIZED_PREAGENDA'],dynamicLimit:['dynamic','true'],dynamicRequestLeadDays:['dynamic','true'],dynamicMaterialRequirementRef:['dynamic','true'],jointAcceptanceHours:['jointRequestsEnabled','true']};
 function conditions(){for(const [key,[parent,value]]of Object.entries(dependencies)){const row=form.querySelector<HTMLElement>(`[data-parameter="${key}"]`),control=form.elements.namedItem('value_'+parent) as HTMLSelectElement|null,status=form.elements.namedItem('status_'+parent) as HTMLSelectElement|null;if(row){row.hidden=!!control&&(status?.value!=='DEFINED'||control.value!==value);if(row.hidden)row.querySelectorAll<HTMLInputElement>('input,select,textarea').forEach(el=>el.required=false);}}}
 for(const field of data.fields){const row=form.querySelector<HTMLElement>(`[data-parameter="${field.key}"]`)!;const badge=document.createElement('span');badge.className='geapa-parameter-badge';badge.textContent=field.rule&&Object.hasOwn(field.rule,'fixed')?'Valor fixado pela norma':field.rule?.editable===false?'Alteração não delegada pela norma':field.status==='UNESTABLISHED'?'Não comprovado':field.status==='NOT_APPLICABLE'?'Não aplicável':data.draft?'Em rascunho':data.current?'Valor vigente':'Valor registrado';row.querySelector('h4')!.after(badge);row.dataset.parameterState=field.status;row.addEventListener('input',()=>{row.dataset.parameterState='PROPOSED';badge.textContent='Alteração proposta';});
  if(field.rule?.allowed){const allowed=field.rule.allowed.map(String);for(const option of row.querySelectorAll<HTMLOptionElement>('[name="value_'+field.key+'"] option'))if(option.value&&!allowed.includes(option.value)&&!option.selected)option.disabled=true;}
  if(data.draft&&data.current){const note=document.createElement('p'),v=data.current.parameters?.[field.key];note.className='geapa-detail-note';note.textContent='Vigente · '+data.current.id+': '+(v===undefined?'Sem valor comprovado':typeof v==='boolean'?(v?'Sim':'Não'):typeof v==='object'?JSON.stringify(v):String(v));badge.after(note);}
 }
 form.addEventListener('change',conditions);conditions();
}
