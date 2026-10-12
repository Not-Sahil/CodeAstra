import React, { useState } from 'react';
import { 
  Zap, AlertTriangle, ArrowRight, ShieldCheck, 
  Layers, RefreshCw, CheckCircle2, ChevronDown, Radio, ExternalLink
} from 'lucide-react';

export default function SecondIncidentView({
  setSelectedIncidentId,
  setIsSecondIncidentTriggered,
  onNavigate
}) {
  const [selectedIncidentKey, setSelectedIncidentKey] = useState('MITHCHOWKI');
  const [activeTabKey, setActiveTabKey] = useState('SEQUENCE');

  const INCIDENTS_DATA = {
    MITHCHOWKI: {
      title: 'Mithchowki 4-Way Junction: BEST Power Substation Trip & Signal Blackout',
      location: 'New Link Road / Marve Road Cross, Kandivali-Malad West',
      severity: 'Level 3 Disruption',
      summary: 'Underground trench water seepage caused a 33kV distribution feeder breaker trip, shutting down all automated 4-way traffic signals and triggering vehicular gridlock.',
      events: [
        { time: '08:14 AM', title: 'Electrical SCADA Trip', desc: 'BEST distribution feeder cable arc following trench water ingress.' },
        { time: '08:16 AM', title: 'Traffic Signals Blanked', desc: 'Mithchowki 4-way junction automated controllers lose supply.' },
        { time: '08:18 AM', title: 'Vehicular Gridlock', desc: 'Speed radar records Link Road velocity collapse to 4.1 km/h.' },
        { time: '08:21 AM', title: '112 CAD Citizen Log', desc: 'Emergency dispatch call logged by stranded commuter at junction.' }
      ],
      corridorImpact: '12 BEST feeder bus routes diverted; SV Road spillover congestion +25m delay',
      parityNote: 'Proves the exact same causal pipeline, spatial clustering, and multimodal rerouting works for electrical & signal failures as for monsoon floods.'
    },
    PATHANWADI: {
      title: 'WEH Pathanwadi Flyover: Multi-Vehicle Pileup & Tanker Spill',
      location: 'Western Express Highway, Goregaon East Flyover Ramp',
      severity: 'Level 4 Critical Blockage',
      summary: 'Heavy diesel tanker hydroplaned on flyover descent, blocking 3 southbound lanes and causing a multi-vehicle pileup.',
      events: [
        { time: '08:06 AM', title: 'Doppler Speed Anomaly', desc: 'Flyover speed dropped abruptly from 58 km/h to 0 km/h.' },
        { time: '08:08 AM', title: 'CCTV Anomaly Detection', desc: 'Automated video analytics flagged stationary truck jackknife.' },
        { time: '08:11 AM', title: 'Emergency Response Dispatched', desc: 'Mumbai Traffic Police towing cranes & fire tenders mobilized.' },
        { time: '08:15 AM', title: 'Highway Diversion Advisory', desc: 'Southbound traffic routed onto SV Road & Link Road.' }
      ],
      corridorImpact: 'Southbound Western Express Highway halted; 4.8 km queue back to Kandivali',
      parityNote: 'Demonstrates physical sensor speed telemetry combined with video detection triggering dynamic re-routing.'
    }
  };

  const currentInc = INCIDENTS_DATA[selectedIncidentKey] || INCIDENTS_DATA.MITHCHOWKI;

  const handleLoadIncident = () => {
    if (selectedIncidentKey === 'MITHCHOWKI') {
      setSelectedIncidentId('INC_MUM_20260715_03');
    } else {
      setSelectedIncidentId('INC_MUM_20260715_02');
    }
    if (setIsSecondIncidentTriggered) setIsSecondIncidentTriggered(true);
    if (onNavigate) onNavigate('map');
  };

  return (
    <div className="second-incident-layout minimal-layout">
      {/* 1. SECTION PAGE HEADER WITH SELECTOR DROPDOWN */}
      <div className="section-page-header">
        <div className="sph-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="screen-num-pill">05</span>
            <h2>Second Incident Showcase — Cross-Domain Fault Correlation</h2>
          </div>
          <p>Demonstrates that the same intelligence engine correlates non-flooding utility and traffic incidents.</p>
        </div>

        {/* DROPDOWN SELECTOR */}
        <div className="dropdown-menu-container">
          <label className="dropdown-inline-label">Select Incident Case:</label>
          <select 
            className="minimal-select"
            value={selectedIncidentKey}
            onChange={(e) => setSelectedIncidentKey(e.target.value)}
          >
            <option value="MITHCHOWKI">Mithchowki: Substation Trip & Signal Blackout</option>
            <option value="PATHANWADI">Pathanwadi: WEH Flyover Multi-Vehicle Collision</option>
          </select>
        </div>
      </div>

      {/* 2. MINIMAL INCIDENT OVERVIEW CARD */}
      <div className="si-overview-card minimal-card">
        <div className="sic-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} className="text-amber" />
            <div>
              <h3>{currentInc.title}</h3>
              <span className="sic-loc-tag">{currentInc.location}</span>
            </div>
          </div>
          <span className="sic-severity-pill">{currentInc.severity}</span>
        </div>

        <p className="sic-summary-text">{currentInc.summary}</p>

        {/* 3. MINIMAL TAB SWITCHER (SEQUENCE / CORRIDOR / ENGINE PARITY) */}
        <div className="sic-tabs-strip">
          <button 
            className={`sic-tab-btn ${activeTabKey === 'SEQUENCE' ? 'active' : ''}`}
            onClick={() => setActiveTabKey('SEQUENCE')}
          >
            Chronological Evidence Sequence
          </button>
          <button 
            className={`sic-tab-btn ${activeTabKey === 'IMPACT' ? 'active' : ''}`}
            onClick={() => setActiveTabKey('IMPACT')}
          >
            Transit Corridor Ripples
          </button>
          <button 
            className={`sic-tab-btn ${activeTabKey === 'PARITY' ? 'active' : ''}`}
            onClick={() => setActiveTabKey('PARITY')}
          >
            Engine Schema Parity
          </button>
        </div>

        {/* TAB 1: SEQUENCE */}
        {activeTabKey === 'SEQUENCE' && (
          <div className="sic-events-quad">
            {currentInc.events.map((ev, i) => (
              <div key={i} className="sic-box">
                <div className="sic-box-top">
                  <span className="sic-step-num">{i + 1}</span>
                  <span className="sic-box-time">{ev.time}</span>
                </div>
                <strong>{ev.title}</strong>
                <p>{ev.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: CORRIDOR IMPACT */}
        {activeTabKey === 'IMPACT' && (
          <div className="sic-impact-panel">
            <div className="sip-highlight">
              <AlertTriangle size={18} className="text-amber" />
              <div>
                <strong>Corridor Impact Summary:</strong>
                <p>{currentInc.corridorImpact}</p>
              </div>
            </div>
            <div className="sip-reroute-notice">
              <CheckCircle2 size={16} className="text-emerald" />
              <span>Smart Reroute Engine automatically diverted commuter passes to Link Road corridor.</span>
            </div>
          </div>
        )}

        {/* TAB 3: ENGINE PARITY */}
        {activeTabKey === 'PARITY' && (
          <div className="sic-parity-panel">
            <ShieldCheck size={20} className="text-emerald" />
            <div>
              <strong>Single Generalizable AI Architecture:</strong>
              <p>{currentInc.parityNote}</p>
            </div>
          </div>
        )}

        {/* ACTION BUTTON */}
        <div className="sic-action-footer">
          <button 
            className="sic-trigger-btn"
            onClick={handleLoadIncident}
          >
            <Zap size={14} />
            <span>Load & Inspect This Incident on Tactical Map</span>
          </button>
          <span className="sic-note">
            Reuses the exact same event schema, confidence ledger, and multimodal rerouting logic!
          </span>
        </div>
      </div>
    </div>
  );
}
