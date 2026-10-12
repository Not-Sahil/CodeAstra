import React, { useState } from 'react';
import { 
  Layers, Radio, Play, Pause, Target, Settings, Sparkles, 
  ChevronDown, MapPin, AlertTriangle, Eye, ShieldAlert,
  Compass, Filter, Check, Info, X
} from 'lucide-react';

export default function CommandCentreMapView({
  mapContainerRef,
  googleMapContainerRef,
  mapProvider,
  setMapProvider,
  googleApiKey,
  setShowApiKeyModal,
  mapLayers,
  setMapLayers,
  userLocation,
  activeIncidentsCount = 12,
  highSeverityCount = 8,
  affectedRoutesCount = 5,
  dataQualityWarningsCount = 2,
  isStreamPaused,
  setIsStreamPaused,
  simulationTimeline,
  incidents = [],
  selectedIncidentId,
  setSelectedIncidentId,
  onLocateBeacon,
  onNavigate
}) {
  // Minimalist State: Keep UI clean and clutter-free
  const [showStreamDrawer, setShowStreamDrawer] = useState(false);
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);

  // Available Incidents List for quick dropdown selection
  const INCIDENT_OPTIONS = [
    { id: 'INC_MUM_20260715_01', name: 'Malad Subway Inundation & Track Flooding', severity: 'Critical', area: 'Malad West' },
    { id: 'INC_MUM_20260715_02', name: 'WEH Pathanwadi Flyover Collision & Gridlock', severity: 'High', area: 'Goregaon East' },
    { id: 'INC_MUM_20260715_03', name: 'Mithchowki Junction Signal & Power Failure', severity: 'High', area: 'Kandivali West' },
    { id: 'INC_MUM_20260715_04', name: 'JVLR Powai Lake Overflow & Slowdown', severity: 'Medium', area: 'Powai' }
  ];

  const currentIncident = INCIDENT_OPTIONS.find(inc => inc.id === selectedIncidentId) || INCIDENT_OPTIONS[0];

  return (
    <div className="command-map-page-wrapper minimal-layout">
      {/* 1. MINIMAL UNIFIED TOP CONTROL BAR */}
      <div className="map-minimal-header">
        <div className="mmh-left">
          <div className="mmh-title-group">
            <span className="screen-num-pill">01</span>
            <h2>Command Centre & Citywide Tactical Map</h2>
          </div>
          
          {/* INCIDENT SWITCHER DROPDOWN */}
          <div className="incident-dropdown-wrapper">
            <label className="dropdown-inline-label">Active Incident:</label>
            <select 
              className="minimal-select"
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
            >
              {INCIDENT_OPTIONS.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  ⚠️ [{inc.severity}] {inc.name} ({inc.area})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CONTROLS STRIP */}
        <div className="mmh-right">
          {/* MAP ENGINE DROPDOWN */}
          <div className="dropdown-menu-container">
            <select 
              className="minimal-select"
              value={mapProvider}
              onChange={(e) => {
                if (e.target.value === 'google' && !googleApiKey) {
                  setShowApiKeyModal(true);
                } else {
                  setMapProvider(e.target.value);
                }
              }}
            >
              <option value="leaflet">Map: OpenStreetMap (Default)</option>
              <option value="google">Map: Google Maps (Live Traffic)</option>
            </select>
          </div>

          {/* LAYERS DROPDOWN TOGGLE */}
          <div className="relative-container">
            <button 
              className={`toolbar-pill-btn ${showLayersDropdown ? 'active' : ''}`}
              onClick={() => setShowLayersDropdown(!showLayersDropdown)}
            >
              <Layers size={13} />
              <span>Layers</span>
              <ChevronDown size={12} />
            </button>

            {showLayersDropdown && (
              <div className="layers-dropdown-panel" onClick={(e) => e.stopPropagation()}>
                <span className="dropdown-panel-title">Corridor Overlays</span>
                
                <label className="layer-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={mapLayers.railTracks} 
                    onChange={e => setMapLayers(prev => ({ ...prev, railTracks: e.target.checked }))} 
                  />
                  <span className="dot" style={{ background: '#ef4444' }}></span>
                  <span>Western Suburban Railway Tracks</span>
                </label>

                <label className="layer-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={mapLayers.metroViaduct} 
                    onChange={e => setMapLayers(prev => ({ ...prev, metroViaduct: e.target.checked }))} 
                  />
                  <span className="dot" style={{ background: '#10b981' }}></span>
                  <span>Elevated Metro Line 2A Viaduct</span>
                </label>

                <label className="layer-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={mapLayers.evaluatedRoute} 
                    onChange={e => setMapLayers(prev => ({ ...prev, evaluatedRoute: e.target.checked }))} 
                  />
                  <span className="dot" style={{ background: '#06d6a0' }}></span>
                  <span>Student Route Overlay</span>
                </label>

                <label className="layer-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={mapLayers.userScanRadar} 
                    onChange={e => setMapLayers(prev => ({ ...prev, userScanRadar: e.target.checked }))} 
                  />
                  <span className="dot" style={{ background: '#38bdf8' }}></span>
                  <span>User Live GPS Radar Scan</span>
                </label>
              </div>
            )}
          </div>

          {/* LOCATE USER BEACON BUTTON */}
          <button 
            className="toolbar-pill-btn"
            onClick={onLocateBeacon}
            title="Pan map directly to current live user GPS beacon"
          >
            <Target size={13} className="text-blue" />
            <span>Locate User</span>
          </button>

          {/* STREAM DRAWER TOGGLE BUTTON */}
          <button 
            className={`toolbar-pill-btn ${showStreamDrawer ? 'active' : ''}`}
            onClick={() => setShowStreamDrawer(!showStreamDrawer)}
          >
            <Radio size={13} className="pulse-icon text-rose" />
            <span>Telemetry Feed ({simulationTimeline?.events?.length || 5})</span>
          </button>
        </div>
      </div>

      {/* 2. MINIMAL FLOATING KPI BANNER (COMPACT, DOES NOT PUSH MAP DOWN) */}
      <div className="minimal-kpi-bar">
        <div className="mkb-item" onClick={() => onNavigate && onNavigate('dashboard')}>
          <span className="mkb-label">Active Incidents:</span>
          <strong className="mkb-val text-blue">{activeIncidentsCount}</strong>
        </div>
        <div className="mkb-divider"></div>
        <div className="mkb-item">
          <span className="mkb-label">High-Severity:</span>
          <strong className="mkb-val text-rose">{highSeverityCount} Critical</strong>
        </div>
        <div className="mkb-divider"></div>
        <div className="mkb-item">
          <span className="mkb-label">Affected Corridors:</span>
          <strong className="mkb-val text-amber">{affectedRoutesCount} Routes</strong>
        </div>
        <div className="mkb-divider"></div>
        <div className="mkb-item">
          <span className="mkb-label">Resilience Engine:</span>
          <strong className="mkb-val text-emerald">Active • Deduplication OK</strong>
        </div>
      </div>

      {/* 3. HERO FULL-WIDTH MAP CANVAS */}
      <div className="map-view-card full-map-card">
        {mapProvider === 'google' ? (
          <div ref={googleMapContainerRef} className="leaflet-map-wrapper full-height"></div>
        ) : (
          <div ref={mapContainerRef} className="leaflet-map-wrapper full-height"></div>
        )}

        {/* MINIMAL FLOATING MAP LEGEND PILL (BOTTOM LEFT) */}
        <div className="floating-map-legend">
          <span className="legend-chip">
            <span className="legend-dot" style={{ background: '#10b981' }}></span> Clear
          </span>
          <span className="legend-chip">
            <span className="legend-dot" style={{ background: '#f43f5e' }}></span> Flooded / Disrupted
          </span>
          <span className="legend-chip">
            <span className="legend-dot" style={{ background: '#06d6a0' }}></span> Metro Bypass
          </span>
          <span className="legend-chip">
            <span className="legend-dot pulse" style={{ background: '#38bdf8' }}></span> User GPS Beacon
          </span>
        </div>
      </div>

      {/* 4. EXPANDABLE SLIDE-OVER TELEMETRY FEED DRAWER */}
      {showStreamDrawer && (
        <div className="stream-drawer-backdrop" onClick={() => setShowStreamDrawer(false)}>
          <div className="stream-drawer-card" onClick={e => e.stopPropagation()}>
            <div className="sdc-header">
              <div className="sdc-title-row">
                <Radio size={16} className="text-cyan pulse-icon" />
                <h3>Real-Time Event Stream Telemetry</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="pause-toggle-btn"
                  onClick={() => setIsStreamPaused(!isStreamPaused)}
                >
                  {isStreamPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isStreamPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button className="drawer-close-btn" onClick={() => setShowStreamDrawer(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <p className="sdc-subtitle">
              Observations arrive chronologically. System unifies them dynamically into a single correlated incident.
            </p>

            <div className="sdc-assessment-box">
              <div className="callout-badge">
                <Sparkles size={12} /> AI SITUATIONAL CORRELATION
              </div>
              <h4>POSSIBLE FLOODING-RELATED DISRUPTION</h4>
              <p>Correlated 5 signals across timestamps, spatial proximity (Malad corridor), and source credibility.</p>
            </div>

            <div className="sdc-timeline-list">
              {simulationTimeline?.events?.map((ev, idx) => (
                <div key={idx} className="timeline-item-card">
                  <div className="tic-top">
                    <span className="tic-time">{ev.time} ({ev.timestamp})</span>
                    <span className={`tic-tier tier-${ev.evidence_tier.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                      {ev.evidence_tier}
                    </span>
                  </div>
                  <div className="tic-event">{ev.event}</div>
                  <div className="tic-meta">
                    <span>Source: <b>{ev.source}</b></span>
                    <span>Reading: <b>{ev.measured}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
