'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

const project = 'geapa-convergencia-dev';
const site = 'sites/' + project;
const api = 'https://firebasehosting.googleapis.com/v1beta1/';
const secretApi = 'https://secretmanager.googleapis.com/v1/projects/' + project + '/secrets/';
const operator = path.resolve(__dirname, '..');
const candidate = path.resolve('candidate');
const manifestPath = path.join(candidate, 'build/dev-manifest.json');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const hex = /^[a-f0-9]{64}$/;
const versionName = new RegExp('^' + site + '/versions/[A-Za-z0-9_-]+$');
const managed = new Set(['/__/firebase/init.js','/__/firebase/init.json']);
const json = data => JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));

async function request(url, method='GET', body, binary=false) {
  const headers = {Authorization:'Bearer ' + process.env.GOOGLE_ACCESS_TOKEN};
  if(body) headers['Content-Type'] = binary ? 'application/octet-stream' : 'application/json';
  const response = await fetch(url, {method, headers, redirect:'error',
    body:body && (binary ? body : JSON.stringify(body)), signal:AbortSignal.timeout(60000)});
  if(!response.ok) throw Error(new URL(url).hostname + ' HTTP ' + response.status);
  if(binary) return;
  return response.json();
}
async function secret(name) {
  const result = await request(secretApi + name + '/versions/latest:access');
  return Buffer.from(result.payload.data, 'base64');
}
function checkPlan(plan) {
  assert.equal(plan.project, project);
  assert.match(plan.portalCommit, /^[a-f0-9]{40}$/);
  assert.match(plan.coreRevision, /^geapacommanddevpilot-[0-9]{5}-[a-z0-9]+$/);
  assert.match(plan.baselineVersion, versionName);
  assert.match(plan.baselineRelease, new RegExp('^'+site+'/channels/live/releases/[A-Za-z0-9_-]+$'));
  assert.match(plan.manifestSha256, hex);
  assert.match(plan.coreReceiptSha256, hex);
  assert.deepEqual(plan.removed, []);
  assert.deepEqual(plan.added, []);
  assert.equal(plan.hostingConfigUnchanged, true);
  assert.ok(Number.isSafeInteger(plan.files) && plan.files > 0);
  assert.equal(new Set(plan.changed.map(f=>f.path)).size,plan.changed.length);
  for(const change of plan.changed) {
    assert.match(change.liveGzipSha256,hex);
    assert.match(change.candidateGzipSha256,hex);
  }
  return plan;
}
function checkApproval(proof, plan, release) {
  assert.equal(proof.project, project);
  assert.equal(proof.decisao, 'APROVADO');
  assert.equal(proof.releaseAnterior, release);
  assert.equal(proof.portalCommit, plan.portalCommit);
  assert.equal(proof.sha256ManifestoPortal, plan.manifestSha256);
  assert.equal(proof.sha256ReciboCore, plan.coreReceiptSha256);
  assert.ok(typeof proof.responsavel === 'string' && proof.responsavel.trim());
  for(const key of ['contratoDocumentalRH','recusaSemEscopo','recuperacaoPeloProprietario']) {
    const check=proof.verificacoes?.[key];
    assert.equal(check?.aprovado, true);
    assert.ok(typeof check.evidencia === 'string' && check.evidencia.trim());
  }
}
async function state() {
  const [channel,service] = await Promise.all([
    request(api + site + '/channels/live'),
    request('https://run.googleapis.com/v2/projects/' + project + '/locations/southamerica-east1/services/geapacommanddevpilot')
  ]);
  const traffic=service.trafficStatuses;
  assert.ok(!service.reconciling && traffic.length===1 && traffic[0].percent===100);
  const revision=traffic[0].revision || (traffic[0].type==='TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST' && service.latestReadyRevision);
  assert.equal(typeof revision,'string');
  assert.match(channel.release.version.name,versionName);
  return {release:channel.release.name, version:channel.release.version.name, message:channel.release.message, revision:revision.split('/').pop()};
}
async function inventory(version) {
  const files=new Map();
  let page='';
  do {
    const res=await request(api+version+'/files?pageSize=1000&pageToken='+encodeURIComponent(page));
    for(const f of res.files||[]) {
      assert.ok(!files.has(f.path) && hex.test(f.hash));
      if(!managed.has(f.path))files.set(f.path,f.hash);
    }
    page=res.nextPageToken;
  } while(page);
  return files;
}
function checkInventory(plan, current, local, published) {
  assert.equal(current.size, plan.files);
  assert.deepEqual([...current.keys()].sort(), [...local.keys()].sort());
  const delta=new Map(plan.changed.map(f=>[f.path,f]));
  for(const target of delta.keys())assert.ok(local.has(target));
  for(const [url,file] of local) {
    const allowed=delta.get(url);
    if(allowed)assert.equal(file.gzipHash, allowed.candidateGzipSha256, url);
    assert.equal(current.get(url), !published && allowed ? allowed.liveGzipSha256 : file.gzipHash,url);
  }
}
function build(overlay,plan) {
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:candidate,encoding:'utf8'}).trim(),plan.portalCommit);
  // The candidate supplies source only. Use the operator's builder and locked compiler.
  for(const entry of fs.readdirSync(candidate,{recursive:true})) {
    const full=path.join(candidate,entry);
    assert.ok(!fs.lstatSync(full).isSymbolicLink() && !entry.split(path.sep).includes('node_modules'));
  }
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'geapa-dev-'));
  try {
    const privatePath=path.join(temp,'overlay.json');
    fs.writeFileSync(privatePath,overlay,{mode:0o600});
    const script=path.join(candidate,'scripts/build.cjs');
    fs.copyFileSync(path.join(operator,'scripts/build.cjs'),script);
    const env={NODE_PATH:path.join(operator,'node_modules'), PATH:process.env.PATH};
    for(const k of ['SystemRoot','TEMP','TMP','USERPROFILE','HOME','COMSPEC','PATHEXT'])if(process.env[k])env[k]=process.env[k];
    execFileSync(process.execPath,[script,'--env','dev','--overlay',privatePath],{cwd:candidate,env,stdio:'ignore'});
    assert.equal(sha(fs.readFileSync(manifestPath)),plan.manifestSha256);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
}
function localFiles(plan) {
  const bytes=fs.readFileSync(manifestPath);
  assert.equal(sha(bytes),plan.manifestSha256);
  const m=json(bytes),files=new Map();
  assert.equal(m.sourceCommit,plan.portalCommit);assert.equal(m.projectId,project);
  assert.equal(m.environment,'dev');assert.equal(m.privateOverlayApplied,true);
  for(const f of m.files) {
    assert.match(f.path,/^\/[A-Za-z0-9_.\/-]+$/);
    assert.ok(!f.path.split('/').slice(1).some(v=>!v||v==='.'||v==='..') && !files.has(f.path));
    const raw=fs.readFileSync(path.join(candidate,'dist/dev',f.path));
    assert.equal(raw.length,f.bytes);assert.equal(sha(raw),f.sha256);
    const gzip=zlib.gzipSync(raw,{level:9});
    files.set(f.path,{gzip,gzipHash:sha(gzip),rawHash:f.sha256});
  }
  return files;
}
async function stage(config,files) {
  const v=await request(api+site+'/versions','POST',{config});
  assert.match(v.name,versionName);
  const mapping=Object.fromEntries([...files].map(([p,f])=>[p,f.gzipHash]));
  const blobs=new Map([...files.values()].map(f=>[f.gzipHash,f.gzip]));
  const uploads=await request(api+v.name+':populateFiles','POST',{files:mapping});
  if(uploads.uploadRequiredHashes?.length) {
    const prefix='https://upload-firebasehosting.googleapis.com/upload/'+v.name+'/files';
    assert.equal(uploads.uploadUrl,prefix);
    for(const hash of uploads.uploadRequiredHashes) {
      assert.ok(blobs.has(hash));await request(prefix+'/'+hash,'POST',blobs.get(hash),true);
    }
  }
  const finalized=await request(api+v.name+'?updateMask=status','PATCH',{status:'FINALIZED'});
  assert.equal(finalized.status,'FINALIZED');assert.deepEqual(finalized.config,config);
  return v.name;
}
async function run(mode) {
  assert.ok(['inspect','build','verify','publish'].includes(mode));
  const live=await state();
  console.log('DEV Hosting %s | Core %s',live.version,live.revision);
  if(mode==='inspect' && process.env.OPERATION==='inspect')return;
  const plan=checkPlan(json(await secret('geapa-portal-dev-candidate')));
  const message='geapa-dev '+plan.portalCommit+' '+plan.manifestSha256;
  assert.equal(live.revision,plan.coreRevision);
  const published=live.message===message;
  if(!published){assert.equal(live.version,plan.baselineVersion);assert.equal(live.release,plan.baselineRelease);}
  if(mode==='inspect'){fs.appendFileSync(process.env.GITHUB_OUTPUT,'commit='+plan.portalCommit+'\n');return;}
  if(mode==='build'){build(await secret('geapa-portal-dev-overlay'),plan);return;}
  const files=localFiles(plan);
  const baseline=await request(api+plan.baselineVersion);
  assert.equal(baseline.status,'FINALIZED');
  const config=json(fs.readFileSync(path.join(candidate,'config/dev.firebase.json'))).hosting;
  assert.deepEqual(Object.keys(config).sort(),['headers','ignore','public']);
  assert.equal(config.public,'../dist/dev');
  assert.deepEqual({headers:config.headers.map(r=>({glob:r.source,headers:Object.fromEntries(r.headers.map(h=>[h.key,h.value]))}))},baseline.config);
  checkInventory(plan,await inventory(live.version),files,published);
  if(mode==='verify')return;
  checkApproval(json(await secret('geapa-portal-dev-acceptance')),plan,plan.baselineRelease);
  if(!published) {
    const next=await stage(baseline.config,files);
    checkInventory(plan,await inventory(next),files,true);
    checkApproval(json(await secret('geapa-portal-dev-acceptance')),plan,plan.baselineRelease);
    assert.deepEqual(await state(),live);
    const r=await request(api+site+'/channels/live/releases?versionName='+encodeURIComponent(next),'POST',{message});
    assert.equal(r.version.name,next);
  }
  const after=await state();
  assert.equal(after.message,message);assert.equal(after.revision,plan.coreRevision);
  checkInventory(plan,await inventory(after.version),files,true);
  for(const [url,f] of files) {
    const r=await fetch('https://'+project+'.web.app'+url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
    assert.ok(r.ok);assert.equal(sha(Buffer.from(await r.arrayBuffer())),f.rawHash,url);
  }
  assert.deepEqual(await state(),after);
  console.log('Hosting DEV verificado. Release %s. Versão de retorno %s.',after.release,plan.baselineVersion);
}
module.exports={checkPlan,checkApproval,checkInventory,build,localFiles};
if(require.main===module)run(process.argv[2]).catch(e=>{
  // Avoid printing assertion payloads, private readers or service responses.
  console.error('Etapa Hosting DEV interrompida.',e.code||e.name,/^[a-z.]+ HTTP \d+$/.test(e.message)?e.message:'');
  process.exitCode=1;
});
