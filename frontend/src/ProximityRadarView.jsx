import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, Radio, AlertTriangle, ShieldAlert, Compass, MapPin, 
  Clock, ArrowRight, ShieldCheck, RefreshCw, Volume2, VolumeX, 
  Play, Pause, Sliders, ExternalLink, Zap, Bike, Train, Bus, 
  Car, Eye, AlertOctagon, CheckCircle2, Locate, Target, CornerUpRight,
  ChevronDown, Layers, Info, Shield
} from 'lucide-react';

const API_BASE = window.location.origin;

// Key Mumbai transit hotspots for instant jump simulation
const MUMBAI_HOTSPOTS = [
  { id: 'malad_subway', name: 'Malad Subway Inundation Hotspot', lat: 19.1875, lon: 72.8504, desc: 'Critical 68cm flood hazard zone & rail submergence' },
  { id: 'andheri_subway', name: 'Andheri Subway Flood Zone', lat: 19.1196, lon: 72.8433, desc: 'Major East-West subway link with 42cm standing water' },
  { id: 'mithchowki', name: 'Mithchowki 4-Way Junction', lat: 19.2001, lon: 72.8372, desc: 'Signal failure & BEST feeder power trip' },
  { id: 'pathanwadi', name: 'WEH Pathanwadi Flyover Gridlock', lat: 19.1814, lon: 72.8591, desc: 'Multi-vehicle collision on southbound highway' },
  { id: 'ashokvan', name: 'Ashokvan (Borivali East)', lat: 19.2372, lon: 72.8695, desc: 'Hero Student 001 Home Origin point' },
  { id: 'rgit_versova', name: 'RGIT Engineering Campus (Versova)', lat: 19.1342, lon: 72.8145, desc: 'Student Destination campus' },
  { id: 'bkc', name: 'Bandra Kurla Complex (BKC G-Block)', lat: 19.0657, lon: 72.8687, desc: 'Corporate financial hub & Kalanagar bottleneck' },
  { id: 'dadar_tt', name: 'Dadar TT Circle & Hindmata', lat: 19.0178, lon: 72.8478, desc: 'Central Mumbai historical flood bowl' },
  { id: 'csmt', name: 'CSMT South Mumbai Terminus', lat: 18.9402, lon: 72.8356, desc: 'Heritage railway terminus & harbour line junction' }
];

// Simulated transit ride waypoints from Ashokvan to Versova
const SIMULATION_ROUTE_WAYPOINTS = [
  { lat: 19.2372, lon: 72.8695, name: 'Ashokvan (Borivali East)' },
  { lat: 19.2290, lon: 72.8569, name: 'Borivali Railway Station' },
  { lat: 19.2045, lon: 72.8522, name: 'Approaching Kandivali (Link Rd)' },
  { lat: 19.1920, lon: 72.8510, name: 'Malad North Corridor' },
  { lat: 19.1875, lon: 72.8504, name: '🚨 Malad Subway Hazard Zone' },
  { lat: 19.1814, lon: 72.8591, name: 'WEH Pathanwadi Bypass Junction' },
  { lat: 19.1555, lon: 72.8542, name: 'NESCO IT Park (Goregaon East)' },
  { lat: 19.1359, lon: 72.8490, name: 'Jogeshwari JVLR Connector' },
  { lat: 19.1197, lon: 72.8464, name: 'Andheri West Flyover' },
  { lat: 19.1308, lon: 72.8322, name: 'D.N. Nagar Metro Line 2A' },
  { lat: 19.1342, lon: 72.8145, name: '🎓 RGIT Versova Destination' }
];

