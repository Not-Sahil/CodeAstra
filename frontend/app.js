// ==========================================================================
// CODEASTRA FRONTEND APPLICATION CONTROLLER
// ==========================================================================

const API_BASE = window.location.origin;

let map = null;
let networkGraph = null;
let activeIncidents = [];
let selectedIncidentId = "INC_MUM_20260715_01";
let selectedUserId = "USR_001";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initMap();
  loadIncidents();
  loadUsers();
  loadTelemetryFeed();
  loadCommuteFingerprint(selectedUserId);
  loadIncidentGraph(selectedIncidentId);
  loadConfidenceLedger(selectedIncidentId);

  // Periodic clock update
  setInterval(updateClock, 1000);
});

// ==========================================================================
// TAB NAVIGATION
// ==========================================================================
function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetId = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      const activePane = document.getElementById(targetId);
      if (activePane) activePane.classList.add("active");

      // Invalidate map size if map tab becomes active
      if (targetId === "tab-map" && map) {
        setTimeout(() => map.invalidateSize(), 200);
      }
      // Re-render network if graph tab becomes active
      if (targetId === "tab-graph") {
        setTimeout(() => loadIncidentGraph(selectedIncidentId), 200);
      }
    });
  });
}

function updateClock() {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0] + " IST";
  const clockEl = document.getElementById("header-time-clock");
  if (clockEl) clockEl.innerText = timeStr;
}

// ==========================================================================
// LEAFLET MAP INITIALIZATION
// ==========================================================================
function initMap() {
  const mapEl = document.getElementById("mumbai-map");
  if (!mapEl) return;

  // Center on Mumbai Western Suburbs (Borivali - Malad - Andheri)
  map = L.map("mumbai-map", {
    center: [19.1850, 72.8480],
    zoom: 12,
    zoomControl: true
  });

  // Dark mode map tiles (CartoDB Dark Matter)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & OpenStreetMap',
    maxZoom: 18,
    subdomains: "abcd"
  }).addTo(map);

  // Load geo stations and plot on map
  fetch(`${API_BASE}/api/stations`)
    .then(res => res.json())
    .then(data => {
      if (data.stations) {
        data.stations.forEach(st => {
          let color = "#3b82f6";
          let radius = 4;
          if (st.category === "RAILWAY") { color = "#ef4444"; radius = 6; }
          else if (st.category.includes("METRO")) { color = "#10b981"; radius = 5; }
          else if (st.category === "FLOOD_SUBWAY") { color = "#06b6d4"; radius = 7; }

          L.circleMarker([st.latitude, st.longitude], {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.85,
            weight: 2
          }).bindPopup(`<strong>${st.name}</strong><br>Category: ${st.category}`).addTo(map);
        });
      }
    })
    .catch(err => console.error("Error loading stations:", err));

  // Plot Student Sahil's corridor line (Ashokvan -> RGIT Versova)
  const sahilRouteCoords = [
    [19.2372, 72.8695], // Ashokvan
    [19.2290, 72.8569], // Borivali Station
    [19.2045, 72.8522], // Kandivali Station
    [19.1868, 72.8488], // Malad (Disruption zone)
    [19.1197, 72.8464], // Andheri Station
    [19.1342, 72.8145]  // RGIT Versova
  ];

  L.polyline(sahilRouteCoords, {
    color: "#38bdf8",
    weight: 3,
    dashArray: "6, 6",
    opacity: 0.8
  }).bindPopup("<strong>Student Sahil Commute Route</strong><br>Ashokvan ➔ RGIT Versova").addTo(map);
}

// ==========================================================================
// INCIDENTS MANAGEMENT
// ==========================================================================
function loadIncidents() {
  fetch(`${API_BASE}/api/incidents`)
    .then(res => res.json())
    .then(data => {
      activeIncidents = data.incidents || [];
      const countEl = document.getElementById("header-incident-count");
      if (countEl) countEl.innerText = activeIncidents.length;

      populateIncidentsList();
      populateIncidentPickers();
      renderIncidentsOnMap();
    })
    .catch(err => console.error("Error loading incidents:", err));
}

