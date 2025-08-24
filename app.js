
// app.js - Smooth scroll + Payments wired in
(function() {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

  // CashApp link
  const cashappLink = "https://cash.app/$Color-Theory-Collective";

  // Square links
  const squareLinks = {
    oneTime: "https://square.link/u/DjiVVB2R?src=sheet",
    starterMonthly: "https://square.link/u/aZ0Ee8HL?src=sheet",
    starterAnnual: "https://square.link/u/Grd9Q9ws?src=sheet",
    proMonthly: "https://square.link/u/lkyaKNeZ?src=sheet",
    proAnnual: "https://square.link/u/XBw09o7j?src=sheet",
    eliteMonthly: "https://square.link/u/U2cdtt7u?src=sheet",
    eliteAnnual: "https://square.link/u/d4DoJI3Q?src=sheet"
  };

  // Auto-wire buttons by data-plan attribute
  document.querySelectorAll("[data-plan]").forEach(btn => {
    let plan = btn.getAttribute("data-plan");
    if(squareLinks[plan]) {
      btn.addEventListener("click", () => {
        window.open(squareLinks[plan], "_blank");
      });
    }
  });

  // CashApp button
  const cashBtn = document.getElementById("cashapp-btn");
  if(cashBtn) {
    cashBtn.addEventListener("click", () => {
      window.open(cashappLink, "_blank");
    });
  }
})();
