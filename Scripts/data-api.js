import { haversineMeters } from './utils.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function buildOverpassQuery(lat, lon, radius, limit){
  // Rechercher des services populaires liés à la nourittzre
  const keys = ['restaurant','cafe','fast_food','bar','pub','ice_cream','food_court','biergarten'];
  const parts = keys.map(k=>`node(around:${radius},${lat},${lon})[amenity=${k}];`);
  return `
    [out:json][timeout:25];
    (
      ${parts.join('\n')}
    );
    out ${limit ?? 80};
  `;
}

function normalize(node, origin){
  const t = node.tags || {};
  const cuisine = t.cuisine ? String(t.cuisine).replace(/_/g,' ') : null;
  const name = t.name || null;
  const type = t.amenity || 'restaurant';
  const extras = [];
  if (t.outdoor_seating === 'yes') extras.push('Outdoor seating');
  if (t.takeaway === 'yes') extras.push('Takeaway');
  if (t.wheelchair === 'yes') extras.push('Wheelchair accessible');
  const price = t['price:range'] || t['price'] || t['stars'] ? `${t['stars'] || ''} ${t['price'] || t['price:range'] || ''}`.trim() : null;

  const place = {
    id: String(node.id),
    name,
    type,
    cuisine,
    lat: node.lat,
    lon: node.lon,
    distance: origin ? Math.round(haversineMeters(origin.lat, origin.lon, node.lat, node.lon)) : null,
    price: price || null,
    outdoor_seating: t.outdoor_seating === 'yes' ? 'Outdoor seating' : null,
    takeaway: t.takeaway === 'yes' ? 'Takeaway' : null,
    wheelchair_accessible: t.wheelchair === 'yes' ? 'Wheelchair accessible' : null,
    raw_tags: t
  };
  return place;
}

export async function searchNearby(lat, lon, { radius = 2000, limit = 80 } = {}){
  const q = buildOverpassQuery(lat, lon, radius, limit);
  const res = await fetch(OVERPASS_URL, {
    method:'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: q })
  });
  if (!res.ok) throw new Error('Overpass API error');
  const data = await res.json();
  const elements = data.elements || [];
  const origin = { lat, lon };
  const places = elements
    .filter(e=>e.type==='node')
    .map(n=>normalize(n, origin));

  const seen = new Map();
  const deduped = [];
  for (const p of places){
    const key = (p.name || `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).toLowerCase();
    if (!seen.has(key)){
      seen.set(key, true);
      deduped.push(p);
    }
  }
  return deduped.slice(0, limit);
}

export async function geocodeText(text){
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(text)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
  if (!res.ok) throw new Error('Geocoding error');
  const arr = await res.json();
  if (!arr.length) return null;
  const it = arr[0];
  return {
    lat: parseFloat(it.lat),
    lon: parseFloat(it.lon),
    display_name: it.display_name
  };
}


