import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadConfig(name) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(`web/assets/js/config.${name}.js`, 'utf8'), sandbox);
  return sandbox.window.PortalGeapaConfig;
}

const dev = loadConfig('dev');
const homolog = loadConfig('homolog');
const prod = loadConfig('prod');
const rules = fs.readFileSync('firestore.rules', 'utf8');
const firebaseRc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
const activitiesClient = fs.readFileSync('web/assets/js/firestore-activities.js', 'utf8');
const backendConfig = fs.readFileSync('apps-script/00_config.gs', 'utf8');
const backendAuth = fs.readFileSync('apps-script/05_auth_firebase.gs', 'utf8');
const homologWorkflow = fs.readFileSync('.github/workflows/firebase-hosting-homolog.yml', 'utf8');
const previewWorkflow = fs.readFileSync('.github/workflows/firebase-hosting-pull-request.yml', 'utf8');

for (const config of [dev, homolog, prod]) {
  assert.equal(config.FIRESTORE_PATH_PREFIX, '');
}
assert.notEqual(dev.FIREBASE.projectId, prod.FIREBASE.projectId);
assert.notEqual(homolog.FIREBASE.projectId, prod.FIREBASE.projectId);
assert.equal(dev.FIREBASE_CONFIGURATION_REQUIRED, true);
assert.equal(dev.FIRESTORE_ENABLED, false);
assert.equal(homolog.FIREBASE_CONFIGURATION_REQUIRED, true);
assert.equal(homolog.FIRESTORE_ENABLED, false);
assert.equal(prod.FIRESTORE_CANONICAL_ACTIVITIES_ENABLED, false);
assert.equal(dev.FIRESTORE_CANONICAL_ACTIVITIES_ENABLED, true);
assert.equal(homolog.FIRESTORE_CANONICAL_ACTIVITIES_ENABLED, true);
assert.equal(Object.prototype.hasOwnProperty.call(firebaseRc.projects, 'default'), false);
assert.doesNotMatch(rules, /match \/environments\//);
assert.match(rules, /match \/activities\/\{idAtividade\}/);
assert.match(rules, /match \/activityPrivate\/\{idAtividade\}[\s\S]*allow read:\s*if false;/);
assert.match(activitiesClient, /CANONICAL_COLLECTION = 'activities'/);
assert.doesNotMatch(activitiesClient, /activityPrivate/);
assert.match(backendConfig, /firebaseProjectIds:[\s\S]*DEV:[\s\S]*PROD:/);
assert.match(backendAuth, /GEAPA_FIREBASE_' \+ environment \+ '_PROJECT_ID/);
assert.doesNotMatch(backendAuth, /GEAPA_FIREBASE_PROJECT_ID/);
for (const workflow of [homologWorkflow, previewWorkflow]) {
  assert.doesNotMatch(workflow, /projectId:\s*portal-geapa/);
  assert.match(workflow, /FIREBASE_DEV_PROJECT_ID/);
  assert.match(workflow, /workflow_dispatch/);
}

console.log('Firestore environment architecture: checks passed.');
