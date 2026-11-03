'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto');
const root=p.resolve(__dirname,'..'),assets=require('../config/assets.json').assets;

test('App Check entry resolves its relative module imports in both deployment artifacts',()=>{
 for(const env of ['dev','prod']){
  const entry=p.join(root,'dist',env,'assets/act-command/dev-app-check.mjs');
  for(const match of fs.readFileSync(entry,'utf8').matchAll(/(?:from\s*|import\s*\(?)['"](\.[^'"]+)['"]/g)){
   a(fs.existsSync(p.resolve(p.dirname(entry),match[1])),env+': '+match[1]);
  }
  a(!fs.readFileSync(entry,'utf8').includes('APP_CHECK_DIAGNOSTIC'),'temporary diagnostics must not ship');
 }
});
test('built files match their current source manifest and resolve private placeholders',()=>{
 for(const env of ['dev','prod']){const published=JSON.parse(fs.readFileSync(root+'/build/'+env+'-manifest.json'));for(const f of published.files){const row=assets.find(r=>r.url===f.path&&r.environments.includes(env));a(row);const src=row.generated||(env==='dev'?row.devSource:row.source);const b=fs.readFileSync(root+'/dist/'+env+f.path);a.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path);if(src.endsWith('.template'))a(!b.toString().includes('@@PRIVATE:'));}}
});
test('Hosting configuration uses CLI schema and explicit separate output roots',()=>{for(const env of ['dev','prod']){const c=require('../config/'+env+'.firebase.json');a.equal(c.hosting.public,'../dist/'+env);for(const h of c.hosting.headers){a.equal(typeof h.source,'string');a(Array.isArray(h.headers));}for(const r of c.hosting.rewrites||[]){a.equal(typeof r.source,'string');a.equal(r.destination,'/index.html');}}});
test('active CI has no deploy credentials, publishing actions or write permissions',()=>{const dir=root+'/.github/workflows';for(const f of fs.readdirSync(dir)){const s=fs.readFileSync(dir+'/'+f,'utf8');a(!/secrets\.|action-hosting-deploy|firebase deploy|clasp push|: write/.test(s));}a(!fs.readdirSync(dir).some(f=>f.includes('firebase-hosting')));});
test('private configuration remains outside the source inventory and artifact list',()=>{for(const r of assets){a(!r.url.includes('..'));for(const k of ['source','devSource','generated'])if(r[k]){a(!p.isAbsolute(r[k]));a(!r[k].includes('..'));a(!/evidence|private-overlay|node_modules/.test(r[k]));}}a(require('../config/private-parameters.json').keys.length>0);});
