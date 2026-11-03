const fixture=await (await fetch('/norms-fixture.json')).json();
window.PortalGeapaNavigation={getRotaAtual:()=> 'institutional-norms'};
window.PortalGeapaApi={apiGet:async(_route,p)=>{const v=structuredClone(fixture);v.instrument=p.instrument||'';v.validUntil=Date.now()+60000;v.items=v.items.filter(r=>(!p.instrument||r.relation.links.some(l=>l.instrumentId===p.instrument))&&(!p.query||r.title.includes(p.query)));v.total=v.items.length;return {ok:true,data:v};}};
await import('/assets/act-ui/institutional-directory.mjs');
document.dispatchEvent(new CustomEvent('portal:navigationchange'));
