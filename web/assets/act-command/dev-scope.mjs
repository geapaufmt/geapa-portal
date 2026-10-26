import {deploymentProfile as deployment} from '../deployment-profile.mjs';
// DEV fixtures retain their existing isolated namespace. This selects a path,
// never a capability. Core verifies identity and the protected routing config.
const fixtureUids=new Set(['3cQEMduCMjUTjSR4YDAfCOstUlJ2','BGfjXGmbxRWjJjVLPQmH64IClxF2','XnSqy8A5UiMbV59oxIm8xDd4mpi1']);
// This disposable account rehearses the canonical invitation workflow at root.
// The matching protected Core configuration restricts it to its synthetic person.
const rootFixtureUids=new Set(['XnSqy8A5UiMbV59oxIm8xDd4mpi1','BGfjXGmbxRWjJjVLPQmH64IClxF2']);
export const fixtureUid=uid=>deployment.environment==='DEV'&&fixtureUids.has(uid);
export const isolatedFixtureUid=uid=>fixtureUid(uid)&&!rootFixtureUids.has(uid);
export const dataPrefix=uid=>isolatedFixtureUid(uid)?'coreDevValidation/ACT_FUNCTIONAL_20261008/':'';
