'use strict';
const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),c=require('node:crypto');
const root=p.resolve(__dirname,'..'),env=process.argv[2];a(['dev','prod'].includes(env),'ENVIRONMENT_REQUIRED');
const expected=require('../releases/published-'+env+'-20261101.json'),built=JSON.parse(fs.readFileSync(root+'/build/'+env+'-manifest.json'));a(built.privateOverlayApplied,'PRIVATE_OVERLAY_REQUIRED_FOR_EXACT_REPLAY');a.equal(built.projectId,expected.projectId);a.equal(built.files.length,expected.files.length);
for(const f of expected.files){const b=fs.readFileSync(root+'/dist/'+env+f.path);a.equal(c.createHash('sha256').update(b).digest('hex'),f.sha256,'ARTIFACT_DRIFT '+f.path);}
console.log(JSON.stringify({environment:env,hostingVersion:expected.hostingVersion,files:expected.files.length,result:'EXACT_PUBLISHED_REPRODUCTION',deploy:false}));