function renderIncidentsOnMap() {
  if (!map) return;
  activeIncidents.forEach(inc => {
    const isCritical = inc.severity_level.includes("LEVEL_4") || inc.severity_level.includes("LEVEL_5");
    const circleColor = isCritical ? "#ef4444" : "#f59e0b";

    // Pulsing circle for incident radius
    L.circle([inc.centroid_lat, inc.centroid_lon], {
      radius: inc.radius_km * 1000,
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: 0.25,
      weight: 2
    }).bindPopup(`
      <div style="font-family:sans-serif; min-width:180px;">
        <strong style="color:${circleColor};">${inc.incident_id}</strong><br>
        <strong>${inc.title}</strong><br>
        Severity: ${inc.severity_level}<br>
        Impact: ${inc.commuters_affected.toLocaleString()} commuters<br>
        Confidence: ${(inc.confidence_score * 100).toFixed(0)}%
      </div>
    `).addTo(map);
  });
}

function populateIncidentsList() {
  const container = document.getElementById("incidents-list-container");
  if (!container) return;
  container.innerHTML = "";

  activeIncidents.forEach(inc => {
    const isSelected = (inc.incident_id === selectedIncidentId);
    const card = document.createElement("div");
    card.className = `incident-card ${isSelected ? "selected" : ""}`;
    card.onclick = () => selectIncident(inc.incident_id);

    const isCritical = inc.severity_level.includes("LEVEL_4");
    const badgeClass = isCritical ? "badge-critical" : "badge-major";

    card.innerHTML = `
      <div class="ic-top">
        <span class="ic-badge ${badgeClass}">${inc.scenario_type}</span>
        <span class="ic-conf">Conf: ${(inc.confidence_score * 100).toFixed(0)}%</span>
      </div>
      <h4>${inc.title}</h4>
      <div class="ic-infra">📍 ${inc.affected_infrastructure.substring(0, 50)}...</div>
      <div class="ic-meta">
        <span>👥 ~${inc.commuters_affected.toLocaleString()} Commuters</span>
        <span>⚡ Cause: ${inc.known_cause.substring(0, 24)}...</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function populateIncidentPickers() {
  const pickers = [document.getElementById("select-incident-graph"), document.getElementById("select-incident-ledger")];
  pickers.forEach(picker => {
    if (!picker) return;
    picker.innerHTML = "";
    activeIncidents.forEach(inc => {
      const opt = document.createElement("option");
      opt.value = inc.incident_id;
      opt.innerText = `${inc.incident_id}: ${inc.scenario_type} (${inc.severity_level})`;
      picker.appendChild(opt);
    });
    picker.value = selectedIncidentId;
    picker.onchange = (e) => selectIncident(e.target.value);
  });
}

function selectIncident(incId) {
  selectedIncidentId = incId;
  populateIncidentsList();
  const gPicker = document.getElementById("select-incident-graph");
  const lPicker = document.getElementById("select-incident-ledger");
  if (gPicker) gPicker.value = incId;
  if (lPicker) lPicker.value = incId;

  loadIncidentGraph(incId);
  loadConfidenceLedger(incId);
}

// ==========================================================
// INNOVATION 1: CASCADING EVIDENCE GRAPH (VIS.JS NETWORK)
// ==========================================================
function loadIncidentGraph(incId) {
  const canvas = document.getElementById("evidence-network-canvas");
  if (!canvas) return;

  fetch(`${API_BASE}/api/incident/${incId}/graph`)
    .then(res => res.json())
    .then(data => {
      const nodes = new vis.DataSet(data.nodes);
      const edges = new vis.DataSet(data.edges);

      const options = {
        nodes: {
          shape: "box",
          margin: 10,
          font: { color: "#ffffff", face: "Inter", size: 12 },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          arrows: { to: { enabled: true, scaleFactor: 0.8 } },
          font: { color: "#94a3b8", size: 10, align: "middle" },
          smooth: { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 }
        },
        layout: {
          hierarchical: {
            direction: "LR",
            sortMethod: "directed",
            levelSeparation: 220,
            nodeSpacing: 100
          }
        },
        physics: {
          hierarchicalRepulsion: { nodeDistance: 150 }
        }
      };

      if (networkGraph) networkGraph.destroy();
      networkGraph = new vis.Network(canvas, { nodes, edges }, options);
    })
    .catch(err => console.error("Error loading graph:", err));
}

// ==========================================================
// INNOVATION 2: PERSONAL COMMUTE FINGERPRINT
// ==========================================================
function loadUsers() {
  fetch(`${API_BASE}/api/users`)
    .then(res => res.json())
    .then(data => {
      const picker = document.getElementById("select-user-fingerprint");
      if (!picker || !data.users) return;
      picker.innerHTML = "";
      data.users.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.user_id;
        opt.innerText = `${u.user_id} - ${u.name} (${u.user_type})`;
        picker.appendChild(opt);
      });
      picker.value = selectedUserId;
      picker.onchange = (e) => {
        selectedUserId = e.target.value;
        loadCommuteFingerprint(selectedUserId);
      };
    })
    .catch(err => console.error("Error loading users:", err));
}

function loadCommuteFingerprint(userId) {
  fetch(`${API_BASE}/api/commute-fingerprint/${userId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("fingerprint-user-name").innerText = `${data.name} (${data.user_type})`;
      
      const rec = data.optimal_recommendation;
      document.getElementById("recommendation-title").innerText = `AI Commute Advisory: Disruption Detected on Planned Route`;
      document.getElementById("recommendation-explanation").innerText = rec.advisory;
      document.getElementById("recommendation-saved-time").innerText = `${rec.net_time_saved_min} Minutes`;

      const grid = document.getElementById("commute-modes-grid");
      if (!grid) return;
      grid.innerHTML = "";

      data.travel_options.forEach(opt => {
        const card = document.createElement("div");
        card.className = `mode-card ${opt.recommended ? "is-recommended" : ""}`;
        
        card.innerHTML = `
          ${opt.recommended ? '<span class="mc-badge mc-badge-rec">⭐ RECOMMENDED</span>' : ''}
          <div class="mc-header">
            <h4>${opt.mode}</h4>
            <span class="mc-status" style="color:${opt.color}">${opt.status}</span>
          </div>
          <div class="mc-eta-row">
            <div>
              <span class="eta-label">Normal ETA</span>
              <span class="eta-val">${opt.normal_eta_min}m</span>
            </div>
            <div>
              <span class="eta-label">Expected Delay</span>
              <span class="eta-val" style="color:${opt.color}">+${opt.delay_min}m</span>
            </div>
            <div>
              <span class="eta-label">Current ETA</span>
              <span class="eta-val">${opt.current_eta_min}m</span>
            </div>
          </div>
          <div class="mc-corridor">📍 <strong>Corridor:</strong> ${opt.route_corridor}</div>
          <div class="mc-reason">${opt.reason}</div>
        `;
        grid.appendChild(card);
      });
    })
    .catch(err => console.error("Error loading commute fingerprint:", err));
}

// ==========================================================
// INNOVATION 3: EVIDENCE CONFIDENCE LEDGER
// ==========================================================
function loadConfidenceLedger(incId) {
  fetch(`${API_BASE}/api/incident/${incId}/ledger`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("ledger-conf-score").innerText = data.computed_confidence_score.toFixed(2);
      document.getElementById("ledger-conf-rating").innerText = data.confidence_rating;
      document.getElementById("ledger-sev-level").innerText = data.severity_level;
      document.getElementById("ledger-ai-reasoning").innerText = data.ai_reasoning_summary;

      // Fill Quad-Cards
      renderEvidenceCol("list-supporting", "count-supporting", data.supporting_evidence, "SUPPORTING");
      renderEvidenceCol("list-conflicting", "count-conflicting", data.conflicting_evidence, "CONFLICTING");
      renderEvidenceCol("list-duplicate", "count-duplicate", data.duplicate_evidence, "DUPLICATE");
      renderEvidenceCol("list-missing", "count-missing", data.missing_evidence, "MISSING");
    })
    .catch(err => console.error("Error loading confidence ledger:", err));
}

