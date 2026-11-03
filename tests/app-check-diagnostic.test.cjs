const {test}=require('node:test'),a=require('node:assert/strict');
test('DEV attestation diagnostics retain only bounded stage, code and HTTP status',async()=>{
 const {appCheckFailureDiagnostic:describe}=await import('../src/services/dev-app-check.mjs');
 a.deepEqual(describe({code:'appCheck/recaptcha-error',message:'private',token:'secret'}),{stage:'RECAPTCHA_EXECUTE',code:'appCheck/recaptcha-error'});
 a.deepEqual(describe({code:'appCheck/fetch-status-error',customData:{httpStatus:403,responseBody:'private',token:'secret'}}),{stage:'APP_CHECK_TOKEN_EXCHANGE',code:'appCheck/fetch-status-error',status:403});
 a.deepEqual(describe({code:'private',customData:{httpStatus:'secret'}}),{stage:'APP_CHECK_TOKEN',code:'APP_CHECK_OTHER'});
});
