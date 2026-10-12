import React, { useState } from 'react';
import { 
  GitBranch, Info, Filter, RefreshCw, ZoomIn, 
  ChevronDown, Layers, CheckCircle2, AlertTriangle, HelpCircle
} from 'lucide-react';

export default function UrbanRippleGraphView({
  graphContainerRef,
  renderIncidentGraph,
  selectedIncidentId = 'INC_MUM_20260715_01',
  onNavigate
}) {
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [showArchNote, setShowArchNote] = useState(false);

  // Entities present in the graph for quick dropdown inspection
  const ENTITY_DETAILS = {
    ALL: {
      title: 'Citywide Multi-Modal Causal Network',
      type: 'Overview',
      color: '#0284c7',
      desc: 'Visualizing how physical rainfall measurements ripple into transit corridor delays, road blockages, and suburban rail slowdowns across Western Mumbai.',
      impact: 'Cross-Corridor Multi-Modal Impact'
    },
    'WR_TRACK': {
      title: 'Western Railway Track Circuit TC-284',
      type: 'Observed Telemetry',
      color: '#3a86ff',
      desc: 'Submerged track circuit at Malad-Kandivali KM 28/4 reported 145mm standing water. Linked to broader monsoon weather episode, but deliberately unmerged from road flooding.',
      impact: 'Churchgate slow lines halted; 40 min suburban rail delays'
    },
    'MALAD_SUB': {
      title: 'BMC Ultrasonic Depth Gauge (Malad Subway)',
      type: 'Observed Telemetry',
      color: '#3a86ff',
      desc: 'Ultrasonic depth gauge recorded 68cm water accumulation at subway invert. Triggered road closure alert.',
      impact: 'SV Road underpass completely impassable for two-wheelers & buses'
    },
    'METRO_2A': {
      title: 'Mumbai Metro Line 2A Elevated Viaduct',
      type: 'Potential Consequence / Alternative',
      color: '#10b981',
      desc: 'Grade-separated elevated viaduct 14m above ground level operates unaffected with zero water ingress.',
      impact: 'Recommended evasive diversion; saves 41 minutes over highway routes'
    },
    'WEH_FLY': {
      title: 'WEH Pathanwadi Doppler Speed Radar',
      type: 'Correlated Anomaly',
      color: '#f4a261',
      desc: 'Radar captured vehicle speed drop to 7.2 km/h due to secondary diversion traffic from submerged subways.',
      impact: 'Severe gridlock on Western Express Highway southbound'
    }
  };

  const currentInfo = ENTITY_DETAILS[selectedEntity] || ENTITY_DETAILS.ALL;

  return (
    <div className="graph-tab-layout minimal-layout">
      {/* 1. MINIMAL SECTION HEADER WITH FILTER DROPDOWN */}
      <div className="section-page-header">
        <div className="sph-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="screen-num-pill">02</span>
            <h2>Urban Ripple Graph — Causal Evidence Reconstruction</h2>
          </div>
          <p>Maps Observed Events, Correlated Telemetry, Hypotheses, and Disruption Ripple Effects.</p>
        </div>

        {/* MINIMAL CONTROLS STRIP */}
        <div className="graph-controls-strip">
          {/* ENTITY INSPECTOR DROPDOWN */}
          <div className="dropdown-menu-container">
            <label className="dropdown-inline-label">Inspect Entity:</label>
            <select 
              className="minimal-select"
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
            >
              <option value="ALL">All Network Nodes (Overview)</option>
              <option value="WR_TRACK">Western Railway Track TC-284</option>
              <option value="MALAD_SUB">BMC Malad Subway Depth Gauge</option>
              <option value="METRO_2A">Metro Line 2A Viaduct (Resilient)</option>
              <option value="WEH_FLY">WEH Pathanwadi Speed Radar</option>
            </select>
          </div>

          {/* RE-RENDER GRAPH BUTTON */}
          <button 
            className="toolbar-pill-btn"
            onClick={() => renderIncidentGraph && renderIncidentGraph(selectedIncidentId)}
            title="Re-layout network physics"
          >
            <RefreshCw size={12} />
            <span>Re-center Layout</span>
          </button>

          {/* ARCHITECTURE NOTE ACCORDION TOGGLE */}
          <button 
            className={`toolbar-pill-btn ${showArchNote ? 'active' : ''}`}
            onClick={() => setShowArchNote(!showArchNote)}
          >
            <Info size={12} />
            <span>Judge Notes</span>
          </button>
        </div>
      </div>

      {/* 2. MINIMAL LEGEND PILL STRIP */}
      <div className="graph-legend-strip">
        <span className="legend-chip"><span className="legend-dot" style={{ background: '#3a86ff' }}></span> Observed Event</span>
        <span className="legend-chip"><span className="legend-dot" style={{ background: '#f4a261' }}></span> Correlated Telemetry</span>
        <span className="legend-chip"><span className="legend-dot" style={{ background: '#e63946' }}></span> Supported Hypothesis</span>
        <span className="legend-chip"><span className="legend-dot" style={{ background: '#9b5de5' }}></span> Potential Consequence</span>
        <span className="legend-chip"><span className="legend-dot" style={{ background: '#10b981' }}></span> Resilient Alternative</span>
      </div>

      {/* 3. SELECTED ENTITY DETAIL DRAWER / HIGHLIGHT CARD */}
      <div className="entity-highlight-card">
        <div className="ehc-top">
          <div className="ehc-badge" style={{ backgroundColor: `${currentInfo.color}15`, color: currentInfo.color, borderColor: currentInfo.color }}>
            {currentInfo.type}
          </div>
          <h4>{currentInfo.title}</h4>
        </div>
        <p className="ehc-desc">{currentInfo.desc}</p>
        <div className="ehc-footer">
          <span className="ehc-impact-label">Corridor Ripple Impact:</span>
          <span className="ehc-impact-val">{currentInfo.impact}</span>
        </div>
      </div>

      {/* 4. MAIN VIS-NETWORK CANVAS CONTAINER */}
      <div className="graph-container-card minimal-graph">
        <div ref={graphContainerRef} className="vis-network-wrapper"></div>
      </div>

      {/* 5. COLLAPSIBLE ARCHITECTURAL NOTE FOR JUDGES */}
      {showArchNote && (
        <div className="collapsible-note-card">
          <div className="cnc-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} className="text-blue" />
              <strong>Architectural Note for Judges (Causal Separation)</strong>
            </div>
            <button className="cnc-close-btn" onClick={() => setShowArchNote(false)}>×</button>
          </div>
          <p>
            Notice that the Western Railway disruption node is connected to the overarching monsoon weather episode with an explicit causal edge, but is <em>NOT</em> merged into the road flooding incident cluster. UrbanPulse correctly distinguishes causal correlation from entity equivalence, avoiding false positives.
          </p>
        </div>
      )}
    </div>
  );
}
