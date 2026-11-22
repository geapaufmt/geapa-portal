'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const portal = path.join(process.argv[3], 'src-portal');
const read = file => JSON.parse(fs.readFileSync(path.join(portal, file), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const mode = process.argv[2];
const live = JSON.parse(fs.readFileSync(0, 'utf8').trim());
const spec = JSON.parse(fs.readFileSync(path.join(process.argv[3], 'campanha-dev.json'), 'utf8'));
const ref = read(spec.previousManifest);
assert.equal(live.project, 'geapa-convergencia-dev');
assert.deepEqual(live.config, ref.config);
// The live API includes the two Firebase-managed initialization resources.
// Pin their gzip hashes separately from the application's historical inventory.
const applicationFiles = {...live.files};
for (const [url, digest] of Object.entries(spec.reserved)) {
    if (mode === 'publicado' && !Object.hasOwn(applicationFiles, url)) continue;
    assert.equal(applicationFiles[url], digest, url);
    delete applicationFiles[url];
}
if (mode === 'anterior') {
    assert.equal(live.version.split('/').pop(), ref.version);
    assert.deepEqual(applicationFiles, ref.files);
} else {
    assert.ok(['local', 'publicado'].includes(mode));
    const manifest = read('build/dev-manifest.json');
    assert.equal(manifest.sourceCommit, spec.portalCommit);
    assert.equal(manifest.environment, 'dev');
    assert.equal(manifest.projectId, ref.site);
    assert.equal(manifest.privateOverlayApplied, true);
    assert.ok(manifest.files.length > 0);
    const config = read('config/dev.firebase.json').hosting;
    assert.deepEqual(Object.keys(config).sort(), ['headers', 'ignore', 'public']);
    assert.equal(config.public, '../dist/dev');
    assert.deepEqual(config.ignore, ['firebase.json','**/.*','**/node_modules/**']);
    assert.deepEqual({headers:config.headers.map(rule => ({
        glob:rule.source, headers:Object.fromEntries(rule.headers.map(h => [h.key,h.value]))
    }))}, ref.config);
    const root = path.join(portal, 'dist', 'dev');
    const paths = fs.readdirSync(root, {recursive:true}).filter(name => {
        const st = fs.lstatSync(path.join(root,name));
        assert.ok(st.isFile() || st.isDirectory());
        return st.isFile();
    }).map(name => '/' + name.split(path.sep).join('/')).sort();
    
    assert.deepEqual(paths, manifest.files.map(f => f.path).sort());
    for (const f of manifest.files) {
        const data = fs.readFileSync(path.join(root, f.path));
        assert.equal(data.length, f.bytes);
        assert.equal(hash(data), f.sha256, f.path);
        if (mode === 'publicado') assert.equal(hash(zlib.gzipSync(data, {level:9})), live.files[f.path], f.path);
    }
    if (mode === 'publicado') {
        assert.deepEqual(paths, Object.keys(applicationFiles).sort());
        const total = Object.keys(live.files).length;
        if (live.declaredFileCount != null) {
            assert.ok([paths.length, total, paths.length + 2].includes(Number(live.declaredFileCount)),
                'Contagem do provedor incompativel com o inventario verificado');
        }
    }
}
console.log('Hosting DEV OK | ' + mode);
