'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function verifyFiles(directory, expected) {
  const pending = new Set(Object.keys(expected));
  let count = 0;
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      const url = '/' + path.relative(directory, file).split(path.sep).join('/');
      assert(entry.isFile(), 'Unsupported Hosting entry ' + url);
      assert(pending.delete(url), 'Unexpected Hosting path ' + url);
      const compressed = zlib.gzipSync(fs.readFileSync(file), { level: 9 });
      const digest = crypto.createHash('sha256').update(compressed).digest('hex');
      assert.equal(digest, expected[url], 'Hosting hash mismatch ' + url);
      count++;
    }
  }
  visit(directory);
  assert.equal(pending.size, 0, 'Missing Hosting paths ' + [...pending].join(', '));
  return count;
}

function hostingConfig(config) {
  const { public: directory, ignore, headers, rewrites, ...other } = config.hosting;
  assert.deepEqual(Object.keys(other), [], 'Unexpected Hosting configuration');
  const result = { headers: headers.map(({ source, headers, ...extra }) => {
    assert.deepEqual(extra, {});
    const values = Object.fromEntries(headers.map(({ key, value }) => [key, value]));
    assert.equal(Object.keys(values).length, headers.length, 'Duplicate HTTP header');
    return { glob: source, headers: values };
  }) };
  if (rewrites) result.rewrites = rewrites.map(({ source, destination, ...extra }) => {
    assert.deepEqual(extra, {});
    return { glob: source, path: destination };
  });
  return result;
}

function verifyRelease(env, checkout) {
  assert(['dev', 'prod'].includes(env) && checkout, 'Usage: verify-hosting.cjs <dev|prod> <release-checkout>');
  const reference = readJson(path.join(__dirname, '..', 'releases', '20261120', env + '.json'));
  const built = readJson(path.join(checkout, 'build', env + '-manifest.json'));
  assert.equal(built.projectId, reference.site);
  assert.equal(built.environment, env);
  assert.equal(built.privateOverlayApplied, true, 'Build requires the authorized private overlay');
  const config = readJson(path.join(checkout, 'config', env + '.firebase.json'));
  assert.equal(config.hosting.public, '../dist/' + env);
  assert.deepEqual(hostingConfig(config), reference.config);
  const count = verifyFiles(path.join(checkout, 'dist', env), reference.files);
  return { site: reference.site, version: reference.version, release: reference.release, count };
}

module.exports = { verifyFiles, verifyRelease };
if (require.main === module) console.log(JSON.stringify(verifyRelease(...process.argv.slice(2))));