export default function ProximityRadarView({
  userLocation,
  onUpdateUserLocation,
  onNavigateToMap,
  onNavigateToCommute,
  currentUser,
  incidents = []
}) {
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanRadiusKm, setScanRadiusKm] = useState(6.0);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL', 'CRITICAL', 'FLOOD', 'TRAFFIC'
  const [audioAlarmEnabled, setAudioAlarmEnabled] = useState(false);
  const [trackingMode, setTrackingMode] = useState('HOTSPOT'); // 'GPS', 'SIMULATED_RIDE', 'HOTSPOT'
  const [simulationIndex, setSimulationIndex] = useState(4); // default near Malad
  const [isSimulatingRide, setIsSimulatingRide] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [radarSweepAngle, setRadarSweepAngle] = useState(0);
  const [selectedHazardId, setSelectedHazardId] = useState(null);

  const simulationTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const watchIdRef = useRef(null);

  // Radar sweep animation
  useEffect(() => {
    const sweepInterval = setInterval(() => {
      setRadarSweepAngle(prev => (prev + 6) % 360);
    }, 50);
    return () => clearInterval(sweepInterval);
  }, []);

  // Fetch proximity hazards when location or radius changes
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lon) {
      fetchNearbyHazards(userLocation.lat, userLocation.lon, scanRadiusKm);
    }
  }, [userLocation?.lat, userLocation?.lon, scanRadiusKm]);

  // Audio beep alarm for nearby hazard
  const playAlertPing = (freq = 880, duration = 0.15) => {
    if (!audioAlarmEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio alert not supported or blocked:', e);
    }
  };

  const fetchNearbyHazards = async (lat, lon, radius) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/nearby/hazards?lat=${lat}&lon=${lon}&radius_km=${radius}`);
      const data = await res.json();
      setRadarData(data);

      if (data.immediate_threats_count > 0 && audioAlarmEnabled) {
        playAlertPing(920, 0.25);
      }
    } catch (err) {
      console.error('Error fetching nearby hazards:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Real Device Geolocation Tracking
  const startRealDeviceTracking = () => {
    if (!navigator.geolocation) {
      setGeoError('HTML5 Geolocation is not supported by your browser.');
      return;
    }
    setGeoError('');
    setTrackingMode('GPS');
    setIsSimulatingRide(false);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        onUpdateUserLocation({
          lat: latitude,
          lon: longitude,
          accuracy: Math.round(accuracy || 12),
          heading: heading || 0,
          speed: speed ? Math.round(speed * 3.6) : 0,
          source: 'DEVICE_GPS',
          lastUpdated: new Date().toLocaleTimeString()
        });
      },
      (err) => {
        setGeoError(`Device GPS error: ${err.message}. Switched to Mumbai Hotspot mode.`);
        setTrackingMode('HOTSPOT');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        onUpdateUserLocation({
          lat: latitude,
          lon: longitude,
          accuracy: Math.round(accuracy || 10),
          heading: heading || 0,
          speed: speed ? Math.round(speed * 3.6) : 0,
          source: 'DEVICE_GPS',
          lastUpdated: new Date().toLocaleTimeString()
        });
      },
      (err) => {
        console.warn('WatchPosition error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  };

  // 2. Hotspot Jump Handler
  const handleSelectHotspot = (hotspotId) => {
    const spot = MUMBAI_HOTSPOTS.find(h => h.id === hotspotId);
    if (!spot) return;
    setTrackingMode('HOTSPOT');
    setIsSimulatingRide(false);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    onUpdateUserLocation({
      lat: spot.lat,
      lon: spot.lon,
      accuracy: 8,
      heading: 180,
      speed: 18,
      source: 'HOTSPOT_PRESET',
      locationName: spot.name,
      lastUpdated: new Date().toLocaleTimeString()
    });
  };

  // 3. Simulated Live Transit Ride
  const toggleSimulateRide = () => {
    if (isSimulatingRide) {
      setIsSimulatingRide(false);
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      return;
    }

    setIsSimulatingRide(true);
    setTrackingMode('SIMULATED_RIDE');
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    let idx = simulationIndex;
    simulationTimerRef.current = setInterval(() => {
      idx = (idx + 1) % SIMULATION_ROUTE_WAYPOINTS.length;
      setSimulationIndex(idx);
      const waypoint = SIMULATION_ROUTE_WAYPOINTS[idx];

      onUpdateUserLocation({
        lat: waypoint.lat,
        lon: waypoint.lon,
        accuracy: 10,
        heading: 195,
        speed: 28,
        source: 'SIMULATED_TRANSIT_RIDE',
        locationName: waypoint.name,
        lastUpdated: new Date().toLocaleTimeString()
      });
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const filteredHazards = (radarData?.nearby_hazards || []).filter(h => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'CRITICAL') return h.severity_level.includes('4');
    if (selectedFilter === 'FLOOD') return h.scenario_type.includes('Flooding');
    if (selectedFilter === 'TRAFFIC') return h.scenario_type.includes('Accident') || h.scenario_type.includes('Utility');
    return true;
  });

  return (
    <div className="proximity-radar-layout minimal-layout">
      {/* 1. OFFICIAL PAGE HEADER (MATCHING THEME) */}
      <div className="section-page-header">
        <div className="sph-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="screen-num-pill">04</span>
            <h2>Proximity Radar & Hazard Early Warning</h2>
          </div>
          <p>Continuous 360° multi-vector spatial scanning cross-correlating your live coordinates against 12 Mumbai multimodal transit disruptions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="simulated-data-tag">SIMULATED DATA</span>
          <button className="link-action-btn" onClick={onNavigateToMap}>
            <Layers size={13} /> View on Tactical Map
          </button>
        </div>
      </div>

      {/* 2. TOP TELEMETRY HUD & LIVE TRACKING CONTROL STRIP */}
      <section className="radar-telemetry-hud minimal-card">
        <div className="hud-header-strip">
          <div className="hud-title-box">
            <div className="radar-antenna-pulse">
              <Radio size={20} className="pulse-icon text-cyan" />
              <span className="live-ring-ping"></span>
            </div>
            <div>
              <h4>Live Commuter Positioning Beacon</h4>
              <span className="hud-sub-desc">Correlating spatial proximity with Doppler rainfall & track waterlogging telemetry</span>
            </div>
          </div>

          <div className="hud-tracking-controls">
            <button 
              className={`hud-mode-btn ${trackingMode === 'GPS' ? 'active-mode' : ''}`}
              onClick={startRealDeviceTracking}
              title="Track live device location using HTML5 Geolocation"
            >
              <Locate size={13} />
              <span>Device GPS</span>
            </button>

            <button 
              className={`hud-mode-btn ${isSimulatingRide ? 'active-ride' : ''}`}
              onClick={toggleSimulateRide}
              title="Simulate riding along the Western corridor from Ashokvan to Versova"
            >
              {isSimulatingRide ? <Pause size={13} /> : <Play size={13} />}
              <span>{isSimulatingRide ? 'Pause Simulation' : 'Simulate Ride Corridor'}</span>
            </button>

            <button 
              className={`hud-audio-btn ${audioAlarmEnabled ? 'active-audio' : ''}`}
              onClick={() => {
                const nextState = !audioAlarmEnabled;
                setAudioAlarmEnabled(nextState);
                if (nextState) playAlertPing(750, 0.15);
              }}
              title="Toggle audio proximity alarm when entering danger zones"
            >
              {audioAlarmEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>{audioAlarmEnabled ? 'Audio Alert ON' : 'Audio Muted'}</span>
            </button>
          </div>
        </div>

        {geoError && (
          <div className="geo-warning-banner">
            <AlertTriangle size={15} />
            <span>{geoError}</span>
          </div>
        )}

        {/* 4 LIVE TELEMETRY TILES */}
        <div className="hud-metrics-quad">
          <div className="hud-tile">
            <span className="ht-label">Current Coordinates</span>
            <div className="ht-val text-blue">
              <MapPin size={14} />
              <span>{userLocation?.lat?.toFixed(5) || 19.18750}°N, {userLocation?.lon?.toFixed(5) || 72.85040}°E</span>
            </div>
            <span className="ht-sub">
              Accuracy: ±{userLocation?.accuracy || 8}m • Heading: {userLocation?.heading || 180}° S
            </span>
          </div>

          <div className="hud-tile">
            <span className="ht-label">Nearest Mumbai Landmark</span>
            <div className="ht-val text-emerald">
              <Compass size={14} />
              <span className="truncate-text">
                {userLocation?.locationName || radarData?.user_gps?.nearest_landmark || 'Malad Railway Corridor'}
              </span>
            </div>
            <span className="ht-sub">
              Speed: {userLocation?.speed || 24} km/h • Source: {userLocation?.source || 'HOTSPOT_PRESET'}
            </span>
          </div>

          <div className="hud-tile">
            <span className="ht-label">Hazards in Radar Range</span>
            <div className="ht-val">
              <span className={`ht-big-num ${radarData?.immediate_threats_count > 0 ? 'text-rose' : 'text-amber'}`}>
                {radarData?.total_hazards_in_radius || 0}
              </span>
              <span className="ht-unit">within {scanRadiusKm} km</span>
            </div>
            <span className="ht-sub">
              {radarData?.immediate_threats_count || 0} Critical Immediate Threat (&lt; 1.2 km)
            </span>
          </div>

          <div className="hud-tile">
            <span className="ht-label">Scanning Perimeter Radius</span>
            <div className="ht-val text-purple">
              <Sliders size={14} />
              <span>{scanRadiusKm} km Radar Range</span>
            </div>
            <div className="range-slider-box">
              <input 
                type="range" 
                min="1" 
                max="15" 
                step="0.5" 
                value={scanRadiusKm} 
                onChange={e => setScanRadiusKm(parseFloat(e.target.value))}
                className="hud-slider"
              />
              <div className="radius-preset-buttons" style={{ marginTop: '4px' }}>
                {[1.5, 3.0, 6.0, 10.0, 15.0].map(r => (
                  <button 
                    key={r} 
                    className={`rpb-btn ${scanRadiusKm === r ? 'active' : ''}`}
                    onClick={() => setScanRadiusKm(r)}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SENSOR CONSTELLATION STATUS STRIP */}
        <div className="sensor-constellation-strip">
          <div className="scs-item">
            <span className="scs-dot green"></span>
            <span>NavIC / IRNSS: <strong>7 Satellites Locked</strong></span>
          </div>
          <div className="scs-item">
            <span className="scs-dot blue"></span>
            <span>Doppler Radar: <strong>Colaba & Veravali 48mm/hr</strong></span>
          </div>
          <div className="scs-item">
            <span className="scs-dot green"></span>
            <span>IoT Sonar Nodes: <strong>12 Stations Online</strong></span>
          </div>
          <div className="scs-item">
            <span className={`scs-dot ${radarData?.immediate_threats_count > 0 ? 'red' : 'green'}`}></span>
            <span>Threat State: <strong>{radarData?.immediate_threats_count > 0 ? 'RED DANGER' : 'CORRIDOR CLEAR'}</strong></span>
          </div>
        </div>


        {/* QUICK JUMP DROPDOWN + CHIPS */}
        <div className="hotspots-quick-bar">
          <div className="hqb-left">
            <span className="hqb-label">⚡ Hotspot Jump:</span>
            <select 
              className="minimal-select"
              value={userLocation?.locationName ? '' : 'malad_subway'}
              onChange={(e) => handleSelectHotspot(e.target.value)}
            >
              <option value="" disabled>Select Mumbai Transit Hotspot...</option>
              {MUMBAI_HOTSPOTS.map(spot => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hqb-chips-row">
            {MUMBAI_HOTSPOTS.slice(0, 5).map(spot => (
              <button 
                key={spot.id}
                className={`hqb-chip ${(Math.abs(userLocation?.lat - spot.lat) < 0.005 && Math.abs(userLocation?.lon - spot.lon) < 0.005) ? 'active' : ''}`}
                onClick={() => handleSelectHotspot(spot.id)}
                title={spot.desc}
              >
                {spot.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC PERIMETER THREAT BANNER */}
      {radarData && (
        <div className={`radar-system-alert ${radarData.system_status}`}>
          <div className="rsa-icon-box">
            {radarData.immediate_threats_count > 0 ? (
              <AlertOctagon size={24} className="pulse-fast text-rose" />
            ) : radarData.warning_threats_count > 0 ? (
              <AlertTriangle size={24} className="pulse-fast text-amber" />
            ) : (
              <ShieldCheck size={24} className="text-emerald" />
            )}
          </div>
          <div className="rsa-content">
            <div className="rsa-top-line">
              <span className="rsa-tag">{radarData.system_status.replace(/_/g, ' ')}</span>
              <span className="rsa-time">Updated: {radarData.user_gps?.timestamp || 'Live'}</span>
            </div>
            <h4>{radarData.headline_alert}</h4>
            <p>
              {radarData.immediate_threats_count > 0 
                ? 'Immediate high-severity disruption intersects your perimeter. Deploying real-time multimodal evasive reroute.'
                : 'Corridor sensors continuously polled. No unmitigated blockades in your immediate 1.2 km perimeter.'}
            </p>
          </div>

          <div className="rsa-actions">
            <button 
              className="btn-rsa-primary"
              onClick={onNavigateToMap}
              title="Inspect live radar scanning beacon on city map"
            >
              <Eye size={13} /> View on Map
            </button>
            <button 
              className="btn-rsa-secondary"
              onClick={onNavigateToCommute}
              title="Evaluate alternate multi-modal detour options"
            >
              <CornerUpRight size={13} /> Safe Detour Plan
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN SPLIT: TACTICAL CRT RADAR SCOPE + DISTANCE-RANKED HAZARD LIST */}
      <div className="radar-split-grid">
        {/* LEFT: 360° RADAR SCOPE DISPLAY */}
        <div className="radar-visualizer-card minimal-card">
          <div className="rvc-header">
            <div className="rvc-title">
              <Target size={16} className="text-blue" />
              <h4>360° Tactical CRT Radar Display</h4>
            </div>
            <span className="rvc-live-badge">SCANNING 360°</span>
          </div>

          <div className="radar-screen-viewport">
            {/* Degree Markers */}
            <span className="degree-mark deg-n">000° N</span>
            <span className="degree-mark deg-e">090° E</span>
            <span className="degree-mark deg-s">180° S</span>
            <span className="degree-mark deg-w">270° W</span>

            {/* Concentric distance rings */}
            <div className="radar-ring ring-outer">
              <span className="ring-label">{scanRadiusKm}km</span>
            </div>
            <div className="radar-ring ring-mid">
              <span className="ring-label">{(scanRadiusKm * 0.6).toFixed(1)}km</span>
            </div>
            <div className="radar-ring ring-inner">
              <span className="ring-label">{(scanRadiusKm * 0.25).toFixed(1)}km</span>
            </div>

            {/* Crosshairs */}
            <div className="radar-crosshair crosshair-h"></div>
            <div className="radar-crosshair crosshair-v"></div>

            {/* Rotating Radar Sweep Line */}
            <div 
              className="radar-sweep-beam"
              style={{ transform: `rotate(${radarSweepAngle}deg)` }}
            ></div>

            {/* Center User Marker */}
            <div className="radar-center-blip" title="Your Live Location">
              <div className="blip-core"></div>
              <div className="blip-ripple"></div>
              <span className="blip-user-tag">YOU ({currentUser?.full_name?.split(' ')[0] || 'SAHIL'})</span>
            </div>

            {/* Incident Blips Placed Relative to User Bearing & Distance */}
            {filteredHazards.map((haz, idx) => {
              const maxDist = scanRadiusKm;
              const ratio = Math.min(1, haz.distance_km / maxDist);
              const angleRad = (haz.bearing_deg - 90) * (Math.PI / 180);
              const pixelRadius = ratio * 130;
              const blipX = Math.cos(angleRad) * pixelRadius;
              const blipY = Math.sin(angleRad) * pixelRadius;
              const isUrgent = haz.proximity_zone === 'IMMEDIATE_THREAT_PERIMETER';

              const hazId = haz.incident_id || `haz_${idx}`;
              const isSelected = selectedHazardId === hazId;

              return (
                <div 
                  key={idx}
                  className={`radar-incident-blip ${isUrgent ? 'urgent-blip' : ''} ${isSelected ? 'selected-blip' : ''}`}
                  style={{
                    transform: `translate(calc(-50% + ${blipX}px), calc(-50% + ${blipY}px))`
                  }}
                  onClick={() => setSelectedHazardId(hazId)}
                  title={`Click to inspect: ${haz.title} (${haz.distance_km}km, Bearing: ${haz.bearing_deg}°)`}
                >
                  <div className="rib-point" style={{ background: haz.color }}></div>
                  <span className="rib-label">{haz.distance_km}km</span>
                </div>
              );
            })}
          </div>

          <div className="rvc-legend">
            <div className="leg-item"><span className="leg-dot red"></span> &lt; 1.2km Immediate Danger</div>
            <div className="leg-item"><span className="leg-dot amber"></span> 1.2km - 3.5km Approaching</div>
            <div className="leg-item"><span className="leg-dot cyan"></span> &gt; 3.5km Advisory Corridor</div>
          </div>
        </div>

        {/* RIGHT: DISTANCE-RANKED HAZARD CARDS */}
        <div className="nearby-hazards-panel minimal-card">
          <div className="nhp-header">
            <div className="nhp-title-group">
              <ShieldAlert size={18} className="text-rose" />
              <h4>Hazards Ranked by Proximity</h4>
              <span className="nhp-count">({filteredHazards.length} within {scanRadiusKm} km)</span>
            </div>

            {/* Filter Pills */}
            <div className="nhp-filter-pills">
              {['ALL', 'CRITICAL', 'FLOOD', 'TRAFFIC'].map(f => (
                <button 
                  key={f}
                  className={`nhp-pill-btn ${selectedFilter === f ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="nearby-cards-scroll">
            {loading && (
              <div className="loading-radar-feed">
                <RefreshCw size={18} className="spin" />
                <span>Scanning 12 Mumbai transit sensors in real time...</span>
              </div>
            )}

            {!loading && filteredHazards.length === 0 && (
              <div className="no-hazards-box">
                <CheckCircle2 size={32} className="text-emerald" />
                <h5>No Active Disruptions Within {scanRadiusKm} km</h5>
                <p>Your current perimeter is clear. You can increase the scanning radius slider above to survey wider Mumbai transit lines.</p>
              </div>
            )}

            {!loading && filteredHazards.map((hazard, i) => {
              const hazardId = hazard.incident_id || `haz_${i}`;
              const isUrgent = hazard.proximity_zone === 'IMMEDIATE_THREAT_PERIMETER';
              const isWarning = hazard.proximity_zone === 'CRITICAL_PROXIMITY_ZONE';
              const isSelected = selectedHazardId === hazardId;

              return (
                <div 
                  key={i} 
                  className={`nearby-hazard-card ${isUrgent ? 'card-urgent' : isWarning ? 'card-warning' : ''} ${isSelected ? 'card-highlighted' : ''}`}
                  onClick={() => setSelectedHazardId(hazardId)}
                >
                  <div className="nhc-top-bar">
                    <div className="nhc-distance-badge" style={{ borderColor: hazard.color, color: hazard.color }}>
                      <Navigation size={12} style={{ transform: `rotate(${hazard.bearing_deg}deg)` }} />
                      <strong>
                        {hazard.distance_meters < 1000 
                          ? `${hazard.distance_meters} meters away` 
                          : `${hazard.distance_km} km away`}
                      </strong>
                      <span className="bearing-text">• {hazard.compass_dir} ({hazard.bearing_deg}°)</span>
                    </div>

                    <div className="nhc-severity-pill" style={{ background: `${hazard.color}20`, color: hazard.color, borderColor: `${hazard.color}50` }}>
                      <span className="sev-pulse-dot" style={{ background: hazard.color }}></span>
                      <span>{hazard.severity_level.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <h5 className="nhc-title">{hazard.title}</h5>

                  <div className="nhc-infrastructure">
                    <MapPin size={12} />
                    <span><strong>Corridor:</strong> {hazard.affected_infrastructure}</span>
                  </div>

                  <div className="nhc-cause-row">
                    <span className="cause-tag">Sensor Anomaly: {hazard.known_cause}</span>
                    <span className="est-impact">Impact: ~{hazard.estimated_commuters_affected?.toLocaleString()} commuters</span>
                  </div>

                  {/* INUNDATION SENSOR GAUGE */}
                  <div className="hazard-sensor-gauge">
                    <div className="hsg-header">
                      <span className="hsg-title">Flood Telemetry & Inundation Gauge:</span>
                      <span className="hsg-val">
                        {hazard.title.toLowerCase().includes('subway') || hazard.title.toLowerCase().includes('flood') ? '68 cm Standing Water (Severe)' : hazard.title.toLowerCase().includes('pileup') ? '4 Lanes Blocked' : '28 cm Waterlogging (Moderate)'}
                      </span>
                    </div>
                    <div className="hsg-bar-track">
                      <div 
                        className="hsg-bar-fill" 
                        style={{ 
                          width: hazard.title.toLowerCase().includes('subway') ? '85%' : hazard.title.toLowerCase().includes('pileup') ? '70%' : '45%',
                          background: hazard.color || '#ef4444' 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* EVASIVE RECOMMENDATION */}
                  <div className="nhc-evasion-box">
                    <div className="evasion-label">

                      <Zap size={11} className="text-amber" />
                      <span>Evasive Reroute Recommendation:</span>
                    </div>
                    <p>{hazard.evasion_recommendation}</p>
                  </div>

                  <div className="nhc-footer-actions">
                    <span className="eta-approach">
                      <Clock size={11} /> Impact ETA: ~{hazard.estimated_approach_time_min} mins
                    </span>
                    <div className="nhc-action-btns">
                      <button 
                        className="btn-nhc-map"
                        onClick={onNavigateToMap}
                        title="View hazard on map"
                      >
                        <Eye size={11} /> Inspect on Map
                      </button>
                      <button 
                        className="btn-nhc-route"
                        onClick={onNavigateToCommute}
                        title="Calculate alternate detour"
                      >
                        <CornerUpRight size={11} /> Detour Route
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
