function placeToBrief(p){
  const tags = [];
  if (p.cuisine) tags.push(`cuisine:${p.cuisine}`);
  if (p.type) tags.push(`type:${p.type}`);
  if (p.price) tags.push(`price:${p.price}`);
  if (p.outdoor_seating) tags.push('outdoor');
  if (p.takeaway) tags.push('takeaway');
  if (p.wheelchair_accessible) tags.push('wheelchair');
  return {
    id: p.id,
    name: p.name || 'Unnamed',
    tags: tags,
    distance_m: p.distance ?? null,
  };
}

// Simple helper to fetch from Gemini
async function callGemini(systemText, userText){
  const apiKey = "GEMINI_API_KEY";
  if (!apiKey){
    throw new Error('Missing Gemini API key. Set GEMINI_API_KEY');
  }

  const body = {
    // Use a fast model; adjust if you prefer pro
    // gemini-1.5-flash supports system instruction and JSON responses
    system_instruction: { role: 'system', parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.2,
      // Force JSON-only output
      response_mime_type: 'application/json'
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok){
    const errText = await res.text().catch(()=> '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();
  return text || '';
}

export async function scorePlacesForVibe(vibe, center, places){
  const briefs = places.map(placeToBrief).slice(0, 80);
  const system = `Ton but est de classer des restaurants/food spots à proximité en fonction de mood de l'utilisateur.
Retourne uniquement JSON comme spécifié. Score 0..1 (float). Consider: cuisine fit (e.g., spicy -> Indian, Thai, Sichuan, Mexican), ambiance terms (cozy, lively, quiet), and quick heuristics from tags. Prefer closer distances when scores are similar.`;
  const user = `
Vibe: "${vibe}"
Center: ${center.lat.toFixed(5)},${center.lon.toFixed(5)}
Places:
${JSON.stringify(briefs)}
Répond avec JSON uniquement sous cette forme:
{
  "items": Array<{ id: string; score: number; why: string; }>
}
`;

  let result;
  try {
    const content = await callGemini(system, user);
    result = JSON.parse(content);
  } catch (e){
    console.warn('Gemini parse/error fallback:', e);
    result = { items: [] };
  }

  const byId = new Map(places.map(p=>[p.id, p]));
  const scored = [];
  (result.items || []).forEach(it=>{
    const base = byId.get(String(it.id));
    if (!base) return;
    scored.push({
      ...base,
      ai_score: Math.max(0, Math.min(1, Number(it.score) || 0)),
      ai_why: String(it.why || '')
    });
  });
  // ensure every item has a score (fallback 0.3)
  const missing = places
    .filter(p=>!scored.find(s=>s.id===p.id))
    .map(p=>({ ...p, ai_score: 0.3, ai_why: 'Fallback score' }));
  return [...scored, ...missing];
}