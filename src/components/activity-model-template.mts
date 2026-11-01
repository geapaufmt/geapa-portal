// UI composition only. The Core validates the template, criteria and authority.
export interface ModelTemplate { id: string; name?: string; [key: string]: unknown }
export function mountTemplatePicker(container: HTMLElement, items: ModelTemplate[], allowed: string[], choose: (value: ModelTemplate) => void): void {
 const label=document.createElement('label');label.textContent='Modelo-base aprovado';
 const select=document.createElement('select');select.required=true;
 select.add(new Option('Selecionar modelo-base',''));
 for(const item of items.filter(item=>allowed.includes(item.id)))select.add(new Option(item.name||item.id,item.id));
 label.append(select);const button=document.createElement('button');button.type='button';button.textContent='Continuar';button.disabled=true;
 select.addEventListener('change',()=>{button.disabled=!select.value;});
 button.addEventListener('click',()=>{const item=items.find(item=>item.id===select.value&&allowed.includes(item.id));if(item){button.disabled=true;choose(item);}});
 container.replaceChildren(label,button);select.focus();
}
