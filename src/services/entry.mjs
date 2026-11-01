import {installLegacyGuard} from './guard.mjs';
// Inert local candidate. Live bootstrap is deliberately not a side effect of F.
installLegacyGuard(window);
const node=document.getElementById('portal-toast-region');
if(node)node.textContent='Candidato local de Membros. A conexão operacional aguarda os gates de homologação.';
export {createLocalServices} from './browser-services.mjs';
