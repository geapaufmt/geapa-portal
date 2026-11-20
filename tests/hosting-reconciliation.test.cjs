'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { verifyFiles } = require('../scripts/verify-hosting.cjs');

test('Hosting verifier rejects changed bytes, extra paths and missing paths', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'geapa-hosting-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'example.js');
  const original = Buffer.from('const x = 1;\n');
  const expected = { '/example.js': crypto.createHash('sha256')
    .update(zlib.gzipSync(original, { level: 9 })).digest('hex') };
  fs.writeFileSync(file, original);
  assert.equal(verifyFiles(directory, expected), 1);
  fs.writeFileSync(file, 'const x = 2;\n');
  assert.throws(() => verifyFiles(directory, expected), /hash mismatch/);
  fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(directory, 'extra.js'), '');
  assert.throws(() => verifyFiles(directory, expected), /Unexpected Hosting path/);
  fs.unlinkSync(path.join(directory, 'extra.js'));
  fs.unlinkSync(file);
  assert.throws(() => verifyFiles(directory, expected), /Missing Hosting paths/);
});

test('DEV retains the semester executor route; each environment keeps its own endpoint', () => {
  const dev = require('../config/variants/dev/src/services/act-flow-executor-routes.json');
  const prod = require('../src/services/act-flow-executor-routes.json');
  assert(dev.routes.includes('/admin/ciclos-semestres/semestre'));
  assert.notEqual(dev.endpoint, prod.endpoint);
  for (const { routes } of [dev, prod]) assert.equal(new Set(routes).size, routes.length);
});
