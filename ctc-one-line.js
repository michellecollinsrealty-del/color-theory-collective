
// ctc-one-line.js — drop-in loader (keeps your theme).
// Add ONE line to your HTML before </body>:
//   <script src="/ctc-one-line.js" defer></script>
(function(){
  // 1) Ensure mount point exists
  function ensureRoot(){
    var el = document.getElementById('ctc-root');
    if(!el){
      el = document.createElement('div');
      el.id = 'ctc-root';
      document.body.appendChild(el);
    }
  }

  // 2) Load a script only once
  function loadOnce(src){
    return new Promise(function(res, rej){
      if(document.querySelector('script[src="'+src+'"]')) return res();
      var s = document.createElement('script'); s.src = src; s.defer = true;
      s.onload = function(){ res(); }; s.onerror = function(){ rej(new Error('Failed to load '+src)); };
      document.head.appendChild(s);
    });
  }

  // 3) After DOM ready, mount features
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function(){
    ensureRoot();
    // Load in order: app-core then assistant
    loadOnce('/app-core.js')
      .then(function(){ return loadOnce('/assistant.js'); })
      .catch(function(e){
        console.warn('CTC loader could not inject features:', e);
      });
  });
})();