function renderEvidenceCol(listId, countId, items, type) {
  const countEl = document.getElementById(countId);
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  if (countEl) countEl.innerText = items.length;

  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text-muted); font-size:11px; padding:10px;">None observed</div>`;
    return;
  }

  items.forEach(it => {
    const el = document.createElement("div");
    el.className = "ev-item";
    if (type === "SUPPORTING") {
      el.innerHTML = `
        <span class="ev-src">${it.source} (Rel: ${(it.reliability*100).toFixed(0)}%)</span>
        <span class="ev-val">${it.measured}</span>
        <span class="ev-txt">${it.text}</span>
      `;
    } else if (type === "CONFLICTING") {
      el.innerHTML = `
        <span class="ev-src" style="color:#fbbf24">${it.source} (Rel: ${(it.reliability*100).toFixed(0)}%)</span>
        <span class="ev-val" style="color:#fbbf24">${it.claim}</span>
        <span class="ev-txt">${it.contradiction_text}</span>
      `;
    } else if (type === "DUPLICATE") {
      el.innerHTML = `
        <span class="ev-src" style="color:#c4b5fd">${it.source}</span>
        <span class="ev-txt">${it.text}</span>
      `;
    } else {
      el.innerHTML = `
        <span class="ev-src" style="color:#94a3b8">${it.sensor_id}</span>
        <span class="ev-txt">${it.reason}</span>
      `;
    }
    listEl.appendChild(el);
  });
}

