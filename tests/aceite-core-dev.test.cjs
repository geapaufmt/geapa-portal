'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {verify} = require('../scripts/verificar-aceite-core-dev.cjs');

test('Hosting requires approval of all three checks for the same release and Core receipt', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geapa-aceite-'));
    t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
    const receipt = '{"revision":"synthetic"}';
    fs.writeFileSync(path.join(dir,'core-dev-publicado.json'),receipt);
    const release = 'sites/geapa-convergencia-dev/channels/live/releases/123';
    const approval = {project:'geapa-convergencia-dev',releaseAnterior:release,
        decisao:'APROVADO',responsavel:'teste',sha256ReciboCore:crypto.createHash('sha256').update(receipt).digest('hex'),
        verificacoes:{}};
    const save = () => fs.writeFileSync(path.join(dir,'aceite-intermediario-dev.json'),JSON.stringify(approval));
    assert.throws(() => verify(dir,release));
    for (const key of ['contratoDocumentalRH','recusaSemEscopo','recuperacaoPeloProprietario']) {
        save();
        assert.throws(() => verify(dir,release));
        approval.verificacoes[key]={aprovado:true,evidencia:'recibo sintetico'};
    }
    save();
    verify(dir,release);
    assert.throws(() => verify(dir,release+'4'));
    const siteRelease = 'sites/geapa-convergencia-dev/releases/123';
    approval.releaseAnterior = siteRelease;
    save();
    verify(dir,siteRelease);
    assert.throws(() => verify(dir,release));
    for (const invalid of ['sites/portal-geapa/releases/123',
        'sites/geapa-convergencia-dev/channels/preview/releases/123',
        'sites/geapa-convergencia-dev/releases/123/extra']) {
        approval.releaseAnterior = invalid;
        save();
        assert.throws(() => verify(dir,invalid));
    }
    approval.releaseAnterior = release;
    approval.verificacoes.recuperacaoPeloProprietario.aprovado=false;
    save();
    assert.throws(() => verify(dir,release));
    approval.verificacoes.recuperacaoPeloProprietario.aprovado=true;
    save();
    fs.appendFileSync(path.join(dir,'core-dev-publicado.json'),' ');
    assert.throws(() => verify(dir,release));
});
