
// ============================================================
// ADVANCED MODULES — Simulation Engine
// ============================================================

let heatmapInterval = null;
let droneInterval = null;

const zones = [
  { id: 'densityGate',  name: 'Main Gate',   capacity: 500,  baseLoad: 0.85, heatX: '15%', heatY: '20%' },
  { id: 'densityFood',  name: 'Food Court',  capacity: 300,  baseLoad: 0.60, heatX: '50%', heatY: '40%' },
  { id: 'densityStage', name: 'Main Stage',  capacity: 1200, baseLoad: 0.45, heatX: '75%', heatY: '75%' }
];

function getColorForLoad(load) {
  if (load >= 0.9) return '#ef4444';
  if (load >= 0.7) return '#f59e0b';
  if (load >= 0.5) return '#4361ee';
  return '#10b981';
}

function getStatusLabel(load) {
  if (load >= 0.9) return 'CRITICAL';
  if (load >= 0.7) return 'HIGH';
  if (load >= 0.5) return 'MODERATE';
  return 'CLEAR';
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r}, ${g}, ${b}`;
}

function startHeatmapSimulation() {
  if (heatmapInterval) clearInterval(heatmapInterval);

  function tick() {
    const overlay = document.getElementById('heatmapOverlay');
    if (!overlay) return;

    const gradients = [];

    zones.forEach(zone => {
      const fluctuation = (Math.random() - 0.5) * 0.12;
      zone.baseLoad = Math.min(1, Math.max(0.1, zone.baseLoad + fluctuation));
      const load = zone.baseLoad;

      const color = getColorForLoad(load);
      const label = getStatusLabel(load);
      const count = Math.round(zone.capacity * load);

      const el = document.getElementById(zone.id);
      if (el) {
        el.textContent = `${count}/${zone.capacity} - ${label}`;
        el.style.color = color;
      }

      const alpha = (0.25 + load * 0.35).toFixed(2);
      const radius = Math.round(20 + load * 25);
      gradients.push(
        `radial-gradient(circle at ${zone.heatX} ${zone.heatY}, rgba(${hexToRgb(color)}, ${alpha}) 0%, transparent ${radius}%)`
      );

      if (load >= 0.9 && Math.random() < 0.08) {
        showToast(`CROWD ALERT: ${zone.name} at ${Math.round(load * 100)}% capacity! Security notified.`, 'error', 6000);
        addIncidentAlert(zone.name, load);
      }
    });

    overlay.style.background = gradients.join(', ');
    overlay.style.opacity = '0.85';
  }

  tick();
  heatmapInterval = setInterval(tick, 2500);
}

function addIncidentAlert(zoneName, load) {
  const list = document.getElementById('incidentList');
  if (!list) return;
  const card = document.createElement('div');
  card.className = 'incident-card critical';
  card.innerHTML = `
    <h4>Crowd Surge - ${zoneName}</h4>
    <p>Density reached ${Math.round(load * 100)}%. Automated alert dispatched to security chief and medical team.</p>
    <div class="time">Just now</div>
  `;
  list.prepend(card);
}

function startDroneSimulation() {
  if (droneInterval) clearInterval(droneInterval);

  const altitudes = [80, 95, 105, 115, 120, 130, 142, 155];
  const speeds    = [30, 35, 42, 48, 55, 60, 65];
  const co2Values = [380, 400, 420, 450, 480, 510, 540];
  const aqiValues = [
    { val: 32,  label: '32 (Good)',      cls: '' },
    { val: 65,  label: '65 (Moderate)',  cls: 'warning' },
    { val: 88,  label: '88 (Unhealthy)', cls: 'critical' },
    { val: 110, label: '110 (HAZARD)',   cls: 'critical' },
    { val: 45,  label: '45 (Good)',      cls: '' }
  ];
  let aqiIndex = 0;

  function tick() {
    const altEl = document.getElementById('droneAlt');
    const spdEl = document.getElementById('droneSpd');
    const aqiEl = document.getElementById('droneAqi');
    const co2El = document.getElementById('droneCo2');
    if (!altEl) return;

    const alt = altitudes[Math.floor(Math.random() * altitudes.length)];
    const spd = speeds[Math.floor(Math.random() * speeds.length)];
    const co2 = co2Values[Math.floor(Math.random() * co2Values.length)];
    const aqi = aqiValues[aqiIndex % aqiValues.length];
    aqiIndex++;

    altEl.textContent = `${alt}m`;
    spdEl.textContent = `${spd}km/h`;
    aqiEl.textContent = aqi.label;
    aqiEl.parentElement.className = `hud-item ${aqi.cls}`;
    co2El.textContent = `${co2}ppm`;

    if (aqi.val >= 100 && Math.random() < 0.4) {
      showToast(`AIR QUALITY HAZARD: Drone Alpha-1 reports AQI ${aqi.val}. Medical team alerted!`, 'error', 6000);
    }
  }

  tick();
  droneInterval = setInterval(tick, 3000);
}

function setupAdvancedModules() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab !== 'map' && heatmapInterval)  { clearInterval(heatmapInterval); heatmapInterval = null; }
      if (tab !== 'drones' && droneInterval) { clearInterval(droneInterval);   droneInterval = null;   }
    });
  });
}
