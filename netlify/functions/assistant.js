// netlify/functions/assistant.js
export async function handler(event) {
  // ---- CORS (keeps your styles/pages untouched) ----
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  // ---- Member pass (from Authorization: Bearer <pass>) ----
  const auth =
    event.headers["authorization"] ||
    event.headers["Authorization"] ||
    "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  let passes = [];
  try {
    // Must be a JSON array in Netlify env, e.g.
    // ["starter-111","pro-222","elite-333","elite-444"]
    passes = JSON.parse(process.env.MEMBER_PASSES || "[]");
  } catch { passes = []; }

  const ok = Array.isArray(passes) && passes.includes(token);
  if (!ok) {
    return {
      statusCode: 401,
      headers: cors,
      body: JSON.stringify({ error: "Invalid or inactive pass" }),
    };
  }

  // ---- Parse question ----
  let question = "";
  try {
    const { q } = JSON.parse(event.body || "{}");
    question = (q || "").toString().slice(0, 2000);
  } catch { /* noop */ }

  if (!question) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: "Missing question" }),
    };
  }

  // ---- Call OpenAI (uses your env OPENAI_API_KEY) ----
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || "";
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
    };
  }

  // Simple, fast model for Q&A
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are Color Theory Collective’s hair color assistant. Be precise, friendly, and concise. Never give unsafe chemical advice." },
      { role: "user", content: question }
    ],
    temperature: 0.4,
  };

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      return {
        statusCode: r.status,
        headers: cors,
        body: JSON.stringify({ error: data?.error?.message || "Upstream error" }),
      };
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || "I couldn’t form an answer.";
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Assistant crashed." }),
    };
  }
}
