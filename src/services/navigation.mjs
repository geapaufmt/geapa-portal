import {fail} from './errors.mjs';
// Route selection is not permission. Each handler obtains a fresh server-authorized DTO.
export function navigate(route,members){if(route==='own-profile')return members.profile();if(route==='own-status')return members.status();if(route==='own-functions')return members.functions();if(route==='own-directors')return members.directors();if(route==='own-contact')return members.selfContact();fail('CONTRACT_NOT_AVAILABLE');}
