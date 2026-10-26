// Opt-in decoder only. Historical bundle and live consumer wiring remain untouched.
import {decode as legacy, models as oldModels} from '../physical-560120e5c1fbb33e/m12-dtos.mjs';
import {fail} from '../physical-560120e5c1fbb33e/errors.mjs';
const models=Object.freeze({...oldModels,
  'safe-member-function-v13':Object.freeze({...oldModels['safe-member-function-v12'],scopeKey:'nullableString'}),
  'member-function-index-v13':Object.freeze({...oldModels['member-function-index-v12'],authorityEpoch:'integer'})
});
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,48}$/.test(x);
const need=ok=>{if(!ok)fail('SCHEMA_UNSUPPORTED');};
function civil(s){need(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s));const n=Date.parse(s+'T00:00:00Z');need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s);return n;}
function decode(data){
  if(Object.prototype.hasOwnProperty.call(oldModels,data?.schemaVersion))return legacy(data);
  const model=models[data?.schemaVersion];need(!!model);
  const keys=['schemaVersion',...Object.keys(model)];need(Object.keys(data).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(data,k)));
  const out={...data};
  if(data.schemaVersion==='member-function-index-v13'){
    need(id(data.idPessoa)&&['memberCurrentFunctions','memberCurrentDirectors'].includes(data.kind));
    for(const k of ['sourceRevision','authorityEpoch'])need(Number.isSafeInteger(data[k])&&data[k]>0);
    need(Array.isArray(data.ids)&&data.ids.every(id)&&new Set(data.ids).size===data.ids.length);
    for(const k of ['asOf','validUntil']){need(typeof data[k]?.toMillis==='function'&&typeof data[k]?.toDate==='function'&&Number.isSafeInteger(data[k].toMillis()));out[k]=data[k].toDate().toISOString();}
    need(data.asOf.toMillis()<data.validUntil.toMillis());out.ids=Object.freeze([...data.ids]);
  }else{
    for(const k of ['idPessoa','idVigencia','idDiretoria','idTermo'])need(id(data[k]));
    if(data.scopeKey===null)need(data.roleKey==='CONSELHEIRO_CONSULTIVO'&&data.group==='CONSELHO');
    else need(id(data.scopeKey)&&!['null','NO_FUNCTIONAL_SCOPE','CONSELHO'].includes(data.scopeKey)&&id(data.roleKey)&&['DIRETORIA','ASSESSORIA','CONSELHO'].includes(data.group));
    const start=civil(data.startDate);need(data.endDatePlanned!==null||data.endDateReal!==null);
    for(const k of ['endDatePlanned','endDateReal'])if(data[k]!==null)need(civil(data[k])>=start);
  }
  // Decode is not authority: approval/revisions are checked by private proofs/Rules.
  return Object.freeze(out);
}
export {decode,models};
