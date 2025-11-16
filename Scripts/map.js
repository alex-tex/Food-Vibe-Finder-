let map;
let markersLayer;

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export function initMap(){
  map = L.map('map', { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  map.setView([37.773972, -122.431297], 13); //San Francisco
  return map;
}

export function setView(lat, lon, zoom=14){
  if (!map) return;
  map.setView([lat, lon], zoom);
}

export function clearMarkers(){
  if (markersLayer) markersLayer.clearLayers();
}

export function addPlaces(places){
  if (!map) return;
  clearMarkers();
  const bounds = [];
  places.forEach(p=>{
    const m = L.marker([p.lat, p.lon], { icon }).addTo(markersLayer);
    const cuisine = p.cuisine ? `<div><b>Cuisine:</b> ${p.cuisine}</div>` : '';
    const score = p.ai_score != null ? `<div><b>Match:</b> ${Math.round(p.ai_score*100)}%</div>` : '';
    const distance = p.distance != null ? `<div><b>Distance:</b> ${Math.round(p.distance)} m</div>` : '';
    m.bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:600">${p.name || 'Unnamed place'}</div>
        <div style="color:#666">${p.type || 'restaurant'}</div>
        ${cuisine}${score}${distance}
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name || '')}&query=${p.lat},${p.lon}">Google Maps</a>
          <a target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=19/${p.lat}/${p.lon}">OSM</a>
        </div>
      </div>
    `);
    bounds.push([p.lat, p.lon]);
  });
  if (bounds.length){
    map.fitBounds(bounds, { padding: [40,40] });
  }
}


