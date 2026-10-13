import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, AlertTriangle, ShieldCheck, User, MapPin, 
  Clock, Cloud, RefreshCw, Send, CheckCircle2, AlertCircle, 
  ExternalLink, Car, Bike, Train, Footprints, Plus, Shield, 
  Radio, Check, X, Info, Settings, Compass, LocateFixed,
  LogIn, UserPlus, CheckCircle, ArrowRight, Activity, Database,
  LayoutDashboard, LogOut, IndianRupee, Zap, Bell, BellRing, 
  BellOff, Volume2, ShieldAlert, Sparkles, Filter, CheckCheck, Smartphone, Mail,
  Play, Pause, SkipBack, SkipForward, RotateCcw, FileText, XCircle, Sliders,
  Split, Download, Printer, Eye, Share2, HelpCircle, Network
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

  // Personalized Notifications State (Objective 1, 2, 5)
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('ALL'); // 'ALL' | 'COMMUTE' | 'NEARBY' | 'UPDATE'
  const [isEvaluatingAlerts, setIsEvaluatingAlerts] = useState(false);
  const [alertEvaluationFeedback, setAlertEvaluationFeedback] = useState(null);
  const [pushPermission, setPushPermission] = useState(() => {
    return (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'denied';
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
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isScanningCorridor, setIsScanningCorridor] = useState(false);
  const [scanCorridorStatus, setScanCorridorStatus] = useState(null);
  const [smsPhoneInput, setSmsPhoneInput] = useState(() => currentUser?.phone || '8788201742');
  const [smsProviderStatus, setSmsProviderStatus] = useState(null);
  const [mapProvider, setMapProvider] = useState('google'); // 'google' (Google Maps Roadmap), 'google_hybrid' (Satellite), 'osm' (OpenStreetMap)

  // Incident Intelligence & Municipal Response State (Phase 13)
  const [incidentTab, setIncidentTab] = useState('comparison'); // 'comparison' | 'root_cause' | 'timeline' | 'work_orders' | 'map'
  const [comparisonMode, setComparisonMode] = useState('FUSION'); // 'CONVENTIONAL' | 'FUSION'
  const [causalAnalysis, setCausalAnalysis] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineStep, setTimelineStep] = useState(8);
  const [reconstructedState, setReconstructedState] = useState(null);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [isScrubbingLoading, setIsScrubbingLoading] = useState(false);

  // Operator Briefing Modal State
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [operatorBriefing, setOperatorBriefing] = useState(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [briefingQueryInput, setBriefingQueryInput] = useState('');
  const [isQueryingBriefing, setIsQueryingBriefing] = useState(false);

  // Municipal Work Orders State
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [municipalWorkOrders, setMunicipalWorkOrders] = useState([]);
  const [activeWorkOrder, setActiveWorkOrder] = useState(null);
  const [workOrderAuditTrail, setWorkOrderAuditTrail] = useState([]);
  const [isDraftingWorkOrder, setIsDraftingWorkOrder] = useState(false);
  const [isEditingWorkOrder, setIsEditingWorkOrder] = useState(false);
  const [editedProblemDesc, setEditedProblemDesc] = useState('');
  const [editedResponse, setEditedResponse] = useState('');
  const [editedPriority, setEditedPriority] = useState('HIGH');
  const [editedDepartment, setEditedDepartment] = useState('MCGM Storm Water Drains Dept');
  const [workOrderOperatorNotes, setWorkOrderOperatorNotes] = useState('');
  const [workOrderFeedback, setWorkOrderFeedback] = useState(null);


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

    fetch(`${API_BASE}/api/alerts/sms-provider-status`)
      .then(res => res.json())
      .then(data => setSmsProviderStatus(data))
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

        // Origin Marker (Start)
        if (coords.length > 0) {
          const startMarker = L.circleMarker(coords[0], {
            radius: 7,
            fillColor: '#10b981',
            color: '#ffffff',
            weight: 2.5,
            fillOpacity: 1.0
          }).bindPopup(`<b>Origin:</b> ${commuteResult.origin || 'Start'}`).addTo(mapInstanceRef.current);
          incidentLayersRef.current.push(startMarker);
        }

        // Destination Marker (End)
        if (coords.length > 1) {
          const endMarker = L.circleMarker(coords[coords.length - 1], {
            radius: 7,
            fillColor: '#ef4444',
            color: '#ffffff',
            weight: 2.5,
            fillOpacity: 1.0
          }).bindPopup(`<b>Destination:</b> ${commuteResult.destination || 'End'}`).addTo(mapInstanceRef.current);
          incidentLayersRef.current.push(endMarker);
        }

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

  // -------------------------------------------------------------------------
  // PERSONALIZED LOCATION-BASED NOTIFICATION CENTER (Objective 1, 2, 5)
  // -------------------------------------------------------------------------
  const fetchUserNotifications = async () => {
    if (!currentUser) return;
    const userIdentifier = currentUser.user_code || currentUser.id || currentUser.email;
    if (!userIdentifier) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${userIdentifier}`);
      if (res.ok) {
        const data = await res.json();
        setUserNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unread_count || 0);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  };

  // Evaluate alerts immediately using current GPS location + saved commute route
  const handleEvaluateAlertsNow = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setIsEvaluatingAlerts(true);
    setAlertEvaluationFeedback(null);
    try {
      const payload = {
        user_code: currentUser.user_code || currentUser.id,
        email: currentUser.email,
        lat: deviceLocation.coords?.lat,
        lon: deviceLocation.coords?.lon
      };
      const res = await fetch(`${API_BASE}/api/alerts/evaluate-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setUserNotifications(data.total_notifications || []);
        setUnreadNotificationsCount(data.unread_count || 0);

        const newCount = data.newly_generated_count || 0;
        if (newCount > 0) {
          setAlertEvaluationFeedback(`⚠️ Discovered ${newCount} active disruption alert(s) relevant to your location & route.`);
          // Trigger browser native push notification if permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const topAlert = data.newly_generated_alerts[0];
            try {
              new Notification(topAlert.title, {
                body: topAlert.message,
                icon: '/vite.svg'
              });
            } catch (e) {
              console.log('Browser notification error:', e);
            }
          }
        } else {
          setAlertEvaluationFeedback('✅ No new hazards within your proximity or corridor. Safe travels!');
        }
      }
    } catch (err) {
      setAlertEvaluationFeedback('Could not evaluate alerts at this moment.');
    } finally {
      setIsEvaluatingAlerts(false);
      setTimeout(() => setAlertEvaluationFeedback(null), 6000);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${notifId}/read`, {
        method: 'POST'
      });
      setUserNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Could not mark notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    const userIdentifier = currentUser.user_code || currentUser.id || currentUser.email;
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_identifier: userIdentifier })
      });
      setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.warn('Could not mark all notifications read:', err);
    }
  };

  const handleTriggerTestAlert = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/alerts/test-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: currentUser.user_code || currentUser.id })
      });
      if (res.ok) {
        fetchUserNotifications();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('UrbanPulse Alert Generated', {
              body: 'Commute Corridor Alert: Andheri Subway waterlogging simulated alert.',
              icon: '/vite.svg'
            });
          } catch (e) {}
        }
      }
    } catch (err) {}
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          new Notification('UrbanPulse Notifications Active', {
            body: 'You will receive real-time alerts for flood & traffic incidents on your corridor.',
            icon: '/vite.svg'
          });
        }
      } catch (err) {
        console.warn('Error requesting push permission:', err);
      }
    }
  };

  // Poll notifications periodically when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchUserNotifications();
      const interval = setInterval(fetchUserNotifications, 25000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);


  // Fast2SMS Test Send (Phase 13.E)
  const handleSendTestSms = async (phone, simulate = false) => {
    setIsSendingTestSms(true);
    setTestSmsStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: 'UrbanPulse: Good morning! Your commute route Borivali->Dadar is CLEAR. Est. travel: ~65m. Safe journey!',
          simulate: simulate,
          user_code: currentUser?.user_code || 'COMMUTER'
        })
      });
      const data = await res.json();
      const isSuccess = data.success === true;
      const errorMsg = data.error || data.detail || (typeof data.message === 'string' && !isSuccess ? data.message : null) || 'SMS delivery rejected';
      setTestSmsStatus({
        ...data,
        success: isSuccess,
        status: data.status || (isSuccess ? 'accepted' : 'failed'),
        error: isSuccess ? null : errorMsg,
        message: data.message || (isSuccess ? 'Alert dispatched' : null)
      });
      fetchUserNotifications();
    } catch (err) {
      setTestSmsStatus({ success: false, error: 'Network error contacting SMS service: ' + err.message });
    } finally {
      setIsSendingTestSms(false);
    }
  };

  // Immediate corridor scan and multi-channel dispatch (Phase 13)
  const handleScanAndNotify = async () => {
    setIsScanningCorridor(true);
    setScanCorridorStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/scan-and-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_code: currentUser?.user_code || 'COMMUTER',
          email: currentUser?.email || 'sawantvipul45@gmail.com',
          phone: smsPhoneInput.trim() || currentUser?.phone || '8788201742',
          origin: currentUser?.default_origin || 'Borivali (West)',
          destination: currentUser?.default_destination || 'Dadar (West)'
        })
      });
      const data = await res.json();
      const det = data.details || {};
      setScanCorridorStatus({
        success: true,
        message: det.has_hazards 
          ? `⚠️ Disruption detected on ${det.corridor}: Live alert dispatched via SMS & Email!` 
          : `✓ Corridor ${det.corridor} is CLEAR: Safe travel status logged & sent!`
      });
      fetchUserNotifications();
    } catch (err) {
      setScanCorridorStatus({ success: false, error: 'Failed to scan corridor: ' + err.message });
    } finally {
      setIsScanningCorridor(false);
    }
  };

  // Emergency Commute Email Test Dispatch
  const handleSendTestEmail = async (email) => {
    setIsSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || currentUser?.email || 'sawantvipul45@gmail.com',
          name: currentUser?.full_name || 'Commuter',
          origin: currentUser?.default_origin || 'Borivali',
          destination: currentUser?.default_destination || 'Dadar'
        })
      });
      const data = await res.json();
      setTestEmailStatus({
        success: data.success,
        message: data.success ? `✓ Emergency email alert dispatched to ${data.recipient || email}!` : `✗ ${data.error || 'Email dispatch failed'}`
      });
      fetchUserNotifications();
    } catch (err) {
      setTestEmailStatus({ success: false, message: '✗ Error: ' + err.message });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PHASE 13: CAUSAL INTELLIGENCE & MUNICIPAL RESPONSE WORKFLOW HANDLERS
  // ---------------------------------------------------------------------------
  const activeIncidentId = selectedIncident?.incident_id || 'INC_MUM_20260715_01';

  const fetchCausalData = async (incId = activeIncidentId) => {
    try {
      const [compRes, causalRes, eventsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/incident/${incId}/comparison`),
        fetch(`${API_BASE}/api/incident/${incId}/causal-analysis`),
        fetch(`${API_BASE}/api/incident/${incId}/timeline-scrubber`),
        fetch(`${API_BASE}/api/work-orders?incident_id=${incId}`)
      ]);
      if (compRes.ok) setComparisonData(await compRes.json());
      if (causalRes.ok) setCausalAnalysis(await causalRes.json());
      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        setTimelineEvents(evData.events || []);
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setMunicipalWorkOrders(oData.work_orders || []);
      }
    } catch (err) {
      console.warn('Error fetching causal intelligence:', err);
    }
  };

  const fetchTimelineStepReconstruction = async (step, incId = activeIncidentId) => {
    setIsScrubbingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/incident/${incId}/reconstruct-step?step=${step}`);
      if (res.ok) {
        const data = await res.json();
        setReconstructedState(data);
      }
    } catch (err) {
      console.warn('Error reconstructing step:', err);
    } finally {
      setIsScrubbingLoading(false);
    }
  };

  // Re-fetch when switching to incidents view or changing selected incident
  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchCausalData(activeIncidentId);
      fetchTimelineStepReconstruction(timelineStep, activeIncidentId);
    }
  }, [activeTab, activeIncidentId]);

  // Scrub step change
  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchTimelineStepReconstruction(timelineStep, activeIncidentId);
    }
  }, [timelineStep]);

  // Scrubber playback timer
  useEffect(() => {
    let timer = null;
    if (isPlayingTimeline) {
      timer = setInterval(() => {
        setTimelineStep(prev => {
          if (prev >= 8) {
            setIsPlayingTimeline(false);
            return 8;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingTimeline]);

  // Operator Briefing Generation
  const handleGenerateBriefing = async (query = '') => {
    setIsLoadingBriefing(true);
    try {
      const res = await fetch(`${API_BASE}/api/incident/${activeIncidentId}/operator-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query || null })
      });
      if (res.ok) {
        const data = await res.json();
        setOperatorBriefing(data);
        setShowBriefingModal(true);
      }
    } catch (err) {
      console.warn('Error generating operator briefing:', err);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Query specific briefing question
  const handleQueryBriefing = async (e) => {
    if (e) e.preventDefault();
    if (!briefingQueryInput.trim()) return;
    setIsQueryingBriefing(true);
    try {
      const res = await fetch(`${API_BASE}/api/incident/${activeIncidentId}/operator-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: briefingQueryInput })
      });
      if (res.ok) {
        const data = await res.json();
        setOperatorBriefing(data);
      }
    } catch (err) {
      console.warn('Error querying briefing:', err);
    } finally {
      setIsQueryingBriefing(false);
    }
  };

  // Municipal Work Order Generation
  const handleGenerateWorkOrderDraft = async () => {
    setIsDraftingWorkOrder(true);
    setWorkOrderFeedback(null);
    try {
      const operatorName = currentUser?.full_name || 'OPERATOR_DESK';
      const res = await fetch(`${API_BASE}/api/work-orders/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: activeIncidentId,
          operator_name: operatorName
        })
      });
      if (res.ok) {
        const draft = await res.json();
        setActiveWorkOrder(draft);
        setEditedProblemDesc(draft.problem_description || '');
        setEditedResponse(draft.recommended_response || '');
        setEditedPriority(draft.priority || 'HIGH');
        setEditedDepartment(draft.department || 'MCGM Storm Water Drains Dept');
        setIsEditingWorkOrder(false);
        setShowWorkOrderModal(true);
        // Refresh audit
        const auditRes = await fetch(`${API_BASE}/api/work-orders/${draft.work_order_id}/audit-trail`);
        if (auditRes.ok) {
          const aData = await auditRes.json();
          setWorkOrderAuditTrail(aData.audit_trail || []);
        }
        fetchCausalData(activeIncidentId);
      }
    } catch (err) {
      console.warn('Error drafting work order:', err);
    } finally {
      setIsDraftingWorkOrder(false);
    }
  };

  const handleOpenExistingWorkOrder = async (order) => {
    setActiveWorkOrder(order);
    setEditedProblemDesc(order.problem_description || '');
    setEditedResponse(order.recommended_response || '');
    setEditedPriority(order.priority || 'HIGH');
    setEditedDepartment(order.department || 'MCGM Storm Water Drains Dept');
    setIsEditingWorkOrder(false);
    setShowWorkOrderModal(true);
    try {
      const auditRes = await fetch(`${API_BASE}/api/work-orders/${order.work_order_id}/audit-trail`);
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setWorkOrderAuditTrail(aData.audit_trail || []);
      }
    } catch (err) {}
  };

  // Work Order Edit Save
  const handleSaveWorkOrderEdits = async () => {
    if (!activeWorkOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_description: editedProblemDesc,
          recommended_response: editedResponse,
          priority: editedPriority,
          department: editedDepartment,
          actor: currentUser?.full_name || 'OPERATOR',
          role: currentUser?.role || 'OPERATOR'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorkOrder(data.work_order);
        setIsEditingWorkOrder(false);
        setWorkOrderFeedback({ success: true, message: 'Work order updated successfully.' });
        const auditRes = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}/audit-trail`);
        if (auditRes.ok) {
          const aData = await auditRes.json();
          setWorkOrderAuditTrail(aData.audit_trail || []);
        }
        fetchCausalData(activeIncidentId);
      }
    } catch (err) {
      setWorkOrderFeedback({ success: false, message: 'Could not update work order.' });
    }
  };

  // Work Order Approval
  const handleApproveWorkOrder = async () => {
    if (!activeWorkOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: currentUser?.full_name || 'OPERATOR_PATIL',
          role: currentUser?.role || 'OPERATOR',
          notes: workOrderOperatorNotes || 'Authorized for field operational response.'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorkOrder(data.work_order);
        setWorkOrderFeedback({ success: true, message: '✓ Work order approved & logged in municipal audit ledger.' });
        fetchCausalData(activeIncidentId);
        const auditRes = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}/audit-trail`);
        if (auditRes.ok) {
          const aData = await auditRes.json();
          setWorkOrderAuditTrail(aData.audit_trail || []);
        }
      } else {
        const errData = await res.json();
        setWorkOrderFeedback({ success: false, message: errData.detail || 'Approval failed.' });
      }
    } catch (err) {
      setWorkOrderFeedback({ success: false, message: 'Error approving work order: ' + err.message });
    }
  };

  // Work Order Rejection
  const handleRejectWorkOrder = async () => {
    if (!activeWorkOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: currentUser?.full_name || 'OPERATOR_PATIL',
          role: currentUser?.role || 'OPERATOR',
          notes: workOrderOperatorNotes || 'Rejected during command desk review.'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorkOrder(data.work_order);
        setWorkOrderFeedback({ success: true, message: 'Work order marked as REJECTED.' });
        fetchCausalData(activeIncidentId);
        const auditRes = await fetch(`${API_BASE}/api/work-orders/${activeWorkOrder.work_order_id}/audit-trail`);
        if (auditRes.ok) {
          const aData = await auditRes.json();
          setWorkOrderAuditTrail(aData.audit_trail || []);
        }
      } else {
        const errData = await res.json();
        setWorkOrderFeedback({ success: false, message: errData.detail || 'Rejection failed.' });
      }
    } catch (err) {
      setWorkOrderFeedback({ success: false, message: 'Error rejecting work order: ' + err.message });
    }
  };

  // Export Work Order JSON
  const handleExportWorkOrderJson = () => {
    if (!activeWorkOrder) return;
    const jsonStr = JSON.stringify({
      work_order: activeWorkOrder,
      audit_trail: workOrderAuditTrail,
      exported_at: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkOrder.work_order_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

          {/* PERSONALIZED ALERT NOTIFICATION BELL (Objective 1 & 5) */}
          {currentUser && (
            <div style={{ position: 'relative' }}>
              <button 
                className="notification-bell-btn"
                onClick={() => setShowNotificationsDrawer(prev => !prev)}
                title="Personalized Location-Based Alerts"
                aria-label="Alerts"
              >
                {unreadNotificationsCount > 0 ? (
                  <BellRing size={15} style={{ color: '#ef4444' }} />
                ) : (
                  <Bell size={15} />
                )}
                {unreadNotificationsCount > 0 && (
                  <span className="notification-badge">{unreadNotificationsCount}</span>
                )}
              </button>
            </div>
          )}

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

      {/* NOTIFICATION CENTER DRAWER (Objective 1, 2, 5) */}
      {showNotificationsDrawer && currentUser && (
        <div className="notification-center-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="nc-header">
            <div className="nc-title">
              <ShieldAlert size={16} style={{ color: '#0284c7' }} />
              <span>Personalized Transit Alerts</span>
              {unreadNotificationsCount > 0 && (
                <span className="nc-unread-pill">{unreadNotificationsCount} Unread</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                className="macos-btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setShowNotificationsDrawer(false)}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* BROWSER PUSH PERMISSION OPT-IN BANNER */}
          {pushPermission === 'default' && (
            <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#0369a1' }}>
                <BellRing size={13} />
                <span>Enable browser push notifications for real-time corridor alerts?</span>
              </div>
              <button 
                className="macos-btn-primary" 
                style={{ padding: '3px 9px', fontSize: '11px' }}
                onClick={handleRequestPushPermission}
              >
                Allow Push
              </button>
            </div>
          )}

          {/* EVALUATION ACTION BAR & FILTER TABS */}
          <div className="nc-actions-bar">
            <div className="nc-tabs">
              {['ALL', 'COMMUTE', 'NEARBY', 'UPDATE'].map(tabKey => (
                <button 
                  key={tabKey}
                  className={`nc-tab-btn ${notificationFilter === tabKey ? 'active' : ''}`}
                  onClick={() => setNotificationFilter(tabKey)}
                >
                  {tabKey === 'ALL' ? `All (${userNotifications.length})` : 
                   tabKey === 'COMMUTE' ? '🚗 Route' : 
                   tabKey === 'NEARBY' ? '📍 Nearby' : '🚨 Updates'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="macos-btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleEvaluateAlertsNow}
                disabled={isEvaluatingAlerts}
                title="Scan live hazards around your current GPS location and commute"
              >
                <RefreshCw size={11} className={isEvaluatingAlerts ? 'spin' : ''} />
                <span>{isEvaluatingAlerts ? 'Scanning...' : 'Scan Now'}</span>
              </button>
              {unreadNotificationsCount > 0 && (
                <button 
                  className="macos-btn-secondary" 
                  style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleMarkAllNotificationsRead}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={11} />
                  <span>Read All</span>
                </button>
              )}
            </div>
          </div>

          {/* SCAN FEEDBACK BANNER */}
          {alertEvaluationFeedback && (
            <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '7px 14px', fontSize: '11px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={12} />
              <span>{alertEvaluationFeedback}</span>
            </div>
          )}

          {/* NOTIFICATIONS LIST */}
          <div className="nc-list">
            {(() => {
              const filtered = userNotifications.filter(n => {
                if (notificationFilter === 'ALL') return true;
                return n.alert_type === notificationFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="nc-empty">
                    <ShieldCheck size={28} style={{ color: '#10b981', strokeWidth: 1.5 }} />
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>All Clear Along Your Route</strong>
                    <span style={{ fontSize: '11px', maxWidth: '280px', lineHeight: 1.4 }}>
                      No active disruptions reported within your commute corridor or nearby perimeter.
                    </span>
                  </div>
                );
              }

              return filtered.map((n) => {
                const sev = (n.severity || 'MODERATE').toLowerCase();
                return (
                  <div 
                    key={n.id} 
                    className={`nc-item severity-${sev} ${n.is_read ? '' : 'unread'}`}
                    onClick={() => handleMarkNotificationRead(n.id)}
                    title={n.is_read ? 'Read' : 'Click to mark as read'}
                  >
                    <div className="nc-item-header">
                      <span className="nc-item-type">
                        {n.alert_type === 'COMMUTE' ? '🚗 Commute Corridor' :
                         n.alert_type === 'NEARBY' ? '📍 Nearby Hazard' :
                         n.alert_type === 'UPDATE' ? '🚨 Disruption Update' : '🗓️ Daily Summary'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          background: sev === 'critical' ? '#fee2e2' : sev === 'major' ? '#fef3c7' : '#e0f2fe',
                          color: sev === 'critical' ? '#991b1b' : sev === 'major' ? '#92400e' : '#0369a1'
                        }}>
                          {n.severity}
                        </span>
                        {!n.is_read && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7' }} />
                        )}
                      </div>
                    </div>

                    <div className="nc-item-title">{n.title}</div>
                    <p className="nc-item-msg">{n.message}</p>

                    {/* MISSING SENSOR DATA HONEST QUALIFICATION BANNER */}
                    {n.missing_data_qualification && (
                      <div className="nc-missing-sensor-box">
                        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{n.missing_data_qualification}</span>
                      </div>
                    )}

                    {/* DISPATCH CHANNELS STRIP */}
                    <div className="nc-channels-strip">
                      {n.channels?.map((ch) => (
                        <span key={ch} className={`nc-channel-tag ${ch.toLowerCase()}`}>
                          {ch === 'SMS' ? '📱 SMS Dispatched' : ch === 'WEB_PUSH' ? '🔔 Browser Push' : '🖥️ In-App Alert'}
                        </span>
                      ))}
                      <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                        {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

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
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>EVENT-DRIVEN DISPATCH</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Instant SMS & Email Alerts</div>
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
                    <li><strong>Event-Driven Incident & Login Alerts:</strong> Evaluates your commute corridor upon login and immediately whenever hazards develop, dispatching real-time SMS (TextBee Gateway) and rich HTML Email notifications.</li>
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
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Instant SMS & Email Alerts</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Event-driven incident sentinel monitors your corridor 24/7. Dispatches instant SMS and emergency Email notifications whenever hazards escalate or whenever you sign in.
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
                    Your personalized Mumbai transit intelligence dashboard is active. Select a service below to evaluate your daily commute corridor, monitor citywide flood telemetry, or customize real-time incident & login alerts.
                  </p>
                </div>

                {/* QUICK STATUS PILLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="macos-chip" style={{ background: '#ffffff', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}>
                    <MapPin size={13} style={{ color: '#0284c7' }} />
                    <span>Corridor: {currentUser.default_origin?.split('(')[0]?.trim() || 'Borivali East'} ➔ {currentUser.default_destination?.split('(')[0]?.trim() || 'RGIT Versova'}</span>
                  </div>
                  <div className="macos-chip" style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#334155' }}>
                    <Zap size={13} style={{ color: '#f59e0b' }} />
                    <span>Instant Alerts: {currentUser.sms_consent ? 'Active (SMS + Email)' : 'In-App Ready'}</span>
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

                {/* SERVICE CARD 3: COMMUTER PROFILE & REAL-TIME ALERTS */}
                <div 
                  className="dashboard-service-card"
                  onClick={() => setActiveTab('profile')}
                  role="button"
                  tabIndex={0}
                  title="Open Commuter Profile & Alert Settings"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={22} />
                      </div>
                      <span className="provenance-badge provenance-live" style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
                        TextBee & Email Alerts
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                      Commuter Profile & Real-Time Alerts
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Configure your default home-to-work commute corridor, preferred travel mode, and manage real-time SMS (TextBee Gateway) and emergency Email notifications.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Configure Alerts & Profile <ArrowRight size={14} />
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
                        `${commuteResult.is_authoritative_google_route ? 'Google Maps Route' : 'Traffic Route Displayed'} • ${commuteResult.distance_km || 0} km (${commuteResult.current_eta_min} mins)`
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
        {/* =====================================================================
            VIEW 2: INCIDENT INTELLIGENCE & MUNICIPAL RESPONSE WORKSPACE (Phase 13)
            ===================================================================== */}
        {activeTab === 'incidents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* WORKSPACE TOP CONTROL BAR */}
            <div className="macos-card" style={{ padding: '16px 20px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="macos-card-title" style={{ fontSize: '17px', color: '#0f172a' }}>
                      <Activity size={18} color="#0284c7" /> Incident Intelligence & Municipal Operations
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                      MUMBAI DISASTER MGMT CELL
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Active Corridor: <strong style={{ color: '#0f172a' }}>{selectedIncident?.title || 'Severe Waterlogging at Malad Subway Corridor'}</strong> ({activeIncidentId})
                  </div>
                </div>

                {/* OPERATOR RAPID ACTION BUTTONS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    className="macos-btn-secondary"
                    style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#0284c7', color: '#0284c7' }}
                    onClick={() => handleGenerateBriefing()}
                    disabled={isLoadingBriefing}
                  >
                    <Sparkles size={14} />
                    <span>{isLoadingBriefing ? 'Synthesizing...' : 'Generate Operator Briefing'}</span>
                  </button>

                  <button 
                    className="macos-btn-primary"
                    style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleGenerateWorkOrderDraft()}
                    disabled={isDraftingWorkOrder}
                  >
                    <FileText size={14} />
                    <span>{isDraftingWorkOrder ? 'Drafting...' : 'Generate Municipal Work Order'}</span>
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION PILLS */}
              <div className="intel-subnav" style={{ marginTop: '14px', marginBottom: 0 }}>
                <button 
                  className={`intel-tab-btn ${incidentTab === 'comparison' ? 'active' : ''}`}
                  onClick={() => setIncidentTab('comparison')}
                >
                  <Split size={14} />
                  <span>⚖️ Before vs. After (Centerpiece)</span>
                </button>
                <button 
                  className={`intel-tab-btn ${incidentTab === 'root_cause' ? 'active' : ''}`}
                  onClick={() => setIncidentTab('root_cause')}
                >
                  <Network size={14} />
                  <span>🧬 Root-Cause vs. Symptoms</span>
                </button>
                <button 
                  className={`intel-tab-btn ${incidentTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setIncidentTab('timeline')}
                >
                  <Clock size={14} />
                  <span>⏱️ Signal Arrival Timeline</span>
                </button>
                <button 
                  className={`intel-tab-btn ${incidentTab === 'work_orders' ? 'active' : ''}`}
                  onClick={() => setIncidentTab('work_orders')}
                >
                  <FileText size={14} />
                  <span>📑 Work Orders ({municipalWorkOrders.length})</span>
                </button>
                <button 
                  className={`intel-tab-btn ${incidentTab === 'map' ? 'active' : ''}`}
                  onClick={() => setIncidentTab('map')}
                >
                  <MapPin size={14} />
                  <span>🗺️ City GIS Layer</span>
                </button>
              </div>
            </div>

            {/* =================================================================
                SUB-TAB 1: BEFORE VS. AFTER COMPARISON (HACKATHON CENTERPIECE)
                ================================================================= */}
            {incidentTab === 'comparison' && (
              <div className="macos-card" style={{ padding: '22px' }}>
                {/* HERO TOGGLE BAR */}
                <div className="comparison-hero-bar">
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                      Operational Comparison: Fragmented Observation Alerts vs. UrbanPulse Fused Intelligence
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                      Toggle to inspect how 6 noisy, disconnected alerts collapse into 1 evidence-linked incident assessment with 350m corridor precision.
                    </p>
                  </div>

                  {/* PROMINENT TOGGLE SWITCH */}
                  <div className="comparison-mode-switch">
                    <button 
                      className={`comparison-switch-btn ${comparisonMode === 'CONVENTIONAL' ? 'active-legacy' : 'inactive'}`}
                      onClick={() => setComparisonMode('CONVENTIONAL')}
                    >
                      <AlertTriangle size={14} />
                      <span>Conventional Alerts (6 Unlinked)</span>
                    </button>
                    <button 
                      className={`comparison-switch-btn ${comparisonMode === 'FUSION' ? 'active-fusion' : 'inactive'}`}
                      onClick={() => setComparisonMode('FUSION')}
                    >
                      <ShieldCheck size={14} />
                      <span>UrbanPulse Fusion (1 Unified)</span>
                    </button>
                  </div>
                </div>

                {/* CONVENTIONAL FRAGMENTED ALERTS VIEW */}
                {comparisonMode === 'CONVENTIONAL' && (
                  <div>
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={18} color="#ea580c" />
                      <div style={{ fontSize: '12px', color: '#9a3412' }}>
                        <strong>Conventional Monitoring Limitation:</strong> Commuters receive 6 separate, alarming alerts with 0% causal correlation and broad citywide broadcasting, causing widespread alert fatigue and unnecessary traffic panic.
                      </div>
                    </div>

                    <div className="conventional-grid">
                      {comparisonData?.conventional_view?.alerts?.map((al) => (
                        <div key={al.alert_id} className="conventional-card">
                          <div className="conventional-card-header">
                            <span className="conventional-card-title">{al.headline}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>
                              {al.category}
                            </span>
                          </div>
                          <div className="conventional-card-body">{al.body}</div>
                          <div className="conventional-card-footer">
                            <span>📡 Source: {al.source}</span>
                            <span>📢 {al.dispatched_to}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <span><strong>Total Fragmented Notifications:</strong> 6 Alerts Dispatched</span>
                      <span><strong>Causal Correlation:</strong> 0% (Symptom treated as isolated cause)</span>
                      <span><strong>Commuter Alert Fatigue:</strong> Severe (Sent to all 2.2M commuters)</span>
                    </div>
                  </div>
                )}

                {/* URBANPULSE FUSED INTELLIGENCE VIEW */}
                {comparisonMode === 'FUSION' && (
                  <div>
                    <div className="delta-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#059669" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                          Fusion Engine Transformation: 83.3% Alert Noise Reduction & Pinpointed Root Cause
                        </span>
                      </div>
                      <div className="delta-grid">
                        <div className="delta-metric-box">
                          <div className="delta-metric-val">1 Unified Incident</div>
                          <div className="delta-metric-lbl">Collapsed 6 noisy alerts into 1 evidence assessment</div>
                        </div>
                        <div className="delta-metric-box">
                          <div className="delta-metric-val">350m Corridor Filter</div>
                          <div className="delta-metric-lbl">Only alerts SV Road users; spares ~85,000 unaffected citizens</div>
                        </div>
                        <div className="delta-metric-box">
                          <div className="delta-metric-val">+43 Mins Recovered</div>
                          <div className="delta-metric-lbl">Direct recommendation to divert to Metro Line 2A</div>
                        </div>
                        <div className="delta-metric-box">
                          <div className="delta-metric-val">100% Causal Clarity</div>
                          <div className="delta-metric-lbl">Culvert silt blockage isolated from rainfall symptoms</div>
                        </div>
                      </div>
                    </div>

                    {/* CONSOLIDATED FUSION CARD */}
                    <div className="fusion-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                              {comparisonData?.fusion_view?.fused_data?.title || 'Severe Waterlogging at Malad Subway Corridor'}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                              FUSED INCIDENT INTELLIGENCE
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Classification: <strong>{comparisonData?.fusion_view?.fused_data?.unified_classification}</strong> • Confidence: <strong style={{ color: '#059669' }}>94% High</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="macos-btn-secondary" 
                            style={{ fontSize: '11px', padding: '5px 10px' }}
                            onClick={() => handleGenerateBriefing()}
                          >
                            <Sparkles size={12} /> Briefing
                          </button>
                          <button 
                            className="macos-btn-primary" 
                            style={{ fontSize: '11px', padding: '5px 10px' }}
                            onClick={() => handleGenerateWorkOrderDraft()}
                          >
                            <FileText size={12} /> Work Order
                          </button>
                        </div>
                      </div>

                      {/* ROOT CAUSE HIGHLIGHT */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          🎯 Pinpointed Initiating Root Cause
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d', marginTop: '2px' }}>
                          {comparisonData?.fusion_view?.fused_data?.best_supported_root_cause}
                        </div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                          Supported by multi-modal cross-correlation: Box culvert silt sensor SWD-G4 telemetry + Doppler Radar cloudburst intensity.
                        </div>
                      </div>

                      {/* CORROBORATION & SYMPTOMS PILLS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>🔍 Corroborating Evidence Streams (4)</div>
                          <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#64748b' }}>
                            <li>BMC Doppler Radar: 82.4 mm/hr cloudburst</li>
                            <li>Ultrasonic Gauge #104: 68.0 cm water depth</li>
                            <li>TomTom Telemetry: 7.2 km/h traffic slowdown</li>
                            <li>112 CAD Emergency Call #4029</li>
                          </ul>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>🛡️ Noise Filtering & Noise Suppression</div>
                          <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#64748b' }}>
                            <li>1 duplicate social post excluded by NLP filter</li>
                            <li>1 contradictory sensor (Malad North: 0cm) preserved</li>
                            <li>Rail track submergence kept distinct (not blindly merged)</li>
                          </ul>
                        </div>
                      </div>

                      {/* ACTIONABLE RECOMMENDATION */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#14532d', fontWeight: 600 }}>
                          🚀 Commuter Protection Action: {comparisonData?.fusion_view?.fused_data?.actionable_corridor_recommendation}
                        </span>
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                          350m Corridor Filter Active
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                SUB-TAB 2: ROOT-CAUSE VS. SYMPTOMS HIERARCHY (Requirement 2)
                ================================================================= */}
            {incidentTab === 'root_cause' && (
              <div className="macos-card" style={{ padding: '22px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                    Multi-Tier Evidence Hierarchy: Causal Mechanism vs. Observed Symptoms
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Strict visual segregation between initiating causes, physical symptoms, supporting evidence, correlated observations, and downstream consequences.
                  </p>
                </div>

                <div className="causal-grid">
                  {/* 1. POTENTIAL ROOT CAUSE CARD */}
                  <div className={`causal-card ${causalAnalysis?.has_supported_root_cause ? 'root-cause' : 'root-cause-undetermined'}`} style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: causalAnalysis?.has_supported_root_cause ? '#15803d' : '#64748b' }}>
                        {causalAnalysis?.has_supported_root_cause ? '🎯 Tier 1: Best-Supported Root Cause' : '❓ Tier 1: Root Cause Evaluation'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: causalAnalysis?.has_supported_root_cause ? '#dcfce7' : '#f1f5f9', color: causalAnalysis?.has_supported_root_cause ? '#166534' : '#64748b' }}>
                        {causalAnalysis?.root_cause?.title || 'Root cause undetermined'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      {causalAnalysis?.root_cause?.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                      {causalAnalysis?.root_cause?.description}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>Initiated: <strong>{causalAnalysis?.root_cause?.initiating_timestamp}</strong></span>
                      <span>Confidence: <strong>{Math.round((causalAnalysis?.confidence_score || 0.93) * 100)}%</strong></span>
                      <span>Evidence Standard: <strong>Multi-Modal Corroboration</strong></span>
                    </div>
                  </div>

                  {/* 2. DIRECTLY OBSERVED SYMPTOMS */}
                  {causalAnalysis?.observed_symptoms?.map((sym) => (
                    <div key={sym.id} className="causal-card symptom">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                          ⚡ Observed Symptom
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                          {sym.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {sym.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginBottom: '6px' }}>
                        Value: {sym.measured_value}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '6px' }}>
                        Source: {sym.source} • {sym.timestamp}
                      </div>
                    </div>
                  ))}

                  {/* 3. CORRELATED OBSERVATIONS */}
                  {causalAnalysis?.correlated_observations?.map((corr) => (
                    <div key={corr.id} className="causal-card correlated">
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>
                        🔗 Correlated Observation (Unmerged)
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {corr.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {corr.relationship}
                      </div>
                    </div>
                  ))}

                  {/* 4. DOWNSTREAM CONSEQUENCES */}
                  {causalAnalysis?.potential_consequences?.map((conseq) => (
                    <div key={conseq.id} className="causal-card consequence">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
                          📉 Downstream Consequence
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: '4px' }}>
                          {conseq.estimated_delay}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {conseq.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Type: {conseq.impact_type}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONTRADICTORY EVIDENCE PANEL */}
                {causalAnalysis?.contradictory_evidence?.length > 0 && (
                  <div style={{ marginTop: '16px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} /> Preserved Contradictory Evidence
                    </div>
                    {causalAnalysis.contradictory_evidence.map((c, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#7c2d12', marginTop: '6px', lineHeight: 1.45 }}>
                        <strong>{c.source} ({c.reading}):</strong> {c.reconciliation_decision}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                SUB-TAB 3: INTERACTIVE SIGNAL ARRIVAL TIMELINE (Requirement 3)
                ================================================================= */}
            {incidentTab === 'timeline' && (
              <div className="macos-card" style={{ padding: '22px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                    Interactive Signal Arrival Timeline & Historical State Reconstruction
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Scrub backwards and forwards to witness how incident graph, confidence, delayed signals, and root cause evolve without altering production records.
                  </p>
                </div>

                {/* SCRUBBER CONTROLS */}
                <div className="timeline-scrubber-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        className="macos-btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                      >
                        {isPlayingTimeline ? <Pause size={13} /> : <Play size={13} />}
                        <span>{isPlayingTimeline ? 'Pause Playback' : 'Play Timeline'}</span>
                      </button>

                      <button 
                        className="macos-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        disabled={timelineStep <= 0}
                        onClick={() => setTimelineStep(prev => Math.max(0, prev - 1))}
                      >
                        <SkipBack size={13} />
                      </button>

                      <button 
                        className="macos-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        disabled={timelineStep >= 8}
                        onClick={() => setTimelineStep(prev => Math.min(8, prev + 1))}
                      >
                        <SkipForward size={13} />
                      </button>

                      <button 
                        className="macos-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => { setTimelineStep(0); setIsPlayingTimeline(false); }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Step: <strong>{timelineStep + 1} of 9</strong> • Playback Event Time: <strong style={{ color: '#0284c7' }}>{reconstructedState?.playback_time || '08:03 IST'}</strong>
                    </div>
                  </div>

                  {/* RANGE SLIDER */}
                  <input 
                    type="range"
                    min="0"
                    max="8"
                    value={timelineStep}
                    onChange={(e) => {
                      setTimelineStep(parseInt(e.target.value));
                      setIsPlayingTimeline(false);
                    }}
                    className="scrubber-slider"
                  />

                  {/* TICKS */}
                  <div className="scrubber-step-ticks">
                    <span>08:03 Rain Influx</span>
                    <span>08:05 Cloudburst</span>
                    <span>08:06 Depth Gauge</span>
                    <span>08:08 CAD 112</span>
                    <span>08:09 Speed Drop</span>
                    <span style={{ color: '#d97706' }}>08:04 (Delayed)</span>
                    <span style={{ color: '#7c3aed' }}>08:12 Duplicate</span>
                    <span style={{ color: '#ea580c' }}>08:13 Conflict</span>
                    <span style={{ color: '#ef4444' }}>08:14 Dropout</span>
                  </div>

                  {/* ACTIVE RECONSTRUCTED EVENT PREVIEW */}
                  {reconstructedState?.current_event && (
                    <div className="scrubber-event-preview">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                            {reconstructedState.current_event.title}
                          </span>

                          {reconstructedState.current_event.is_delayed && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                              ⏱️ DELAYED ARRIVAL (Observed at {reconstructedState.current_event.event_timestamp}, Ingested at {reconstructedState.current_event.ingestion_timestamp})
                            </span>
                          )}

                          {reconstructedState.current_event.is_duplicate && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#7e22ce' }}>
                              🔄 EXCLUDED DUPLICATE
                            </span>
                          )}

                          {reconstructedState.current_event.is_contradictory && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c' }}>
                              ⚠️ CONTRADICTORY SENSOR
                            </span>
                          )}

                          {reconstructedState.current_event.is_dropout && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>
                              📡 SENSOR DROPOUT
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          {reconstructedState.current_event.description}
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          Source: <strong>{reconstructedState.current_event.source}</strong> • Event Type: <strong>{reconstructedState.current_event.event_type}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '130px' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Reconstructed Confidence</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: reconstructedState.confidence_score >= 0.85 ? '#059669' : (reconstructedState.confidence_score >= 0.65 ? '#d97706' : '#ef4444') }}>
                          {Math.round(reconstructedState.confidence_score * 100)}%
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                          Status: {reconstructedState.incident_status}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* GRAPH NODES AT THIS HISTORICAL STEP */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                    Reconstructed Evidence Graph State ({reconstructedState?.nodes_count || 0} Active Graph Nodes at Playback Point):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {reconstructedState?.nodes?.map((node) => (
                      <div 
                        key={node.id} 
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '8px', 
                          background: '#ffffff', 
                          border: `1px solid ${node.color}`, 
                          borderLeft: `4px solid ${node.color}`,
                          fontSize: '11px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{node.label.replace('\n', ' - ')}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Tier: {node.tier}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                SUB-TAB 4: MUNICIPAL WORK ORDERS LIST (Requirement 6)
                ================================================================= */}
            {incidentTab === 'work_orders' && (
              <div className="macos-card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                      Municipal Response Work Orders ({municipalWorkOrders.length})
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Structured municipal dispatch drafts with required on-site verification, safety constraints, and audit trail.
                    </p>
                  </div>

                  <button 
                    className="macos-btn-primary" 
                    style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleGenerateWorkOrderDraft()}
                    disabled={isDraftingWorkOrder}
                  >
                    <Plus size={14} />
                    <span>{isDraftingWorkOrder ? 'Drafting...' : 'Draft New Work Order'}</span>
                  </button>
                </div>

                {municipalWorkOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <div>No work orders drafted for this incident yet.</div>
                    <button 
                      className="macos-btn-primary" 
                      style={{ marginTop: '12px', fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => handleGenerateWorkOrderDraft()}
                    >
                      Generate Draft from Evidence Assessment
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {municipalWorkOrders.map((wo) => (
                      <div key={wo.work_order_id} className="macos-card" style={{ border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7' }}>{wo.work_order_id}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '99px',
                            background: wo.status === 'APPROVED' ? '#dcfce7' : (wo.status === 'REJECTED' ? '#fee2e2' : '#fef3c7'),
                            color: wo.status === 'APPROVED' ? '#166534' : (wo.status === 'REJECTED' ? '#b91c1c' : '#b45309')
                          }}>
                            {wo.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                          {wo.location_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4, marginBottom: '8px' }}>
                          {wo.problem_description}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Priority: <strong>{wo.priority}</strong></span>
                          <button 
                            className="macos-btn-secondary" 
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => handleOpenExistingWorkOrder(wo)}
                          >
                            Review & Audit ➔
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                SUB-TAB 5: CITYWIDE GIS MAP LAYER & VERIFIED REPORTS
                ================================================================= */}
            {incidentTab === 'map' && (
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
                      <li>Instant SMS (TextBee) and Email dispatch upon hazard escalation and login</li>
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

            {/* REAL-TIME INCIDENT & LOGIN COMMUTE ALERTS (EVENT-DRIVEN: TEXTBEE SMS + EMAIL) */}
            <div className="macos-card">
              <div className="macos-card-header">
                <span className="macos-card-title">
                  <Zap size={16} style={{ color: '#f59e0b' }} /> Real-Time Incident & Login Commute Alerts
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {smsProviderStatus?.textbee?.device_connected ? (
                    <span className="provenance-badge provenance-verified" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      ✓ Phone Connected ({smsProviderStatus?.textbee?.devices?.[0]?.name || 'TextBee'})
                    </span>
                  ) : (
                    <span className="provenance-badge provenance-live" style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                      TextBee Gateway
                    </span>
                  )}
                  <span className="provenance-badge provenance-live" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                    Instant Event-Driven
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                No rigid clock timers or waiting. Alerts evaluate and dispatch <strong>immediately when a hazard occurs</strong> along your corridor ({currentUser?.default_origin ? currentUser.default_origin.split('(')[0].trim() : 'Borivali'} &rarr; {currentUser?.default_destination ? currentUser.default_destination.split('(')[0].trim() : 'Dadar'}), and <strong>every time you log in</strong>. Delivered directly to your connected phone via SMS and your registered Email.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* SMS CHANNEL SETTINGS */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smartphone size={15} style={{ color: '#0284c7' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Instant SMS Alerts</span>
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
                    <label className="macos-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Recipient Mobile (+91 Indian Number)</label>
                    <div className="macos-input-box">
                      <input 
                        type="tel" 
                        className="macos-input" 
                        placeholder="e.g. 8788201742" 
                        value={smsPhoneInput}
                        onChange={(e) => {
                          setSmsPhoneInput(e.target.value);
                          if (currentUser) {
                            const updated = { ...currentUser, phone: e.target.value };
                            setCurrentUser(updated);
                            localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                          }
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '5px' }}>
                      Delivered free via connected phone SIM card (TextBee Gateway)
                    </div>
                  </div>

                  {/* EMAIL CHANNEL SETTINGS */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={15} style={{ color: '#8b5cf6' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Instant Email Alerts</span>
                      </div>
                      <label className="macos-switch">
                        <input 
                          type="checkbox" 
                          checked={currentUser?.email_notifications_enabled !== false} 
                          onChange={(e) => {
                            if (!currentUser) {
                              setShowAuthModal(true);
                              return;
                            }
                            const updated = { ...currentUser, email_notifications_enabled: e.target.checked };
                            setCurrentUser(updated);
                            localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                          }}
                        />
                        <span className="macos-slider" />
                      </label>
                    </div>
                    <label className="macos-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Registered Commuter Email</label>
                    <div className="macos-input-box" style={{ background: '#f1f5f9' }}>
                      <input 
                        type="email" 
                        className="macos-input" 
                        value={currentUser?.email || 'sawantvipul45@gmail.com'}
                        readOnly
                        style={{ cursor: 'default', color: '#334155' }}
                      />
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '5px' }}>
                      Sends rich HTML emergency advisory with alternate transit recommendations
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS & DISPATCH CONTROLS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    className="macos-btn-primary"
                    disabled={isScanningCorridor}
                    onClick={handleScanAndNotify}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
                  >
                    <Zap size={14} />
                    <span>{isScanningCorridor ? 'Evaluating Corridor...' : 'Scan Corridor & Dispatch Alert Now'}</span>
                  </button>

                  <button 
                    className="macos-btn-secondary"
                    disabled={isSendingTestSms}
                    onClick={() => {
                      const phone = smsPhoneInput.trim() || currentUser?.phone || '8788201742';
                      handleSendTestSms(phone, false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Send size={13} />
                    <span>{isSendingTestSms ? 'Sending SMS...' : 'Test SMS'}</span>
                  </button>

                  <button 
                    className="macos-btn-secondary"
                    disabled={isSendingTestEmail}
                    onClick={() => {
                      const email = currentUser?.email || 'sawantvipul45@gmail.com';
                      handleSendTestEmail(email);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Mail size={13} />
                    <span>{isSendingTestEmail ? 'Sending Email...' : 'Test Email'}</span>
                  </button>

                  <button 
                    className="macos-btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                    disabled={isSendingTestSms}
                    title="Test commute alert workflow & view in Notification Center"
                    onClick={() => {
                      const phone = smsPhoneInput.trim() || currentUser?.phone || '8788201742';
                      handleSendTestSms(phone, true);
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Simulate Delivery</span>
                  </button>
                </div>

                {/* STATUS FEEDBACK */}
                {scanCorridorStatus && (
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: scanCorridorStatus.success ? '#059669' : '#e11d48', background: scanCorridorStatus.success ? '#ecfdf5' : '#fff1f2', border: `1px solid ${scanCorridorStatus.success ? '#a7f3d0' : '#fecdd3'}`, borderRadius: '8px', padding: '8px 12px' }}>
                    {scanCorridorStatus.message || scanCorridorStatus.error}
                  </div>
                )}

                {testSmsStatus && (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: testSmsStatus.success ? '#059669' : '#e11d48' }}>
                    SMS: {testSmsStatus.success ? `✓ ${testSmsStatus.message || 'Alert dispatched'}` : `✗ ${testSmsStatus.error || 'SMS dispatch failed'}`}
                  </div>
                )}

                {testEmailStatus && (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: testEmailStatus.success ? '#059669' : '#e11d48' }}>
                    Email: {testEmailStatus.message}
                  </div>
                )}

                {/* TEXTBEE DEVICE LINKING GUIDE (if phone not connected) */}
                {testSmsStatus && !testSmsStatus.success && testSmsStatus.status === 'textbee_device_required' && (
                  <div style={{ fontSize: '12px', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7' }}>
                      <Smartphone size={15} /> TextBee API Key Connected — One-Time Phone Link Required:
                    </div>
                    <ol style={{ margin: '0 0 8px 18px', padding: 0 }}>
                      <li>Install the <strong>TextBee app</strong> on your Android phone.</li>
                      <li>Log in with your account or scan your pairing QR code at <a href="https://textbee.dev/dashboard" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: '#0284c7', fontWeight: 600 }}>textbee.dev/dashboard</a>.</li>
                      <li>Grant SMS permissions on the phone.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* PERSONALIZED LOCATION-BASED ALERT SETTINGS & CHANNELS (Objective 1, 2, 5) */}
            <div className="macos-card">
              <div className="macos-card-header">
                <span className="macos-card-title">
                  <ShieldAlert size={16} style={{ color: '#0284c7' }} /> Alert Generation & Geographic Perimeter Controls
                </span>
                <span className="provenance-badge provenance-live">Decision Engine</span>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Configure your personalized perimeter thresholds, channel consent, and minimum severity triggers. Alerts are tailored specifically to your locations and route rather than citywide broad-broadcasts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                {/* NEARBY RADIUS SLIDER */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="macos-label" style={{ margin: 0 }}>Nearby Hazard Radius Perimeter</label>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                      {currentUser?.nearby_radius_km || 1.0} km
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="5.0" 
                    step="0.5"
                    defaultValue={currentUser?.nearby_radius_km || 1.0}
                    style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                    onChange={(e) => {
                      if (currentUser) {
                        const val = parseFloat(e.target.value);
                        const updated = { 
                          ...currentUser, 
                          nearby_radius_km: val,
                          alert_preferences: { ...(currentUser.alert_preferences || {}), nearby_radius_km: val }
                        };
                        setCurrentUser(updated);
                        localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                      }
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    <span>0.5 km (Strict)</span>
                    <span>1.0 km (Default)</span>
                    <span>5.0 km (Wide)</span>
                  </div>
                </div>

                {/* MINIMUM SEVERITY THRESHOLD */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <label className="macos-label" style={{ marginBottom: '8px' }}>Minimum Disruption Severity</label>
                  <select 
                    className="macos-input"
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}
                    defaultValue={currentUser?.min_alert_severity || 'MODERATE'}
                    onChange={(e) => {
                      if (currentUser) {
                        const updated = { ...currentUser, min_alert_severity: e.target.value };
                        setCurrentUser(updated);
                        localStorage.setItem('urbanpulse_user', JSON.stringify(updated));
                      }
                    }}
                  >
                    <option value="LOW">Low (Include all minor delays & advisories)</option>
                    <option value="MODERATE">Moderate (Standard: subway waterlogging, lane blocks)</option>
                    <option value="MAJOR">Major (Only significant arterial gridlocks & flooding)</option>
                    <option value="CRITICAL">Critical (Only disaster-level track submergence & road closures)</option>
                  </select>
                </div>
              </div>

              {/* CHANNELS ACTIVE STRIP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={13} /> In-App Notification Center
                  </div>
                  <div style={{ fontSize: '11px', color: '#14532d', marginTop: '2px' }}>
                    Active • Stored in Supabase
                  </div>
                </div>

                <div style={{ background: pushPermission === 'granted' ? '#f0fdf4' : '#f8fafc', border: `1px solid ${pushPermission === 'granted' ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: pushPermission === 'granted' ? '#166534' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Bell size={13} /> Browser Web Push
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{pushPermission === 'granted' ? 'Permission Active' : 'Not Granted'}</span>
                    {pushPermission !== 'granted' && (
                      <button 
                        className="macos-btn-secondary" 
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={handleRequestPushPermission}
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ background: currentUser?.sms_consent ? '#f0fdf4' : '#f8fafc', border: `1px solid ${currentUser?.sms_consent ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: currentUser?.sms_consent ? '#166534' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Send size={13} /> Fast2SMS Gateway
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {currentUser?.sms_consent ? 'Consent Granted' : 'Opted Out'}
                  </div>
                </div>
              </div>

              {/* TEST ACTIONS */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="macos-btn-primary"
                  style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleEvaluateAlertsNow}
                  disabled={isEvaluatingAlerts}
                >
                  <RefreshCw size={12} className={isEvaluatingAlerts ? 'spin' : ''} />
                  <span>{isEvaluatingAlerts ? 'Evaluating...' : 'Scan & Evaluate Alerts Now'}</span>
                </button>

                <button 
                  className="macos-btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleTriggerTestAlert}
                >
                  <Sparkles size={12} />
                  <span>Trigger Test In-App & Push Alert</span>
                </button>
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
                    if (data.login_alert?.message) {
                      setScanCorridorStatus({
                        success: true,
                        message: `⚡ Login Corridor Scan: ${data.login_alert.message}`
                      });
                      setAuthSuccess(`Welcome, ${data.user.full_name}! ⚡ Route Scan: ${data.login_alert.message}`);
                    } else {
                      setAuthSuccess(`Logged in as ${data.user.full_name}! Saved commute corridor loaded.`);
                    }
                    fetchUserNotifications();
                    setTimeout(() => {
                      setShowAuthModal(false);
                    }, 1200);
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

      {/* =====================================================================
          PHASE 13: EXPLAINABLE OPERATOR BRIEFING MODAL (Requirement 5)
          ===================================================================== */}
      {showBriefingModal && (
        <div className="intel-modal-backdrop" onClick={() => setShowBriefingModal(false)}>
          <div className="intel-modal-window" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div className="intel-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="#0284c7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
                    Explainable Operator Briefing • Municipal Command Advisory
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Incident Reference: <strong>{activeIncidentId}</strong> • Generated at: {operatorBriefing?.generated_at}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '3px 8px', 
                  borderRadius: '99px',
                  background: (operatorBriefing?.confidence_score || 0.93) >= 0.85 ? '#ecfdf5' : '#fef3c7',
                  color: (operatorBriefing?.confidence_score || 0.93) >= 0.85 ? '#065f46' : '#92400e',
                  border: '1px solid #a7f3d0'
                }}>
                  Confidence: {Math.round((operatorBriefing?.confidence_score || 0.93) * 100)}% ({operatorBriefing?.confidence_grade || 'High'})
                </span>
                <button 
                  onClick={() => setShowBriefingModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* MODAL BODY (10 QUESTIONS ANSWERED) */}
            <div className="intel-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* TARGETED QUERY SEARCH */}
              <form onSubmit={handleQueryBriefing} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={14} /> Ask a Specific Explainability Question
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text"
                    value={briefingQueryInput}
                    onChange={(e) => setBriefingQueryInput(e.target.value)}
                    placeholder="e.g., Explain why confidence dropped and why Sensor BMC_FLD_MALAD_NORTH was ignored"
                    className="macos-input"
                    style={{ flex: 1, background: '#ffffff', fontSize: '12px', padding: '6px 10px', border: '1px solid #93c5fd', borderRadius: '6px' }}
                  />
                  <button 
                    type="submit"
                    className="macos-btn-primary"
                    disabled={isQueryingBriefing || !briefingQueryInput.trim()}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {isQueryingBriefing ? 'Analyzing...' : 'Investigate'}
                  </button>
                </div>

                {operatorBriefing?.query_response && (
                  <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#1e3a8a', lineHeight: 1.5 }}>
                    <strong>Factual Telemetry Investigation:</strong>
                    <div style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{operatorBriefing.query_response}</div>
                  </div>
                )}
              </form>

              {/* 1. WHAT IS HAPPENING */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>1. What is Happening?</div>
                <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>
                  {operatorBriefing?.q1_what_is_happening}
                </div>
              </div>

              {/* 2. SUPPORTED EXPLANATION */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>2. What is the Most Strongly Supported Explanation?</div>
                <div style={{ fontSize: '12px', color: '#14532d', marginTop: '4px', lineHeight: 1.5 }}>
                  {operatorBriefing?.q2_supported_explanation}
                </div>
              </div>

              {/* 3 & 4. SUPPORTING VS CONTRADICTING OBSERVATIONS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>3. Supporting Observations</div>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>
                    {operatorBriefing?.q3_supporting_observations?.map((o, idx) => <li key={idx}>{o}</li>)}
                  </ul>
                </div>

                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>4. Contradicting Observations (Preserved)</div>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#9a3412', lineHeight: 1.5 }}>
                    {operatorBriefing?.q4_contradicting_observations?.length > 0 ? (
                      operatorBriefing.q4_contradicting_observations.map((c, idx) => <li key={idx}>{c}</li>)
                    ) : (
                      <li>No unresolved conflicting sensor telemetry recorded.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* 5. CONFIDENCE CHANGE EXPLANATION */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>5. Why Has the Confidence Assessment Changed?</div>
                <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5 }}>
                  {operatorBriefing?.q5_confidence_delta}
                </div>
              </div>

              {/* 7. TRACEABLE SENSOR EXCLUSION LEDGER TABLE */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  7. Traceable Sensor & Report Exclusion Ledger (Factual Reasons Only)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Source / Sensor ID</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Status</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Distance</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Factual Recorded Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operatorBriefing?.sensor_exclusion_ledger?.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{s.sensor_id}</td>
                          <td style={{ padding: '6px 8px', color: '#b91c1c' }}>{s.status}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{s.distance_from_centroid_km} km</td>
                          <td style={{ padding: '6px 8px', color: '#475569', lineHeight: 1.4 }}>{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 8, 9, 10. PUBLIC IMPACT, ACTION, UNCERTAINTIES */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>8. Potential Public Impact</div>
                <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px' }}>{operatorBriefing?.q8_public_impact}</div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>9. Recommended Operational Action</div>
                <div style={{ fontSize: '12px', color: '#14532d', marginTop: '4px', whiteSpace: 'pre-line' }}>{operatorBriefing?.q9_recommended_action}</div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>10. What Remains Uncertain?</div>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#64748b' }}>
                  {operatorBriefing?.q10_uncertainties?.map((u, idx) => <li key={idx}>{u}</li>)}
                </ul>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="intel-modal-footer">
              <button 
                className="macos-btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(operatorBriefing, null, 2));
                  alert('Briefing JSON copied to clipboard.');
                }}
              >
                Copy Briefing JSON
              </button>
              <button 
                className="macos-btn-primary" 
                style={{ fontSize: '12px', padding: '6px 16px' }}
                onClick={() => setShowBriefingModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PHASE 13: MUNICIPAL WORK ORDER REVIEW & APPROVAL MODAL (Requirement 6)
          ===================================================================== */}
      {showWorkOrderModal && activeWorkOrder && (
        <div className="intel-modal-backdrop" onClick={() => setShowWorkOrderModal(false)}>
          <div className="intel-modal-window" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
            {/* WORK ORDER HEADER */}
            <div className="intel-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#0284c7" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
                      Municipal Response Work Order: {activeWorkOrder.work_order_id}
                    </h3>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '99px',
                      background: activeWorkOrder.status === 'APPROVED' ? '#dcfce7' : (activeWorkOrder.status === 'REJECTED' ? '#fee2e2' : '#fef3c7'),
                      color: activeWorkOrder.status === 'APPROVED' ? '#166534' : (activeWorkOrder.status === 'REJECTED' ? '#b91c1c' : '#b45309')
                    }}>
                      {activeWorkOrder.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Incident Reference: <strong>{activeWorkOrder.incident_id}</strong> • Location: <strong>{activeWorkOrder.location_name}</strong>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowWorkOrderModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* WORK ORDER BODY */}
            <div className="intel-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* FEEDBACK BANNER */}
              {workOrderFeedback && (
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  background: workOrderFeedback.success ? '#ecfdf5' : '#fee2e2',
                  color: workOrderFeedback.success ? '#065f46' : '#b91c1c',
                  border: `1px solid ${workOrderFeedback.success ? '#a7f3d0' : '#fca5a5'}`
                }}>
                  {workOrderFeedback.message}
                </div>
              )}

              {/* EDIT MODE TOGGLE INFO */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Created By: <strong>{activeWorkOrder.created_by}</strong> • Department: <strong>{activeWorkOrder.department}</strong> • Priority: <strong style={{ color: '#b91c1c' }}>{activeWorkOrder.priority}</strong>
                </span>

                {activeWorkOrder.status === 'DRAFT' && !isEditingWorkOrder && (
                  <button 
                    className="macos-btn-secondary" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => setIsEditingWorkOrder(true)}
                  >
                    ✏️ Edit Draft Content
                  </button>
                )}
              </div>

              {/* PROBLEM DESCRIPTION */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Problem Description</div>
                {isEditingWorkOrder ? (
                  <textarea 
                    value={editedProblemDesc}
                    onChange={(e) => setEditedProblemDesc(e.target.value)}
                    className="macos-input"
                    rows={3}
                    style={{ width: '100%', fontSize: '12px', background: '#ffffff', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ fontSize: '12px', color: '#0f172a', lineHeight: 1.5 }}>{activeWorkOrder.problem_description}</div>
                )}
              </div>

              {/* RECOMMENDED TACTICAL RESPONSE */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>Recommended Tactical Response</div>
                {isEditingWorkOrder ? (
                  <textarea 
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className="macos-input"
                    rows={3}
                    style={{ width: '100%', fontSize: '12px', background: '#ffffff', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ fontSize: '12px', color: '#14532d', lineHeight: 1.5 }}>{activeWorkOrder.recommended_response}</div>
                )}
              </div>

              {/* SUGGESTED RESOURCES TABLE */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Suggested Resource Categories (Marked Requires On-Site Verification)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Category</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Resource Item</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Qty</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWorkOrder.suggested_resources?.map((res, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{res.category}</td>
                          <td style={{ padding: '6px 8px', color: '#334155' }}>{res.item}</td>
                          <td style={{ padding: '6px 8px', color: '#475569' }}>{res.recommended_qty}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                              {res.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VERIFICATION STEPS & SAFETY CONSIDERATIONS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Required Verification Steps</div>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#475569', lineHeight: 1.45 }}>
                    {activeWorkOrder.verification_steps?.map((step, idx) => <li key={idx}>{step}</li>)}
                  </ul>
                </div>

                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Safety Considerations</div>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#7f1d1d', lineHeight: 1.45 }}>
                    {activeWorkOrder.safety_considerations?.map((safe, idx) => <li key={idx}>{safe}</li>)}
                  </ul>
                </div>
              </div>

              {/* OPERATOR REVIEW NOTES */}
              {activeWorkOrder.status === 'DRAFT' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Operator Decision Notes (Appended to Audit Trail)
                  </div>
                  <input 
                    type="text"
                    value={workOrderOperatorNotes}
                    onChange={(e) => setWorkOrderOperatorNotes(e.target.value)}
                    placeholder="Enter review remarks before approving or rejecting..."
                    className="macos-input"
                    style={{ width: '100%', fontSize: '12px', padding: '7px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              )}

              {/* CHRONOLOGICAL AUDIT TRAIL TABLE */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Chronological Municipal Audit Trail ({workOrderAuditTrail.length} Records)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left', color: '#475569' }}>Action</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', color: '#475569' }}>Actor</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', color: '#475569' }}>Role</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', color: '#475569' }}>Status</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', color: '#475569' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrderAuditTrail.map((log, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 700, color: log.action === 'APPROVED' ? '#166534' : (log.action === 'REJECTED' ? '#b91c1c' : '#0284c7') }}>
                            {log.action}
                          </td>
                          <td style={{ padding: '4px 6px', color: '#334155' }}>{log.actor}</td>
                          <td style={{ padding: '4px 6px', color: '#64748b' }}>{log.actor_role}</td>
                          <td style={{ padding: '4px 6px', color: '#475569' }}>{log.previous_status || 'NONE'} ➔ {log.new_status}</td>
                          <td style={{ padding: '4px 6px', color: '#64748b' }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* WORK ORDER FOOTER BUTTONS */}
            <div className="intel-modal-footer">
              <button 
                className="macos-btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleExportWorkOrderJson()}
              >
                <Download size={13} /> Export JSON
              </button>

              {isEditingWorkOrder ? (
                <>
                  <button 
                    className="macos-btn-secondary" 
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => setIsEditingWorkOrder(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="macos-btn-primary" 
                    style={{ fontSize: '12px', padding: '6px 16px' }}
                    onClick={() => handleSaveWorkOrderEdits()}
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  {activeWorkOrder.status === 'DRAFT' && (
                    <>
                      <button 
                        className="macos-btn-secondary" 
                        style={{ fontSize: '12px', padding: '6px 14px', color: '#b91c1c', borderColor: '#fca5a5' }}
                        onClick={() => handleRejectWorkOrder()}
                      >
                        Reject
                      </button>
                      <button 
                        className="macos-btn-primary" 
                        style={{ fontSize: '12px', padding: '6px 16px', background: '#059669', borderColor: '#059669' }}
                        onClick={() => handleApproveWorkOrder()}
                      >
                        ✓ Authorize & Approve
                      </button>
                    </>
                  )}
                  <button 
                    className="macos-btn-secondary" 
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => setShowWorkOrderModal(false)}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

