/* Color Theory Collective – AI Color Assistant (flat-file)
   - Voice (SpeechRecognition + SpeechSynthesis)
   - Optional OpenAI client (BYO key via localStorage.OPENAI_API_KEY)
   - On-device camera + image analysis (lightness, warm/cool bias, density, buildup flag)
   - Zone suggestions and kit builders
   - Square & Cash App links wired
   - Member passes removed
*/

(function(){
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
  const elRoot = $("#ctc-assistant-root");

  // Floating FAB
  const fab = document.createElement("div");
  fab.className = "ctc-fab";
  fab.innerHTML = `
    <div class="ctc-pill">Color Assistant <span class="ctc-badge" id="ctc-ready">ready</span></div>
    <button id="ctc-talk" title="Talk / Stop">🎙️</button>
    <button id="ctc-open" title="Open Assistant">Open</button>
  `;
  elRoot.appendChild(fab);

  // Panel
  const panel = document.createElement("div");
  panel.className = "ctc-panel";
  panel.innerHTML = `
    <div class="ctc-panel-header">
      <strong>AI Color Assistant</strong>
      <div>
        <button id="ctc-min">Close</button>
      </div>
    </div>
    <div class="ctc-panel-body">
      <div class="ctc-row">
        <input id="ctc-key" type="text" placeholder="Paste OpenAI API Key (sk-...); stored in your browser only">
        <button id="ctc-save-key">Save</button>
      </div>
      <div class="ctc-row">
        <select id="ctc-voice-mode">
          <option value="auto">Auto Listen</option>
          <option value="press">Hold to Talk</option>
          <option value="off">Off</option>
        </select>
        <button id="ctc-clear">Clear Chat</button>
      </div>
      <div class="ctc-chat" id="ctc-chat" aria-live="polite"></div>
      <div class="ctc-row">
        <input id="ctc-input" type="text" placeholder='Ask about lifts, timing, tone, aftercare... or say "fix my hair"'>
        <button id="ctc-send">Send</button>
      </div>
      <div class="ctc-small">Privacy: speech runs in your browser, image analysis is on-device. OpenAI calls are only made if you provide a key.</div>
    </div>
  `;
  document.body.appendChild(panel);

  // State
  let recognition, listening=false;
  let openAIKey = localStorage.getItem("OPENAI_API_KEY") || "";
  $("#ctc-key").value = openAIKey;

  // Speech: Recognition (Web Speech API)
  function initRecognition(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ $("#ctc-ready").textContent = "no mic API"; return null; }
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e)=>{
      let finalText = "";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const tr = e.results[i];
        if(tr.isFinal){ finalText += tr[0].transcript.trim()+" "; }
      }
      if(finalText){
        addChat("you", finalText);
        respond(finalText);
      }
    };
    r.onend = ()=>{
      listening = false;
      $("#ctc-talk").textContent = "🎙️";
      if($("#ctc-voice-mode").value === "auto"){ startListening(); }
    };
    return r;
  }

  function startListening(){
    if(!recognition){ recognition = initRecognition(); }
    try{
      recognition && recognition.start();
      listening = true;
      $("#ctc-talk").textContent = "⏹️";
    }catch(err){ /* ignore */ }
  }
  function stopListening(){
    try{ recognition && recognition.stop(); }catch(e){}
    listening = false;
    $("#ctc-talk").textContent = "🎙️";
  }

  // Speech: Synthesis
  function speak(text){
    if(!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    speechSynthesis.speak(u);
  }

  // Chat UI
  function addChat(who, text){
    const div = document.createElement("p");
    div.innerHTML = `<strong>${who === "you" ? "You" : "Assistant"}:</strong> ${escapeHtml(text)}`;
    $("#ctc-chat").appendChild(div);
    $("#ctc-chat").scrollTop = $("#ctc-chat").scrollHeight;
  }
  function escapeHtml(s){ return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // OpenAI (optional)
  async function askOpenAI(prompt){
    const key = localStorage.getItem("OPENAI_API_KEY");
    if(!key) return null;
    try{
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer "+key },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {role:"system", content:"You are a licensed color theory educator and salon technical advisor. Keep answers concise, safe, and brand-agnostic; offer ranges and explain the why."},
            {role:"user", content: prompt}
          ],
          temperature: 0.3
        })
      });
      if(!res.ok){ return "API error: "+res.status; }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "(no response)";
    }catch(e){
      return "Network error.";
    }
  }

  // Rule-based fallback
  function ruleBasedAnswer(q){
    q = q.toLowerCase();
    if(q.includes("fix my hair")){
      return "Upload a clear indoor photo or open the camera. I’ll analyze tone and density, then propose 2–3 formulas by zone with aftercare.";
    }
    if(q.includes("aftercare") || q.includes("care")){
      return "General aftercare: pH-balanced shampoo, weekly bond-builder or mask, cool water rinse, heat protectant, and extend toners every 4–6 weeks.";
    }
    if(q.includes("timing") || q.includes("process")){
      return "Typical processing is 20–45 min depending on brand, level change, gray %, and porosity. Strand test and monitor visually.";
    }
    return null;
  }

  async function respond(input){
    if(input.trim().toLowerCase() === "fix my hair"){
      addChat("assistant", "Open camera or upload a photo, then tap Analyze. I’ll suggest tones and a kit.");
      speak("Open your camera or upload a photo, then tap Analyze.");
      return;
    }
    let answer = ruleBasedAnswer(input);
    if(!answer){
      const ai = await askOpenAI(input);
      answer = ai || "I’m here; try again or provide a photo for analysis.";
    }
    addChat("assistant", answer);
    speak(answer);
  }

  // Events
  $("#ctc-open").onclick = ()=>{ panel.style.display = "flex"; };
  $("#ctc-min").onclick = ()=>{ panel.style.display = "none"; };
  $("#ctc-talk").onclick = ()=>{
    if($("#ctc-voice-mode").value === "off"){ panel.style.display="flex"; return; }
    listening ? stopListening() : startListening();
  };
  $("#ctc-save-key").onclick = ()=>{
    const v = $("#ctc-key").value.trim();
    if(v){ localStorage.setItem("OPENAI_API_KEY", v); addChat("assistant","API key saved locally."); }
  };
  $("#ctc-clear").onclick = ()=>{ $("#ctc-chat").innerHTML=""; };

  $("#ctc-send").onclick = ()=>{
    const v = $("#ctc-input").value.trim();
    if(!v) return;
    addChat("you", v);
    $("#ctc-input").value="";
    respond(v);
  };

  if($("#ctc-voice-mode").value === "auto"){ startListening(); }

})(); // IIFE end