// ==========================================================
// INNOVATION 4: INTERACTIVE INCIDENT REPLAY LAB
// ==========================================================
function triggerReplayAction(actionType, payload) {
  fetch(`${API_BASE}/api/replay/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type: actionType, payload: payload })
  })
    .then(res => res.json())
    .then(data => {
      const res = data.result;
      logReplayConsole(res.timestamp, res.effect);

      // Refresh Ledger and Fingerprint dynamically!
      loadConfidenceLedger(selectedIncidentId);
      loadIncidentGraph(selectedIncidentId);
      loadCommuteFingerprint(selectedUserId);
    })
    .catch(err => console.error("Error executing replay action:", err));
}

function logReplayConsole(time, msg) {
  const consoleEl = document.getElementById("replay-console-log");
  if (!consoleEl) return;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-msg">${msg}</span>
  `;
  consoleEl.prepend(entry);
}

function clearReplayConsole() {
  const consoleEl = document.getElementById("replay-console-log");
  if (consoleEl) {
    consoleEl.innerHTML = `
      <div class="log-entry system-entry">
        <span class="log-time">[CLEARED]</span>
        <span class="log-msg">Replay log reset.</span>
      </div>
    `;
  }
}

// ==========================================================
// TELEMETRY FEED TICKER
// ==========================================================
function loadTelemetryFeed() {
  fetch(`${API_BASE}/api/complaints`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("telemetry-feed-container");
      if (!container || !data.complaints) return;
      container.innerHTML = "";

      data.complaints.slice(0, 15).forEach(c => {
        const item = document.createElement("div");
        item.className = "feed-item";
        item.innerHTML = `
          <span class="feed-time">${c.timestamp.split(" ")[1]}</span>
          <span class="feed-src">[${c.channel}]</span>
          <span class="feed-val">${c.category}:</span>
          <span>${c.report_text.substring(0, 75)}...</span>
        `;
        container.appendChild(item);
      });
    })
    .catch(err => console.error("Error loading complaints:", err));
}
