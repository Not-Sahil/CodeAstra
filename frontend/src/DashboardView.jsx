import React from 'react';
import { 
  ShieldAlert, Activity, AlertTriangle, Layers, Navigation, 
  Radio, GitBranch, RotateCcw, BarChart3, Clock, MapPin, 
  ArrowRight, CheckCircle2, Train, Bike, Bus, Database,
  Compass, ExternalLink, Zap, Eye, AlertOctagon, RefreshCw
} from 'lucide-react';

export default function DashboardView({
  onNavigate,
  incidents = [],
  userLocation,
  activeIncidentsCount = 12,
  highSeverityCount = 8,
  affectedRoutesCount = 5,
  dataQualityWarningsCount = 2,
  currentTime = '20:03:59 IST',
  onSelectIncident
}) {
  return (
    <div className="dashboard-page-container">
      {/* DASHBOARD HEADER */}
      <div className="dashboard-page-header">
        <div>
          <h2>Executive Operations Dashboard</h2>
          <p className="page-sub">Citywide situational awareness, multimodal transit performance, and real-time hazard correlation.</p>
        </div>
        <div className="dph-actions">
          <span className="live-clock-badge">
            <Clock size={13} /> {currentTime}
          </span>
          <button className="primary-dash-btn" onClick={() => onNavigate('map')}>
            <Layers size={14} /> Full Tactical Map
          </button>
        </div>
      </div>

      {/* TOP INDICATORS QUAD (EXACT SCREENSHOT STYLE) */}
      <section className="indicators-quad-strip">
        <div className="indicator-quad-box" onClick={() => onNavigate('map')}>
          <span className="iq-label">Active Incidents</span>
          <div className="iq-val-row">
            <span className="iq-num text-blue">{activeIncidentsCount}</span>
            <span className="iq-pill text-blue">Citywide Mumbai</span>
          </div>
          <span className="iq-sub">Monitored across 7 multimodal grids</span>
        </div>

        <div className="indicator-quad-box" onClick={() => onNavigate('map')}>
          <span className="iq-label">High-Severity Incidents</span>
          <div className="iq-val-row">
            <span className="iq-num text-rose">{highSeverityCount}</span>
            <span className="iq-pill text-rose">Level 3 & 4 Disruptions</span>
          </div>
          <span className="iq-sub">Malad track inundation, JVLR blockage</span>
        </div>

        <div className="indicator-quad-box" onClick={() => onNavigate('commute')}>
          <span className="iq-label">Affected Routes</span>
          <div className="iq-val-row">
            <span className="iq-num text-amber">{affectedRoutesCount}</span>
            <span className="iq-pill text-amber">Major Corridors</span>
          </div>
          <span className="iq-sub">SV Road, WEH, WR suburban line, JVLR</span>
        </div>

        <div className="indicator-quad-box" onClick={() => onNavigate('replay')}>
          <span className="iq-label">Data Quality Warnings</span>
          <div className="iq-val-row">
            <span className="iq-num text-purple">{dataQualityWarningsCount}</span>
            <span className="iq-pill text-purple">Signal Resilience Active</span>
          </div>
          <span className="iq-sub">Duplicates suppressed, sensor buffered</span>
        </div>
      </section>

      {/* DASHBOARD TWO-COLUMN GRID */}
      <div className="dashboard-grid-layout">
        {/* LEFT COLUMN: ACTIVE INCIDENTS OVERVIEW TABLE & TRANSIT GAUGES */}
        <div className="dashboard-main-col">
          {/* MULTIMODAL NETWORK HEALTH GAUGES */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dch-title">
                <Activity size={17} className="text-blue" />
                <h3>Multimodal Transit Corridor Health</h3>
              </div>
              <span className="header-sub-tag">Automated Sensor Fusion</span>
            </div>

            <div className="transit-health-bars">
              <div className="th-item">
                <div className="th-top">
                  <span className="th-mode"><Train size={14} /> Western Railway (Churchgate - Virar)</span>
                  <span className="th-status text-rose">42% Capacity • Severe Track Waterlogging</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill rose" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div className="th-item">
                <div className="th-top">
                  <span className="th-mode"><Train size={14} /> Metro Line 2A & 7 (Elevated Viaducts)</span>
                  <span className="th-status text-green">100% Operational • Zero Surface Ingress</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="th-item">
                <div className="th-top">
                  <span className="th-mode"><Bike size={14} /> Western Express Highway (WEH Southbound)</span>
                  <span className="th-status text-amber">65% Flow • Pathanwadi Accident Congestion</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill amber" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="th-item">
                <div className="th-top">
                  <span className="th-mode"><Bus size={14} /> SV Road Arterial & Local Subways</span>
                  <span className="th-status text-rose">25% Impassable • Malad Subway Closed (68cm)</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill rose" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE INCIDENTS TABLE */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dch-title">
                <ShieldAlert size={17} className="text-rose" />
                <h3>Active Urban Incidents Across Mumbai</h3>
              </div>
              <button className="link-action-btn" onClick={() => onNavigate('map')}>
                View on Map <ArrowRight size={13} />
              </button>
            </div>

            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Incident Title</th>
                    <th>Type</th>
                    <th>Affected Infrastructure</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 6).map((inc, i) => {
                    const isCrit = inc.severity_level?.includes('4');
                    return (
                      <tr key={i}>
                        <td>
                          <span className={`severity-tag ${isCrit ? 'tag-crit' : 'tag-warn'}`}>
                            {inc.severity_level?.replace('_LEVEL_', ' L')}
                          </span>
                        </td>
                        <td>
                          <strong className="inc-table-title">{inc.title}</strong>
                          <span className="inc-table-cause">{inc.known_cause}</span>
                        </td>
                        <td><span className="type-pill">{inc.scenario_type}</span></td>
                        <td className="infra-cell">{inc.affected_infrastructure}</td>
                        <td>
                          <button 
                            className="dash-inspect-btn"
                            onClick={() => {
                              if (onSelectIncident) onSelectIncident(inc.incident_id);
                              onNavigate('map');
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: USER PROXIMITY SNAPSHOT & QUICK ACTION LAUNCHPAD */}
        <div className="dashboard-side-col">
          {/* LIVE USER PROXIMITY SNAPSHOT */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dch-title">
                <Radio size={17} className="text-rose pulse-icon" />
                <h3>Your Live Proximity Snapshot</h3>
              </div>
              <button className="dash-inspect-btn" onClick={() => onNavigate('proximity')}>
                Open Radar
              </button>
            </div>

            <div className="user-proximity-box">
              <div className="upb-top">
                <div className="upb-coord-tag">
                  <MapPin size={13} />
                  <span>{userLocation?.lat?.toFixed(4)}°N, {userLocation?.lon?.toFixed(4)}°E</span>
                </div>
                <span className="upb-hotspot-name">{userLocation?.locationName || 'Malad Subway Inundation Hotspot'}</span>
              </div>

              <div className="upb-alert-alert">
                <AlertTriangle size={16} className="text-rose" />
                <div>
                  <strong>Critical Proximity: 0 meters</strong>
                  <p>You are directly adjacent to Severe Track Submergence at Malad-Kandivali section.</p>
                </div>
              </div>

              <div className="upb-action-row">
                <button className="btn-evade-quick" onClick={() => onNavigate('commute')}>
                  <Navigation size={13} /> Recommended: Take Metro Line 2A
                </button>
              </div>
            </div>
          </div>

          {/* QUICK TOOL LAUNCHPAD */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dch-title">
                <Zap size={17} className="text-amber" />
                <h3>Multimodal Tool Launchpad</h3>
              </div>
            </div>

            <div className="quick-tools-grid">
              <button className="quick-tool-btn" onClick={() => onNavigate('map')}>
                <Layers size={18} className="text-blue" />
                <div>
                  <strong>Citywide Command Map</strong>
                  <small>Full tactical GIS layer & stream</small>
                </div>
              </button>

              <button className="quick-tool-btn" onClick={() => onNavigate('proximity')}>
                <Radio size={18} className="text-rose" />
                <div>
                  <strong>Proximity CRT Radar</strong>
                  <small>Rotating 360° radar sweep & audio alarm</small>
                </div>
              </button>

              <button className="quick-tool-btn" onClick={() => onNavigate('graph')}>
                <GitBranch size={18} className="text-cyan" />
                <div>
                  <strong>Urban Ripple Graph</strong>
                  <small>Causal evidence without rail merging</small>
                </div>
              </button>

              <button className="quick-tool-btn" onClick={() => onNavigate('commute')}>
                <Navigation size={18} className="text-green" />
                <div>
                  <strong>Commuter Assistant</strong>
                  <small>Door-to-door flood resilient routing</small>
                </div>
              </button>

              <button className="quick-tool-btn" onClick={() => onNavigate('replay')}>
                <RotateCcw size={18} className="text-amber" />
                <div>
                  <strong>AI Replay Lab</strong>
                  <small>Inject duplicate reports & sensor drops</small>
                </div>
              </button>

              <button className="quick-tool-btn" onClick={() => onNavigate('eval')}>
                <BarChart3 size={18} className="text-purple" />
                <div>
                  <strong>Evaluation & Evidence</strong>
                  <small>Synthetic benchmarks & test metrics</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
