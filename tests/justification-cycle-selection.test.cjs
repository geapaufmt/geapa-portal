const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const env of ['dev','prod'])test(env+': cycle selector does not imply a selected institutional cycle',()=>{
 const s=fs.readFileSync(__dirname+'/../dist/'+env+'/assets/act-ui/portal-v2-readonly.js','utf8'),start=s.indexOf('  function montarEscopoJustificativas('),end=s.indexOf('\n  function ',start+5);
 const ctx={ui:{escaparHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')}};vm.createContext(ctx);vm.runInContext('var filtroJustificativas;'+s.slice(start,end)+';this.render=montarEscopoJustificativas;',ctx);
 const cycles=[{id:'C1',label:'Ciclo <1>'},{id:'C2',label:'Ciclo 2'}],empty=ctx.render({cycles,cycleId:null,queue:'ALL',requiresCycleSelection:true});
 a(empty.includes('<option value="" selected disabled>Selecione o ciclo</option>'));a(!empty.includes('value="C1" selected'));a(empty.includes('Ciclo &lt;1>'));a.equal(ctx.filtroJustificativas.cycleId,null);
 const chosen=ctx.render({cycles,cycleId:'C2',queue:'HISTORY'});a(chosen.includes('value="C2" selected'));a(!chosen.includes('Selecione o ciclo'));a.equal(ctx.filtroJustificativas.cycleId,'C2');
});
