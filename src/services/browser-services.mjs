import {AuthService} from './auth-service.mjs';
import {Transport} from './transport.mjs';
import {AdmissionTransport} from './admission-transport.mjs';
import {CommandService} from './command-service.mjs';
import {Repositories} from './repositories.mjs';
import {MembersService} from './members-service.mjs';
import {CONFIG} from './config.mjs';
import {createActivitiesServices} from '../activities-v2/services.mjs';
// Called only by local harness with loopback SDK ports; no global token or services.
export function createLocalServices({auth,sdk,readDocument,watchDocument,admissionPorts,activities}){
 const identity=new AuthService(auth,sdk),transport=new Transport(identity,readDocument,CONFIG),repositories=new Repositories(identity,transport,watchDocument),commands=new CommandService(identity,new AdmissionTransport(identity,admissionPorts,CONFIG));
 return Object.freeze({identity,members:new MembersService(repositories,commands),commands,...(activities?{activities:createActivitiesServices({...activities,identity,commands})}:{})});
}
