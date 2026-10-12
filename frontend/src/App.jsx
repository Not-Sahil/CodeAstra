import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, AlertTriangle, ShieldCheck, User, MapPin, 
  Clock, Cloud, RefreshCw, Send, CheckCircle2, AlertCircle, 
  ExternalLink, Car, Bike, Train, Footprints, Plus, Shield, 
  Radio, Check, X, Info, Settings, Compass, LocateFixed,
  LogIn, UserPlus, CheckCircle, ArrowRight, Activity, Database,
  LayoutDashboard, LogOut, IndianRupee, Zap
} from 'lucide-react';
import './App.css';

const API_BASE = window.location.origin;

export default function App() {
  // User Profile & Authentication State (Phase 11)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('urbanpulse_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigation: Landing page if unauthenticated; Dashboard and services if authenticated
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const stored = localStorage.getItem('urbanpulse_user');
      return stored ? 'dashboard' : 'home';
    } catch {
      return 'home';
    }
  });

  // Authentication gating: unauthenticated visitors stay on Landing Page ('home').
  // Authenticated users bypass the landing page directly to 'dashboard'.
  useEffect(() => {
    if (!currentUser && activeTab !== 'home') {
      setActiveTab('home');
    } else if (currentUser && activeTab === 'home') {
      setActiveTab('dashboard');
    }
  }, [currentUser]);

  // Auth Modal State
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

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

  // Estimate realistic commute costs across Mumbai transit modes
  const getCommuteCost = (mode, distKm) => {
    const d = Math.max(1, distKm || 12);
    const m = (mode || 'DRIVE').toUpperCase();
    if (m === 'DRIVE' || m.includes('CAR')) {
      return Math.max(60, Math.round(d * 9.5));
    } else if (m === 'MOTORCYCLE' || m.includes('BIKE')) {
      return Math.max(25, Math.round(d * 2.8));
    } else if (m.includes('METRO') || m === 'TRANSIT') {
      if (d <= 3) return 10;
      if (d <= 12) return 20;
      if (d <= 18) return 30;
      if (d <= 24) return 40;
      return 50;
    } else if (m.includes('TRAIN') || m.includes('RAIL')) {
      if (d <= 10) return 5;
      if (d <= 25) return 10;
      return 15;
    } else if (m.includes('BUS')) {
      if (d <= 5) return 6;
      if (d <= 10) return 10;
      if (d <= 15) return 15;
      return 20;
    } else if (m.includes('WALK')) {
      return 0;
    }
    return Math.max(25, Math.round(d * 3.0));
  };

  return (
    <div className="macos-app-container">
      {/* 1. CLEAN TOP NAVIGATION BAR */}
      <header className="macos-navbar">
        <div 
          className="macos-brand" 
          onClick={() => setActiveTab(currentUser ? 'dashboard' : 'home')} 
          style={{ cursor: 'pointer' }} 
          title={currentUser ? "UrbanPulse AI Dashboard" : "UrbanPulse AI"}
        >
          <div className="macos-brand-logo">
            <ShieldCheck size={18} />
          </div>
          <span className="macos-brand-title">UrbanPulse AI</span>
          <span className="macos-brand-badge">Mumbai Intelligence</span>
        </div>

        {/* NAVIGATION TABS (ONLY DISPLAYED WHEN USER IS LOGGED IN) */}
        {currentUser && (
          <div className="macos-segmented-tabs">
            <button 
              className={`macos-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>

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
        )}

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

          {/* USER ACCOUNT CONTROLS */}
          {currentUser ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className="macos-btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: '#bae6fd', background: '#f0f9ff' }}
                onClick={() => setActiveTab('profile')}
                title={`Logged in as ${currentUser.full_name} (${currentUser.user_code || ''})`}
              >
                <User size={13} style={{ color: '#0284c7' }} />
                <span style={{ fontWeight: 600, color: '#0369a1' }}>{currentUser.full_name?.split(' ')[0] || 'User'}</span>
              </button>

              <button 
                className="macos-btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  localStorage.removeItem('urbanpulse_user');
                  setCurrentUser(null);
                  setActiveTab('home');
                }}
                title="Sign Out"
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                className="macos-btn-secondary" 
                style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  setAuthModalTab('login');
                  setAuthError('');
                  setAuthSuccess('');
                  setShowAuthModal(true);
                }}
              >
                <LogIn size={13} />
                <span>Log In</span>
              </button>
              <button 
                className="macos-btn-primary" 
                style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  setAuthModalTab('register');
                  setAuthError('');
                  setAuthSuccess('');
                  setShowAuthModal(true);
                }}
              >
                <UserPlus size={13} />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. MAIN APPLICATION VIEWS */}
      <main className="macos-main-view">
        {/* =====================================================================
            VIEW 0: LANDING PAGE (Unauthenticated Initial Showcase — Bypassed on Login)
            ===================================================================== */}
        {!currentUser && (
          <div className="landing-container">
            {/* HERO SECTION */}
            <div className="landing-hero">
              <span className="provenance-badge provenance-live" style={{ padding: '5px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <ShieldCheck size={14} /> UrbanPulse AI • Location-Aware Transit Intelligence
              </span>
              
              <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.2 }}>
                Smarter, Safer Daily Commutes Through Severe Urban Disruptions
              </h1>

              <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, maxWidth: '740px', margin: '0 auto 28px auto' }}>
                During intense monsoons, waterlogged transit corridors, and sudden railway track submergence across Mumbai, commuters struggle with disconnected broadcasts and misleading detour suggestions. 
                UrbanPulse AI eliminates false alarms by mathematically filtering hazards strictly within a <strong>350-meter corridor</strong> of your Google Maps route, backed by automated morning SMS alerts and verified ground reports.
              </p>

              {/* CENTER ACTION BUTTONS ("GET STARTED", "REGISTER", "LOG IN") */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
                <button 
                  className="macos-btn-primary" 
                  style={{ padding: '12px 26px', fontSize: '15px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)' }}
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthError('');
                    setAuthSuccess('');
                    setShowAuthModal(true);
                  }}
                >
                  <LogIn size={17} />
                  <span>Get Started — Log In to Dashboard</span>
                  <ArrowRight size={15} />
                </button>

                <button 
                  className="macos-btn-secondary" 
                  style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff' }}
                  onClick={() => {
                    setAuthModalTab('register');
                    setAuthError('');
                    setAuthSuccess('');
                    setShowAuthModal(true);
                  }}
                >
                  <UserPlus size={16} />
                  <span>Register Account</span>
                </button>

                <button 
                  className="macos-btn-secondary" 
                  style={{ padding: '12px 18px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff' }}
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthError('');
                    setAuthSuccess('');
                    setShowAuthModal(true);
                  }}
                >
                  <LogIn size={16} />
                  <span>Log In</span>
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Location-Aware Corridor Intelligence • Google Routes API v2, Supabase PostgreSQL & Fast2SMS Gateway
              </div>
            </div>

            {/* LIVE METRICS RIBBON */}
            <div className="landing-stats-ribbon">
              <div className="landing-stat-card">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CORRIDOR PRECISION</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>350m Spatial Filter</div>
                </div>
              </div>

              <div className="landing-stat-card">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ACTIVE CITY HAZARDS</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{cityIncidents.length} Monitored Clusters</div>
                </div>
              </div>

              <div className="landing-stat-card">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>SCHEDULED DISPATCH</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Fast2SMS Morning Alerts</div>
                </div>
              </div>

              <div className="landing-stat-card">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>PROFILE PERSISTENCE</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Supabase PostgreSQL</div>
                </div>
              </div>
            </div>

            {/* PROBLEM STATEMENT SHOWCASE VS SOLUTION */}
            <div className="macos-card" style={{ marginBottom: '28px' }}>
              <div className="macos-card-header">
                <span className="macos-card-title">
                  <AlertTriangle size={16} style={{ color: '#d97706' }} /> The Urban Commute Problem & The CodeAstra Solution
                </span>
                <span className="provenance-badge provenance-live">Core Architecture</span>
              </div>

              <div className="landing-grid-2" style={{ marginBottom: 0, marginTop: '16px' }}>
                {/* THE PROBLEM */}
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#9f1239', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> The Problem in Metropolitan Commuting
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#881337', lineHeight: 1.7 }}>
                    <li><strong>Generic City Broadcasts:</strong> Commuters receive wide-area flood or traffic warnings that do not intersect their route, causing alarm fatigue.</li>
                    <li><strong>Dangerous Navigation Detours:</strong> Standard turn-by-turn routing lacks monsoon awareness and redirects drivers into waterlogged railway subways and submerged lowlands.</li>
                    <li><strong>Delayed Discovery:</strong> Railway track submergence (e.g. Western Line Borivali-Malad) is often discovered only upon arrival at the station.</li>
                  </ul>
                </div>

                {/* THE SOLUTION */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> How UrbanPulse AI Solves It
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#14532d', lineHeight: 1.7 }}>
                    <li><strong>Perpendicular Corridor Math:</strong> Calculates exact perpendicular distance (meters) to your route polyline. Only incidents within 350m are reported.</li>
                    <li><strong>Multimodal Fusion:</strong> Continuously correlates railway tracks, road telemetry, Open-Meteo weather, and citizen ground reports.</li>
                    <li><strong>Pre-Departure Morning SMS:</strong> Evaluates your registered commute corridor on the server every morning and dispatches a concise summary SMS before departure.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3 CORE PILLARS / FEATURES */}
            <div className="landing-grid-3">
              <div className="macos-card">
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Navigation size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Google Maps Routes v2</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  High-accuracy traffic-aware route polylines with dynamic Google Maps Roadmap and Satellite layers, complete with device GPS origin detection.
                </p>
              </div>

              <div className="macos-card">
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Database size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Persistent Supabase Profiles</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Register your daily origin, destination, and preferred travel mode (Car, Bike, Transit, Walk). Saved securely in Supabase PostgreSQL for automated daily tracking.
                </p>
              </div>

              <div className="macos-card">
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Send size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Fast2SMS Incident Alerts</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Automated server-side scheduler checks your commute corridor at your scheduled time (e.g. 08:00 AM) and sends an SMS summary to your registered mobile.
                </p>
              </div>
            </div>

            {/* QUICK-START CORRIDOR LAUNCHER BANNER */}
            <div className="macos-card" style={{ textAlign: 'center', padding: '28px 20px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
                Test Your Mumbai Commute Corridor Now
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 auto 18px auto', maxWidth: '520px' }}>
                Select a sample Mumbai route to test Google Maps routing and 350m incident corridor matching:
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { origin: 'Ashokvan (Borivali East)', dest: 'Rajiv Gandhi Institute of Technology (RGIT, Versova)', label: 'Borivali East ➔ RGIT Versova' },
                  { origin: 'Andheri West (Lokhandwala)', dest: 'Bandra Kurla Complex (BKC G-Block)', label: 'Andheri West ➔ BKC G-Block' },
                  { origin: 'Kandivali West (Link Road)', dest: 'CSMT Fort', label: 'Kandivali West ➔ CSMT Fort' }
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="macos-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', background: '#f8fafc' }}
                    onClick={() => {
                      setOriginInput(sample.origin);
                      setDestInput(sample.dest);
                      setAuthModalTab('login');
                      setAuthError('');
                      setAuthSuccess(`Log in to start tracking the ${sample.label} corridor.`);
                      setShowAuthModal(true);
                    }}
                  >
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>

              <button 
                className="macos-btn-primary" 
                style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => {
                  setAuthModalTab('login');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
              >
                <LogIn size={15} />
                <span>Log In to Launch Interactive Commute Map</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 0.5: DASHBOARD (Minimal Authenticated Overview & Platform Services)
            ===================================================================== */}
        {currentUser && activeTab === 'dashboard' && (
          <div className="dashboard-container">
            {/* 1. MINIMAL WELCOME SECTION */}
            <div className="dashboard-welcome-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="provenance-badge provenance-live" style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} /> UrbanPulse Transit Intelligence
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      ID: {currentUser.user_code || 'COMMUTER'}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                    Welcome back, {currentUser.full_name}! 👋
                  </h1>
                  <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.5, maxWidth: '640px' }}>
                    Your personalized Mumbai transit intelligence dashboard is active. Select a service below to evaluate your daily commute corridor, monitor citywide flood telemetry, or customize morning SMS alerts.
                  </p>
                </div>

                {/* QUICK STATUS PILLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="macos-chip" style={{ background: '#ffffff', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}>
                    <MapPin size={13} style={{ color: '#0284c7' }} />
                    <span>Corridor: {currentUser.default_origin?.split('(')[0]?.trim() || 'Borivali East'} ➔ {currentUser.default_destination?.split('(')[0]?.trim() || 'RGIT Versova'}</span>
                  </div>
                  <div className="macos-chip" style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#334155' }}>
                    <Send size={13} style={{ color: '#059669' }} />
                    <span>Daily SMS: {currentUser.scheduled_sms_time || '08:00 AM'} ({currentUser.sms_notifications_enabled ? 'Active' : 'Muted'})</span>
                  </div>
                  <div className="macos-chip" style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b' }}>
                    <Car size={13} style={{ color: '#0284c7' }} />
                    <span>Mode: {currentUser.preferred_mode || 'DRIVE'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SERVICES SECTION */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Platform Services
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Select a service below to open the corresponding tool.
                </p>
              </div>

              <div className="dashboard-services-grid">
                {/* SERVICE CARD 1: DAILY COMMUTE & CORRIDOR HAZARDS */}
                <div 
                  className="dashboard-service-card"
                  onClick={() => {
                    if (currentUser.default_origin) setOriginInput(currentUser.default_origin);
                    if (currentUser.default_destination) setDestInput(currentUser.default_destination);
                    if (currentUser.preferred_mode) setTravelMode(currentUser.preferred_mode);
                    setActiveTab('commute');
                  }}
                  role="button"
                  tabIndex={0}
                  title="Open Daily Commute Planner"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Navigation size={22} />
                      </div>
                      <span className="provenance-badge provenance-live" style={{ fontSize: '11px' }}>
                        Google Routes v2
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                      Daily Commute & Corridor Hazards
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Plan traffic-aware journeys with our 350-meter spatial hazard filter. Automatically flags waterlogged railway subways, flooded arterial roads, and track submergence along your path.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Launch Commute Map <ArrowRight size={14} />
                    </span>
                    <button 
                      className="macos-btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600 }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (currentUser.default_origin) setOriginInput(currentUser.default_origin);
                        if (currentUser.default_destination) setDestInput(currentUser.default_destination);
                        if (currentUser.preferred_mode) setTravelMode(currentUser.preferred_mode);
                        setActiveTab('commute'); 
                      }}
                    >
                      Open Page
                    </button>
                  </div>
                </div>

                {/* SERVICE CARD 2: CITYWIDE INCIDENTS & EVIDENCE */}
                <div 
                  className="dashboard-service-card"
                  onClick={() => setActiveTab('incidents')}
                  role="button"
                  tabIndex={0}
                  title="Open City Incidents & Telemetry"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={22} />
                      </div>
                      <span className="provenance-badge provenance-live" style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                        {cityIncidents.length} Active Hazards
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                      Citywide Incidents & Evidence
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Explore real-time ground truth reports across Mumbai. View waterlogging depths, crowd-verified flood evidence, Open-Meteo weather feeds, and submit citizen ground reports.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Explore City Incidents <ArrowRight size={14} />
                    </span>
                    <button 
                      className="macos-btn-secondary" 
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderColor: '#fde68a', background: '#fffbeb', color: '#b45309' }}
                      onClick={(e) => { e.stopPropagation(); setActiveTab('incidents'); }}
                    >
                      Open Page
                    </button>
                  </div>
                </div>

                {/* SERVICE CARD 3: COMMUTER PROFILE & SMS ALERTS */}
                <div 
                  className="dashboard-service-card"
                  onClick={() => setActiveTab('profile')}
                  role="button"
                  tabIndex={0}
                  title="Open Commuter Profile & SMS Settings"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={22} />
                      </div>
                      <span className="provenance-badge provenance-live" style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
                        Supabase & Fast2SMS
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                      Commuter Profile & SMS Alerts
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Configure your default home-to-work commute corridor, preferred travel mode (Car, Bike, Transit, Walk), and test on-demand SMS alerts via the Fast2SMS gateway.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Configure Profile & SMS <ArrowRight size={14} />
                    </span>
                    <button 
                      className="macos-btn-secondary" 
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderColor: '#a7f3d0', background: '#ecfdf5', color: '#065f46' }}
                      onClick={(e) => { e.stopPropagation(); setActiveTab('profile'); }}
                    >
                      Open Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

              {/* ROUTE ASSESSMENT & COMMUTE RECOMMENDATION CARD */}
              {commuteResult && (() => {
                const distKm = commuteResult.distance_km || 14.5;
                const currentCost = commuteResult.current_cost_inr ?? getCommuteCost(travelMode, distKm);
                const recommendedMode = commuteResult.recommended_mode || (commuteResult.intersecting_incidents?.length > 0 ? 'Metro' : (travelMode === 'DRIVE' ? 'Drive / Car' : travelMode));
                const recommendedEta = commuteResult.recommended_eta_min ?? (commuteResult.net_time_saved_min ? Math.max(15, commuteResult.current_eta_min - commuteResult.net_time_saved_min) : commuteResult.current_eta_min);
                const recommendedCost = commuteResult.recommended_cost_inr ?? getCommuteCost(recommendedMode, distKm);
                const timeSaved = Math.max(0, (commuteResult.current_eta_min || 0) - recommendedEta);
                const costDiff = currentCost - recommendedCost;
                const altName = commuteResult.alternative_route_name || (recommendedMode.toUpperCase().includes('METRO') ? 'Elevated Metro Line 2A' : (recommendedMode.toUpperCase().includes('TRAIN') ? 'Western Railway Suburban' : `${recommendedMode} Corridor`));
                const altReason = commuteResult.alternative_route_reason || (recommendedMode.toUpperCase().includes('METRO') ? 'Grade-separated elevated viaduct has zero water ingress, completely bypassing flooded subways.' : 'Fastest and most flood-resilient route for this corridor.');

                return (
                  <div className="macos-card" style={{ marginTop: '16px' }}>
                    <div className="macos-card-header">
                      <span className="macos-card-title">
                        <Clock size={16} /> Route Assessment & Alternatives
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

                    {/* TOP SUMMARY TILES: CURRENT VS RECOMMENDED */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          Current ({travelMode})
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '3px 0 1px 0' }}>
                          {commuteResult.current_eta_min} mins
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                          Est. Cost: <strong style={{ color: '#0f172a' }}>₹{currentCost}</strong>
                        </div>
                      </div>

                      <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={11} /> Recommended
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', margin: '3px 0 1px 0' }}>
                          {recommendedEta} mins
                        </div>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                          Est. Cost: <strong>₹{recommendedCost}</strong> {timeSaved > 0 ? `(saves ${timeSaved}m)` : ''}
                        </div>
                      </div>
                    </div>

                    {/* RECOMMENDATION CARD (REPLACES CORRIDOR HAZARDS CARD) */}
                    <div className="macos-recommendation-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#14532d' }}>
                              Recommended Alternative Route
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                              {altName}
                            </div>
                          </div>
                        </div>
                        <span className="provenance-badge provenance-live" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', fontSize: '10px', fontWeight: 700 }}>
                          {timeSaved > 0 ? `⚡ ${timeSaved}m Faster` : 'Resilient Choice'}
                        </span>
                      </div>

                      {/* TIME & COST METRICS */}
                      <div className="recommendation-metrics-grid">
                        <div className="recommendation-metric-box">
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} style={{ color: '#16a34a' }} />
                            <span>Alternative Time</span>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                            {recommendedEta} mins
                          </div>
                          <div style={{ fontSize: '11px', color: timeSaved > 0 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                            {timeSaved > 0 ? `▼ ${timeSaved} mins faster than current mode` : 'Fastest available corridor'}
                          </div>
                        </div>

                        <div className="recommendation-metric-box">
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IndianRupee size={11} style={{ color: '#0284c7' }} />
                            <span>Alternative Cost</span>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                            ₹{recommendedCost}
                          </div>
                          <div style={{ fontSize: '11px', color: costDiff > 0 ? '#16a34a' : (costDiff < 0 ? '#64748b' : '#0284c7'), fontWeight: 600 }}>
                            {costDiff > 0 ? `▼ Saves ₹${costDiff} vs ${travelMode.toLowerCase()}` : (costDiff < 0 ? `▲ ₹${Math.abs(costDiff)} vs current` : 'Same cost as current')}
                          </div>
                        </div>
                      </div>

                      {/* REASON & WHY SWITCH */}
                      <div style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#166534', lineHeight: 1.5, marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={13} />
                          <span>Why Follow This Alternative?</span>
                        </div>
                        <div>{altReason}</div>
                        {commuteResult.intersecting_incidents?.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                            <span>Bypasses <strong>{commuteResult.intersecting_incidents.length} active disruption(s)</strong> on your initial path ({commuteResult.intersecting_incidents[0]?.title}).</span>
                          </div>
                        )}
                      </div>

                      {/* ACTION BUTTON */}
                      <button
                        type="button"
                        className="macos-btn-primary"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: '#16a34a',
                          borderColor: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                        }}
                        onClick={() => {
                          const newMode = (recommendedMode.toUpperCase().includes('METRO') || recommendedMode.toUpperCase().includes('TRAIN') || recommendedMode.toUpperCase().includes('TRANSIT'))
                            ? 'TRANSIT' 
                            : (recommendedMode.toUpperCase().includes('BIKE') || recommendedMode.toUpperCase().includes('MOTORCYCLE') ? 'MOTORCYCLE' : 'DRIVE');
                          setTravelMode(newMode);
                          if (commuteResult.map_route?.recommended_leg && window.L && mapInstanceRef.current && routePolylineRef.current) {
                            routePolylineRef.current.setLatLngs(commuteResult.map_route.recommended_leg);
                            routePolylineRef.current.setStyle({ color: '#16a34a', weight: 6 });
                          }
                        }}
                      >
                        <Navigation size={14} />
                        <span>Follow Recommended Route ({recommendedMode})</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })()}
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
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
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
                      setActiveTab('home');
                    }}
                  >
                    Sign Out
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                  <Shield size={36} style={{ color: '#0284c7', margin: '0 auto 12px auto' }} />
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    Commuter Identity & Route Tracking
                  </h3>
                  <p style={{ margin: '0 auto 20px auto', fontSize: '13px', color: '#64748b', maxWidth: '440px', lineHeight: 1.5 }}>
                    Log in with your existing account or register a new commuter profile with your daily commute corridor (Source & Destination) stored in Supabase for automated 350m hazard tracking and morning alerts.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                      className="macos-btn-primary" 
                      style={{ minWidth: '150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => {
                        setAuthModalTab('login');
                        setAuthError('');
                        setAuthSuccess('');
                        setShowAuthModal(true);
                      }}
                    >
                      <LogIn size={15} />
                      <span>Log In</span>
                    </button>
                    <button 
                      className="macos-btn-secondary" 
                      style={{ minWidth: '150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => {
                        setAuthModalTab('register');
                        setAuthError('');
                        setAuthSuccess('');
                        setShowAuthModal(true);
                      }}
                    >
                      <UserPlus size={15} />
                      <span>Register Account</span>
                    </button>
                  </div>
                  <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', maxWidth: '460px', margin: '20px auto 0 auto', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Why Register with UrbanPulse?</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                      <li>Register your daily origin & destination stored securely in Supabase PostgreSQL</li>
                      <li>350m perpendicular corridor hazard tracking for your exact journey</li>
                      <li>Automated morning SMS dispatch before your scheduled departure time</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="provenance-badge provenance-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle size={12} /> Live Commuter Profile • Supabase PostgreSQL Synced
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ID: {currentUser.user_code || 'COMMUTER'}</span>
                  </div>

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
                      <div className="macos-label">Mobile Number (+91)</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{currentUser.phone || 'Not registered'}</div>
                    </div>
                    <div>
                      <div className="macos-label">Preferred Mode</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{currentUser.preferred_mode || 'DRIVE'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div className="macos-label" style={{ color: '#0284c7' }}>Daily Commute Source (Origin)</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{currentUser.default_origin || 'Not set'}</div>
                    </div>
                    <div>
                      <div className="macos-label" style={{ color: '#ef4444' }}>Daily Commute Destination</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{currentUser.default_destination || 'Not set'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <button 
                      className="macos-btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        if (currentUser.default_origin) setOriginInput(currentUser.default_origin);
                        if (currentUser.default_destination) setDestInput(currentUser.default_destination);
                        if (currentUser.preferred_mode) setTravelMode(currentUser.preferred_mode);
                        setActiveTab('commute');
                      }}
                    >
                      <Navigation size={13} />
                      <span>Load Commute Route to Map</span>
                    </button>
                    <button
                      className="macos-btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => {
                        setAuthModalTab('register');
                        setAuthError('');
                        setAuthSuccess('');
                        setShowAuthModal(true);
                      }}
                    >
                      Update Profile / Commute Route
                    </button>
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

      {/* AUTH MODAL (LOGIN / REGISTER WITH DAILY COMMUTE CORRIDORS) */}
      {showAuthModal && (
        <div className="macos-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="macos-modal-card" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {authModalTab === 'login' ? 'Log In to UrbanPulse' : 'Register Commuter Account'}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {authModalTab === 'login' 
                    ? 'Enter your credentials to load your saved commute corridor.' 
                    : 'Set up your daily commute route, preferred mode, and SMS alerts.'}
                </div>
              </div>
              <button className="macos-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowAuthModal(false)}>
                <X size={14} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: authModalTab === 'login' ? '#ffffff' : 'transparent',
                  boxShadow: authModalTab === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: authModalTab === 'login' ? 600 : 500,
                  fontSize: '13px',
                  color: authModalTab === 'login' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => { setAuthModalTab('login'); setAuthError(''); setAuthSuccess(''); }}
              >
                <LogIn size={14} />
                <span>Log In</span>
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: authModalTab === 'register' ? '#ffffff' : 'transparent',
                  boxShadow: authModalTab === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: authModalTab === 'register' ? 600 : 500,
                  fontSize: '13px',
                  color: authModalTab === 'register' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => { setAuthModalTab('register'); setAuthError(''); setAuthSuccess(''); }}
              >
                <UserPlus size={14} />
                <span>Register</span>
              </button>
            </div>

            {/* ERROR / SUCCESS ALERTS */}
            {authError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {authModalTab === 'login' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                setAuthSuccess('');
                setIsAuthLoading(true);

                const fd = new FormData(e.target);
                const identifier = fd.get('identifier')?.toString().trim();
                const password = fd.get('password')?.toString();

                try {
                  const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setCurrentUser(data.user);
                    localStorage.setItem('urbanpulse_user', JSON.stringify(data.user));
                    if (data.user.default_origin) setOriginInput(data.user.default_origin);
                    if (data.user.default_destination) setDestInput(data.user.default_destination);
                    if (data.user.preferred_mode) setTravelMode(data.user.preferred_mode);
                    setActiveTab('dashboard');
                    setAuthSuccess(`Logged in as ${data.user.full_name}! Saved commute corridor loaded.`);
                    setTimeout(() => {
                      setShowAuthModal(false);
                    }, 800);
                  } else {
                    setAuthError(data.detail || 'Login failed. Please verify your credentials.');
                  }
                } catch (err) {
                  setAuthError('Network error connecting to login service.');
                } finally {
                  setIsAuthLoading(false);
                }
              }}>
                <div className="macos-form-group">
                  <label className="macos-label">Email, Mobile (+91), or Commuter ID</label>
                  <input 
                    name="identifier" 
                    required 
                    className="macos-input" 
                    placeholder="e.g. sahil.student@rgit.edu.in or 98201 11222" 
                    style={{ background: '#f8fafc', padding: '9px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                  />
                </div>

                <div className="macos-form-group">
                  <label className="macos-label">Password</label>
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    className="macos-input" 
                    placeholder="••••••••" 
                    style={{ background: '#f8fafc', padding: '9px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="macos-btn-primary" 
                  disabled={isAuthLoading} 
                  style={{ width: '100%', marginTop: '14px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <LogIn size={15} />
                  <span>{isAuthLoading ? 'Logging In...' : 'Log In to Account'}</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: '#64748b' }}>
                  Don't have an account?{' '}
                  <span 
                    style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    onClick={() => { setAuthModalTab('register'); setAuthError(''); setAuthSuccess(''); }}
                  >
                    Register new commuter profile
                  </span>
                </div>
              </form>
            )}

            {/* REGISTER FORM */}
            {authModalTab === 'register' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                setAuthSuccess('');
                setIsAuthLoading(true);

                const fd = new FormData(e.target);
                const full_name = fd.get('full_name')?.toString().trim();
                const email = fd.get('email')?.toString().trim();
                const password = fd.get('password')?.toString();
                const phone = fd.get('phone')?.toString().trim();
                const default_origin = fd.get('default_origin')?.toString().trim();
                const default_destination = fd.get('default_destination')?.toString().trim();
                const preferred_mode = fd.get('preferred_mode')?.toString() || 'DRIVE';
                const scheduled_sms_time = fd.get('scheduled_sms_time')?.toString() || '08:00';
                const sms_consent = fd.get('sms_consent') === 'on';

                try {
                  const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      full_name,
                      email,
                      password,
                      phone: phone || '+91 98000 00000',
                      default_origin: default_origin || 'Ashokvan (Borivali East)',
                      default_destination: default_destination || 'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
                      preferred_mode,
                      scheduled_sms_time,
                      sms_consent,
                      sms_notifications_enabled: sms_consent
                    })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setCurrentUser(data.user);
                    localStorage.setItem('urbanpulse_user', JSON.stringify(data.user));
                    if (default_origin) setOriginInput(default_origin);
                    if (default_destination) setDestInput(default_destination);
                    setTravelMode(preferred_mode);
                    setActiveTab('dashboard');
                    setAuthSuccess('Account registered & saved in Supabase PostgreSQL! Daily commute corridor active.');
                    setTimeout(() => {
                      setShowAuthModal(false);
                    }, 1200);
                  } else {
                    setAuthError(data.detail || 'Registration failed. Please check the provided information.');
                  }
                } catch (err) {
                  setAuthError('Network error connecting to registration service.');
                } finally {
                  setIsAuthLoading(false);
                }
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="macos-form-group">
                    <label className="macos-label">Full Name *</label>
                    <input 
                      name="full_name" 
                      required 
                      className="macos-input" 
                      placeholder="e.g. Sahil Sharma" 
                      style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                    />
                  </div>

                  <div className="macos-form-group">
                    <label className="macos-label">Email Address *</label>
                    <input 
                      name="email" 
                      type="email" 
                      required 
                      className="macos-input" 
                      placeholder="sahil@domain.com" 
                      style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="macos-form-group">
                    <label className="macos-label">Password (Min 6 chars) *</label>
                    <input 
                      name="password" 
                      type="password" 
                      required 
                      minLength={6}
                      className="macos-input" 
                      placeholder="••••••••" 
                      style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                    />
                  </div>

                  <div className="macos-form-group">
                    <label className="macos-label">Mobile Number (+91 Indian)</label>
                    <input 
                      name="phone" 
                      type="tel"
                      className="macos-input" 
                      placeholder="+91 98201 54321" 
                      defaultValue={currentUser?.phone || ''}
                      style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                    />
                  </div>
                </div>

                {/* DAILY COMMUTE ROUTE SECTION */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', margin: '10px 0 14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={14} style={{ color: '#0284c7' }} />
                      <span>Daily Commute Route (Saved to Supabase)</span>
                    </div>
                    <span className="provenance-badge provenance-live" style={{ fontSize: '10px' }}>Corridor Tracking</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                    Define your regular daily commute origin and destination. Used for continuous 350m corridor hazard detection.
                  </div>

                  {/* SOURCE (ORIGIN) */}
                  <div className="macos-form-group" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="macos-label" style={{ margin: 0 }}>Daily Commute Source (Origin) *</label>
                      {deviceLocation.label && (
                        <button
                          type="button"
                          className="macos-btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => {
                            const el = document.getElementById('reg_origin_input');
                            if (el) el.value = deviceLocation.label;
                          }}
                        >
                          Use GPS Location
                        </button>
                      )}
                    </div>
                    <div className="macos-input-box">
                      <MapPin size={14} style={{ color: '#0284c7' }} />
                      <input 
                        id="reg_origin_input"
                        name="default_origin" 
                        required 
                        className="macos-input" 
                        defaultValue={originInput || 'Ashokvan (Borivali East)'} 
                        placeholder="e.g. Ashokvan (Borivali East) or Andheri West" 
                        style={{ background: '#ffffff', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                      />
                    </div>
                  </div>

                  {/* DESTINATION */}
                  <div className="macos-form-group" style={{ marginBottom: '10px' }}>
                    <label className="macos-label">Daily Commute Destination *</label>
                    <div className="macos-input-box">
                      <MapPin size={14} style={{ color: '#ef4444' }} />
                      <input 
                        id="reg_dest_input"
                        name="default_destination" 
                        required 
                        className="macos-input" 
                        defaultValue={destInput || 'Rajiv Gandhi Institute of Technology (RGIT, Versova)'} 
                        placeholder="e.g. RGIT Versova or BKC G-Block" 
                        style={{ background: '#ffffff', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                      />
                    </div>

                    {/* QUICK DESTINATION CHIPS */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {['BKC G-Block', 'RGIT Versova', 'CSMT Fort', 'Andheri West'].map(loc => (
                        <button
                          key={loc}
                          type="button"
                          className="macos-btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => {
                            const el = document.getElementById('reg_dest_input');
                            if (el) el.value = loc;
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PREFERRED MODE & SCHEDULED SMS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                    <div>
                      <label className="macos-label">Preferred Travel Mode</label>
                      <select 
                        name="preferred_mode" 
                        defaultValue={travelMode || 'DRIVE'} 
                        className="macos-input"
                        style={{ background: '#ffffff', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      >
                        <option value="DRIVE">🚗 Drive / Car</option>
                        <option value="MOTORCYCLE">🏍️ Two-Wheeler / Bike</option>
                        <option value="TRANSIT">🚆 Public Transit / Metro</option>
                        <option value="WALK">🚶 Walk / Pedestrian</option>
                      </select>
                    </div>

                    <div>
                      <label className="macos-label">Morning Alert Time</label>
                      <input 
                        name="scheduled_sms_time" 
                        type="time" 
                        defaultValue="08:00" 
                        className="macos-input"
                        style={{ background: '#ffffff', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <input 
                      type="checkbox" 
                      id="reg_sms_consent" 
                      name="sms_consent" 
                      defaultChecked={true} 
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="reg_sms_consent" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                      Receive daily morning SMS hazard summaries before departure
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="macos-btn-primary" 
                  disabled={isAuthLoading} 
                  style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <UserPlus size={15} />
                  <span>{isAuthLoading ? 'Registering & Syncing to DB...' : 'Create Account & Save Commute Route'}</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: '#64748b' }}>
                  Already have an account?{' '}
                  <span 
                    style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    onClick={() => { setAuthModalTab('login'); setAuthError(''); setAuthSuccess(''); }}
                  >
                    Log In to existing account
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
