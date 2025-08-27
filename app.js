// ========================= app.js (full file) =========================
// Safe, drop-in script for Color Theory Collective.
// - Keeps existing page behaviors (smooth scroll, color mix demo, copy)
// - Adds voice-enabled Color Assistant bubble wired to Netlify function
//   at "/.netlify/functions/assistant".
// =====================================================================

// ---- 1) Smooth-scroll anchor links (no change to your markup)
(function () {
  try {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          window.location.hash = id;
        }
        if (history && history.pushState) {
          try { history.pushState(null, "", `#${id}`); } catch {}
        }
      });
    });
  } catch {}
})();

// ---- 2) Color mix demo & hex copy (runs only if those elements exist)
(function () {
  try {
    const A = document.getElementById("colorA");
    const B = document.getElementById("colorB");
    const R = document.getElementById("ratio");
    const chipA = document.getElementById("chipA");
    const chipMix = document.getElementById("chipMix");
    const mixHex = document.getElementById("mixHex");
    const copyBtn = document.getElementById("copyHex");

    if (!A || !B || !R || !chipA || !chipMix || !mixHex) return; // page doesn't have the demo

    const hex2rgb = (h) => {
      h = (h || "").trim().replace(/^#/, "");
      if (h.length === 3) h = h.split("").map(x => x + x).join("");
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const comp = (v) => Math.min(255, Math.max(0, v|0));
    const rgb2hex = ({ r, g, b }) =>
      "#" + [r, g, b].map(v => comp(v).toString(16).padStart(2, "0")).join("");

    const update = () => {
      const a = hex2rgb(A.value || "#000000");
      const b = hex2rgb(B.value || "#ffffff");
      const r = Math.max(0, Math.min(100, parseInt(R.value || "50", 10)));
      const mix = {
        r: a.r * (r / 100) + b.r * (1 - r / 100),
        g: a.g * (r / 100) + b.g * (1 - r / 100),
        b: a.b * (r / 100) + b.b * (1 - r / 100),
      };
      const h = rgb2hex(mix);
      chipA.style.background = A.value;
      chipMix.style.background = h;
      mixHex.textContent = h.toUpperCase();
    };

    [A, B, R].forEach(el => el && el.addEventListener("input", update));
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard?.writeText(mixHex.textContent || "");
        } catch {}
      });
    }
    update();
  } catch {}
})();

// ---- 3) Assistant connector (used by the voice bubble below)
async function sendToAssistant(message) {
  const response = await fetch("/.netlify/functions/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.reply || "I couldn’t get a reply.";
}

// ---- 4) Voice-enabled bubble hookup (no UI surgery needed)
(function () {
  // Find the “Color Assistant” bubble by text
  const bubble =
    Array.from(document.querySelectorAll("button, a, div, span"))
      .find(el => /color\s+assistant/i.test(el.textContent || ""));

  if (!bubble) return; // bubble not present on this page

  // Small popup to show transcript/reply
  const pop = document.createElement("div");
  pop.style.cssText =
    "position:fixed;right:16px;bottom:86px;max-width:72vw;padding:10px 12px;" +
    "border-radius:10px;background:#0b0f1a;color:#fff;font:14px/1.35 system-ui;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.3);white-space:pre-wrap;z-index:999999;" +
    "display:none";
  document.body.appendChild(pop);
  const show = (t)=>{ pop.textContent=t; pop.style.display="block"; };
  const hide = ()=>{ pop.style.display="none"; };

  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let listening = false;

  async function startListening() {
    if (!SR) {
      show("🎤 This browser doesn’t support voice.\n(Assistant will stay text-only.)");
      setTimeout(hide, 2600);
      return;
    }
    if (listening) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    listening = true;

    const original = bubble.textContent;
    const setState = (t)=> (bubble.textContent = t);

    setState("Color Assistant  •  listening…");
    show("🎤 Listening… (allow mic if asked)");

    let finalText = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += txt;
        else interim += txt;
      }
      show(finalText ? "You: " + finalText : "… " + interim);
    };

    rec.onerror = (e) => {
      listening = false;
      setState(original);
      show("⚠️ Mic error: " + e.error);
      setTimeout(hide, 2000);
    };

    rec.onend = async () => {
      listening = false;
      if (!finalText.trim()) {
        setState(original);
        show("No speech detected.");
        setTimeout(hide, 1200);
        return;
      }

      setState("Color Assistant  •  thinking…");
      show("You: " + finalText + "\n\n⏳ Thinking…");
      try {
        const reply = await sendToAssistant(finalText);
        setState("Color Assistant");
        show("You: " + finalText + "\n\nAssistant: " + reply);
        speak(reply);
      } catch (err) {
        setState("Color Assistant");
        show("⚠️ Error talking to assistant.");
      }
    };

    try { rec.start(); } catch {}
  }

  bubble.addEventListener("click", (e) => {
    e.preventDefault();
    startListening();
  });
})();
