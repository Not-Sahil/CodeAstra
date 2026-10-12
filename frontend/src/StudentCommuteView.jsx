import React, { useState } from 'react';
import { 
  Navigation, Bike, Train, Bus, AlertTriangle, AlertOctagon, 
  CheckCircle2, Compass, ArrowRight, Clock, MapPin, Sparkles, 
  ExternalLink, ShieldCheck, RefreshCw, User, Calendar, 
  ChevronRight, Zap, Eye, Check, Layers, Radio, ShieldAlert
} from 'lucide-react';

export default function StudentCommuteView({
  customCommuteResult,
  commuteOrigin,
  setCommuteOrigin,
  commuteDestination,
  setCommuteDestination,
  commuteMode,
  setCommuteMode,
  commuterName,
  setCommuterName,
  isEvaluating,
  evaluateUserCommute,
  availableLocations = [],
  onNavigateToMap,
  onNavigateToRadar,
  currentUser,
  showCompareModal,
  setShowCompareModal
}) {
  const [selectedModeKey, setSelectedModeKey] = useState('METRO');
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Quick One-Click Mumbai Student Routes
  const STUDENT_PRESETS = [
    {
      label: '🎓 Student 001 Hero Route: Ashokvan ➔ RGIT Versova',
      origin: 'Ashokvan (Borivali East)',
      dest: 'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
      mode: 'MOTORCYCLE',
      college: 'Rajiv Gandhi Institute of Technology (RGIT)',
      event: 'Data Structures & Algorithms Exam (09:00 AM)'
    },
    {
      label: '🏛️ Kandivali ➔ Mithibai College (Vile Parle)',
      origin: 'Kandivali Railway Station',
      dest: 'Mithibai College (Vile Parle West)',
      mode: 'TRAIN',
      college: 'Mithibai College of Arts & Commerce',
      event: 'Economics Lecture (08:30 AM)'
    },
    {
      label: '🔬 Borivali ➔ VJTI Engineering (Matunga)',
      origin: 'Borivali Railway Station',
      dest: 'Dadar Railway Station',
      mode: 'TRAIN',
      college: 'Veermata Jijabai Technological Institute (VJTI)',
      event: 'Fluid Mechanics Laboratory (09:15 AM)'
    },
    {
      label: '⚙️ Malad ➔ IIT Bombay (Powai via JVLR)',
      origin: 'Malad Subway',
      dest: 'Powai (IIT Bombay)',
      mode: 'BUS',
      college: 'Indian Institute of Technology Bombay',
      event: 'Robotics Seminar (10:00 AM)'
    }
  ];

  const handleApplyPreset = (preset, idx) => {
    setActivePresetIndex(idx);
    setCommuteOrigin(preset.origin);
    setCommuteDestination(preset.dest);
    setCommuteMode(preset.mode);
    evaluateUserCommute(preset.origin, preset.dest, preset.mode, commuterName);
  };

  // Turn-by-Turn Rerouting Step-by-Step Itinerary
  const recommendedSteps = [
    {
      step: 1,
      title: 'Depart Home Origin (Ashokvan, Borivali East)',
      instruction: 'Start journey at 08:00 AM. Avoid low-lying Western Railway subway approaches on SV Road.',
      time: '08:00 AM',
      modeIcon: 'Walk / Ride',
      status: 'NORMAL_FLOW',
      distance: '1.2 km'
    },
    {
      step: 2,
      title: 'Divert from Flooded Malad Subway',
      instruction: 'BMC Ultrasonic Depth Gauge reports 68cm flood water. Turn right at Link Road junction towards Metro viaduct ramp.',
      time: '08:12 AM',
      modeIcon: 'Alert Evasion',
      status: 'HAZARD_BYPASSED',
      distance: '600 m'
    },
    {
      step: 3,
      title: 'Board Metro Line 2A at Lower Malad Station',
      instruction: 'Enter elevated concourse (Platform 2, Southbound). Metro viaduct is 14 meters elevated, completely immune to track waterlogging.',
      time: '08:18 AM',
      modeIcon: 'Metro Line 2A',
      status: 'ON_SCHEDULE',
      distance: '7.8 km'
    },
    {
      step: 4,
      title: 'De-board at D.N. Nagar Interchange',
      instruction: 'Arrive at D.N. Nagar Metro station smoothly without encountering traffic jams on Western Express Highway.',
      time: '08:32 AM',
      modeIcon: 'Metro Transit',
      status: 'ON_SCHEDULE',
      distance: 'Station Exit'
    },
    {
      step: 5,
      title: 'Arrive at RGIT Engineering Campus (Versova)',
      instruction: 'Short 4-minute walk / EV shuttle to RGIT main gate. You arrive at 08:38 AM, 22 minutes before your 09:00 AM class!',
      time: '08:38 AM',
      modeIcon: 'Campus Gate',
      status: 'SAFE_ARRIVAL',
      distance: '450 m'
    }
  ];

  // Real-time Sensor Telemetry along the student's route
  const sensorReadings = [
    {
      name: 'BMC Ultrasonic Water Depth Gauge',
      location: 'Malad Subway Invert',
      reading: '68.0 cm Standing Water',
      status: 'CRITICAL HAZARD',
      statusClass: 'crit',
      note: 'Impassable for bikes & buses'
    },
    {
      name: 'Western Railway Track Circuit TC-284',
      location: 'Malad-Kandivali KM 28/4',
      reading: '145 mm Submerged Tracks',
      status: 'TRAINS HALTED',
      statusClass: 'crit',
      note: 'Slow suburban line halted'
    },
    {
      name: 'Traffic Police Doppler Speed Radar',
      location: 'WEH Pathanwadi Flyover',
      reading: '7.2 km/h Gridlock Speed',
      status: 'SEVERE CONGESTION',
      statusClass: 'warn',
      note: 'Multi-vehicle accident delay'
    },
    {
      name: 'Mumbai Metro Line 2A SCADA Feed',
      location: 'Elevated Viaduct Corridor',
      reading: '14m Elevated • Zero Water Ingress',
      status: '100% OPERATIONAL',
      statusClass: 'good',
      note: '4.5 min headway frequency'
    }
  ];

  return (
    <div className="student-commute-page-container">
      {/* 1. OFFICIAL SCREEN HEADER (EXACT SCREENSHOT STYLE) */}
      <div className="section-page-header">
        <div className="sph-left">
          <h2>04 Student Commute Assistant</h2>
          <p>Evaluates how active incidents intersect your journey and recommends resilient multimodal reroutes.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="simulated-data-tag">SIMULATED DATA</span>
          <button className="link-action-btn" onClick={onNavigateToMap}>
            <Layers size={13} /> View on Map
          </button>
        </div>
      </div>

      {/* 2. STUDENT HERO IDENTITY & CLASS ATTENDANCE CARD */}
      <div className="student-profile-banner">
        <div className="spb-left">
          <div className="spb-avatar">🎓</div>
          <div className="spb-info">
            <div className="spb-name-row">
              <h3>{currentUser?.full_name || commuterName}</h3>
              <span className="student-tag">STUDENT PASS #MUM-ENG-2026-001</span>
              <span className="institution-tag">RGIT Versova Campus</span>
            </div>
            <p className="spb-meta">
              <strong>Department:</strong> B.Tech Computer Engineering • <strong>Semester:</strong> VII • <strong>Home:</strong> Ashokvan (Borivali East)
            </p>
          </div>
        </div>

        <div className="spb-schedule-box">
          <div className="ssb-top">
            <Calendar size={13} className="text-blue" />
            <span className="ssb-title">Today's Academic Priority</span>
          </div>
          <strong className="ssb-event">Data Structures & Algorithms (09:00 AM)</strong>
          <div className="ssb-status-pill on-time">
            <CheckCircle2 size={12} />
            <span>On Track to Arrive by 08:38 AM (22m Buffer via Metro 2A)</span>
          </div>
        </div>
      </div>

      {/* 3. ONE-CLICK PRESET STUDENT JOURNEYS */}
      <div className="commute-presets-strip">
        <span className="cps-label">Quick Student Routes:</span>
        <div className="cps-buttons">
          {STUDENT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              className={`cps-btn ${activePresetIndex === idx ? 'active' : ''}`}
              onClick={() => handleApplyPreset(p, idx)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. ROUTE INPUTS BAR (MATCHING REFERENCE IMAGE PANEL 4) */}
      <div className="commute-inputs-card">
        <div className="input-group">
          <span className="input-label">Origin Location</span>
          <input 
            className="input-select"
            value={commuteOrigin}
            onChange={e => setCommuteOrigin(e.target.value)}
            list="commute-mumbai-locations"
            placeholder="e.g. Ashokvan (Borivali East)"
          />
        </div>

        <div className="input-group">
          <span className="input-label">Destination (Any Mumbai Station/Locality)</span>
          <input 
            className="input-select"
            value={commuteDestination}
            onChange={e => setCommuteDestination(e.target.value)}
            list="commute-mumbai-locations"
            placeholder="e.g. Rajiv Gandhi Institute of Technology"
          />
        </div>

        <div className="input-group">
          <span className="input-label">Preferred Travel Mode</span>
          <select 
            className="input-select"
            value={commuteMode}
            onChange={e => setCommuteMode(e.target.value)}
          >
            <option value="MOTORCYCLE">Motorcycle / Personal Vehicle</option>
            <option value="TRAIN">Western Railway Suburban Local</option>
            <option value="METRO">Metro Line 2A (Elevated Viaduct)</option>
            <option value="BUS">BEST Bus Transit</option>
          </select>
        </div>

        <button 
          className="evaluate-btn"
          onClick={() => evaluateUserCommute(commuteOrigin, commuteDestination, commuteMode, commuterName)}
          disabled={isEvaluating}
        >
          {isEvaluating ? (
            <>
              <RefreshCw size={14} className="spin" />
              <span>Evaluating...</span>
            </>
          ) : (
            <>
              <Compass size={14} />
              <span>Evaluate Route</span>
            </>
          )}
        </button>

        <datalist id="commute-mumbai-locations">
          {availableLocations.map((loc, i) => (
            <option key={i} value={loc} />
          ))}
        </datalist>
      </div>

      {/* 5. NEARBY HAZARDS ALERT STRIP (AMBER STRIP IN SCREENSHOT) */}
      <div className="nearby-hazards-alert-bar">
        <AlertTriangle size={16} className="nha-icon" />
        <div>
          <strong>Nearby Hazards Alert (Within 3.5 km of {commuteOrigin.split(' ')[0]}): </strong>
          <span>Severe Track Submergence at Malad-Kandivali section • Multi-Vehicle Collision on WEH Pathanwadi Flyover • BEST Power Trip at Mithchowki Junction</span>
        </div>
      </div>

      {/* 6. BIG RED ROUTE IMPACT ALERT CARD (EXACT MATCH TO PANEL 4) */}
      <div className="route-impact-alert-card">
        <div className="ria-top">
          <AlertOctagon size={22} color="#b91c1c" />
          <div>
            <h3>Your route may be affected by active incidents</h3>
            <span style={{ fontSize: '11px', color: '#7f1d1d' }}>Correlated 4 physical sensor anomalies intersecting your travel corridor.</span>
          </div>
        </div>

        <div className="ria-details-grid">
          <div className="ria-col">
            <span className="ria-col-label">Detected Incident:</span>
            <span className="ria-col-val" style={{ color: '#dc2626' }}>
              {customCommuteResult?.personalized_alert?.incident || 'Possible flooding-related road disruption'}
            </span>
          </div>
          <div className="ria-col">
            <span className="ria-col-label">Affected Corridor:</span>
            <span className="ria-col-val">
              {customCommuteResult?.personalized_alert?.affected_area || 'Western Railway Slow & Fast Tracks, Malad Subway, SV Road'}
            </span>
          </div>
          <div className="ria-col">
            <span className="ria-col-label">Potential Impact:</span>
            <span className="ria-col-val" style={{ color: '#d97706' }}>
              {customCommuteResult?.personalized_alert?.potential_impact || 'Your motorcycle route may experience delays of approximately 20-35 minutes.'}
            </span>
          </div>
        </div>

        <div className="ria-advice-row">
          <div>
            <strong>What UrbanPulse Recommends:</strong>
            <ul style={{ paddingLeft: '16px', marginTop: '6px', lineHeight: '1.6' }}>
              <li>Switch immediately to elevated <strong>Metro Line 2A</strong> viaduct at Lower Malad Station.</li>
              <li>Avoid low-lying SV Road subways (Malad Subway is impassable with 68cm standing water).</li>
              <li>Check Western Railway local train status before selecting rail transit (track TC-284 submerged).</li>
              <li>Save <strong>~17 to 29 minutes</strong> and arrive safely before your 09:00 AM lecture.</li>
            </ul>
          </div>
          <div className="ria-why-box">
            <strong>Why you received this alert:</strong>
            <p style={{ marginTop: '6px' }}>
              The reported incident overlaps your saved daily college commute. Active physical Doppler rain gauges, ultrasonic depth sensors, and traffic slowdowns confirm critical water accumulation on your default route.
            </p>
          </div>
        </div>
      </div>

      {/* 7. LIVE SENSOR TELEMETRY STRIP (TRANSPARENCY & EVIDENCE) */}
      <div className="corridor-sensor-strip-card">
        <div className="cssc-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Radio size={16} className="text-blue" />
            <h4>Real-Time Sensor Telemetry Intersecting Student Corridor</h4>
          </div>
          <span className="header-sub-tag">Automated Ground Truth</span>
        </div>

        <div className="sensor-telemetry-grid">
          {sensorReadings.map((s, idx) => (
            <div key={idx} className={`sensor-telemetry-tile ${s.statusClass}`}>
              <div className="stt-top">
                <span className="stt-name">{s.name}</span>
                <span className={`stt-badge ${s.statusClass}`}>{s.status}</span>
              </div>
              <strong className="stt-reading">{s.reading}</strong>
              <div className="stt-footer">
                <span className="stt-loc"><MapPin size={11} /> {s.location}</span>
                <span className="stt-note">{s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. MULTIMODAL TRAVEL OPTIONS COMPARISON (4 CARDS ROW MATCHING PANEL 4) */}
      <div className="multimodal-comparison-section">
        <div className="mcs-header-strip">
          <div>
            <h3>Multimodal Travel Options Comparison</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Algorithmically ranked across travel time, flood exposure, and transit reliability.</p>
          </div>
          <button className="compare-options-btn" onClick={() => setShowCompareModal(true)}>
            <Sparkles size={13} /> Compare My Options Breakdown
          </button>
        </div>

        <div className="travel-options-row">
          {/* 1. MOTORCYCLE */}
          <div 
            className={`travel-option-card ${selectedModeKey === 'MOTORCYCLE' ? 'selected' : ''}`}
            onClick={() => setSelectedModeKey('MOTORCYCLE')}
          >
            <div className="toc-top">
              <span className="toc-mode"><Bike size={15} /> Motorcycle</span>
              <span className="risk-tag high">High Risk</span>
            </div>
            <div>
              <span className="toc-time">59 mins</span>
              <span className="toc-delay">+35m delay</span>
            </div>
            <span className="toc-desc">
              High road-disruption exposure. SV Road & Malad subway corridor experiencing severe surface water accumulation (68cm) and engine stalling hazards.
            </span>
            <div className="toc-status-row">
              <span className="toc-cost">Est. Fuel: ₹45</span>
              <span className="toc-risk text-rose">Missing Class Risk: High</span>
            </div>
          </div>

          {/* 2. WESTERN RAILWAY */}
          <div 
            className={`travel-option-card ${selectedModeKey === 'TRAIN' ? 'selected' : ''}`}
            onClick={() => setSelectedModeKey('TRAIN')}
          >
            <div className="toc-top">
              <span className="toc-mode"><Train size={15} /> Western Railway</span>
              <span className="risk-tag high">Track Inundation</span>
            </div>
            <div>
              <span className="toc-time">62 mins</span>
              <span className="toc-delay">+40m delay</span>
            </div>
            <span className="toc-desc">
              High / Track Submergence. Track circuit TC-284 tripped due to 145mm waterlogging at Malad KM 28/4. Churchgate-bound local trains running with severe delays.
            </span>
            <div className="toc-status-row">
              <span className="toc-cost">Fare: ₹10 (Student Pass)</span>
              <span className="toc-risk text-rose">Missing Class Risk: Severe</span>
            </div>
          </div>

          {/* 3. METRO LINE 2A (RECOMMENDED) */}
          <div 
            className={`travel-option-card recommended ${selectedModeKey === 'METRO' ? 'selected' : ''}`}
            onClick={() => setSelectedModeKey('METRO')}
          >
            <div className="toc-top">
              <span className="toc-mode"><Train size={15} /> Metro Line 2A</span>
              <span className="toc-rec-badge">⭐ Recommended Reroute</span>
            </div>
            <div>
              <span className="toc-time text-green">21 mins</span>
              <span className="toc-delay ontime">On schedule (Saves ~17-41m)</span>
            </div>
            <span className="toc-desc">
              Low exposure (simulation). Grade-separated elevated viaduct 14 meters above street level has zero surface water ingress. Continuous 4.5 min frequency.
            </span>
            <div className="toc-status-row">
              <span className="toc-cost">Student Fare: ₹20</span>
              <span className="toc-risk text-green">Arrival at 08:38 AM (Guaranteed)</span>
            </div>
          </div>

          {/* 4. BEST BUS */}
          <div 
            className={`travel-option-card ${selectedModeKey === 'BUS' ? 'selected' : ''}`}
            onClick={() => setSelectedModeKey('BUS')}
          >
            <div className="toc-top">
              <span className="toc-mode"><Bus size={15} /> BEST Bus Transit</span>
              <span className="risk-tag warn">Diverted Route</span>
            </div>
            <div>
              <span className="toc-time">62 mins</span>
              <span className="toc-delay">+29m delay</span>
            </div>
            <span className="toc-desc">
              High road-congestion exposure. BEST feeder routes 202 and 249 diverted around flooded underpasses. Heavy congestion along Western Express Highway.
            </span>
            <div className="toc-status-row">
              <span className="toc-cost">Fare: ₹15</span>
              <span className="toc-risk text-amber">Missing Class Risk: Moderate</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9. VISUAL CORRIDOR WAYPOINTS & STEP-BY-STEP REROUTING GUIDE */}
      <div className="rerouting-journey-card">
        <div className="rjc-header">
          <div>
            <h3>Step-by-Step Evasive Rerouting Plan for {commuterName}</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Guaranteed flood bypass route via Metro Line 2A elevated viaduct to RGIT Versova.</p>
          </div>
          <div className="rjc-badge-time">
            <Clock size={13} />
            <span>Total Journey Time: <strong>21 Mins</strong> (Saves 41 Mins over Traffic)</span>
          </div>
        </div>

        <div className="journey-steps-timeline">
          {recommendedSteps.map(step => (
            <div key={step.step} className="journey-step-item">
              <div className="jsi-left">
                <div className={`jsi-step-circle ${step.status === 'HAZARD_BYPASSED' ? 'warning' : (step.status === 'SAFE_ARRIVAL' ? 'finish' : '')}`}>
                  {step.step}
                </div>
                {step.step < recommendedSteps.length && <div className="jsi-step-line"></div>}
              </div>

              <div className="jsi-content">
                <div className="jsi-top">
                  <strong className="jsi-title">{step.title}</strong>
                  <div className="jsi-badges">
                    <span className="jsi-time">{step.time}</span>
                    <span className="jsi-dist">{step.distance}</span>
                  </div>
                </div>
                <p className="jsi-instruction">{step.instruction}</p>
                <div className="jsi-footer">
                  <span className="jsi-mode-pill">{step.modeIcon}</span>
                  {step.status === 'HAZARD_BYPASSED' && (
                    <span className="hazard-bypass-badge">
                      <ShieldCheck size={12} /> Bypassed 68cm Submerged Underpass
                    </span>
                  )}
                  {step.status === 'SAFE_ARRIVAL' && (
                    <span className="safe-arrival-badge">
                      <CheckCircle2 size={12} /> On-Time Exam Arrival
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
