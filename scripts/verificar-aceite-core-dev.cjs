'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verify(dir, release) {
    const read = name => fs.readFileSync(path.join(dir, name));
    const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    const receipt = read('core-dev-publicado.json');
    const approval = parse(read('aceite-intermediario-dev.json'));
    assert.equal(approval.project, 'geapa-convergencia-dev');
    assert.ok(/^sites\/geapa-convergencia-dev\/(?:channels\/live\/)?releases\/[^/]+$/.test(release));
    assert.equal(approval.releaseAnterior, release);
    assert.equal(approval.sha256ReciboCore, crypto.createHash('sha256').update(receipt).digest('hex'));
    assert.equal(approval.decisao, 'APROVADO');
    assert.ok(typeof approval.responsavel === 'string' && approval.responsavel.trim());
    for (const key of ['contratoDocumentalRH','recusaSemEscopo','recuperacaoPeloProprietario']) {
        const result = approval.verificacoes?.[key];
        assert.equal(result?.aprovado, true, key);
        assert.ok(typeof result.evidencia === 'string' && result.evidencia.trim(), key);
    }
}
module.exports = {verify};
if (require.main === module) {
    try { verify(process.argv[2], process.argv[3]); }
    catch { console.error('Aceite intermediario DEV ausente, reprovado ou divergente. Hosting bloqueado.'); process.exitCode = 1; }
}
