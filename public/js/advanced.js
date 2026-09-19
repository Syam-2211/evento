
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

let isDroneAuthorized = false;

function setupDroneAuth() {
  const deployBtn = document.getElementById('deployDroneBtn');
  const returnBtn = document.getElementById('returnDroneBtn');
  const modal = document.getElementById('droneAuthModal');
  const confirmBtn = document.getElementById('confirmDroneAuthBtn');
  const cancelBtn = document.getElementById('cancelDroneAuthBtn');
  const userInp = document.getElementById('droneAuthUser');
  const keyInp = document.getElementById('droneAuthKey');

  if(deployBtn) {
    deployBtn.addEventListener('click', () => {
      if (isDroneAuthorized) {
        showToast('Drone Alpha-1 is already deployed.', 'info');
        return;
      }
      modal.style.display = 'flex';
    });
  }

  if(cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      userInp.value = '';
      keyInp.value = '';
    });
  }

  if(confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (userInp.value === 'yuva' && keyInp.value === 'Evento') {
        modal.style.display = 'none';
        userInp.value = '';
        keyInp.value = '';
        isDroneAuthorized = true;
        showToast('Authorization accepted. Deploying Alpha-1.', 'success');
        startDroneSimulation();
      } else {
        showToast('ACCESS DENIED. Invalid credentials.', 'error');
      }
    });
  }
  
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      if (droneInterval) {
         clearInterval(droneInterval);
         droneInterval = null;
      }
      isDroneAuthorized = false;
      showToast('Drone Alpha-1 returning to base.', 'info');
    });
  }
}

let droneWebcamStream = null;

async function startDroneCameras() {
  try {
    if (!droneWebcamStream) {
      droneWebcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      const cctvIds = ['cctvCam1', 'cctvCam2', 'cctvCam3', 'cctvCam4'];
      cctvIds.forEach(id => {
        const vid = document.getElementById(id);
        if (vid) vid.srcObject = droneWebcamStream;
      });
      
      const droneVid = document.getElementById('droneVideo');
      if (droneVid) {
        droneVid.srcObject = droneWebcamStream;
      }
    }
  } catch (err) {
    console.warn("Camera access denied or unavailable for Drone/CCTV.", err);
    showToast("Camera access required for live Drone/CCTV feeds.", "error");
  }
}

function stopDroneCameras() {
  if (droneWebcamStream) {
    droneWebcamStream.getTracks().forEach(t => t.stop());
    droneWebcamStream = null;
  }
}

function setupAdvancedModules() {
  // Thermal Toggle
  const thermalBtn = document.getElementById('toggleThermalBtn');
  if (thermalBtn) {
    thermalBtn.addEventListener('click', () => {
      const droneVid = document.getElementById('droneVideo');
      const cctvVids = document.querySelectorAll('.cctv-video');
      
      if (droneVid) droneVid.classList.toggle('thermal-mode');
      cctvVids.forEach(vid => vid.classList.toggle('thermal-mode'));
      
      const isThermal = droneVid && droneVid.classList.contains('thermal-mode');
      showToast(isThermal ? 'Thermal Vision Activated' : 'Thermal Vision Deactivated', 'info');
    });
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab === 'map') {
        if (!heatmapInterval) startHeatmapSimulation();
      } else {
        if (heatmapInterval) { clearInterval(heatmapInterval); heatmapInterval = null; }
      }
      
      // Drone simulation only runs if authorized, and pauses if tab is hidden (optional)
      if (tab !== 'drones') { 
        if (droneInterval) { clearInterval(droneInterval); droneInterval = null; }
        stopDroneCameras();
      } else if (tab === 'drones') {
        startDroneCameras();
        if (isDroneAuthorized && !droneInterval) {
          startDroneSimulation(); // Resume if they come back to the tab
        }
      }
    });
  });
  
  setupDroneAuth();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', setupAdvancedModules);

