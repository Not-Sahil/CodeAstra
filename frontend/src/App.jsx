import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, Train, Navigation, Bike, Bus, AlertTriangle, 
  CheckCircle2, Compass, Activity, Play, Pause, RefreshCw, BarChart3, 
  MapPin, Clock, ArrowRight, Eye, GitBranch, Layers, Sparkles, User,
  Radio, Send, Bot, Check, Info, FileText, ChevronRight, Zap, Database,
  Settings, ExternalLink, Filter, HelpCircle, AlertOctagon, RotateCcw,
  LogIn, LogOut, UserPlus, Locate, Target, Menu, X, Home, LayoutDashboard, ChevronDown
} from 'lucide-react';
import AuthView from './AuthView';
import ProximityRadarView from './ProximityRadarView';
import LandingView from './LandingView';
import DashboardView from './DashboardView';
import StudentCommuteView from './StudentCommuteView';
import CommandCentreMapView from './CommandCentreMapView';
import UrbanRippleGraphView from './UrbanRippleGraphView';
import ReplayLabView from './ReplayLabView';
import SecondIncidentView from './SecondIncidentView';
import EvaluationView from './EvaluationView';

const API_BASE = window.location.origin;

export default function App() {
  // Navigation: 10 structured pages matching the screenshot theme
  const [activeTab, setActiveTab] = useState('landing'); 
  // 'landing' (Landing Page with Hero & Platform Overview)
  // 'dashboard' (Executive Operations Dashboard)
  // 'map' (Act 1: Command Centre & Citywide Map with Live User Radar)
  // 'proximity' (Live User Location Tracking & Nearby Hazard Radar)
  // 'graph' (Act 2: Urban Ripple Graph)
  // 'replay' (Act 3: AI Challenges Its Own Conclusion - Replay Lab)
  // 'commute' (Acts 4 & 5: Commute Assistant & Intelligent Rerouting)
  // 'second_incident' (Act 6: Second Incident Extension)
  // 'eval' (Act 7: Evaluation & Evidence Metrics)
  // 'auth' (Commuter Account, Profile & Supabase Sync)

  // Closable / Openable Left Sidebar State (Toggled via 3-lines hamburger menu)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Commuter Identity & Authentication State
  const [currentUser, setCurrentUser] = useState(null);

  // Live User GPS Location Tracking State (Defaults to Malad Inundation Hotspot)
  const [userLocation, setUserLocation] = useState({
    lat: 19.1875,
    lon: 72.8504,
    accuracy: 8,
    heading: 180,
    speed: 24,
    source: 'HOTSPOT_PRESET',
    locationName: 'Malad Subway Inundation Hotspot',
    lastUpdated: '08:10:00 IST'
  });

  // Incidents & Intelligence Data
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('INC_MUM_20260715_01');
  const [ledgerData, setLedgerData] = useState(null);
  const [briefingData, setBriefingData] = useState(null);
  const [modelsMetrics, setModelsMetrics] = useState(null);
  const [currentTime, setCurrentTime] = useState('08:10:00 IST');
  const [simulationTimeline, setSimulationTimeline] = useState(null);

  // Commute Route Planner State (Default: Hero Student 001 Journey)
  const [commuterName, setCommuterName] = useState('Student 001 (Sahil)');
  const [commuteOrigin, setCommuteOrigin] = useState('Ashokvan (Borivali East)');
  const [commuteDestination, setCommuteDestination] = useState('Rajiv Gandhi Institute of Technology (RGIT, Versova)');
  const [commuteMode, setCommuteMode] = useState('MOTORCYCLE'); // 'MOTORCYCLE', 'TRAIN', 'METRO', 'BUS'
  const [customCommuteResult, setCustomCommuteResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Auth & Session Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.full_name) setCommuterName(user.full_name);
    if (user.default_origin) setCommuteOrigin(user.default_origin);
    if (user.default_destination) setCommuteDestination(user.default_destination);
    if (user.preferred_mode) setCommuteMode(user.preferred_mode);
    try {
      localStorage.setItem('urbanpulse_user', JSON.stringify(user));
    } catch (e) {}
    evaluateUserCommute(
      user.default_origin || commuteOrigin,
      user.default_destination || commuteDestination,
      user.preferred_mode || commuteMode,
      user.full_name || commuterName
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('urbanpulse_user');
    } catch (e) {}
  };

  // Restore session from localStorage or load seed user
  useEffect(() => {
    try {
      const saved = localStorage.getItem('urbanpulse_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.user_code) {
          setCurrentUser(u);
          if (u.full_name) setCommuterName(u.full_name);
          if (u.default_origin) setCommuteOrigin(u.default_origin);
          if (u.default_destination) setCommuteDestination(u.default_destination);
          if (u.preferred_mode) setCommuteMode(u.preferred_mode);
          return;
        }
      }
    } catch (e) {}

    // Auto-load default hero student from backend
    fetch(`${API_BASE}/api/auth/user/STUDENT_001`)
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user);
          if (d.user.full_name) setCommuterName(d.user.full_name);
          try {
            localStorage.setItem('urbanpulse_user', JSON.stringify(d.user));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Supabase Live Status
  const [supabaseStatus, setSupabaseStatus] = useState({ connected: false, mode: 'CHECKING...' });
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  // Google Maps API Key State & Map Provider ('google' or 'leaflet')
  const [googleApiKey, setGoogleApiKey] = useState(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('google_maps_api_key') || ''
  );
  const [mapProvider, setMapProvider] = useState(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('google_maps_api_key')) ? 'google' : 'leaflet'
  );
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  // Real-Time Streaming Ticker State
  const [liveStreamEvents, setLiveStreamEvents] = useState([]);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [streamStatus, setStreamStatus] = useState('CONNECTING');
  const [eventCounter, setEventCounter] = useState(0);
  const [latestTickEvent, setLatestTickEvent] = useState(null);

  // Map Layer Toggles & Style
  const [mapLayers, setMapLayers] = useState({
    railTracks: true,
    metroViaduct: true,
    floodZones: true,
    evaluatedRoute: true,
    trafficLayer: true,
    userScanRadar: true
  });
  const [mapTileStyle, setMapTileStyle] = useState('osm'); // 'osm' or 'dark'

  // Replay Lab State (Act Three)
  const [replayLogs, setReplayLogs] = useState([]);
  const [offlineSensors, setOfflineSensors] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayChallengeActive, setReplayChallengeActive] = useState(null);

  // Second Incident State (Act Six)
  const [isSecondIncidentTriggered, setIsSecondIncidentTriggered] = useState(false);

  // Map & Graph Refs
  const mapContainerRef = useRef(null);
  const googleMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleTrafficLayerRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const googlePolylinesRef = useRef([]);
  const layerGroupsRef = useRef({});
  const tileLayerRef = useRef(null);
  const graphContainerRef = useRef(null);
  const graphInstanceRef = useRef(null);

  const handleLocateBeacon = () => {
    if (mapProvider === 'google' && googleMapInstanceRef.current && window.google) {
      googleMapInstanceRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lon });
      googleMapInstanceRef.current.setZoom(14);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lon], 14, { duration: 1.2 });
    }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Data Fetches
  useEffect(() => {
    fetchIncidents();
    fetchLocations();
    fetchModelsMetrics();
    fetchSupabaseStatus();
    fetchSimulationTimeline();
    fetchConfidenceLedger(selectedIncidentId);
    fetchOperatorBriefing(selectedIncidentId);
    evaluateUserCommute('Ashokvan (Borivali East)', 'Rajiv Gandhi Institute of Technology (RGIT, Versova)', 'MOTORCYCLE', 'Student 001 (Sahil)');
  }, []);

  useEffect(() => {
    fetchConfidenceLedger(selectedIncidentId);
    fetchOperatorBriefing(selectedIncidentId);
    if (activeTab === 'graph') {
      renderIncidentGraph(selectedIncidentId);
    }
  }, [selectedIncidentId, activeTab]);

  // Handle Map Initialization / Switching
  useEffect(() => {
    if (activeTab === 'map') {
      if (mapProvider === 'google' && googleApiKey) {
        initGoogleMap();
      } else {
        setTimeout(() => initOrUpdateLeafletMap(), 150);
      }
    }
  }, [activeTab, mapProvider, mapTileStyle, googleApiKey]);

  // Re-populate map vectors when custom commute result or userLocation updates
  useEffect(() => {
    if (activeTab === 'map') {
      if (mapProvider === 'google' && googleMapInstanceRef.current) {
        renderGoogleMapFeatures();
      } else if (mapInstanceRef.current) {
        fetch(`${API_BASE}/api/map/layers`)
          .then(res => res.json())
          .then(data => populateMapVectors(data))
          .catch(console.error);
      }
    }
  }, [customCommuteResult, mapLayers, incidents, userLocation]);

  // =========================================================================
  // REAL-TIME STREAMING: WebSockets with SSE Fallback
  // =========================================================================
  useEffect(() => {
    if (isStreamPaused) return;

    let ws = null;
    let eventSource = null;
    let isSubscribed = true;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isSubscribed) setStreamStatus('WEBSOCKET_ACTIVE');
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            handleIncomingLiveTelemetry(data);
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onerror = () => {
          if (isSubscribed) fallbackToSSE();
        };

        ws.onclose = () => {
          if (isSubscribed && !isStreamPaused) {
            setTimeout(connectWebSocket, 4000);
          }
        };
      } catch (err) {
        fallbackToSSE();
      }
    };

    const fallbackToSSE = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/api/stream/events`);
        setStreamStatus('SSE_STREAMING');

        eventSource.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            handleIncomingLiveTelemetry(data);
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          if (isSubscribed) setStreamStatus('RECONNECTING');
        };
      } catch (err) {
        console.error('SSE setup error:', err);
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      if (eventSource) eventSource.close();
    };
  }, [isStreamPaused]);

  const handleIncomingLiveTelemetry = (eventItem) => {
    setLatestTickEvent(eventItem);
    setEventCounter(prev => prev + 1);
    setLiveStreamEvents(prev => [eventItem, ...prev.slice(0, 14)]);
  };

  // =========================================================================
  // API CALL HELPERS
  // =========================================================================
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents`);
      const data = await res.json();
      if (data.incidents) setIncidents(data.incidents);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commute/locations`);
      const data = await res.json();
      if (data.locations) setAvailableLocations(data.locations);
    } catch (err) {
      console.error('Error fetching commute locations:', err);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/supabase/status`);
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (err) {
      setSupabaseStatus({ connected: false, mode: 'OFFLINE_CACHE' });
    }
  };

  const syncSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await fetch(`${API_BASE}/api/supabase/sync`, { method: 'POST' });
      const data = await res.json();
      fetchSupabaseStatus();
      alert(`Supabase Sync: ${data.synced ? 'Successfully synced' : 'Cached locally'}: ${data.count} incidents.`);
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const fetchSimulationTimeline = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulation/timeline`);
      const data = await res.json();
      setSimulationTimeline(data);
    } catch (err) {
      console.error('Error fetching simulation timeline:', err);
    }
  };

  const evaluateUserCommute = async (
    origin = commuteOrigin,
    dest = commuteDestination,
    mode = commuteMode,
    name = commuterName,
    corridorThresholdM = 350.0
  ) => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`${API_BASE}/api/commute/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin || 'Ashokvan (Borivali East)',
          destination: dest || 'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
          preferred_mode: mode,
          name: name || 'Student 001 (Sahil)',
          corridor_threshold_m: corridorThresholdM || 350.0
        })
      });
      const data = await res.json();
      setCustomCommuteResult(data);
    } catch (err) {
      console.error('Error evaluating commute:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const fetchConfidenceLedger = async (incId) => {
    try {
      const res = await fetch(`${API_BASE}/api/incident/${incId}/ledger`);
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error('Error fetching confidence ledger:', err);
    }
  };

  const fetchOperatorBriefing = async (incId) => {
    try {
      const res = await fetch(`${API_BASE}/api/incident/${incId}/briefing`);
      const data = await res.json();
      setBriefingData(data);
    } catch (err) {
      console.error('Error fetching operator briefing:', err);
    }
  };

  const fetchModelsMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/models/metrics`);
      const data = await res.json();
      setModelsMetrics(data);
    } catch (err) {
      console.error('Error fetching model metrics:', err);
    }
  };

  // Replay Lab Handler (Act Three)
  const triggerReplayAction = async (actionType, payload = {}) => {
    setIsReplaying(true);
    setReplayChallengeActive(actionType);
    try {
      const res = await fetch(`${API_BASE}/api/replay/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, payload })
      });
      const data = await res.json();
      if (data.replay_log) setReplayLogs(data.replay_log);
      if (data.active_offline_sensors) setOfflineSensors(data.active_offline_sensors);
      if (data.updated_ledger) setLedgerData(data.updated_ledger);
      fetchIncidents();
      fetchConfidenceLedger(selectedIncidentId);
      if (activeTab === 'graph') {
        renderIncidentGraph(selectedIncidentId);
      }
    } catch (err) {
      console.error('Error executing replay action:', err);
    } finally {
      setTimeout(() => setIsReplaying(false), 300);
    }
  };

  // =========================================================================
  // GOOGLE MAPS API INTEGRATION WITH LIVE TRAFFIC LAYER
  // =========================================================================
  const loadGoogleMapsScript = (apiKey, callback) => {
    if (window.google && window.google.maps) {
      callback();
      return;
    }
    const scriptId = 'google-maps-script-tag';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => callback();
      script.onerror = () => {
        console.warn('Google Maps script failed to load. Switching to Leaflet free map.');
        setMapProvider('leaflet');
      };
      document.head.appendChild(script);
    } else {
      script.onload = () => callback();
    }
  };

  const initGoogleMap = () => {
    if (!googleApiKey) return;
    loadGoogleMapsScript(googleApiKey, () => {
      if (!googleMapContainerRef.current || !window.google) return;

      const map = new window.google.maps.Map(googleMapContainerRef.current, {
        center: { lat: 19.1850, lng: 72.8450 },
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] }
        ]
      });

      googleMapInstanceRef.current = map;

      // Google Traffic Layer
      if (mapLayers.trafficLayer) {
        const trafficLayer = new window.google.maps.TrafficLayer();
        trafficLayer.setMap(map);
        googleTrafficLayerRef.current = trafficLayer;
      }

      renderGoogleMapFeatures();
    });
  };

  const renderGoogleMapFeatures = () => {
    const map = googleMapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear old markers & polylines
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];
    googlePolylinesRef.current.forEach(p => p.setMap(null));
    googlePolylinesRef.current = [];

    // Map of route-relevant incidents for instant corridor lookup
    const routeRelevantMap = new Map();
    (customCommuteResult?.intersecting_incidents || []).forEach(inc => {
      routeRelevantMap.set(inc.incident_id, inc);
    });

    // Render incidents across Mumbai (Objective 4: Coordinate-Based Visualization)
    incidents.forEach(inc => {
      const lat = inc.latitude || inc.centroid_lat;
      const lon = inc.longitude || inc.centroid_lon;
      if (lat == null || lon == null) return;

      const matchedRouteInc = routeRelevantMap.get(inc.incident_id);
      const isRouteRelevant = Boolean(matchedRouteInc);
      const isCritical = inc.severity_level && inc.severity_level.includes('4');
      const markerColor = isRouteRelevant 
        ? '#ef4444' 
        : (isCritical ? '#f97316' : '#64748b');

      const marker = new window.google.maps.Marker({
        position: { lat, lng: lon },
        map: map,
        title: inc.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isRouteRelevant ? 11 : 7,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: isRouteRelevant ? '#ffffff' : '#e2e8f0',
          strokeWeight: isRouteRelevant ? 3 : 1.5
        }
      });

      const corridorBadge = isRouteRelevant
        ? `<div style="background:#fee2e2;color:#991b1b;padding:3px 7px;border-radius:4px;font-weight:700;margin-bottom:5px;font-size:10px;">⚠️ ON COMMUTE ROUTE (${matchedRouteInc.distance_from_route_meters || 0}m from centerline)</div>`
        : `<div style="background:#f1f5f9;color:#475569;padding:3px 7px;border-radius:4px;margin-bottom:5px;font-size:10px;">ℹ️ CITYWIDE INCIDENT (Outside route corridor)</div>`;

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color:#0f172a;padding:8px;max-width:260px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.4;">
            ${corridorBadge}
            <b style="color:${isRouteRelevant ? '#dc2626' : '#1e293b'};font-size:13px;">${inc.title}</b><br/>
            <div style="margin-top:4px;font-size:11px;color:#334155;">
              <b>Type:</b> ${inc.scenario_type}<br/>
              <b>Severity:</b> ${inc.severity_level}<br/>
              <b>Coordinates:</b> ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}<br/>
              <b>Source:</b> ${inc.source || 'CAD 112'} (Reliability: ${((inc.source_reliability || 0.94) * 100).toFixed(0)}%)<br/>
              <b>Status:</b> ${inc.status || 'ACTIVE'} ${inc.is_simulated ? '• [SIMULATED SCENARIO]' : ''}<br/>
              <b>Impact:</b> ${inc.known_cause || inc.description || 'Active disruption'}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedIncidentId(inc.incident_id);
      });

      googleMarkersRef.current.push(marker);

      // Circle buffer around incident
      const circle = new window.google.maps.Circle({
        strokeColor: markerColor,
        strokeOpacity: isRouteRelevant ? 0.9 : 0.4,
        strokeWeight: isRouteRelevant ? 2 : 1,
        fillColor: markerColor,
        fillOpacity: isRouteRelevant ? 0.22 : 0.08,
        map: map,
        center: { lat, lng: lon },
        radius: (inc.radius_km || 1.2) * 1000
      });
      googleMarkersRef.current.push(circle);
    });

    // Render Authoritative Google Maps Evaluated Route (Objective 2 & 4)
    const activeRoute = customCommuteResult?.map_route;
    if (activeRoute) {
      if (activeRoute.origin) {
        const originMarker = new window.google.maps.Marker({
          position: { lat: activeRoute.origin[0], lng: activeRoute.origin[1] },
          map: map,
          label: 'A',
          title: customCommuteResult?.origin || 'Origin'
        });
        googleMarkersRef.current.push(originMarker);
      }
      if (activeRoute.destination) {
        const destMarker = new window.google.maps.Marker({
          position: { lat: activeRoute.destination[0], lng: activeRoute.destination[1] },
          map: map,
          label: 'B',
          title: customCommuteResult?.destination || 'Destination'
        });
        googleMarkersRef.current.push(destMarker);
      }

      // 1. Authoritative Primary Route Polyline from Google Routes API v2
      if (activeRoute.primary_polyline && activeRoute.primary_polyline.length > 1) {
        const path = activeRoute.primary_polyline.map(c => ({ lat: c[0], lng: c[1] }));
        const isDisrupted = (customCommuteResult?.intersecting_incidents_count || 0) > 0;
        const poly = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: isDisrupted ? '#f43f5e' : '#38bdf8',
          strokeOpacity: 0.95,
          strokeWeight: 6
        });
        poly.setMap(map);
        googlePolylinesRef.current.push(poly);
      }

      // 2. Alternative Routes returned by Google Routes API
      if (activeRoute.alternative_polylines && activeRoute.alternative_polylines.length > 0) {
        activeRoute.alternative_polylines.forEach((altPoly, aIdx) => {
          if (altPoly && altPoly.length > 1) {
            const altPath = altPoly.map(c => ({ lat: c[0], lng: c[1] }));
            const polyAlt = new window.google.maps.Polyline({
              path: altPath,
              geodesic: true,
              strokeColor: '#94a3b8',
              strokeOpacity: 0.65,
              strokeWeight: 4
            });
            polyAlt.setMap(map);
            googlePolylinesRef.current.push(polyAlt);
          }
        });
      }

      // Backwards-compatible legs fallback if primary_polyline is missing
      if (!activeRoute.primary_polyline || activeRoute.primary_polyline.length <= 1) {
        if (activeRoute.disrupted_leg && activeRoute.disrupted_leg.length > 0) {
          const path = activeRoute.disrupted_leg.map(c => ({ lat: c[0], lng: c[1] }));
          const poly = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#f43f5e',
            strokeOpacity: 0.9,
            strokeWeight: 5
          });
          poly.setMap(map);
          googlePolylinesRef.current.push(poly);
        }
        if (activeRoute.recommended_leg && activeRoute.recommended_leg.length > 0) {
          const path = activeRoute.recommended_leg.map(c => ({ lat: c[0], lng: c[1] }));
          const poly = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#06d6a0',
            strokeOpacity: 1.0,
            strokeWeight: 5
          });
          poly.setMap(map);
          googlePolylinesRef.current.push(poly);
        }
      }
    }

    // Render Live User Scanning Beacon on Google Maps
    if (mapLayers.userScanRadar && userLocation?.lat && userLocation?.lon) {
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lon },
        map: map,
        title: `Your Live Position: ${userLocation.locationName || 'Mumbai Corridor'}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#0284c7',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });
      googleMarkersRef.current.push(userMarker);

      const userScanCircle = new window.google.maps.Circle({
        strokeColor: '#38bdf8',
        strokeOpacity: 0.85,
        strokeWeight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        map: map,
        center: { lat: userLocation.lat, lng: userLocation.lon },
        radius: 1200
      });
      googleMarkersRef.current.push(userScanCircle);
    }
  };

  const handleSaveApiKey = () => {
    const key = tempApiKeyInput.trim();
    if (key) {
      localStorage.setItem('google_maps_api_key', key);
      setGoogleApiKey(key);
      setMapProvider('google');
      setShowApiKeyModal(false);
    }
  };

  // =========================================================================
  // LEAFLET MAP LOGIC (Free OpenStreetMap / CartoDB Fallback)
  // =========================================================================
  const initOrUpdateLeafletMap = () => {
    if (!mapContainerRef.current || !window.L) return;

    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [19.1850, 72.8450],
        zoom: 12,
        zoomControl: true
      });

      mapInstanceRef.current = map;
      layerGroupsRef.current = {
        rail: L.layerGroup().addTo(map),
        metro: L.layerGroup().addTo(map),
        flood: L.layerGroup().addTo(map),
        evaluatedRoute: L.layerGroup().addTo(map),
        incidents: L.layerGroup().addTo(map),
        userRadar: L.layerGroup().addTo(map)
      };
    }

    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapTileStyle === 'osm') {
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB & OpenStreetMap',
        maxZoom: 19
      }).addTo(map);
    }

    fetch(`${API_BASE}/api/map/layers`)
      .then(res => res.json())
      .then(data => populateMapVectors(data))
      .catch(console.error);

    map.invalidateSize();
  };

  const populateMapVectors = (layerData) => {
    const L = window.L;
    if (!L || !layerGroupsRef.current.rail) return;

    layerGroupsRef.current.rail.clearLayers();
    layerGroupsRef.current.metro.clearLayers();
    layerGroupsRef.current.flood.clearLayers();
    layerGroupsRef.current.evaluatedRoute.clearLayers();
    layerGroupsRef.current.incidents.clearLayers();
    if (layerGroupsRef.current.userRadar) layerGroupsRef.current.userRadar.clearLayers();

    // 1. RAIL TRACKS
    if (mapLayers.railTracks && layerData.rail_tracks) {
      layerData.rail_tracks.forEach(track => {
        const poly = L.polyline(track.coords, {
          color: track.color || '#ef4444',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 6'
        }).bindPopup(`<strong>Western Railway Main Line</strong><br>${track.name}`);
        layerGroupsRef.current.rail.addLayer(poly);
      });
    }

    // 2. METRO VIADUCT
    if (mapLayers.metroViaduct && layerData.metro_viaduct) {
      layerData.metro_viaduct.forEach(metro => {
        const poly = L.polyline(metro.coords, {
          color: metro.color || '#10b981',
          weight: 4,
          opacity: 0.95
        }).bindPopup(`<strong>${metro.name}</strong><br>Elevated Viaduct (Flood Immune)`);
        layerGroupsRef.current.metro.addLayer(poly);
      });
    }

    // Map of route-relevant incidents for instant corridor lookup
    const routeRelevantMap = new Map();
    (customCommuteResult?.intersecting_incidents || []).forEach(inc => {
      routeRelevantMap.set(inc.incident_id, inc);
    });

    // 3. ALL MUMBAI LIVE INCIDENTS (Objective 1 & 4)
    incidents.forEach(inc => {
      const lat = inc.latitude || inc.centroid_lat;
      const lon = inc.longitude || inc.centroid_lon;
      if (lat == null || lon == null) return;

      const matchedRouteInc = routeRelevantMap.get(inc.incident_id);
      const isRouteRelevant = Boolean(matchedRouteInc);
      const isCritical = inc.severity_level && inc.severity_level.includes('4');
      const incColor = isRouteRelevant ? '#ef4444' : (isCritical ? '#f97316' : '#64748b');

      const circle = L.circle([lat, lon], {
        radius: (inc.radius_km || 1.2) * 1000,
        color: incColor,
        fillColor: incColor,
        fillOpacity: isRouteRelevant ? 0.25 : 0.08,
        weight: isRouteRelevant ? 2 : 1
      }).bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;line-height:1.4;">
          ${isRouteRelevant 
            ? `<div style="background:#fee2e2;color:#991b1b;padding:3px 6px;border-radius:4px;font-weight:700;margin-bottom:4px;font-size:10px;">⚠️ ON COMMUTE ROUTE (${matchedRouteInc.distance_from_route_meters}m from centerline)</div>` 
            : `<div style="background:#f1f5f9;color:#475569;padding:3px 6px;border-radius:4px;margin-bottom:4px;font-size:10px;">ℹ️ CITYWIDE INCIDENT (Outside corridor)</div>`
          }
          <strong style="color:${isRouteRelevant ? '#dc2626' : '#0f172a'}">🚨 ${inc.title}</strong><br/>
          <b>Type:</b> ${inc.scenario_type}<br/>
          <b>Severity:</b> ${inc.severity_level}<br/>
          <b>Coordinates:</b> ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}<br/>
          <b>Source:</b> ${inc.source || 'CAD 112'} • Reliability: ${((inc.source_reliability || 0.94) * 100).toFixed(0)}%<br/>
          <b>Cause:</b> ${inc.known_cause || inc.description || 'Active disruption'}
        </div>
      `);

      const marker = L.circleMarker([lat, lon], {
        radius: isRouteRelevant ? 11 : 6,
        color: isRouteRelevant ? '#ffffff' : '#cbd5e1',
        fillColor: incColor,
        fillOpacity: 1,
        weight: isRouteRelevant ? 3 : 1.5
      }).bindPopup(`
        <strong>${isRouteRelevant ? '⚠️ On Commute Route: ' : ''}${inc.title}</strong><br/>
        ${isRouteRelevant ? `<span style="color:#ef4444;font-size:11px;">${matchedRouteInc.distance_from_route_meters}m from Google route</span><br/>` : ''}
        <small>Click to inspect full evidence</small>
      `);

      marker.on('click', () => setSelectedIncidentId(inc.incident_id));

      layerGroupsRef.current.incidents.addLayer(circle);
      layerGroupsRef.current.incidents.addLayer(marker);
    });

    // 4. EVALUATED ROUTE OVERLAYS (Objective 2 & 4: Authoritative Google Polyline)
    const activeRoute = customCommuteResult?.map_route;
    if (activeRoute && mapLayers.evaluatedRoute) {
      // Authoritative Google Maps Primary Polyline
      if (activeRoute.primary_polyline && activeRoute.primary_polyline.length > 1) {
        const isDisrupted = (customCommuteResult?.intersecting_incidents_count || 0) > 0;
        const mainPoly = L.polyline(activeRoute.primary_polyline, {
          color: isDisrupted ? '#f43f5e' : '#38bdf8',
          weight: 6,
          opacity: 0.95
        }).bindPopup(`
          <strong>🗺️ Authoritative Route (${customCommuteResult?.routing_provider || 'Google Maps'})</strong><br/>
          Distance: <b>${customCommuteResult?.distance_km} km</b> • Duration: <b>${customCommuteResult?.current_eta_min} mins</b><br/>
          Corridor Buffer: <b>${activeRoute.corridor_threshold_m || 350}m</b>
        `);
        layerGroupsRef.current.evaluatedRoute.addLayer(mainPoly);
      }

      // Alternative Routes if present
      if (activeRoute.alternative_polylines && activeRoute.alternative_polylines.length > 0) {
        activeRoute.alternative_polylines.forEach((altPoly, aIdx) => {
          if (altPoly && altPoly.length > 1) {
            const altLine = L.polyline(altPoly, {
              color: '#94a3b8',
              weight: 4,
              opacity: 0.65,
              dashArray: '5, 5'
            }).bindPopup(`<strong>Alternative Option ${aIdx + 1}</strong>`);
            layerGroupsRef.current.evaluatedRoute.addLayer(altLine);
          }
        });
      }

      // Backwards-compatible legacy legs
      if (!activeRoute.primary_polyline || activeRoute.primary_polyline.length <= 1) {
        if (activeRoute.clear_leg && activeRoute.clear_leg.length > 0) {
          const leg1 = L.polyline(activeRoute.clear_leg, {
            color: '#10b981',
            weight: 6,
            opacity: 0.95
          }).bindPopup(`<strong>🟢 Clear Section:</strong> Normal Flow`);
          layerGroupsRef.current.evaluatedRoute.addLayer(leg1);
        }

        if (activeRoute.disrupted_leg && activeRoute.disrupted_leg.length > 0) {
          const leg2 = L.polyline(activeRoute.disrupted_leg, {
            color: '#f43f5e',
            weight: 6,
            opacity: 0.9,
            dashArray: '8, 8',
            className: 'pulsing-flood-route'
          }).bindPopup(`<strong>🔴 Disrupted Segment:</strong> +${customCommuteResult?.delay_min || 20}m Delay`);
          layerGroupsRef.current.evaluatedRoute.addLayer(leg2);
        }

        if (activeRoute.recommended_leg && activeRoute.recommended_leg.length > 0) {
          const legRec = L.polyline(activeRoute.recommended_leg, {
            color: '#06d6a0',
            weight: 6,
            opacity: 1
          }).bindPopup(`<strong>⭐ Recommended Reroute:</strong> ${customCommuteResult?.recommended_mode}<br/>Saves ${customCommuteResult?.net_time_saved_min || 17} mins!`);
          layerGroupsRef.current.evaluatedRoute.addLayer(legRec);
        }
      }

      if (activeRoute.origin) {
        const originMarker = L.circleMarker(activeRoute.origin, {
          radius: 9,
          color: '#10b981',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 3
        }).bindPopup(`<strong>📍 Origin:</strong> ${customCommuteResult?.origin}`);
        layerGroupsRef.current.evaluatedRoute.addLayer(originMarker);
      }

      if (activeRoute.destination) {
        const destMarker = L.circleMarker(activeRoute.destination, {
          radius: 9,
          color: '#06d6a0',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 3
        }).bindPopup(`<strong>🏁 Destination:</strong> ${customCommuteResult?.destination}`);
        layerGroupsRef.current.evaluatedRoute.addLayer(destMarker);
      }
    }

    // 5. LIVE USER LOCATION SCANNING RADAR BEACON (VISIBLE ON MAP)
    if (mapLayers.userScanRadar && userLocation?.lat && userLocation?.lon && layerGroupsRef.current.userRadar) {
      // Concentric Radar Scan Rings (1.2 km Immediate Perimeter & 3.5 km Advisory Perimeter)
      const scanCircle1 = L.circle([userLocation.lat, userLocation.lon], {
        radius: 1200,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4'
      });
      const scanCircle2 = L.circle([userLocation.lat, userLocation.lon], {
        radius: 3500,
        color: '#0284c7',
        fillColor: '#0284c7',
        fillOpacity: 0.04,
        weight: 1,
        dashArray: '6, 6'
      });

      // Animated Pulsating Radar Marker
      const userPulseIcon = L.divIcon({
        className: 'user-pulse-marker-wrapper',
        html: `
          <div class="user-pulse-marker">
            <div class="radar-scan-ring-1"></div>
            <div class="radar-scan-ring-2"></div>
            <div class="user-beacon-core">
              <span class="user-beacon-dot"></span>
            </div>
            <div class="user-beacon-tag">YOU (LIVE GPS)</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lon], { icon: userPulseIcon })
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;padding:4px;color:#0f172a;">
            <strong style="color:#0284c7">📍 Your Live Position</strong><br/>
            <b>Coordinates:</b> ${userLocation.lat.toFixed(5)}° N, ${userLocation.lon.toFixed(5)}° E<br/>
            <b>Nearest Landmark:</b> ${userLocation.locationName || 'Mumbai Metropolitan Region'}<br/>
            <b>Speed:</b> ${userLocation.speed || 0} km/h • <b>Accuracy:</b> ±${userLocation.accuracy || 8}m
          </div>
        `);

      layerGroupsRef.current.userRadar.addLayer(scanCircle1);
      layerGroupsRef.current.userRadar.addLayer(scanCircle2);
      layerGroupsRef.current.userRadar.addLayer(userMarker);

      // Connect threat vectors (dashed lines) to closest active incidents within 4.0 km
      incidents.forEach(inc => {
        const dLat = inc.centroid_lat - userLocation.lat;
        const dLon = inc.centroid_lon - userLocation.lon;
        const approxDistKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
        if (approxDistKm <= 4.0) {
          const threatLine = L.polyline([[userLocation.lat, userLocation.lon], [inc.centroid_lat, inc.centroid_lon]], {
            color: inc.severity_level.includes('4') ? '#ef4444' : '#f59e0b',
            weight: 2,
            dashArray: '5, 8',
            opacity: 0.75
          }).bindPopup(`<strong>Hazard Threat Vector:</strong> ${inc.title} (~${approxDistKm.toFixed(1)} km away)`);
          layerGroupsRef.current.userRadar.addLayer(threatLine);
        }
      });
    }
  };

  // =========================================================================
  // ACT TWO: THE URBAN RIPPLE GRAPH (VIS.JS)
  // =========================================================================
  const renderIncidentGraph = (incId) => {
    if (!graphContainerRef.current || !window.vis) return;

    fetch(`${API_BASE}/api/incident/${incId}/graph`)
      .then(res => res.json())
      .then(graphData => {
        const vis = window.vis;
        const nodes = new vis.DataSet(graphData.nodes || []);
        const edges = new vis.DataSet(graphData.edges || []);

        const options = {
          physics: {
            enabled: true,
            hierarchicalRepulsion: { nodeDistance: 150 },
            stabilization: { iterations: 100 }
          },
          nodes: {
            shape: 'box',
            margin: 12,
            font: { face: 'Inter, sans-serif', color: '#ffffff', size: 13, bold: 'bold' },
            borderWidth: 2,
            shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 8 }
          },
          edges: {
            arrows: 'to',
            font: { size: 11, face: 'JetBrains Mono', color: '#94a3b8', align: 'top' },
            smooth: { type: 'cubicBezier' }
          }
        };

        if (graphInstanceRef.current) {
          graphInstanceRef.current.destroy();
        }
        graphInstanceRef.current = new vis.Network(graphContainerRef.current, { nodes, edges }, options);
      })
      .catch(console.error);
  };

  // Compute 4 Top Indicators for Quad
  const activeIncidentsCount = incidents.length || 12;
  const highSeverityCount = incidents.filter(i => i.severity_level && (i.severity_level.includes('4') || i.severity_level.includes('3'))).length || 6;
  const affectedRoutesCount = 5;
  const dataQualityWarningsCount = (offlineSensors.length + (ledgerData?.counts?.duplicates_excluded || 0) + (ledgerData?.counts?.contradictory || 0)) || 2;

  return (
    <div className="ca-app-wrapper">
      {/* =====================================================================
          TOP WINDOW BAR: Exact Match to Screenshot Header
         ===================================================================== */}
      <header className="ca-window-header">
        <div className="header-left">
          {/* macOS Window Control Dots */}
          <div className="mac-window-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>

          {/* 3-Lines Side Drop Button (Hamburger Menu) to Collapse/Open Sidebar */}
          <button 
            className="hamburger-toggle-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Collapse navigation sidebar" : "Open navigation sidebar"}
            aria-label="Toggle navigation sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Brand Logo & Title */}
          <div className="header-brand" onClick={() => setActiveTab('landing')} style={{ cursor: 'pointer' }}>
            <div className="brand-pin-icon">
              <MapPin size={18} />
            </div>
            <div className="brand-text-col">
              <span className="brand-title">UrbanPulse</span>
              <span className="brand-sub">CodeAstra Multimodal Urban Incident Intelligence</span>
            </div>
          </div>
        </div>

        {/* Header Right Badges & Controls */}
        <div className="header-right">
          {/* Corridor Dropdown Pill */}
          <div className="corridor-select-pill">
            <span>Greater Mumbai Corridor Network</span>
            <ChevronDown size={13} />
          </div>

          {/* Supabase Status Pill */}
          <button 
            className="header-pill-btn" 
            onClick={syncSupabase} 
            title="Click to sync active incidents with Supabase database"
          >
            <Database size={13} className={supabaseStatus.connected ? "text-green" : "text-amber"} />
            <span>{supabaseStatus.connected ? "Supabase Live" : "Supabase Local Cache"}</span>
            <span className="pill-action-tag">{isSyncingSupabase ? "Syncing..." : "Sync"}</span>
          </button>

          {/* Google Maps / Traffic Status Pill */}
          <button 
            className="header-pill-btn"
            onClick={() => setShowApiKeyModal(true)}
            title="Configure Google Maps API Key or switch map engine"
          >
            <span className="status-dot green"></span>
            <span>{mapProvider === 'google' ? 'Google Maps - Traffic On' : 'Leaflet / OSM Mode'}</span>
          </button>

          {/* Red SIMULATED DATA Tag */}
          <span className="simulated-data-tag">SIMULATED DATA</span>

          {/* System Time Pill */}
          <div className="system-time-pill">
            <span className="st-label">SYSTEM TIME</span>
            <span className="st-val">{currentTime}</span>
          </div>

          {/* Live User GPS Radar Pill */}
          <button 
            className={`live-gps-pill ${activeTab === 'proximity' ? 'active' : ''}`}
            onClick={() => setActiveTab('proximity')}
            title="Click to view live user GPS proximity radar and nearby threats"
          >
            <span className="radar-ping-dot"></span>
            <span>{userLocation?.lat?.toFixed(4)}°N, {userLocation?.lon?.toFixed(4)}°E</span>
          </button>

          {/* Commuter Account Profile Chip */}
          <div 
            className="user-nav-chip"
            onClick={() => setActiveTab('auth')}
            title="Click to view commuter pass or switch accounts"
          >
            <div className="user-chip-avatar">
              {currentUser ? (currentUser.full_name?.charAt(0) || 'U') : <User size={13} />}
            </div>
            <span className="user-chip-name">{currentUser ? currentUser.full_name : 'Sign In'}</span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          APP BODY LAYOUT: SIDEBAR + MAIN CONTENT
         ===================================================================== */}
      <div className="ca-body-layout">
        {/* ===================================================================
            LEFT NAVIGATION SIDEBAR (CLOSABLE / OPENABLE VIA 3 LINES BUTTON)
           =================================================================== */}
        <aside className={`ca-sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
          <div className="sidebar-nav-list">
            {/* 1. LANDING PAGE */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'landing' ? 'active' : ''}`}
              onClick={() => setActiveTab('landing')}
              title="Landing Page & Overview"
            >
              <Home size={18} />
              {isSidebarOpen && <span className="nav-item-label">Landing Page</span>}
            </button>

            {/* 2. EXECUTIVE DASHBOARD */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              title="Executive Operations Dashboard"
            >
              <LayoutDashboard size={18} />
              {isSidebarOpen && <span className="nav-item-label">Dashboard</span>}
            </button>

            {/* 3. COMMAND CENTRE & MAP */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
              title="Command Centre & Map"
            >
              <Layers size={18} />
              {isSidebarOpen && <span className="nav-item-label">Command Centre & Map</span>}
            </button>

            {/* 4. PROXIMITY RADAR & HAZARDS */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'proximity' ? 'active' : ''}`}
              onClick={() => setActiveTab('proximity')}
              title="Proximity Radar & Hazards"
            >
              <Radio size={18} />
              {isSidebarOpen && (
                <div className="nav-item-content">
                  <span className="nav-item-label">Proximity Radar</span>
                  <span className="nav-item-pill red">Live GPS</span>
                </div>
              )}
            </button>

            {/* 5. URBAN RIPPLE GRAPH */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveTab('graph')}
              title="Urban Ripple Graph"
            >
              <GitBranch size={18} />
              {isSidebarOpen && <span className="nav-item-label">Urban Ripple Graph</span>}
            </button>

            {/* 6. AI REPLAY LAB */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'replay' ? 'active' : ''}`}
              onClick={() => setActiveTab('replay')}
              title="AI Replay Lab"
            >
              <RotateCcw size={18} />
              {isSidebarOpen && <span className="nav-item-label">AI Replay Lab</span>}
            </button>

            {/* 7. STUDENT COMMUTE ASSISTANT */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'commute' ? 'active' : ''}`}
              onClick={() => setActiveTab('commute')}
              title="Student Commute Assistant"
            >
              <Navigation size={18} />
              {isSidebarOpen && (
                <div className="nav-item-content">
                  <span className="nav-item-label">Student Commute</span>
                </div>
              )}
            </button>

            {/* 8. SECOND INCIDENT */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'second_incident' ? 'active' : ''}`}
              onClick={() => setActiveTab('second_incident')}
              title="Second Incident"
            >
              <Zap size={18} />
              {isSidebarOpen && <span className="nav-item-label">Second Incident</span>}
            </button>

            {/* 9. EVALUATION & EVIDENCE */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'eval' ? 'active' : ''}`}
              onClick={() => setActiveTab('eval')}
              title="Evaluation & Evidence"
            >
              <BarChart3 size={18} />
              {isSidebarOpen && <span className="nav-item-label">Evaluation & Evidence</span>}
            </button>

            {/* 10. COMMUTER ACCOUNT */}
            <button 
              className={`sidebar-nav-item ${activeTab === 'auth' ? 'active' : ''}`}
              onClick={() => setActiveTab('auth')}
              title="Commuter Account & Profile"
            >
              <User size={18} />
              {isSidebarOpen && (
                <div className="nav-item-content">
                  <span className="nav-item-label">Commuter Account</span>
                  <span className="nav-item-pill purple">{currentUser ? 'Active' : 'Sign In'}</span>
                </div>
              )}
            </button>
          </div>

          {/* Sidebar Footer Box */}
          {isSidebarOpen && (
            <div className="sidebar-footer-box">
              <span className="sfb-title">CodeAstra UrbanPulse</span>
              <span className="sfb-status">
                <span className="status-dot green"></span> Live Telemetry Active
              </span>
            </div>
          )}
        </aside>

        {/* ===================================================================
            MAIN VIEWPORT CONTENT
           =================================================================== */}
        <main className="ca-main-content">
          {/* LANDING PAGE VIEW */}
          {activeTab === 'landing' && (
            <LandingView 
              onNavigate={setActiveTab}
              userLocation={userLocation}
              incidentsCount={incidents.length}
            />
          )}

          {/* EXECUTIVE DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              onNavigate={setActiveTab}
              incidents={incidents}
              userLocation={userLocation}
              activeIncidentsCount={activeIncidentsCount}
              highSeverityCount={highSeverityCount}
              affectedRoutesCount={affectedRoutesCount}
              dataQualityWarningsCount={dataQualityWarningsCount}
              currentTime={currentTime}
              onSelectIncident={setSelectedIncidentId}
            />
          )}

          {/* USER SIGN IN, REGISTRATION & COMMUTER PROFILE */}
          {activeTab === 'auth' && (
            <AuthView 
              currentUser={currentUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              onNavigateToCommute={() => setActiveTab('commute')}
              onNavigateToMap={() => setActiveTab('map')}
              availableLocations={availableLocations}
              supabaseStatus={supabaseStatus}
            />
          )}

          {/* ACT ONE: COMMAND CENTRE & MAP */}
          {activeTab === 'map' && (
            <CommandCentreMapView 
              mapContainerRef={mapContainerRef}
              googleMapContainerRef={googleMapContainerRef}
              mapProvider={mapProvider}
              setMapProvider={setMapProvider}
              googleApiKey={googleApiKey}
              setShowApiKeyModal={setShowApiKeyModal}
              mapLayers={mapLayers}
              setMapLayers={setMapLayers}
              userLocation={userLocation}
              activeIncidentsCount={activeIncidentsCount}
              highSeverityCount={highSeverityCount}
              affectedRoutesCount={affectedRoutesCount}
              dataQualityWarningsCount={dataQualityWarningsCount}
              isStreamPaused={isStreamPaused}
              setIsStreamPaused={setIsStreamPaused}
              simulationTimeline={simulationTimeline}
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              setSelectedIncidentId={setSelectedIncidentId}
              onLocateBeacon={handleLocateBeacon}
              onNavigate={setActiveTab}
            />
          )}

        {/* ===================================================================
            LIVE USER LOCATION TRACKING & NEARBY HAZARD RADAR SECTION
           =================================================================== */}
        {activeTab === 'proximity' && (
          <ProximityRadarView 
            userLocation={userLocation}
            onUpdateUserLocation={setUserLocation}
            onNavigateToMap={() => setActiveTab('map')}
            onNavigateToCommute={() => setActiveTab('commute')}
            currentUser={currentUser}
            incidents={incidents}
          />
        )}

        {/* ===================================================================
            ACT TWO: THE URBAN RIPPLE GRAPH (0:45–1:30)
           =================================================================== */}
        {activeTab === 'graph' && (
          <UrbanRippleGraphView 
            graphContainerRef={graphContainerRef}
            renderIncidentGraph={renderIncidentGraph}
            selectedIncidentId={selectedIncidentId}
            onNavigate={setActiveTab}
          />
        )}

        {/* ===================================================================
            ACT THREE: AI CHALLENGES ITS OWN CONCLUSION (1:30–2:15)
           =================================================================== */}
        {activeTab === 'replay' && (
          <ReplayLabView 
            replayChallengeActive={replayChallengeActive}
            triggerReplayAction={triggerReplayAction}
            isReplaying={isReplaying}
            ledgerData={ledgerData}
          />
        )}

        {/* ===================================================================
            ACTS FOUR & FIVE: PERSONALIZED COMMUTE ASSISTANT (2:15–3:45)
           =================================================================== */}
        {activeTab === 'commute' && (
          <StudentCommuteView
            customCommuteResult={customCommuteResult}
            commuteOrigin={commuteOrigin}
            setCommuteOrigin={setCommuteOrigin}
            commuteDestination={commuteDestination}
            setCommuteDestination={setCommuteDestination}
            commuteMode={commuteMode}
            setCommuteMode={setCommuteMode}
            commuterName={commuterName}
            setCommuterName={setCommuterName}
            isEvaluating={isEvaluating}
            evaluateUserCommute={evaluateUserCommute}
            availableLocations={availableLocations}
            onNavigateToMap={() => setActiveTab('map')}
            onNavigateToRadar={() => setActiveTab('proximity')}
            currentUser={currentUser}
            showCompareModal={showCompareModal}
            setShowCompareModal={setShowCompareModal}
          />
        )}

        {/* ===================================================================
            ACT SIX: SECOND INCIDENT SHOWCASE (ELECTRICAL / SIGNAL FAULT)
           =================================================================== */}
        {activeTab === 'second_incident' && (
          <SecondIncidentView 
            setSelectedIncidentId={setSelectedIncidentId}
            setIsSecondIncidentTriggered={setIsSecondIncidentTriggered}
            onNavigate={setActiveTab}
          />
        )}

        {/* ===================================================================
            ACT SEVEN: EVALUATION & EVIDENCE METRICS
           =================================================================== */}
        {activeTab === 'eval' && (
          <EvaluationView />
        )}
        </main>
      </div>

      {/* =====================================================================
          MODAL: GOOGLE MAPS API KEY CONFIGURATION
         ===================================================================== */}
      {showApiKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Google Maps API Key Configuration</h3>
              <button className="close-btn" onClick={() => setShowApiKeyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Enter your Google Maps API key to activate the live traffic layer, directions, and satellite maps:</p>
              <div className="input-row">
                <input 
                  type="text" 
                  value={tempApiKeyInput} 
                  onChange={e => setTempApiKeyInput(e.target.value)} 
                  placeholder="AIzaSy..." 
                  className="api-input"
                />
              </div>
              <div className="key-instructions">
                <strong>Where to set it permanently:</strong>
                <p>Open <code>frontend/.env</code> and set: <code>VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code></p>
                <small>If omitted, CodeAstra automatically falls back to full-featured OpenStreetMap & Leaflet with zero errors.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setMapProvider('leaflet'); setShowApiKeyModal(false); }}>
                Use Free Leaflet / OSM
              </button>
              <button className="btn-primary" onClick={handleSaveApiKey}>
                Save & Enable Google Maps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: COMPARE MY OPTIONS BREAKDOWN
         ===================================================================== */}
      {showCompareModal && (
        <div className="modal-backdrop" onClick={() => setShowCompareModal(false)}>
          <div className="modal-card modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Explainable Route Scoring & Alternatives Ranking</h3>
              <button className="close-btn" onClick={() => setShowCompareModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>UrbanPulse evaluated journey time, corridor flood exposure, track signals, and user preferences:</p>
              
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Est. Time</th>
                    <th>Incident Exposure</th>
                    <th>Assessment & Reliability</th>
                  </tr>
                </thead>
                <tbody>
                  {customCommuteResult?.travel_options?.map((opt, i) => (
                    <tr key={i} className={opt.recommended ? 'row-recommended' : ''}>
                      <td><strong>{opt.mode}</strong></td>
                      <td>{opt.estimated_journey_time} mins ({opt.delay_min > 0 ? `+${opt.delay_min}m` : 'Normal'})</td>
                      <td><span className={`exposure-pill ${opt.incident_exposure.toLowerCase().includes('high') ? 'exp-high' : 'exp-low'}`}>{opt.incident_exposure}</span></td>
                      <td>{opt.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="why-recommendation-box">
                <h4>Why did we recommend Metro?</h4>
                <p>Metro Line 2A viaduct is elevated 14 meters above street level, completely bypassing the 68cm water accumulation at Malad Subway and the 145mm track submergence affecting Western Railway locals.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowCompareModal(false)}>
                Back to Commute Planner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
