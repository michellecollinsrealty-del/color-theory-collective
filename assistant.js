<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Assistant Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .card { border: 1px solid #aaa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    input, button { padding: 10px; font-size: 16px; margin-top: 5px; }
    #out { white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 6px; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>🔑 Member Pass Test</h2>

  <div class="card">
    <label>Pass Code:</label><br/>
    <input id="pass" value="elite-333" />
    <button onclick="savePass()">Save</button>
    <button onclick="clearPass()">Clear</button>
    <div id="status"></div>
  </div>

  <div class="card">
    <label>Ask live:</label><br/>
    <input id="q" value="Hello?" />
    <button onclick="ask()">Ask</button>
    <div id="out"></div>
  </div>

  <script>
    const PASS_KEY = "ctc_member_pass";

    function savePass() {
      localStorage.setItem(PASS_KEY, document.getElementById("pass").value.trim());
      renderStatus();
    }
    function clearPass() {
      localStorage.removeItem(PASS_KEY);
      renderStatus();
    }
    function renderStatus() {
      const p = localStorage.getItem(PASS_KEY);
      document.getElementById("status").textContent = p ? `Saved pass: ${p}` : "No pass saved";
    }

    async function ask() {
      const p = localStorage.getItem(PASS_KEY);
      if (!p) return alert("Save a pass first!");

      const q = document.getElementById("q").value;
      const res = await fetch("/.netlify/functions/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + p
        },
        body: JSON.stringify({ q })
      });

      const data = await res.text();
      document.getElementById("out").textContent = data;
    }

    renderStatus();
  </script>
</body>
</html>
