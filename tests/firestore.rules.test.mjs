import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-geapa-dev',
    firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8') }
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'portalUsers', 'active-user'), {
      ativo: true,
      podeAcessarPortal: true,
      podeLerDadosPrivados: true,
      stale: false
    });
    await setDoc(doc(db, 'portalUsers', 'inactive-user'), {
      ativo: false,
      podeAcessarPortal: false,
      podeLerDadosPrivados: false,
      stale: true
    });
    await setDoc(doc(db, 'activities', 'ATV-2026-1-0001'), {
      idAtividade: 'ATV-2026-1-0001',
      ativo: true,
      dataAtividade: '2026-08-21',
      schemaVersion: 'activity-canonical-v1'
    });
    await setDoc(doc(db, 'activityPrivate', 'ATV-2026-1-0001'), {
      idAtividade: 'ATV-2026-1-0001',
      emailPessoaPrincipal: 'privado@example.invalid'
    });
    await setDoc(doc(db, 'activities', 'ATV-2026-1-0002'), {
      idAtividade: 'ATV-2026-1-0002',
      ativo: false,
      dataAtividade: '2026-08-22',
      schemaVersion: 'activity-canonical-v1'
    });
    await setDoc(doc(db, 'portalActivities', 'ATV-2026-1-0001'), {
      idAtividade: 'ATV-2026-1-0001',
      ativoNoReadModel: true
    });
  });
});

after(async () => {
  if (environment) await environment.cleanup();
});

test('usuario ativo le cadastro/agenda canonico e o read model legado', async () => {
  const db = environment.authenticatedContext('active-user').firestore();
  await assertSucceeds(getDoc(doc(db, 'activities', 'ATV-2026-1-0001')));
  const activeQuery = query(collection(db, 'activities'), where('ativo', '==', true));
  const result = await assertSucceeds(getDocs(activeQuery));
  assert.equal(result.size, 1);
  await assertFails(getDoc(doc(db, 'activities', 'ATV-2026-1-0002')));
  await assertSucceeds(getDoc(doc(db, 'portalActivities', 'ATV-2026-1-0001')));
});

test('dados privados canonicos nunca sao lidos pelo cliente', async () => {
  const db = environment.authenticatedContext('active-user').firestore();
  await assertFails(getDoc(doc(db, 'activityPrivate', 'ATV-2026-1-0001')));
});

test('usuario inativo e visitante nao leem cadastro canonico', async () => {
  const inactive = environment.authenticatedContext('inactive-user').firestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(inactive, 'activities', 'ATV-2026-1-0001')));
  await assertFails(getDoc(doc(anonymous, 'activities', 'ATV-2026-1-0001')));
});

test('cliente nao escreve nas collections canonicas', async () => {
  const db = environment.authenticatedContext('active-user').firestore();
  await assertFails(setDoc(doc(db, 'activities', 'ATV-2026-1-0002'), {
    idAtividade: 'ATV-2026-1-0002',
    ativo: true
  }));
  await assertFails(setDoc(doc(db, 'activityPrivate', 'ATV-2026-1-0002'), {
    idAtividade: 'ATV-2026-1-0002'
  }));
});

test('namespace antigo nao e aceito como ambiente', async () => {
  const db = environment.authenticatedContext('active-user').firestore();
  const result = getDoc(doc(db, 'environments', 'dev', 'activities', 'ATV-2026-1-0001'));
  await assertFails(result);
  assert.ok(true);
});
