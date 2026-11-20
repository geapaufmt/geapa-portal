type Escape = (value: string) => string;
export function authorizationForm(id: string, revoke: boolean, escape: Escape): string {
  return '<form class="readonly-form" data-theme-extraordinary-form>' +
    '<input type="hidden" name="idApresentacao" value="'+escape(id)+'">' +
    '<input type="hidden" name="action" value="'+(revoke?'revogar':'autorizar')+'">' +
    '<p>'+ (revoke?'A autorização não poderá mais ser utilizada. Os registros anteriores serão preservados.':'Permite um registro atual de título, resumo e eixos. Não aprova o tema nem altera a realização da apresentação.') +'</p>' +
    (revoke?'':'<label>Motivo da autorização<textarea name="motivo" required maxlength="2000"></textarea></label>') +
    '<button type="submit">'+(revoke?'Confirmar revogação':'Confirmar autorização extraordinária')+'</button></form>';
}
export function authorizationPayload(data: FormData): {action: string; payload: Record<string, unknown>} {
  const action=String(data.get('action'));
  if(!['autorizar','revogar'].includes(action))throw Error('Ação inválida.');
  return {action,payload:{idApresentacao:String(data.get('idApresentacao')),confirmed:true,...(action==='autorizar'?{motivo:String(data.get('motivo')).trim()}:{})}};
}
export function registrationFields(mode: string, realized: boolean): string {
  if(!['regularizar','registrar'].includes(mode))return '';
  return '<input type="hidden" name="regularizacao" value="'+mode+'">'+
    '<p>'+ (realized?'Registro posterior, com a data de hoje. O tema aprovado e a realização serão preservados. Este complemento documental não equivale a aprovação temática.':'O tema ficará aguardando revisão humana. A autorização será consumida somente após o registro confirmado.')+'</p>'+
    (mode==='registrar'?'<label>Referência da comunicação institucional<textarea name="evidenceReference" required maxlength="2000" placeholder="Protocolo ou referência da mensagem recebida"></textarea></label><label>Recebida em<input name="evidenceReceivedAt" type="datetime-local" required></label><label><input name="evidenceConfirmed" type="checkbox" required>Confirmo que transcrevi as informações efetivamente recebidas do apresentador pelo canal institucional indicado.</label>':'');
}
export function institutionalEvidence(data: FormData, now=Date.now()): Record<string, unknown> {
  const receivedAt=new Date(String(data.get('evidenceReceivedAt'))).getTime(),reference=String(data.get('evidenceReference')||'').trim();
  if(!data.get('evidenceConfirmed')||!reference||!Number.isSafeInteger(receivedAt)||receivedAt<=0||receivedAt>now)throw Error('Confira a referência, a data de recebimento e a confirmação da transcrição.');
  return {confirmed:true,institutionalEvidence:{reference,receivedAt}};
}
export function documentaryRecord(record: {title?:string;summary?:string;recordedAt?:string}|undefined, escape:Escape):string {
  if(!record)return '';
  return '<section data-theme-documentary-record><strong>Registro documental posterior — sem aprovação temática</strong><p>'+escape(record.title||'')+'</p><p>'+escape(record.summary||'')+'</p><small>Registrado em '+escape(record.recordedAt?new Date(record.recordedAt).toLocaleString('pt-BR'):'')+'</small></section>';
}
