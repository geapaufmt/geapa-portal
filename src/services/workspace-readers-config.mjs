import {specializedReadersConfig} from './specialized-readers-config.mjs';
// Local candidate only: identity, private storage and HTTP validation pending.
export const workspaceReadersConfig=Object.freeze({...specializedReadersConfig,enabled:false,routes:['/v2/apresentacoes/material/arquivo','/v2/apresentacoes/foto/arquivo','/v2/justificativas/documento/arquivo'],blockedRoutes:[]});
