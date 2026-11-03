const {test}=require('node:test'),a=require('assert/strict'),fs=require('fs'),vm=require('vm'),p=require('path');
for(const env of ['dev','prod'])test(env+' client constructs all institutional adapters without requesting credentials',()=>{
 const path=env==='dev'?'config/variants/dev/src/services/act-browser-client.mjs':'src/services/act-browser-client.mjs',source=fs.readFileSync(p.resolve(__dirname,'..',path),'utf8'),calls=[];
 const ctx={fetch(){throw Error('NO_NETWORK_DURING_BOOTSTRAP')},console,URL,TextEncoder,AbortController};
 for(const m of source.matchAll(/^import \{([^}]+)\} from .+;$/gm))for(const token of m[1].split(',')){const name=token.trim().split(/\s+as\s+/).at(-1);ctx[name]=function(){return {clear(){},dispose(){}}};}
 const project=env==='dev'?'geapa-convergencia-dev':'portal-geapa',endpoint=env==='dev'?'https://geapacommanddevpilot-fkat4fslbq-rj.a.run.app':'https://prod.example.invalid';
 Object.assign(ctx,{deployment:{environment:env.toUpperCase(),projectId:project,endpoint},specializedReadersConfig:{projectId:project,endpoint},need:a.ok,frozen:x=>x,createInstitutionalEditor:options=>{calls.push(options);return {run(){}}}});
 vm.createContext(ctx);vm.runInContext(source.replace(/^import .+;\r?\n/gm,'').replace(/export /g,''),ctx);
 const client=ctx.createActBrowserClient({auth:{},db:{app:{options:{projectId:project}}},sdk:{},storage:{}});
 a.equal(typeof client.apiPost,'function');a.equal(calls.length,3);a.deepEqual(calls.map(x=>x.mode||'contact'),['contact','parameter','visibility']);
 for(const options of calls){a.equal(options.projectId,project);a.equal(options.endpoint,endpoint);a.equal(typeof options.attest,'function');}
});
