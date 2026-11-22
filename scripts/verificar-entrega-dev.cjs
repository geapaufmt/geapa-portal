'use strict';
// Read-only verification of the bytes actually served by the DEV origin.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

async function verify(manifest, fetchFile = fetch) {
    assert.equal(manifest.projectId, 'geapa-convergencia-dev');
    assert.equal(manifest.environment, 'dev');
    assert.equal(manifest.privateOverlayApplied, true);
    const origin = 'https://geapa-convergencia-dev.web.app';
    const seen = new Set();
    for (const file of manifest.files) {
        const url = new URL(file.path, origin);
        assert.equal(url.origin, origin);
        assert.equal(url.pathname, file.path);
        assert.ok(!seen.has(file.path));
        seen.add(file.path);
        const response = await fetchFile(url, {redirect:'error', cache:'no-store', signal:AbortSignal.timeout(20000)});
        assert.equal(response.status, 200, file.path);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(bytes.length, file.bytes, file.path);
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    }
    assert.ok(seen.size > 0);
    return seen.size;
}
module.exports = {verify};
if (require.main === module) {
    verify(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))
        .then(count => console.log('Hosting DEV: ' + count + ' respostas HTTP verificadas.'))
        .catch(error => { console.error(error.message); process.exitCode = 1; });
}
