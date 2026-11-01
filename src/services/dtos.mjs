import {decode as oldDecode} from '../physical-560120e5c1fbb33e/dtos.mjs';
import {decode as functionsDecode} from './m12-dtos.mjs';
import {models} from '../physical-560120e5c1fbb33e/dtos.mjs';
import {exact} from './command-contract.mjs';
export {models};
// Old formats remain explicit; F does not expose the legacy receipt's revision maps.
export function decode(kind,data){
  if(kind==='memberFunction'||kind==='memberFunctionIndex'){
    const versions=kind==='memberFunction'?['safe-member-function-v12','safe-member-function-v13']:['member-function-index-v12','member-function-index-v13'];
    if(!versions.includes(data?.schemaVersion))return functionsDecode(null);
    return functionsDecode(data);
  }
  if(data?.schemaVersion===models[kind]?.schema)exact(data,['schemaVersion',...Object.keys(models[kind].fields)]);
  return oldDecode(kind,data);
}
