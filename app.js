(function () {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      try { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (_) { t.scrollIntoView(true); }
      if (history && history.replaceState) history.replaceState(null, '', id);
    });
  });
})();
(function(){ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); })();
(function(){
  const A = document.getElementById('mixA');
  const B = document.getElementById('mixB');
  const R = document.getElementById('mixRatio');
  const pctA = document.getElementById('mixPctA');
  const pctB = document.getElementById('mixPctB');
  const chipA = document.getElementById('chipA');
  const chipB = document.getElementById('chipB');
  const chipMix = document.getElementById('chipMix');
  const mixHex = document.getElementById('mixHex');
  const copyBtn = document.getElementById('copyHexBtn');
  const copyHint = document.getElementById('copyHint');
  if (!A || !B || !R) return;
  const hex2rgb = (h)=>{ const x = h.replace('#',''); const n = parseInt(x,16); return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 }; };
  const comp = (v)=> Math.max(0, Math.min(255, Math.round(v)));
  const rgb2hex = ({r,g,b})=>{ const h=(n)=>n.toString(16).padStart(2,'0'); return '#'+h(comp(r))+h(comp(g))+h(comp(b)); };
  const update = ()=>{
    const a = hex2rgb(A.value); const b = hex2rgb(B.value); const t = Number(R.value)/100;
    const mix = { r: a.r*(1-t) + b.r*t, g: a.g*(1-t) + b.g*t, b: a.b*(1-t) + b.b*t };
    const h = rgb2hex(mix);
    chipA.style.background = A.value; chipB.style.background = B.value; chipMix.style.background = h;
    mixHex.textContent = h.toUpperCase(); pctA.textContent = (100 - Number(R.value)); pctB.textContent = R.value;
  };
  [A,B,R].forEach(el => el.addEventListener('input', update));
  chipMix.addEventListener('click', ()=>copyHex());
  copyBtn?.addEventListener('click', ()=>copyHex());
  function copyHex(){
    const v = mixHex.textContent;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(v).then(()=>{ copyHint.textContent = 'Copied!'; setTimeout(()=> copyHint.textContent='', 1200); }).catch(()=>{});
    }
  }
  update();
})();