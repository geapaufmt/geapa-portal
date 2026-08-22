import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
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
const result = spawnSync(process.execPath, [firebaseCli,
  'emulators:exec',
  '--only', 'firestore',
  '--project', 'demo-geapa-dev',
  'node --test tests/firestore.rules.test.mjs'
], {
  cwd: root,
  env: childEnvironment,
  stdio: 'inherit',
  shell: false
});

if (result.error) throw result.error;
process.exit(result.status == null ? 1 : result.status);
