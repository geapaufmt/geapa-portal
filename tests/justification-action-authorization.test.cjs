const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const file of ['src/modules/portal-v2-readonly.js','config/variants/dev/src/modules/portal-v2-readonly.js']){
 const source=fs.readFileSync(file,'utf8'),start=source.indexOf('  function montarAcaoJustificativaFrequencia('),end=source.indexOf('\n  function ',start+10);
 const context=vm.createContext({botaoAcao:(action,id,label)=>label,temJustificativaFrequencia:()=>false});
 vm.runInContext(source.slice(start,end),context);
 test(file+' respects explicit denial despite a legacy action label',()=>{
  const result=context.montarAcaoJustificativaFrequencia({podeEnviarJustificativa:false,podeComplementarJustificativa:false,acaoJustificativa:'ENVIAR_JUSTIFICATIVA'},'SYN');
  assert(!result.includes('Enviar justificativa'));
 });
 test(file+' renders canonically authorized submission and complement',()=>{
  assert.equal(context.montarAcaoJustificativaFrequencia({podeEnviarJustificativa:true},'SYN'),'Enviar justificativa');
  assert.equal(context.montarAcaoJustificativaFrequencia({podeComplementarJustificativa:true},'SYN'),'Complementar justificativa');
 });
}
