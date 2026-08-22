import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configHome = path.join(root, '.firebase-cli-config');
fs.mkdirSync(configHome, { recursive: true });
const androidStudioJavaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const javaHome = process.env.JAVA_HOME || (fs.existsSync(path.join(androidStudioJavaHome, 'bin', 'java.exe'))
  ? androidStudioJavaHome
  : '');
const childEnvironment = Object.assign({}, process.env, {
  XDG_CONFIG_HOME: configHome,
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true'
});
if (javaHome) {
  childEnvironment.JAVA_HOME = javaHome;
  childEnvironment.PATH = path.join(javaHome, 'bin') + path.delimiter + String(process.env.PATH || '');
}

const firebaseCli = path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const selected = address && typeof address === 'object' ? address.port : 0;
    server.close((error) => error ? reject(error) : resolve(selected));
  });
});
const baseConfig = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
baseConfig.firestore = Object.assign({}, baseConfig.firestore || {}, {
  rules: path.join(root, 'firestore.rules'),
  indexes: path.join(root, 'firestore.indexes.json')
});
baseConfig.emulators = Object.assign({}, baseConfig.emulators || {}, {
  firestore: { host: '127.0.0.1', port: port },
  ui: { enabled: false },
  singleProjectMode: true
});
const temporaryConfig = path.join(configHome, `firebase-emulator-${process.pid}.json`);
fs.writeFileSync(temporaryConfig, JSON.stringify(baseConfig), 'utf8');

let result;
try {
  result = spawnSync(process.execPath, [firebaseCli,
    'emulators:exec',
    '--only', 'firestore',
    '--project', 'demo-geapa-dev',
    '--config', temporaryConfig,
    'node --test tests/firestore.rules.test.mjs'
  ], {
    cwd: root,
    env: childEnvironment,
    stdio: 'inherit',
    shell: false
  });
} finally {
  fs.rmSync(temporaryConfig, { force: true });
}

if (result.error) throw result.error;
process.exit(result.status == null ? 1 : result.status);
