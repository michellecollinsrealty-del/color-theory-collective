// netlify/functions/color-assistant.js
// Color Theory Collective – Live Assistant (pass-gated)

/**
 * Expected env vars (Netlify > Site settings > Environment variables):
 *   OPENAI_API_KEY          = sk-...  (NOT your ChatGPT app login; create at platform.openai.com)
 *   MEMBER_PASSES           = JSON string (see notes above)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// ---- helpers ---------------------------------------------------------------

function ok(body, extra = {}) {
  return {
    statusCode: 200,
    headers: { ...CORS, ...extra },
    body: JSON.stringify(body)
  };
}

function err(statusCode, message) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify({ error: message })
  };
}

/** Parse MEMBER_PASSES env into array of { code, tier } objects */
function readMemberPasses() {
  let raw = process.env.MEMBER_PASSES || "";
  let parsed;

  // Try JSON first
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    // Not JSON? allow simple comma list: "Elite-333, Pro-222"
    if (raw.trim().length) {
      parsed = raw.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      parsed = [];
    }
  }

  // Normalize into [{code,tier?}]
  if (Array.isArray(parsed)) {
    return parsed.map(item => {
      if (typeof item === "string") {
        return { code: item, tier: guessTier(item) };
      }
      if (item && typeof item === "object") {
        // support {pass:"..." } or {code:"..."}
        const code = item.code || item.pass || "";
        const tier = item.tier || guessTier(code);
        return { code, tier };
      }
      return null;
    }).filter(Boolean);
  }

  // Anything else → empty
  return [];
}

function guessTier(code = "") {
  const low = code.toLowerCase();
  if (low.includes("elite")) return "elite";
  if (low.includes("pro")) return "pro";
  if (low.includes("starter")) return "starter";
  return "member";
}

// ---- OpenAI call -----------------------------------------------------------

async function askOpenAI(question, tier) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Server missing OPENAI_API_KEY");

  const system = [
    "You are the Color Theory Collective live assistant.",
    "Audience: licensed stylists and advanced DIY learners.",
    "Tone: concise, friendly, safety-first.",
    "NEVER give medical advice; for chemical services emphasize strand tests, patch tests, developer strength, processing windows, and aftercare.",
    `User tier: ${tier || "member"} (adjust depth accordingly).`
  ].join(" ");

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: question }
    ],
    temperature: 0.4,
    max_tokens: 450
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstream OpenAI error: ${text}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry—no answer.";
  return reply;
}

// ---- Netlify function ------------------------------------------------------

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }
  if (event.httpMethod !== "POST") {
    return err(405, "Use POST");
  }

  // Auth header (member pass)
  const auth =
    event.headers["authorization"] ||
    event.headers["Authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return err(401, "Missing Member Pass (Authorization: Bearer <pass>)");
  }

  // Parse passes from env
  const passes = readMemberPasses();

  // Find match (accept exact code case-insensitive)
  const found = passes.find(p => (p.code || "").toLowerCase() === token.toLowerCase());
  if (!found) {
    return err(403, "Invalid or inactive pass");
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err(400, "Invalid JSON body");
  }

  const question = (body.question || "").toString().trim();
  if (!question) return err(400, "Missing 'question'");

  try {
    const reply = await askOpenAI(question, found.tier);
    return ok({ reply, tier: found.tier || "member" });
  } catch (e) {
    return err(502, e.message);
  }
};
