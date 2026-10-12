import React, { useState } from 'react';
import { 
  RotateCcw, RefreshCw, AlertTriangle, ShieldCheck, 
  ChevronDown, ChevronRight, CheckCircle2, Zap, Database, Eye
} from 'lucide-react';

export default function ReplayLabView({
  replayChallengeActive,
  triggerReplayAction,
  isReplaying,
  ledgerData
}) {
  const [selectedChallengeKey, setSelectedChallengeKey] = useState('INJECT_DUPLICATE');
  const [showSupportingList, setShowSupportingList] = useState(false);
  const [showConflictList, setShowConflictList] = useState(false);

  const CHALLENGE_PRESETS = [
    {
      key: 'INJECT_DUPLICATE',
      title: 'Challenge 1: Inject Duplicate Citizen Report',
      summary: 'Two citizen reports with identical semantic text arrive simultaneously.',
      expected: 'Deduplication module identifies semantic overlap and suppresses redundant feed from inflating severity count.',
      badge: 'NLP Semantic Deduplication'
    },
    {
      key: 'DELAY_EVENT',
      title: 'Challenge 2: Delay Event Arrival (Out-of-Order Stream)',
      summary: 'An 08:03 AM sensor observation arrives with a 9-minute lag at 08:12 AM.',
      expected: 'Event stream buffer reorders observation chronologically without corrupting ongoing incident timeline.',
      badge: 'Temporal Re-sequencing'
    },
    {
      key: 'ADD_CONTRADICTORY',
      title: 'Challenge 3: Add Contradictory Signal (Dry Road Report)',
      summary: 'A nearby optical camera reports dry road conditions in adjacent sector.',
      expected: 'System preserves contradiction instead of discarding it, automatically lowering confidence grade from High to Moderate.',
      badge: 'Contradiction Preservation'
    },
    {
      key: 'DISCONNECT_SENSOR',
      title: 'Challenge 4: Disconnect Primary Sensor Feed',
      summary: 'Primary BMC ultrasonic depth gauge abruptly drops offline.',
      expected: 'Pipeline identifies missing telemetry, logs data quality warning, and switches to secondary speed radar corroboration.',
      badge: 'Sensor Fault Tolerance'
    }
  ];

  const currentChallenge = CHALLENGE_PRESETS.find(c => c.key === selectedChallengeKey) || CHALLENGE_PRESETS[0];

  const handleRunChallenge = () => {
    if (selectedChallengeKey === 'DELAY_EVENT') {
      triggerReplayAction('DELAY_EVENT', { lag_sec: 540 });
    } else if (selectedChallengeKey === 'DISCONNECT_SENSOR') {
      triggerReplayAction('DISCONNECT_SENSOR', { sensor_id: 'BMC_FLD_MALAD_SUB' });
    } else {
      triggerReplayAction(selectedChallengeKey);
    }
  };

  return (
    <div className="replay-lab-layout minimal-layout">
      {/* 1. SECTION PAGE HEADER */}
      <div className="section-page-header">
        <div className="sph-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="screen-num-pill">03</span>
            <h2>AI Replay Lab — Resilience & Edge-Case Testing</h2>
          </div>
          <p>Inject real adversarial edge cases into the live intelligence pipeline to verify robust decision making.</p>
        </div>

        {/* TOP SCENARIO SELECTOR DROPDOWN */}
        <div className="dropdown-menu-container">
          <label className="dropdown-inline-label">Select Adversarial Challenge:</label>
          <select 
            className="minimal-select"
            value={selectedChallengeKey}
            onChange={(e) => setSelectedChallengeKey(e.target.value)}
          >
            {CHALLENGE_PRESETS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. MINIMAL TWO-COLUMN WORKBENCH */}
      <div className="replay-workbench-grid">
        {/* LEFT: ACTIVE CHALLENGE CONTROLLER */}
        <div className="replay-controls-card minimal-card">
          <div className="rcc-header">
            <div className="rcc-title-row">
              <span className="challenge-tag">{currentChallenge.badge}</span>
              <h3>{currentChallenge.title}</h3>
            </div>
            <p className="rcc-summary">{currentChallenge.summary}</p>
          </div>

          <div className="rcc-expectation-box">
            <span className="reb-label">Expected Algorithmic Behavior:</span>
            <p>{currentChallenge.expected}</p>
          </div>

          <div className="rcc-actions-bar">
            <button 
              className="replay-run-btn"
              onClick={handleRunChallenge}
              disabled={isReplaying}
            >
              {isReplaying ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Evaluating Pipeline...</span>
                </>
              ) : (
                <>
                  <Zap size={14} />
                  <span>Execute {currentChallenge.badge}</span>
                </>
              )}
            </button>

            <button 
              className="replay-reset-btn"
              onClick={() => triggerReplayAction('RESET')}
              disabled={isReplaying}
            >
              <RotateCcw size={13} />
              <span>Reset Pipeline</span>
            </button>
          </div>
        </div>

        {/* RIGHT: ENGINE VERDICT & EVIDENCE LEDGER */}
        <div className="replay-assessment-card minimal-card">
          <div className="rac-top">
            <span className="rac-tag">EVIDENCE LEDGER STATE</span>
            <span className={`confidence-pill ${ledgerData?.confidence_rating === 'Moderate' ? 'moderate' : 'high'}`}>
              Grade: {ledgerData?.confidence_rating || 'High'} ({Math.round((ledgerData?.confidence_score || 0.93) * 100)}%)
            </span>
          </div>

          {/* COMPACT KPI QUAD */}
          <div className="rac-compact-stats">
            <div className="rcs-item">
              <span className="rcs-num text-emerald">{ledgerData?.counts?.supporting || 3}</span>
              <span className="rcs-label">Supporting</span>
            </div>
            <div className="rcs-item">
              <span className="rcs-num text-amber">{ledgerData?.counts?.contradictory || 0}</span>
              <span className="rcs-label">Contradictory</span>
            </div>
            <div className="rcs-item">
              <span className="rcs-num text-purple">{ledgerData?.counts?.duplicates_excluded || 0}</span>
              <span className="rcs-label">Duplicates Excluded</span>
            </div>
            <div className="rcs-item">
              <span className="rcs-num text-rose">{ledgerData?.counts?.missing_or_stale || 0}</span>
              <span className="rcs-label">Stale Feeds</span>
            </div>
          </div>

          {/* VERDICT SUMMARY */}
          <div className="rac-verdict-summary">
            <strong>Current Assessment:</strong>
            <span style={{ color: '#0284c7' }}> Possible flooding-related disruption (Malad Corridor)</span>
          </div>

          {/* ACCORDION 1: SUPPORTING CORROBORATION */}
          <div className="replay-accordion-box">
            <button 
              className="accordion-toggle-btn"
              onClick={() => setShowSupportingList(!showSupportingList)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Supporting Evidence ({ledgerData?.supporting_evidence?.length || 3} feeds)</span>
              </div>
              <ChevronDown size={14} className={`chev-icon ${showSupportingList ? 'open' : ''}`} />
            </button>

            {showSupportingList && (
              <div className="accordion-content-list">
                {ledgerData?.supporting_evidence?.map((item, i) => (
                  <div key={i} className="evidence-item-row">
                    <span className="ei-source">[{item.source}]</span>
                    <span className="ei-text">{item.measured || item.type}</span>
                    <span className="ei-rel">Reliability: {item.reliability}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACCORDION 2: CONTRADICTORY FEEDS */}
          {ledgerData?.conflicting_evidence?.length > 0 && (
            <div className="replay-accordion-box conflict">
              <button 
                className="accordion-toggle-btn"
                onClick={() => setShowConflictList(!showConflictList)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={13} className="text-amber" />
                  <span>Contradictory Feeds Preserved ({ledgerData.conflicting_evidence.length})</span>
                </div>
                <ChevronDown size={14} className={`chev-icon ${showConflictList ? 'open' : ''}`} />
              </button>

              {showConflictList && (
                <div className="accordion-content-list">
                  {ledgerData.conflicting_evidence.map((item, i) => (
                    <div key={i} className="evidence-item-row conflict-row">
                      <span className="ei-source">[{item.source}]</span>
                      <span className="ei-text">{item.claim}</span>
                      <span className="ei-rel">Reliability: {item.reliability}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
