// netlify/functions/assistant.js
export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  // ---------- auth: member pass ----------
  const headers = event.headers || {};
  const rawAuth =
    headers["authorization"] ||
    headers["Authorization"] ||
    "";
  const bearer = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : "";
  const url = new URL(
    event.rawUrl ||
    `https://dummy.local${event.path}${event.queryStringParameters ? "?" + new URLSearchParams(event.queryStringParameters).toString() : ""}`
  );
  const qsPass = url.searchParams.get("pass") || "";
  const token = (bearer || qsPass || "").trim();

  if (!token) {
    return {
      statusCode: 401,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Missing Member Pass. Add Authorization: Bearer <pass> or ?pass=<pass>."
      })
    };
  }

  // Load passes from env and normalize
  function normalizePasses(raw) {
    if (!raw) return [];
    let parsed = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // allow comma-separated fallback
      return String(raw).split(",").map(s => s.trim()).filter(Boolean);
    }

    // Array of strings?
    if (Array.isArray(parsed)) {
      return parsed
        .map(p => {
          if (typeof p === "string") return p.trim();
          if (p && typeof p === "object") {
            return String(p.code || p.pass || p.id || p.value || "").trim();
          }
          return "";
        })
        .filter(Boolean);
    }

    // {passes: [...]}
    if (parsed && Array.isArray(parsed.passes)) {
      return parsed.passes
        .map(p => (typeof p === "string" ? p : (p && (p.code || p.pass || p.id || p.value)) || ""))
        .map(s => String(s).trim())
        .filter(Boolean);
    }
    return [];
  }

  const allowed = normalizePasses(process.env.MEMBER_PASSES);

  const isAllowed = allowed.some(
    p => String(p).toLowerCase() === token.toLowerCase()
  );

  if (!isAllowed) {
    return {
      statusCode: 403,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid or inactive pass" })
    };
  }

  // ---------- input ----------
  let question = "";
  if (event.httpMethod === "GET") {
    question = url.searchParams.get("msg") || url.searchParams.get("q") || "";
  } else if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      question = body.message || body.msg || body.q || "";
    } catch {
      // ignore
    }
  } else {
    return { statusCode: 405, headers: cors, body: "" };
  }

  if (!question) {
    return {
      statusCode: 400,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing question (use ?msg=... or POST {\"message\":\"...\"})" })
    };
  }

  // ---------- OpenAI call ----------
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server is missing OPENAI_API_KEY" })
    };
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a concise, friendly color & hair chemistry assistant for Color Theory Collective. " +
          "Give step-by-step, safe, product-agnostic guidance. If info is insufficient, ask for the missing details."
      },
      { role: "user", content: question }
    ],
    temperature: 0.4,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        statusCode: res.status,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Upstream OpenAI error", detail: errText })
      };
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "Sorry—no answer received.";

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, tier: token.split("-")[0].toLowerCase(), answer })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Function crash", detail: String(e) })
    };
  }
}
