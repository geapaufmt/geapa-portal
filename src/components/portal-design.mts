/** Shared presentation entry, available before authentication. No data access. */
import './design-system.mjs';
import {installCardInteractions} from './card-interactions.mjs';
if(typeof document!=='undefined')installCardInteractions();

import './board-competencies.mjs';

import './people-directory.mjs';
