const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
test('theme errors distinguish deadlines, axes and preparation limits',async()=>{
 const {actDomainFailure:f}=await import('../dist/dev/assets/act-command/act-browser-client.mjs');
 a.match(f({code:'DEADLINE_VIOLATION',reasonCode:'D20'}).message,/exceção individual válida/);
 a.match(f({code:'VALIDATION_ERROR',reasonCode:'AXIS_DUPLICATE'}).message,/diferente/);
 a.match(f({code:'SCOPE_TOO_LARGE'}).message,/limite técnico/);
 a.match(f({code:'STALE_REVISION',reasonCode:'DISPLAYED_THEME_CHANGED'}).message,/Atualize/);
 a.match(f({code:'FORBIDDEN'}).message,/acesso/);
 a.match(fs.readFileSync('src/session/act-session.mjs','utf8'),/SCOPE_TOO_LARGE:'[^']*limite técnico/);
});
