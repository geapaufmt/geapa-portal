import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const environment = String(args[0] || '').trim().toLowerCase();
const checkOnly = args.includes('--check');

if (environment !== 'dev') {
  throw new Error('Somente o perfil Apps Script DEV esta definido. Use: dev.');
}

const sourceRoot = path.join(root, 'apps-script');
const profilePath = path.join(root, 'profiles', `apps-script.${environment}.json`);
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const outputRoot = checkOnly
  ? fs.mkdtempSync(path.join(os.tmpdir(), 'geapa-portal-apps-script-dev-check-'))
  : path.join(root, 'build', 'apps-script', environment);

function replaceExactlyOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`));
  assert.equal(matches && matches.length, 1, `${label}: esperado exatamente um ponto de substituicao.`);
  return source.replace(pattern, replacement);
}

function generateConfig(source) {
  let generated = source;
  generated = replaceExactlyOnce(
    generated,
    /ambiente:\s*'[^']*'/,
    `ambiente: '${profile.portalEnvironment}'`,
    'PORTAL_CONFIG.ambiente'
  );
  generated = replaceExactlyOnce(
    generated,
    /ambientePerfilCadastral:\s*'[^']*'/,
    `ambientePerfilCadastral: '${profile.profileEnvironment}'`,
    'PORTAL_CONFIG.ambientePerfilCadastral'
  );
  generated = replaceExactlyOnce(
    generated,
    /ambienteDadosV2:\s*'[^']*'/,
    `ambienteDadosV2: '${profile.dataEnvironment}'`,
    'PORTAL_CONFIG.ambienteDadosV2'
  );
  return generated;
}

function generateManifest(source) {
  const manifest = JSON.parse(source);
  const libraries = manifest.dependencies && manifest.dependencies.libraries || [];
  for (const [symbol, version] of Object.entries(profile.libraries)) {
    const library = libraries.find((item) => item.userSymbol === symbol);
    assert.ok(library, `Library ausente no manifest: ${symbol}`);
    library.version = String(version);
    library.developmentMode = false;
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function generateFiles() {
  const files = new Map();
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !(entry.name.endsWith('.gs') || entry.name === 'appsscript.json')) continue;
    const source = fs.readFileSync(path.join(sourceRoot, entry.name), 'utf8');
    if (entry.name === '00_config.gs') files.set(entry.name, generateConfig(source));
    else if (entry.name === 'appsscript.json') files.set(entry.name, generateManifest(source));
    else files.set(entry.name, source);
  }
  return files;
}

function assertThrowsCode(fn, code) {
  assert.throws(fn, (error) => Boolean(error && error.message === code));
}

function validateGenerated(files) {
  const sourceConfig = fs.readFileSync(path.join(sourceRoot, '00_config.gs'), 'utf8');
  assert.match(sourceConfig, /ambiente:\s*'producao'/, 'A fonte deve continuar com PROD como default.');
  assert.match(sourceConfig, /ambienteDadosV2:\s*'PROD'/, 'Dados PROD devem continuar como default da fonte.');

  const configSource = files.get('00_config.gs');
  const authSource = files.get('05_auth_firebase.gs');
  const manifest = JSON.parse(files.get('appsscript.json'));
  assert.match(configSource, /ambiente:\s*'homologacao'/);
  assert.match(configSource, /ambientePerfilCadastral:\s*'DEV'/);
  assert.match(configSource, /ambienteDadosV2:\s*'DEV'/);
  assert.doesNotMatch(configSource, /firebaseProjectId:\s*'portal-geapa'/);

  for (const [symbol, version] of Object.entries(profile.libraries)) {
    const library = manifest.dependencies.libraries.find((item) => item.userSymbol === symbol);
    assert.equal(library.version, String(version));
    assert.equal(library.developmentMode, false);
  }

  const values = new Map([
    ['GEAPA_FIREBASE_DEV_WEB_API_KEY', 'fake-dev-web-api-key'],
    ['GEAPA_FIREBASE_DEV_PROJECT_ID', 'fake-dev-project'],
    ['GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID', 'fake-dev-project'],
    ['GEAPA_FIREBASE_PROD_WEB_API_KEY', 'must-not-read'],
    ['GEAPA_FIREBASE_PROD_PROJECT_ID', 'must-not-read'],
    ['GEAPA_CORE_FIRESTORE_PROD_PROJECT_ID', 'must-not-read']
  ]);
  const reads = [];
  const context = {
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            reads.push(name);
            return values.get(name) || '';
          }
        };
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(configSource, context);
  vm.runInContext(authSource, context);

  assert.equal(context.portalGetFirebaseWebApiKey_(), 'fake-dev-web-api-key');
  assert.equal(context.portalGetFirebaseProjectId_(), 'fake-dev-project');
  assert.deepEqual(
    reads,
    [
      'GEAPA_FIREBASE_DEV_WEB_API_KEY',
      'GEAPA_FIREBASE_DEV_PROJECT_ID',
      'GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID'
    ],
    'O perfil DEV nao pode consultar propriedades PROD ou legadas.'
  );

  values.delete('GEAPA_FIREBASE_DEV_WEB_API_KEY');
  assertThrowsCode(
    () => context.portalGetFirebaseWebApiKey_(),
    'GEAPA_FIREBASE_DEV_WEB_API_KEY_NAO_CONFIGURADA'
  );
  values.set('GEAPA_FIREBASE_DEV_WEB_API_KEY', 'fake-dev-web-api-key');
  values.delete('GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID');
  assertThrowsCode(
    () => context.portalGetFirebaseProjectId_(),
    'GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID_NAO_CONFIGURADO'
  );
  values.set('GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID', 'other-project');
  assertThrowsCode(
    () => context.portalGetFirebaseProjectId_(),
    'PORTAL_FIREBASE_CORE_PROJECT_ID_DIVERGENTE_DEV'
  );
  context.PORTAL_CONFIG.ambienteDadosV2 = 'INVALID';
  assertThrowsCode(
    () => context.portalGetFirebaseProjectId_(),
    'PORTAL_CONFIG_AMBIENTE_DADOS_V2_INVALIDO'
  );
}

const files = generateFiles();
validateGenerated(files);

if (!checkOnly) {
  const allowedOutputRoot = path.resolve(root, 'build', 'apps-script');
  const resolvedOutput = path.resolve(outputRoot);
  assert.ok(
    resolvedOutput.startsWith(`${allowedOutputRoot}${path.sep}`),
    'Diretorio de saida fora de build/apps-script.'
  );
  fs.rmSync(resolvedOutput, { recursive: true, force: true });
  fs.mkdirSync(resolvedOutput, { recursive: true });
  for (const [name, contents] of files) {
    fs.writeFileSync(path.join(resolvedOutput, name), contents, 'utf8');
  }
  process.stdout.write(`Pacote Apps Script ${profile.profile} gerado em ${path.relative(root, resolvedOutput)}.\n`);
} else {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  process.stdout.write('Perfil Apps Script DEV reproduz Portal 109: OK.\n');
}
