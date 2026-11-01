import {fail} from './errors.mjs';
const ID='[A-Za-z0-9_-]{1,48}',paths=[new RegExp('^(portalUsers|portalAccessStatus|memberPortalProfiles|memberStatusViews|memberSelfProfiles)/'+ID+'$'),new RegExp('^portalAccessStatus/'+ID+'/state/current$'),new RegExp('^memberCurrent(Functions|Directors)/'+ID+'/(index/current|items/'+ID+')$'),new RegExp('^memberReadViews/'+ID+'/items/'+ID+'$')];
export function admitPath(path){if(typeof path!=='string'||!paths.some(re=>re.test(path)))fail('FORBIDDEN');return path;}
