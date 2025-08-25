// Simple client-side gate: show downloads when logged-in via Netlify Identity
(function(){
  const area = document.getElementById('downloads-area');
  const cta = document.getElementById('auth-cta');
  function update() {
    const u = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (u) {
      area.style.display = 'grid';
      cta.style.display = 'none';
    } else {
      area.style.display = 'none';
      cta.style.display = 'flex';
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on('init', update);
      window.netlifyIdentity.on('login', update);
      window.netlifyIdentity.on('logout', update);
      window.netlifyIdentity.init();
    }
    update();
  });
})();