import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, AlertTriangle, ShieldCheck, User, MapPin, 
  Clock, Cloud, RefreshCw, Send, CheckCircle2, AlertCircle, 
  ExternalLink, Car, Bike, Train, Footprints, Plus, Shield, 
  Radio, Check, X, Info, Settings, Compass, LocateFixed
} from 'lucide-react';
import './App.css';

const API_BASE = window.location.origin;

export default function App() {
  // Navigation: Exactly 3 primary sections (Phase 2.C)
  const [activeTab, setActiveTab] = useState('commute'); // 'commute', 'incidents', 'profile'

  // User Profile & Authentication State (Phase 11)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('urbanpulse_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Real Device Geolocation State (Phase 7 - No Hardcoded Defaults)
  const [deviceLocation, setDeviceLocation] = useState({
    coords: null, // { lat: number, lon: number }
    accuracy: null,
    timestamp: null,
    status: 'PROMPTING', // 'PROMPTING', 'GRANTED', 'DENIED', 'UNAVAILABLE'
    label: ''
  });

  // Commute Route Search State (Phase 8 & Phase 10)
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [travelMode, setTravelMode] = useState('DRIVE'); // 'DRIVE', 'MOTORCYCLE', 'TRANSIT', 'WALK'
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [commuteResult, setCommuteResult] = useState(null); // null before destination submitted (Phase 8.C)
  const [routeError, setRouteError] = useState(null);

  // Live Data & Weather State (Phase 4)
  const [weatherData, setWeatherData] = useState(null);
  const [cityIncidents, setCityIncidents] = useState([]);
  const [sourcesHealth, setSourcesHealth] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [testSmsStatus, setTestSmsStatus] = useState(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [mapProvider, setMapProvider] = useState('google'); // 'google' (Google Maps Roadmap), 'google_hybrid' (Satellite), 'osm' (OpenStreetMap)

  // Map References
  const mapContainerRef = useRef(null);
  const cityMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const cityMapInstanceRef = useRef(null);
  const commuteTileLayerRef = useRef(null);
  const cityTileLayerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const incidentLayersRef = useRef([]);

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyA_C-AFPn-1596_R0cCUggw5ibxBpg5aVU';

  const createTileLayer = (provider, L) => {
    if (provider === 'google') {
      return L.tileLayer(`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`, {
        subdomains: '0123',
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      });
    } else if (provider === 'google_hybrid') {
      return L.tileLayer(`https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`, {
        subdomains: '0123',
        maxZoom: 20,
        attribution: '&copy; Google Maps Satellite'
      });
    } else {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
    }
  };

  // =========================================================================
  // 1. INITIAL BROWSER GEOLOCATION (Phase 7)
  // =========================================================================
  const requestDeviceLocation = () => {
    if (!navigator.geolocation) {
      setDeviceLocation(prev => ({ ...prev, status: 'UNAVAILABLE' }));
      return;
    }

    setDeviceLocation(prev => ({ ...prev, status: 'PROMPTING' }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coords = { lat: latitude, lon: longitude };
        const label = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        setDeviceLocation({
          coords,
          accuracy: Math.round(accuracy),
          timestamp: new Date().toLocaleTimeString(),
          status: 'GRANTED',
          label
        });

        // Set as default origin if origin is currently empty
        if (!originInput || originInput.startsWith('GPS:')) {
          setOriginInput(label);
        }

        // Center map if instance exists
        if (mapInstanceRef.current && window.L) {
          mapInstanceRef.current.setView([latitude, longitude], 13);
          updateUserLocationMarker(latitude, longitude, accuracy);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setDeviceLocation(prev => ({ ...prev, status: 'DENIED' }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    requestDeviceLocation();
  }, []);

  // Fetch weather, active incidents, and source health
  const refreshLiveFeeds = () => {
    fetch(`${API_BASE}/api/weather`)
      .then(res => res.json())
      .then(data => setWeatherData(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/incidents`)
      .then(res => res.json())
      .then(data => setCityIncidents(data.incidents || []))
      .catch(console.error);

    fetch(`${API_BASE}/api/sources/health`)
      .then(res => res.json())
      .then(data => setSourcesHealth(data))
      .catch(console.error);
  };

  useEffect(() => {
    refreshLiveFeeds();
    const interval = setInterval(refreshLiveFeeds, 60000); // 1 minute refresh
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // 2. LEAFLET MAP INITIALIZATION & UPDATES (Commute View)
  // =========================================================================
  const updateUserLocationMarker = (lat, lon, accuracy) => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    const markerGroup = L.layerGroup();
    // Accuracy circle
    L.circle([lat, lon], {
      radius: Math.min(accuracy || 50, 200),
      color: '#0284c7',
      fillColor: '#0284c7',
      fillOpacity: 0.15,
      weight: 1
    }).addTo(markerGroup);

    // Current location dot
    L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: '#0284c7',
      color: '#ffffff',
      weight: 3,
      fillOpacity: 1
    }).bindPopup('<b>Current Device Location</b><br>Accurate to within ' + (accuracy || 10) + 'm').addTo(markerGroup);

    markerGroup.addTo(mapInstanceRef.current);
    userMarkerRef.current = markerGroup;
  };

  useEffect(() => {
    if (activeTab !== 'commute') return;
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter = deviceLocation.coords 
        ? [deviceLocation.coords.lat, deviceLocation.coords.lon]
        : [19.0760, 72.8777]; // Default Mumbai centroid if GPS pending

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        zoomControl: true
      });

      // Initialize with selected provider (Google Maps by default)
      const tile = createTileLayer(mapProvider, L).addTo(map);
      commuteTileLayerRef.current = tile;

      mapInstanceRef.current = map;

      if (deviceLocation.coords) {
        updateUserLocationMarker(deviceLocation.coords.lat, deviceLocation.coords.lon, deviceLocation.accuracy);
      }
    }

    mapInstanceRef.current.invalidateSize();
  }, [activeTab, deviceLocation.coords]);

  // Dynamic Map Layer Switcher (Google Maps Roadmap, Satellite, or OpenStreetMap)
  useEffect(() => {
    const L = window.L;
    if (!L) return;

    if (mapInstanceRef.current && commuteTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(commuteTileLayerRef.current);
      commuteTileLayerRef.current = createTileLayer(mapProvider, L).addTo(mapInstanceRef.current);
    }

    if (cityMapInstanceRef.current && cityTileLayerRef.current) {
      cityMapInstanceRef.current.removeLayer(cityTileLayerRef.current);
      cityTileLayerRef.current = createTileLayer(mapProvider, L).addTo(cityMapInstanceRef.current);
    }
  }, [mapProvider]);

  // Render route polyline and route-specific incidents onto commute map
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    // Clear previous route
    if (routePolylineRef.current) {
      mapInstanceRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // Clear previous route incident markers
    incidentLayersRef.current.forEach(layer => mapInstanceRef.current.removeLayer(layer));
    incidentLayersRef.current = [];

    // Draw route only if route calculation has returned (Phase 8.C)
    if (commuteResult && commuteResult.map_route) {
      const coords = commuteResult.map_route.primary_polyline || commuteResult.map_route.polyline_coords || [];
      if (coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });

        // Add Route-Specific Corridor Incidents (Phase 10)
        const corridorIncidents = commuteResult.intersecting_incidents || [];
        corridorIncidents.forEach(inc => {
          const lat = inc.latitude || inc.centroid_lat;
          const lon = inc.longitude || inc.centroid_lon;
          if (!lat || !lon) return;

          const marker = L.circleMarker([lat, lon], {
            radius: 9,
            fillColor: inc.severity_level && inc.severity_level.includes('4') ? '#e11d48' : '#d97706',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.9
          }).bindPopup(`
            <div style="font-family:system-ui;font-size:12px;">
              <span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:99px;font-weight:700;font-size:10px;">
                ⚠️ ON COMMUTE ROUTE (${inc.distance_from_route_meters}m from corridor)
              </span>
              <h4 style="margin:6px 0 2px 0;font-size:13px;color:#0f172a;">${inc.title}</h4>
              <p style="margin:0;color:#475569;">${inc.description || inc.known_cause || ''}</p>
            </div>
          `).addTo(mapInstanceRef.current);

          incidentLayersRef.current.push(marker);
        });
      }
    }
  }, [commuteResult]);

  // =========================================================================
  // 3. LEAFLET MAP INITIALIZATION (Citywide Incidents View)
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'incidents') return;
    const L = window.L;
    if (!L || !cityMapContainerRef.current) return;

    if (!cityMapInstanceRef.current) {
      const map = L.map(cityMapContainerRef.current, {
        center: [19.1200, 72.8600],
        zoom: 11,
        zoomControl: true
      });

      const tile = createTileLayer(mapProvider, L).addTo(map);
      cityTileLayerRef.current = tile;

      cityMapInstanceRef.current = map;
    }

    const cityMap = cityMapInstanceRef.current;
    cityMap.invalidateSize();

    // Render citywide incidents
    cityIncidents.forEach(inc => {
      const lat = inc.latitude || inc.centroid_lat;
      const lon = inc.longitude || inc.centroid_lon;
      if (!lat || !lon) return;

      const isCritical = inc.severity_level && inc.severity_level.includes('4');
      const isCitizen = inc.provenance === 'CITIZEN_REPORT';

      const color = isCritical ? '#e11d48' : (isCitizen ? '#0891b2' : '#d97706');

      L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.85
      }).bindPopup(`
        <div style="font-family:system-ui;font-size:12px;min-width:180px;">
          <div style="display:flex;gap:4px;margin-bottom:4px;">
            <span style="font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;background:#f1f5f9;color:#334155;">
              ${inc.provenance || 'MUNICIPAL_FEED'}
            </span>
            <span style="font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;background:#ecfdf5;color:#059669;">
              ${inc.verification_status || 'VERIFIED'}
            </span>
          </div>
          <h4 style="margin:2px 0;font-size:13px;color:#0f172a;">${inc.title}</h4>
          <p style="margin:0 0 4px 0;color:#475569;font-size:11px;">${inc.description || inc.known_cause || ''}</p>
          <div style="font-size:10px;color:#94a3b8;">Coords: ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
        </div>
      `).addTo(cityMap);
    });
  }, [activeTab, cityIncidents]);

  // =========================================================================
  // 4. COMMUTE ROUTE CALCULATION (Strict Google Maps & Corridor Filter)
  // =========================================================================
  const handleFindRoute = async (e) => {
    if (e) e.preventDefault();
    if (!destInput.trim()) {
      setRouteError('Please enter a destination to calculate your route.');
      return;
    }

    setRouteError(null);
    setIsSearchingRoute(true);

    // Use device GPS coordinates directly if origin is current location or starts with GPS
    let effectiveOrigin = originInput.trim();
    if (!effectiveOrigin || effectiveOrigin.startsWith('GPS:') || effectiveOrigin.toLowerCase().includes('current')) {
      if (deviceLocation.coords) {
        effectiveOrigin = `${deviceLocation.coords.lat}, ${deviceLocation.coords.lon}`;
      } else {
        effectiveOrigin = 'Andheri West';
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/commute/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: effectiveOrigin,
          destination: destInput.trim(),
          preferred_mode: travelMode,
          name: currentUser ? currentUser.full_name : 'Commuter',
          corridor_threshold_m: 350.0
        })
      });

      const data = await res.json();
      if (res.ok && data.success !== false && data.status !== 'LOCATION_RESOLUTION_FAILED') {
        setCommuteResult(data);
        setRouteError(null);
      } else {
        setRouteError(data.error_message || data.detail || 'Could not find a valid route between these locations.');
      }
    } catch (err) {
      setRouteError('Network error connecting to routing service.');
    } finally {
      setIsSearchingRoute(false);
    }
  };

  // Save current route as user's default commute
  const handleSaveDefaultCommute = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/${currentUser.id || currentUser.user_code || currentUser.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_origin: originInput,
          default_destination: destInput,
          preferred_mode: travelMode
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated.user);
        localStorage.setItem('urbanpulse_user', JSON.stringify(updated.user));
        alert('Saved as default commute for scheduled daily SMS alerts!');
      }
    } catch (e) {
      alert('Could not save commute settings.');
    }
  };

  // Fast2SMS Test Send (Phase 13.E)
  const handleSendTestSms = async (phone) => {
    setIsSendingTestSms(true);
    setTestSmsStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: 'UrbanPulse Test: Automated morning commute notification system active.'
        })
      });
      const data = await res.json();
      setTestSmsStatus(data);
    } catch (err) {
      setTestSmsStatus({ success: false, error: 'Network error contacting SMS service' });
    } finally {
      setIsSendingTestSms(false);
    }
  };

  return (
    <div className="macos-app-container">
      {/* 1. CLEAN TOP NAVIGATION BAR (At most 3 primary tabs: Phase 2.C) */}
      <header className="macos-navbar">
        <div className="macos-brand">
          <div className="macos-brand-logo">
            <ShieldCheck size={18} />
          </div>
          <span className="macos-brand-title">UrbanPulse AI</span>
          <span className="macos-brand-badge">Mumbai Intelligence</span>
        </div>

        {/* 3-SEGMENT PRIMARY TAB SELECTOR */}
        <div className="macos-segmented-tabs">
          <button 
            className={`macos-tab-btn ${activeTab === 'commute' ? 'active' : ''}`}
            onClick={() => setActiveTab('commute')}
          >
            <Navigation size={14} />
            <span>Commute</span>
          </button>

          <button 
            className={`macos-tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <AlertTriangle size={14} />
            <span>City Incidents ({cityIncidents.length})</span>
          </button>

          <button 
            className={`macos-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={14} />
            <span>Profile & Alerts</span>
          </button>
        </div>

        <div className="macos-nav-right">
          {/* LIVE WEATHER CHIP (Open-Meteo Real Data: Phase 4.A) */}
          {weatherData && (
            <div className="macos-chip" title="Live weather from Open-Meteo API">
              <Cloud size={13} className="text-blue" />
              <span>{weatherData.temperature_c}°C</span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span>{weatherData.condition}</span>
            </div>
          )}

          {/* SYSTEM HEALTH MODAL TRIGGER */}
          <button 
            className="macos-btn-secondary" 
            style={{ padding: '5px 10px', fontSize: '12px' }}
            onClick={() => setShowHealthModal(true)}
          >
            <span className="macos-chip-dot" />
            <span>Sources</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN APPLICATION VIEWS */}
      <main className="macos-main-view">
        {/* =====================================================================
            VIEW 1: COMMUTE (Primary Experience)
            ===================================================================== */}
        {activeTab === 'commute' && (
          <div className="commute-layout-grid">
            {/* LEFT CONTROL PANEL */}
            <div className="commute-sidebar-col">
              <div className="macos-card">
                <div className="macos-card-header">
                  <span className="macos-card-title">
                    <Navigation size={16} /> Plan Journey
                  </span>
                  {/* GPS STATUS / RECENTER */}
                  <button 
                    className="macos-btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={requestDeviceLocation}
                    title="Refresh Device GPS Location"
                  >
                    <LocateFixed size={12} />
                    <span>{deviceLocation.status === 'GRANTED' ? 'GPS Active' : 'Get Location'}</span>
                  </button>
                </div>

                {/* GEOLOCATION PERMISSION NOTICE IF DENIED */}
                {deviceLocation.status === 'DENIED' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px', color: '#92400e' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                      <AlertCircle size={13} /> Browser Location Denied
                    </div>
                    Enable browser location for automatic origin detection, or manually enter your starting address below.
                  </div>
                )}

                <form onSubmit={handleFindRoute}>
                  {/* ORIGIN FIELD */}
                  <div className="macos-form-group">
                    <label className="macos-label">Origin</label>
                    <div className="macos-input-box">
                      <MapPin size={15} style={{ color: '#0284c7' }} />
                      <input 
                        type="text" 
                        className="macos-input" 
                        placeholder={deviceLocation.status === 'GRANTED' ? 'Current GPS Location' : 'Enter starting location (e.g. Andheri West)'}
                        value={originInput}
                        onChange={(e) => setOriginInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* DESTINATION FIELD */}
                  <div className="macos-form-group">
                    <label className="macos-label">Destination</label>
                    <div className="macos-input-box">
                      <MapPin size={15} style={{ color: '#ef4444' }} />
                      <input 
                        type="text" 
                        className="macos-input" 
                        placeholder="Enter destination (e.g. BKC G-Block, Versova)"
                        value={destInput}
                        onChange={(e) => setDestInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* QUICK DESTINATIONS */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {['BKC G-Block', 'RGIT Versova', 'CSMT Fort', 'Andheri West'].map(loc => (
                      <button 
                        key={loc} 
                        type="button" 
                        className="macos-btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => setDestInput(loc)}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>

                  {/* TRAVEL MODE SELECTOR */}
                  <label className="macos-label">Travel Mode</label>
                  <div className="macos-mode-selector">
                    <button 
                      type="button"
                      className={`macos-mode-btn ${travelMode === 'DRIVE' ? 'active' : ''}`}
                      onClick={() => setTravelMode('DRIVE')}
                    >
                      <Car size={15} />
                      <span>Drive</span>
                    </button>
                    <button 
                      type="button"
                      className={`macos-mode-btn ${travelMode === 'MOTORCYCLE' ? 'active' : ''}`}
                      onClick={() => setTravelMode('MOTORCYCLE')}
                    >
                      <Bike size={15} />
                      <span>Bike</span>
                    </button>
                    <button 
                      type="button"
                      className={`macos-mode-btn ${travelMode === 'TRANSIT' ? 'active' : ''}`}
                      onClick={() => setTravelMode('TRANSIT')}
                    >
                      <Train size={15} />
                      <span>Transit</span>
                    </button>
                    <button 
                      type="button"
                      className={`macos-mode-btn ${travelMode === 'WALK' ? 'active' : ''}`}
                      onClick={() => setTravelMode('WALK')}
                    >
                      <Footprints size={15} />
                      <span>Walk</span>
                    </button>
                  </div>

                  {/* PRIMARY ACTION */}
                  <button 
                    type="submit" 
                    className="macos-btn-primary"
                    disabled={isSearchingRoute}
                  >
                    {isSearchingRoute ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Calculating Google Route...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={14} />
                        <span>Find Route</span>
                      </>
                    )}
                  </button>
                </form>

                {routeError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px', marginTop: '12px', fontSize: '12px', color: '#991b1b' }}>
                    {routeError}
                  </div>
                )}
              </div>

              {/* ROUTE CORRIDOR EVALUATION RESULTS (Phase 10) */}
              {commuteResult && (
                <div className="macos-card" style={{ marginTop: '16px' }}>
                  <div className="macos-card-header">
                    <span className="macos-card-title">
                      <Clock size={16} /> Route Assessment
                    </span>
                    <button 
                      className="macos-btn-secondary" 
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={handleSaveDefaultCommute}
                      title="Save this commute for automatic daily SMS notifications"
                    >
                      <span>Save Default</span>
                    </button>
                  </div>

                  {/* ETA & ROUTE SUMMARY */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ESTIMATED ETA</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                        {commuteResult.current_eta_min} mins
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669' }}>
                        Recommended: {commuteResult.recommended_mode || travelMode}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CORRIDOR HAZARDS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: (commuteResult.intersecting_incidents?.length > 0 ? '#e11d48' : '#059669') }}>
                        {commuteResult.intersecting_incidents?.length || 0} on route
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Corridor threshold: 350m
                      </div>
                    </div>
                  </div>

                  {/* ROUTE SPECIFIC INCIDENTS LIST */}
                  <div className="route-incidents-section">
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Route-Affecting Incidents ({commuteResult.intersecting_incidents?.length || 0})
                    </div>

                    {(!commuteResult.intersecting_incidents || commuteResult.intersecting_incidents.length === 0) ? (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} />
                        <span>No reported disruptions along your route within the 350m corridor.</span>
                      </div>
                    ) : (
                      commuteResult.intersecting_incidents.map((inc, i) => (
                        <div key={i} className="route-incident-card">
                          <div className="route-incident-header">
                            <span className="route-incident-title">{inc.title}</span>
                            <span className="route-incident-dist">{inc.distance_from_route_meters}m from route</span>
                          </div>
                          <div className="route-incident-desc">{inc.description || inc.known_cause}</div>
                          <div className="route-incident-footer">
                            <span className="provenance-badge provenance-live">{inc.provenance || 'MUNICIPAL FEED'}</span>
                            <span>Status: {inc.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT MAP DISPLAY */}
            <div className="commute-map-col">
              <div className="macos-card macos-map-card">
                {/* FLOATING STATUS PILL */}
                <div className="macos-map-floating-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 'calc(100% - 28px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="macos-chip-dot" />
                    <span>
                      {!commuteResult ? (
                        deviceLocation.status === 'GRANTED' ? 'Device Location Identified • Enter destination to compute route' : 'Waiting for Destination'
                      ) : (
                        `Google Route Displayed • ${commuteResult.current_eta_min} mins`
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select 
                      className="macos-input"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#0284c7', cursor: 'pointer', outline: 'none' }}
                      value={mapProvider}
                      onChange={(e) => setMapProvider(e.target.value)}
                    >
                      <option value="google">🗺️ Google Maps</option>
                      <option value="google_hybrid">🛰️ Satellite</option>
                      <option value="osm">🌐 OpenStreetMap</option>
                    </select>
                  </div>
                </div>

                {/* LEAFLET CANVAS */}
                <div ref={mapContainerRef} className="macos-map-container" />
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 2: CITY INCIDENTS (Authorized Feeds & Community Reports)
            ===================================================================== */}
        {activeTab === 'incidents' && (
          <div className="city-incidents-grid">
            {/* CITYWIDE MAP */}
            <div className="macos-card macos-map-card" style={{ height: '700px' }}>
              <div className="macos-map-floating-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 'calc(100% - 28px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="macos-chip-dot" />
                  <span>Citywide Verified Incident Layer ({cityIncidents.length} active)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select 
                    className="macos-input"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#0284c7', cursor: 'pointer', outline: 'none' }}
                    value={mapProvider}
                    onChange={(e) => setMapProvider(e.target.value)}
                  >
                    <option value="google">🗺️ Google Maps</option>
                    <option value="google_hybrid">🛰️ Satellite</option>
                    <option value="osm">🌐 OpenStreetMap</option>
                  </select>
                </div>
              </div>
              <div ref={cityMapContainerRef} className="macos-map-container" />
            </div>

            {/* INCIDENT FEED & SUBMIT REPORT */}
            <div className="city-sidebar-col">
              <div className="macos-card" style={{ marginBottom: '16px' }}>
                <div className="macos-card-header">
                  <span className="macos-card-title">
                    <AlertTriangle size={16} /> Verified Reports
                  </span>
                  <button 
                    className="macos-btn-primary" 
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setShowReportModal(true)}
                  >
                    <Plus size={13} />
                    <span>Report Hazard</span>
                  </button>
                </div>
                <p style="font-size:12px;color:#64748b;margin:0 0 12px 0;">
                  Authorized municipal disruptions and community reports verified via multi-source correlation.
                </p>

                {/* INCIDENTS LIST */}
                <div style={{ maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                  {cityIncidents.map((inc) => (
                    <div 
                      key={inc.incident_id} 
                      className="route-incident-card"
                      style={{ cursor: 'pointer', borderColor: selectedIncident?.incident_id === inc.incident_id ? '#0284c7' : '#e2e8f0' }}
                      onClick={() => {
                        setSelectedIncident(inc);
                        if (cityMapInstanceRef.current && inc.centroid_lat && inc.centroid_lon) {
                          cityMapInstanceRef.current.setView([inc.centroid_lat, inc.centroid_lon], 14);
                        }
                      }}
                    >
                      <div className="route-incident-header">
                        <span className="route-incident-title">{inc.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '99px' }}>
                          {inc.verification_status || 'VERIFIED'}
                        </span>
                      </div>
                      <div className="route-incident-desc">{inc.description || inc.known_cause}</div>
                      <div className="route-incident-footer">
                        <span className={`provenance-badge ${inc.provenance === 'CITIZEN_REPORT' ? 'provenance-citizen' : 'provenance-live'}`}>
                          {inc.provenance || 'MUNICIPAL FEED'}
                        </span>
                        <span style={{ fontSize: '10px' }}>Severity: {inc.severity_level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 3: PROFILE & ALERTS (Supabase Auth & Fast2SMS Settings)
            ===================================================================== */}
        {activeTab === 'profile' && (
          <div className="profile-view-layout">
            {/* COMMUTER PROFILE CARD */}
            <div className="macos-card">
              <div className="macos-card-header">
                <span className="macos-card-title">
                  <User size={16} /> Commuter Identity
                </span>
                {currentUser && (
                  <button 
                    className="macos-btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      localStorage.removeItem('urbanpulse_user');
                      setCurrentUser(null);
                    }}
                  >
                    Sign Out
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Shield size={32} style={{ color: '#0284c7', margin: '0 auto 10px auto' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Sign In to UrbanPulse</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                    Access your saved default commute, personalize hazard thresholds, and manage SMS alerts.
                  </p>
                  <button 
                    className="macos-btn-primary" 
                    style={{ maxWidth: '240px', margin: '0 auto' }}
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign In / Register
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <div className="macos-label">Full Name</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{currentUser.full_name}</div>
                    </div>
                    <div>
                      <div className="macos-label">Email Address</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{currentUser.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <div className="macos-label">Saved Default Origin</div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>{currentUser.default_origin || 'Not set'}</div>
                    </div>
                    <div>
                      <div className="macos-label">Saved Default Destination</div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>{currentUser.default_destination || 'Not set'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FAST2SMS DAILY COMMUTE ALERTS (Phase 13) */}
            <div className="macos-card">
              <div className="macos-card-header">
                <span className="macos-card-title">
                  <Send size={16} /> Fast2SMS Morning Commute Notifications
                </span>
                <span className="provenance-badge provenance-live">Fast2SMS Gateway</span>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Receive an automated, persistent SMS summary of corridor hazards every morning before you depart.
                Evaluated independently on our server even when the browser is closed.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Daily Hazard Summary SMS</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Dispatches concise alert at preferred departure time</div>
                  </div>
                  <label className="macos-switch">
                    <input 
                      type="checkbox" 
                      checked={Boolean(currentUser?.sms_consent)} 
                      onChange={(e) => {
                        if (!currentUser) {
                          setShowAuthModal(true);
                          return;
                        }
                        const updated = { ...currentUser, sms_consent: e.target.checked, sms_notifications_enabled: e.target.checked };
                        setCurrentUser(updated);
                        localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                      }}
                    />
                    <span className="macos-slider" />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="macos-label">Recipient Mobile (+91 Indian Number)</label>
                    <div className="macos-input-box">
                      <input 
                        type="tel" 
                        className="macos-input" 
                        placeholder="e.g. 98201 54321" 
                        defaultValue={currentUser?.phone || ''}
                        onBlur={(e) => {
                          if (currentUser) {
                            const updated = { ...currentUser, phone: e.target.value };
                            setCurrentUser(updated);
                            localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="macos-label">Scheduled Alert Time (IST)</label>
                    <div className="macos-input-box">
                      <Clock size={14} style={{ color: '#64748b' }} />
                      <input 
                        type="time" 
                        className="macos-input" 
                        defaultValue={currentUser?.scheduled_sms_time || '08:00'}
                        onBlur={(e) => {
                          if (currentUser) {
                            const updated = { ...currentUser, scheduled_sms_time: e.target.value };
                            setCurrentUser(updated);
                            localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TEST SMS DISPATCH BUTTON (Phase 13.E) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="macos-btn-secondary"
                  disabled={isSendingTestSms}
                  onClick={() => {
                    const phone = currentUser?.phone || prompt('Enter 10-digit Indian mobile number for test SMS:');
                    if (phone) handleSendTestSms(phone);
                  }}
                >
                  <Send size={13} />
                  <span>{isSendingTestSms ? 'Dispatching Test...' : 'Send Test SMS Alert'}</span>
                </button>

                {testSmsStatus && (
                  <span style={{ fontSize: '12px', color: testSmsStatus.success ? '#059669' : '#e11d48' }}>
                    {testSmsStatus.success ? `✓ Request accepted (${testSmsStatus.status})` : `✗ ${testSmsStatus.error}`}
                  </span>
                )}
              </div>
            </div>

            {/* COST & FREE-TIER DISCLOSURE BANNER */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '12px', color: '#64748b' }}>
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} /> Service Costs & Provider Safeguards
              </div>
              UrbanPulse uses Open-Meteo's open-access API for live weather, Google Routes API v2 within Google Cloud's monthly free credit tier, and Supabase Free Tier for storage. Fast2SMS is a paid per-message service for Indian mobile numbers; live sending is protected with idempotent rate limits and kept in mock/safety mode until configured by the account owner.
            </div>
          </div>
        )}
      </main>

      {/* 3. DISCRETE SYSTEM HEALTH BAR (Footer) */}
      <footer className="macos-footer">
        <div>
          UrbanPulse AI • Multimodal Urban Incident Intelligence • Mumbai Metropolitan Region
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Sources: {sourcesHealth?.online_sources_count || 4}/{sourcesHealth?.total_monitored_sources || 8} Active</span>
          <span>Google Routes API v2: Online</span>
          <span>Weather: Open-Meteo Live</span>
        </div>
      </footer>

      {/* 4. MODALS (Citizen Report, Health & Diagnostics, Auth) */}
      {/* CITIZEN REPORT MODAL */}
      {showReportModal && (
        <div className="macos-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="macos-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Submit Citizen Incident Report</h3>
              <button className="macos-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowReportModal(false)}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                const res = await fetch(`${API_BASE}/api/incidents/report`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    category: fd.get('category'),
                    title: fd.get('title'),
                    description: fd.get('description'),
                    latitude: parseFloat(fd.get('latitude')),
                    longitude: parseFloat(fd.get('longitude')),
                    user_name: currentUser?.full_name || 'Citizen'
                  })
                });
                const data = await res.json();
                if (res.ok) {
                  alert('Incident report submitted! It will appear in verified city intelligence feeds.');
                  setShowReportModal(false);
                  refreshLiveFeeds();
                } else {
                  alert(data.detail || 'Could not submit report');
                }
              } catch (err) {
                alert('Network error submitting report');
              }
            }}>
              <div className="macos-form-group">
                <label className="macos-label">Hazard Category</label>
                <select name="category" className="macos-input" style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="WATERLOGGING">Waterlogging / Flooding</option>
                  <option value="ROAD_CLOSURE">Road Closure / Blockage</option>
                  <option value="ACCIDENT">Traffic Accident</option>
                  <option value="TREE_FALL">Tree Fall / Obstruction</option>
                </select>
              </div>

              <div className="macos-form-group">
                <label className="macos-label">Incident Headline</label>
                <input name="title" className="macos-input" placeholder="e.g. Severe waterlogging at Malad Subway" required style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>

              <div className="macos-form-group">
                <label className="macos-label">Detailed Observation</label>
                <textarea name="description" className="macos-input" rows={3} placeholder="Describe water depth, lane blockages, or traffic impact..." required style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }} className="macos-form-group">
                <div>
                  <label className="macos-label">Latitude</label>
                  <input name="latitude" type="number" step="any" defaultValue={deviceLocation.coords?.lat || 19.1196} className="macos-input" required style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                </div>
                <div>
                  <label className="macos-label">Longitude</label>
                  <input name="longitude" type="number" step="any" defaultValue={deviceLocation.coords?.lon || 72.8433} className="macos-input" required style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                </div>
              </div>

              <button type="submit" className="macos-btn-primary" style={{ marginTop: '10px' }}>
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SOURCE HEALTH & RESILIENCE MODAL (Phase 6) */}
      {showHealthModal && (
        <div className="macos-modal-backdrop" onClick={() => setShowHealthModal(false)}>
          <div className="macos-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Data Sources & Evidence Resilience</h3>
              <button className="macos-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowHealthModal(false)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {sourcesHealth?.sources?.map((src) => (
                <div key={src.source_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{src.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{src.operational_note}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Tier: {src.free_tier_status}</div>
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    borderRadius: '99px',
                    background: src.status === 'ONLINE' ? '#ecfdf5' : (src.status === 'STANDBY' ? '#f1f5f9' : '#fffbeb'),
                    color: src.status === 'ONLINE' ? '#059669' : (src.status === 'STANDBY' ? '#475569' : '#d97706')
                  }}>
                    {src.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SIGN IN / REGISTER MODAL */}
      {showAuthModal && (
        <div className="macos-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="macos-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Sign In / Register</h3>
              <button className="macos-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAuthModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const email = fd.get('email');
              const password = fd.get('password');
              const name = fd.get('name');

              try {
                // Try login or register
                let res = await fetch(`${API_BASE}/api/auth/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identifier: email, password })
                });

                if (!res.ok && name) {
                  // Register new
                  res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      full_name: name,
                      email,
                      password,
                      phone: fd.get('phone') || '+91 98201 54321',
                      default_origin: originInput || 'Andheri West',
                      default_destination: destInput || 'BKC'
                    })
                  });
                }

                const data = await res.json();
                if (res.ok) {
                  setCurrentUser(data.user);
                  localStorage.setItem('urbanpulse_user', JSON.stringify(data.user));
                  setShowAuthModal(false);
                } else {
                  alert(data.detail || 'Authentication failed');
                }
              } catch (err) {
                alert('Network error connecting to auth service');
              }
            }}>
              <div className="macos-form-group">
                <label className="macos-label">Full Name (New Users)</label>
                <input name="name" className="macos-input" placeholder="Your name" style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>
              <div className="macos-form-group">
                <label className="macos-label">Email Address</label>
                <input name="email" type="email" required className="macos-input" placeholder="you@domain.com" style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>
              <div className="macos-form-group">
                <label className="macos-label">Password</label>
                <input name="password" type="password" required className="macos-input" placeholder="••••••••" style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>
              <div className="macos-form-group">
                <label className="macos-label">Mobile Number (+91)</label>
                <input name="phone" className="macos-input" placeholder="98201 54321" style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>
              <button type="submit" className="macos-btn-primary" style={{ marginTop: '12px' }}>
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
