import {deploymentProfile as deployment} from '../deployment-profile.mjs';
import {dataPrefix,fixtureUid} from '../act-command/dev-scope.mjs';
// DEV rehearsal routing. Shared Core validates the identity and role.
export const ACT_ENABLED=true;
const REAL_UID="0WejtvmbXjfVSntKDf0cSJCaQSt1";
export const actUid=uid=>ACT_ENABLED&&(deployment.environment==='PROD'?typeof uid==='string'&&uid.length>0:uid===REAL_UID||fixtureUid(uid));
export const memberPrefix=dataPrefix;
export const directActUid=uid=>actUid(uid)&&dataPrefix(uid)==='';
