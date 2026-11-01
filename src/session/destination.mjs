import {fail} from './errors.mjs';
const ID='[A-Za-z0-9_-]{1,48}';const paths=[new RegExp('^(portalUsers|portalAccessStatus|memberPortalProfiles|memberStatusViews)/'+ID+'$'),new RegExp('^portalAccessStatus/'+ID+'/state/current$'),new RegExp('^memberCurrent(Functions|Directors)/'+ID+'/(index/current|items/'+ID+')$')];
export function admitPath(path){if(typeof path!=='string'||!paths.some(re=>re.test(path)))fail('FORBIDDEN');return path;}
