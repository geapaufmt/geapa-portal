type Escape = (value: string) => string;
export function revocationForm(id:string, escape:Escape):string {
  return '<form class="readonly-form" data-theme-extraordinary-form><input type="hidden" name="idApresentacao" value="'+escape(id)+'"><p>Encerrar a autorização pendente deste apresentador?</p><button type="submit">Confirmar revogação</button></form>';
}
export function registrationFields(mode:string, realized:boolean):string {
  if(mode!=='regularizar')return '';
  return '<input type="hidden" name="regularizacao" value="regularizar"><p>'+(realized?'O complemento será registrado com a data de hoje e preservará o tema aprovado.':'O tema ficará aguardando revisão humana.')+'</p>';
}
type Sections={tema:boolean;material:boolean;foto:boolean};
type Status={tema:string;material:string;foto:string};
export function administrativeForm(id:string, speaker:string, sections:Sections, status:Status, themeFields:string, realized:boolean, escape:Escape):string {
  const options=([['tema','Tema e eixos'],['material','Arquivo principal'],['foto','Foto']] as const)
    .map(([key,label])=>'<option value="'+key+'" '+(sections[key]?'':'disabled')+'>'+label+' — '+escape(status[key]||'Pendente')+(sections[key]?'':' (indisponível)')+'</option>').join('');
  return '<form class="readonly-form" data-administrative-registration><input type="hidden" name="idApresentacao" value="'+escape(id)+'">'+
    '<p>Apresentador: '+escape(speaker)+'</p><label>O que deseja registrar?<select name="section" required><option value="">Selecione</option>'+options+'</select></label>'+
    '<fieldset data-section="tema" hidden disabled><legend>Tema e eixos</legend><p>'+(realized?'Preencha os campos ausentes. O conteúdo existente e os fatos históricos serão preservados.':'Preencha os campos ausentes. Quando completo, o tema seguirá o fluxo temático vigente.')+'</p>'+themeFields+'</fieldset>'+
    '<fieldset data-section="material" hidden disabled><legend>Arquivo principal</legend><input aria-label="Arquivo principal" type="file" name="material" accept=".pdf,.ppt,.pptx,.odp" required></fieldset>'+
    '<fieldset data-section="foto" hidden disabled><legend>Foto</legend><input aria-label="Foto da apresentação" type="file" name="foto" accept=".jpg,.jpeg,.png,.webp" required></fieldset>'+
    '<fieldset data-source hidden disabled><legend>Recebimento institucional</legend><label>Procedência do arquivo<input name="reference" required maxlength="2000" placeholder="Protocolo ou mensagem de origem"></label><label>Recebido em<input name="receivedAt" type="datetime-local" required></label></fieldset>'+
    '<label>Justificativa administrativa<textarea name="motivo" required maxlength="2000"></textarea></label><button type="submit">Confirmar registro</button></form>';
}
export function selectSection(form:HTMLFormElement):void {
  const section=(form.elements.namedItem('section') as HTMLSelectElement).value;
  for(const group of form.querySelectorAll<HTMLFieldSetElement>('fieldset')){
    const enabled=group.hasAttribute('data-source')?['material','foto'].includes(section):group.dataset.section===section;
    group.disabled=!enabled;group.hidden=!enabled;
  }
}
export function receiptEvidence(data:FormData,now=Date.now()){
  const reference=String(data.get('reference')||'').trim(),receivedAt=new Date(String(data.get('receivedAt')||'')).getTime();
  if(!reference||!Number.isSafeInteger(receivedAt)||receivedAt<=0||receivedAt>now)throw Error('Informe a procedência e uma data de recebimento até o momento atual.');
  return {reference,receivedAt};
}
export function documentaryRecord(record: {title?:string;summary?:string;recordedAt?:string}|undefined, escape:Escape):string {
  if(!record)return '';
  return '<section data-theme-documentary-record><strong>Registro documental posterior — sem aprovação temática</strong><p>'+escape(record.title||'')+'</p><p>'+escape(record.summary||'')+'</p><small>Registrado em '+escape(record.recordedAt?new Date(record.recordedAt).toLocaleString('pt-BR'):'')+'</small></section>';
}

export function protectExistingTheme(form:HTMLFormElement,item:Record<string,unknown>):void {
  const fields:Record<string,string>={tituloApresentacao:'tema',observacoes:'resumoTema',eixoTematicoPrincipal:'eixoTematicoPrincipal',eixoTematicoSecundario:'eixoTematicoSecundario'};
  for(const [name,key] of Object.entries(fields)){
    const field=form.elements.namedItem(name) as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null;
    if(!field||!item[key])continue;
    // Disabled controls are omitted; the Core merges missing fields under CAS.
    field.disabled=true;field.dataset.preserved='true';
  }
}
