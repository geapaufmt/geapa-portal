import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const environment = String(args[0] || 'dev').toLowerCase();
const checkOnly = args.includes('--check');

function argumentValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (!['dev', 'homolog', 'prod'].includes(environment)) {
  throw new Error('Ambiente invalido. Use dev, homolog ou prod.');
}

const sourcePath = path.join(root, 'web', 'assets', 'js', `config.${environment}.js`);
const outputPath = path.join(root, 'web', 'assets', 'js', 'config.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: sourcePath });
const config = sandbox.window.PortalGeapaConfig;

const expectedEnvironment = environment === 'homolog' ? 'HOMOLOG' : environment.toUpperCase();
if (!config || config.ENVIRONMENT !== expectedEnvironment) {
  throw new Error(`ENVIRONMENT deve ser ${expectedEnvironment} em ${path.basename(sourcePath)}.`);
}

config.BUILD_CHANNEL = argumentValue('--channel', process.env.BUILD_CHANNEL || config.BUILD_CHANNEL);
config.PORTAL_VERSION = argumentValue(
  '--version',
  process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : config.PORTAL_VERSION
);

const requiredFlags = [
  'FIRESTORE_ENABLED',
  'FIRESTORE_SNAPSHOT_ENABLED',
  'FIRESTORE_COLLECTION_FALLBACK_ENABLED',
  'APPS_SCRIPT_FALLBACK_ENABLED',
  'ENABLE_ACTIVITY_MANAGEMENT',
  'ENABLE_JUSTIFICATIVAS',
  'ENABLE_PROFILE_UPDATES',
  'ENABLE_VINCULO_REQUESTS',
  'ENABLE_EGRESS_FEEDBACK',
  'ENABLE_MEMBER_REGISTRATION',
  'READ_ONLY_MODE'
];
requiredFlags.forEach((key) => {
  if (typeof config[key] !== 'boolean') throw new Error(`${key} deve ser booleano.`);
});

['API_READ_TIMEOUT_MS', 'API_WRITE_TIMEOUT_MS', 'API_UPLOAD_WRITE_TIMEOUT_MS'].forEach((key) => {
  if (!Number.isFinite(Number(config[key])) || Number(config[key]) < 5000) {
    throw new Error(`${key} deve ser numerico e ter ao menos 5000 ms.`);
  }
});

if (!/^https:\/\/script\.google\.com\/macros\//.test(config.GEAPA_API_BASE_URL || '')) {
  throw new Error('GEAPA_API_BASE_URL deve ser um endpoint publico HTTPS do Apps Script.');
}
if (!config.FIREBASE || !config.FIREBASE.projectId) throw new Error('FIREBASE.projectId ausente.');
if (environment === 'prod' && String(config.FIRESTORE_PATH_PREFIX || '')) {
  throw new Error('PROD deve preservar os caminhos Firestore atuais nesta fase.');
}

const serialized = JSON.stringify(config, null, 2);
if (/"(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ACCOUNT|SPREADSHEET_ID)"\s*:/i.test(serialized)) {
  throw new Error('A configuracao publica contem uma chave proibida.');
}

if (!checkOnly) {
  const generated = [
    '/**',
    ' * ARQUIVO GERADO. Nao edite manualmente.',
    ` * Fonte: config.${environment}.js`,
    ' * Gerador: scripts/generate-portal-config.mjs',
    ' */',
    '',
    `window.PortalGeapaConfig = ${serialized};`,
    ''
  ].join('\n');
  fs.writeFileSync(outputPath, generated, 'utf8');
  process.stdout.write(`config.js gerado para ${config.ENVIRONMENT} (${config.BUILD_CHANNEL}).\n`);
} else {
  process.stdout.write(`config.${environment}.js valido.\n`);
}
