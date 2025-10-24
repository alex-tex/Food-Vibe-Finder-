import { initMap, setView, clearMarkers, addPlaces } from './map.js';
import { searchNearby, geocodeText } from './data-api.js';
import { scorePlacesForVibe } from './ai.js';
import { metersToReadable, debounce } from './utils.js';

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results-list');
const vibeInput = document.getElementById('vibe-input');
const form = document.getElementById('search-form');
const locateBtn = document.getElementById('locate-btn');
const locationInput = document.getElementById('location-input');

let center = null;
let map = null;
let lastResults = [];

function setStatus(text, spin = false){
  statusEl.textContent = text;
  statusEl.dataset.spin = spin ? '1' : '';
}

function renderList(items){
  resultsEl.innerHTML = '';
  items.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'result';
    li.innerHTML = `
      <div class="row">
        <div class="title">${p.name || 'Lieu sans nom'}</div>
        <div class="score">${Math.round((p.ai_score ?? 0)*100)}%</div>
      </div>
      <div class="subtitle">
        ${p.type}${p.cuisine ? ' • ' + p.cuisine : ''}${p.distance != null ? ' • ' + metersToReadable(p.distance) : ''}
      </div>
      <div class="badges">${[p.price, p.outdoor_seating, p.takeaway, p.wheelchair_accessible].filter(Boolean).map(t=>`<span class="badge">${t}</span>`).join('')}</div>
      <div class="actions">
        <a class="link-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name || '')}&query_place_id=${encodeURIComponent(p.id || '')}&query=${p.lat},${p.lon}" target="_blank" rel="noreferrer">Open in Maps</a>
        <a class="link-btn" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=19/${p.lat}/${p.lon}" target="_blank" rel="noreferrer">Open in OSM</a>
      </div>
    `;
    li.addEventListener('mouseenter', ()=>{
      if (map) {
        map.panTo([p.lat, p.lon], { animate: true });
      }
    });
    resultsEl.appendChild(li);
  });
}

async function runSearch(){
  const vibe = vibeInput.value.trim() || 'cozy and spicy';
  if (!center){
    setStatus('Sélectionner un lieu ou autoriser l`access à votre position.');
    return;
  }
  setStatus('Recherche à proximité…', true);
  try {
    const raw = await searchNearby(center.lat, center.lon, { radius: 2000, limit: 60 });
    if (!raw.length){
      setStatus('Pas de lieux trouvé à proximité.');
      clearMarkers();
      resultsEl.innerHTML = '';
      return;
    }
    /// AI scoring
    setStatus('Compréhension de votre mood…', true);
    const scored = await scorePlacesForVibe(vibe, center, raw);
    // sort by score desc, then distance asc
    scored.sort((a,b)=>(b.ai_score??0)-(a.ai_score??0) || (a.distance??1e9)-(b.distance??1e9));
    lastResults = scored;
    setStatus(`Top matches pour “${vibe}”`);
    clearMarkers();
    addPlaces(scored.slice(0, 30));
    renderList(scored.slice(0, 30));
  } catch (e){
    console.error(e);
    setStatus('Un problème s´est produit. Réessayez.');
  }
}

async function locate(){
  setStatus('Locating…', true);
  try{
    const pos = await new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });
    center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    setView(center.lat, center.lon, 15);
    setStatus('Prêt');
  }catch(e){
    setStatus('Position bloqué. Entrez un lieu ci-dessus.');
  }
}

async function setCenterFromText(text){
  if (!text) return;
  setStatus(`Finding “${text}”…`, true);
  try{
    const g = await geocodeText(text);
    if (g){
      center = { lat: g.lat, lon: g.lon };
      setView(center.lat, center.lon, 14);
      setStatus(`Centré sur ${g.display_name}`);
    }else{
      setStatus('Impossible de trouver le lieu.');
    }
  }catch(e){
    console.error(e);
    setStatus('Geocoding échoué.');
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  map = initMap();
  locate();
});

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  runSearch();
});

locateBtn.addEventListener('click', ()=>{
  locate();
});

locationInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    e.preventDefault();
    setCenterFromText(locationInput.value.trim());
  }
});

locationInput.addEventListener('input', debounce(()=>{
  const q = locationInput.value.trim();
  if (q.length > 3){
    setCenterFromText(q);
  }
}, 800));

