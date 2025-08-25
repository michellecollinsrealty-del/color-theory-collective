// netlify/functions/assistant.js
export async function handler(event, context) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: cors, body: 'ok' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
    }

    const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return { statusCode: 401, headers: cors, body: 'Missing Member Pass (Authorization: Bearer <pass>)' };
    }

    let passes = [];
    try { passes = JSON.parse(process.env.MEMBER_PASSES || '[]'); } catch {}
    const found = passes.find(p => p.pass === token);
    if (!found) {
      return { statusCode: 402, headers: cors, body: 'Invalid or inactive pass' };
    }

    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];
    const mode = body.mode || 'pro';
    const tier = body.tier || found.tier || 'starter';

    const persona =
`You are CTC—Color Theory Collective’s color educator & lab tech.
Audience: salon pros and DIY consumers. Be warm, concise, and confidence-building.
Priorities: hair integrity, correct formulation, clean application, budget & ETA, aftercare.
Always consider: current level, % gray, porosity, skin/eye undertone, color history, target tone, maintenance window.
Teach while solving (why this developer, why this tone). Use color wheel complements. Offer 2–3 safe paths (Pro vs DIY).
If user is overwhelmed, simplify to a one-page checklist. Avoid medical diagnoses.
Mode: ${mode}. Tier: ${tier}.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: cors, body: 'Server missing OPENAI_API_KEY' };
    }

    const model = (tier === 'elite' || tier === 'pro') ? 'gpt-5.1' : 'gpt-5.1-mini';

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
      body: JSON.stringify({
        model,
        messages: [{role:'system', content: persona}, ...messages]
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return { statusCode: 502, headers: cors, body: 'Upstream OpenAI error: ' + txt };
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '…';

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type":"application/json" },
      body: JSON.stringify({ reply })
    };

  } catch (e) {
    return { statusCode: 500, headers: cors, body: 'Function crash: ' + String(e) };
  }
}
