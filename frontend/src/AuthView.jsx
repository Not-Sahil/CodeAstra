import React, { useState, useEffect } from 'react';
import { 
  User, ShieldAlert, LogIn, UserPlus, Lock, Mail, Phone, 
  Building2, MapPin, Clock, Compass, Bike, Train, Navigation, 
  Bus, Car, AlertTriangle, CheckCircle2, ShieldCheck, Eye, 
  EyeOff, QrCode, Sparkles, RefreshCw, LogOut, ArrowRight, 
  ExternalLink, Database, Bell, ChevronRight, Zap, QrCode as QrIcon,
  Shield, CreditCard, Sliders, Layers, Activity, History
} from 'lucide-react';

export default function AuthView({ 
  currentUser, 
  onLoginSuccess, 
  onLogout, 
  onNavigateToCommute, 
  onNavigateToMap,
  availableLocations = [],
  supabaseStatus = { connected: false }
}) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [activeProfileTab, setActiveProfileTab] = useState('PASS'); // 'PASS', 'ROUTE', 'ALERTS'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [authUsers, setAuthUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState('STUDENT_001');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Sign Up / Full Commuter Profile State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
    organization: '',
    studentOrEmployeeId: '',
    defaultOrigin: 'Ashokvan (Borivali East)',
    defaultDestination: 'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
    corridorLandmark: 'Via Western Express Highway & JVLR',
    preferredMode: 'MOTORCYCLE',
    secondaryMode: 'METRO',
    departureTime: '08:00',
    targetArrivalTime: '09:00',
    floodSensitivity: 'HIGH',
    delaySensitivityMin: 10,
    notifyInApp: true,
    notifySmsWhatsapp: true,
    notifyEmergencySos: true,
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.users) {
        setAuthUsers(data.users);
      }
    } catch (e) {
      console.warn('Could not fetch auth users:', e);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  // Sign In Handler
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your Email, Commuter Code, or Mobile Number.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check credentials.');
      }

      setSuccessMsg(`Welcome back, ${data.user.full_name}! Commute radar and route telemetry loaded.`);
      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Login error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Login for Hackathon Evaluator Personas
  const handleQuickLogin = async (userCode) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoginIdentifier(userCode);
    setLoginPassword('password123');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: userCode,
          password: 'password123'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo login failed');

      setSuccessMsg(`Active profile switched to ${data.user.full_name} (${data.user.role}).`);
      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Mobile number is required for emergency hazard broadcast.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        organization: formData.organization.trim() || `${formData.role} Affiliation`,
        employee_or_student_id: formData.studentOrEmployeeId.trim(),
        default_origin: formData.defaultOrigin.trim(),
        default_destination: formData.defaultDestination.trim(),
        corridor_landmark: formData.corridorLandmark.trim(),
        preferred_mode: formData.preferredMode,
        secondary_mode: formData.secondaryMode,
        departure_time: formData.departureTime ? `${formData.departureTime}:00` : '08:00:00',
        target_arrival_time: formData.targetArrivalTime ? `${formData.targetArrivalTime}:00` : '09:00:00',
        alert_preferences: {
          flood_sensitivity: formData.floodSensitivity,
          delay_sensitivity_min: parseInt(formData.delaySensitivityMin, 10) || 10,
          notify_in_app: formData.notifyInApp,
          notify_sms_whatsapp: formData.notifySmsWhatsapp,
          notify_emergency_sos: formData.notifyEmergencySos
        },
        emergency_contact: {
          name: formData.emergencyContactName.trim() || 'Emergency Contact',
          phone: formData.emergencyContactPhone.trim() || '+91 98000 00000'
        }
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      setSuccessMsg(`Commuter Account Created & Synced to Supabase! Welcome, ${data.user.full_name}.`);
      onLoginSuccess(data.user);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Registration error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'MOTORCYCLE': return <Bike size={15} />;
      case 'TRAIN': return <Train size={15} />;
      case 'METRO': return <Navigation size={15} />;
      case 'BUS': return <Bus size={15} />;
      case 'CAR': return <Car size={15} />;
      default: return <Navigation size={15} />;
    }
  };

  return (
    <div className="auth-view-container minimal-layout">
      {/* 1. OFFICIAL PAGE HEADER */}
      <div className="section-page-header">
        <div className="sph-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="screen-num-pill">10</span>
            <h2>Commuter Identity & Digital Smart Pass</h2>
          </div>
          <p>Personalized Multimodal Journey Monitoring, Real-time Inundation Warnings & Transit Disruption Alerts across Greater Mumbai.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={`db-pill ${supabaseStatus.connected ? 'db-live' : 'db-local'}`}>
            <Database size={12} />
            <span>{supabaseStatus.connected ? 'Supabase Cloud: LIVE' : 'Local Fast Memory'}</span>
          </div>
          <span className="simulated-data-tag">SIMULATED DATA</span>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="auth-alert-box alert-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
          <button className="alert-close" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}
      {errorMsg && (
        <div className="auth-alert-box alert-error">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
          <button className="alert-close" onClick={() => setErrorMsg('')}>×</button>
        </div>
      )}

      {/* =====================================================================
          2. AUTHENTICATED COMMUTER STATE (SMART PASS & SETTINGS)
         ===================================================================== */}
      {currentUser && !isEditing ? (
        <div className="auth-signed-in-layout">
          {/* PROFILE SUB-TABS */}
          <div className="auth-profile-subtabs">
            <button 
              className={`apt-btn ${activeProfileTab === 'PASS' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('PASS')}
            >
              <CreditCard size={14} />
              <span>Digital Transit Pass & ID</span>
            </button>
            <button 
              className={`apt-btn ${activeProfileTab === 'ROUTE' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('ROUTE')}
            >
              <Compass size={14} />
              <span>Configured Commute Route</span>
            </button>
            <button 
              className={`apt-btn ${activeProfileTab === 'ALERTS' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('ALERTS')}
            >
              <Bell size={14} />
              <span>Weather Alerts & SOS</span>
            </button>
            <button 
              className={`apt-btn ${activeProfileTab === 'HISTORY' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('HISTORY')}
            >
              <Activity size={14} />
              <span>Disaster Avoidance Log</span>
            </button>
          </div>

          {/* TAB 1: DIGITAL TRANSIT SMART PASS */}
          {activeProfileTab === 'PASS' && (
            <div className="commuter-smart-card minimal-card">
              <div className="csc-header">
                <div className="csc-brand">
                  <ShieldAlert size={18} className="csc-pulse" />
                  <span>MMRDA MUMBAI TRANSIT DIGITAL SMART PASS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="csc-chip-icon">NFC 📶</span>
                  <span className={`csc-role-pill ${currentUser.role?.toLowerCase()}`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <div className="csc-body">
                <div className="csc-avatar-row">
                  <div className="csc-avatar">
                    {currentUser.role === 'STUDENT' ? '🎓' : currentUser.role === 'CORPORATE' ? '💼' : '🚑'}
                  </div>
                  <div className="csc-user-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3>{currentUser.full_name}</h3>
                      <span className="user-code-tag">{currentUser.user_code}</span>
                    </div>
                    <span className="org-text">{currentUser.organization || 'Mumbai Transit Authority'}</span>
                    <span className="id-sub">Student/Employee Pass: #{currentUser.employee_or_student_id || 'MUM-ENG-2026-001'}</span>
                  </div>

                  {/* QR CODE STAMP */}
                  <div className="csc-qr-badge" title="Scannable transit pass QR">
                    <QrIcon size={46} color="#0284c7" />
                    <span>VALID 2026</span>
                  </div>
                </div>

                {/* TRANSIT PASS WALLET & ALLOWANCE STRIP */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '11.5px',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={14} color="#7dd3fc" />
                    <span>Transit Stored Value: <strong style={{ color: '#38bdf8' }}>₹850.00 Active</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#e2e8f0' }}>Suburban Pass Quota:</span>
                    <strong style={{ color: '#34d399' }}>18 Trips Remaining</strong>
                  </div>
                </div>

                <div className="csc-contact-grid">
                  <div className="csc-contact-item">
                    <Mail size={13} className="text-blue" />
                    <span>{currentUser.email}</span>
                  </div>
                  <div className="csc-contact-item">
                    <Phone size={13} className="text-emerald" />
                    <span>{currentUser.phone || '+91 98200 12345'}</span>
                  </div>
                  <div className="csc-contact-item">
                    <ShieldCheck size={13} className="text-cyan" />
                    <span>Verification: <strong>Biometric Confirmed</strong></span>
                  </div>
                </div>
              </div>


              <div className="csc-footer">
                <div className="csc-sync-tag">
                  <span className="sync-dot live"></span>
                  <span>Active Session • Synced with Incident Correlation Engine</span>
                </div>
                <div className="csc-actions">
                  <button 
                    className="btn-csc-action primary-glow"
                    onClick={onNavigateToCommute}
                  >
                    <Navigation size={13} />
                    <span>Launch Commute Assistant</span>
                  </button>
                  <button 
                    className="btn-csc-action secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Sparkles size={13} />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    className="btn-csc-action danger"
                    onClick={onLogout}
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURED ROUTE */}
          {activeProfileTab === 'ROUTE' && (
            <div className="commuter-route-card minimal-card">
              <div className="crc-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={18} className="text-blue" />
                  <h4>Saved Daily Mumbai Transit Journey</h4>
                </div>
                <span className="crc-badge">Monitored 24/7</span>
              </div>

              <div className="csc-route-box">
                <div className="csc-route-flow">
                  <div className="csc-loc">
                    <span className="loc-dot origin-dot"></span>
                    <div>
                      <small>ORIGIN (HOME BASE)</small>
                      <strong>{currentUser.default_origin}</strong>
                    </div>
                  </div>
                  <div className="csc-arrow">
                    <ArrowRight size={14} />
                    <span className="transit-mode-tag">
                      {getModeIcon(currentUser.preferred_mode)}
                      {currentUser.preferred_mode}
                    </span>
                  </div>
                  <div className="csc-loc">
                    <span className="loc-dot dest-dot"></span>
                    <div>
                      <small>DESTINATION (CAMPUS/OFFICE)</small>
                      <strong>{currentUser.default_destination}</strong>
                    </div>
                  </div>
                </div>

                {currentUser.corridor_landmark && (
                  <div className="csc-corridor-landmark">
                    <MapPin size={12} className="text-blue" />
                    <span>Corridor Landmark: <strong>{currentUser.corridor_landmark}</strong></span>
                  </div>
                )}
              </div>

              <div className="csc-timings-grid">
                <div className="csc-stat-pill">
                  <span className="csc-stat-label">Usual Departure</span>
                  <span className="csc-stat-val">
                    <Clock size={12} /> {currentUser.departure_time?.slice(0, 5) || '08:00 AM'}
                  </span>
                </div>
                <div className="csc-stat-pill">
                  <span className="csc-stat-label">Target Arrival</span>
                  <span className="csc-stat-val">
                    <Clock size={12} /> {currentUser.target_arrival_time?.slice(0, 5) || '09:00 AM'}
                  </span>
                </div>
                <div className="csc-stat-pill">
                  <span className="csc-stat-label">Backup Transit Mode</span>
                  <span className="csc-stat-val text-blue">
                    {getModeIcon(currentUser.secondary_mode || 'METRO')} {currentUser.secondary_mode || 'METRO'}
                  </span>
                </div>
                <div className="csc-stat-pill">
                  <span className="csc-stat-label">Delay Tolerance</span>
                  <span className="csc-stat-val text-amber">
                    10 Mins Threshold
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALERTS & SOS */}
          {activeProfileTab === 'ALERTS' && (
            <div className="commuter-alerts-card minimal-card">
              <div className="cac-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} className="text-amber" />
                  <h4>Monsoon Safety & Notification Settings</h4>
                </div>
                <span className="cac-badge">Push Broadcasts ON</span>
              </div>

              <div className="alerts-settings-grid">
                <div className="as-row">
                  <div>
                    <strong>Monsoon Inundation Flood Sensitivity:</strong>
                    <p>Alert triggers automatically when water depth on your route exceeds threshold.</p>
                  </div>
                  <span className="sensitivity-tag high">{currentUser.alert_preferences?.flood_sensitivity || 'HIGH'} (Above 15cm)</span>
                </div>

                <div className="as-row">
                  <div>
                    <strong>In-App Hazard Warning Sirens:</strong>
                    <p>Audible proximity chime when GPS beacon enters a 1.2km radius hazard zone.</p>
                  </div>
                  <span className="status-toggle-tag on">ACTIVE</span>
                </div>

                <div className="as-row">
                  <div>
                    <strong>Emergency Monsoon SOS Broadcast:</strong>
                    <p>Broadcasts safe arrival notification or distress location to family contact.</p>
                  </div>
                  <span className="emergency-contact-pill">
                    {currentUser.emergency_contact?.name ? `${currentUser.emergency_contact.name} (${currentUser.emergency_contact.phone})` : 'Guardian Contact Linked'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISASTER AVOIDANCE & JOURNEYS LOG */}
          {activeProfileTab === 'HISTORY' && (
            <div className="commuter-route-card minimal-card">
              <div className="crc-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} className="text-emerald" />
                  <h4>Monsoon Commute Safety Log & Disruption Evasion History</h4>
                </div>
                <span className="crc-badge" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}>
                  Safety Streak: 100%
                </span>
              </div>

              {/* 3 Top Summary Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Disruptions Evaded</span>
                  <strong style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>3 Disasters</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Zero flood strandings recorded</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Commute Time Saved</span>
                  <strong style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>+42 Minutes</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Via real-time Metro 2A viaduct reroute</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Transit Pass Efficiency</span>
                  <strong style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>98.4% Score</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Verified Suburban commuter tier</span>
                </div>
              </div>

              {/* Verified Trips Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px' }}>Date & Time</th>
                      <th style={{ padding: '10px 14px' }}>Route Segment</th>
                      <th style={{ padding: '10px 14px' }}>Incident Avoided</th>
                      <th style={{ padding: '10px 14px' }}>Evasive Mode</th>
                      <th style={{ padding: '10px 14px' }}>Time Saved</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>15 Jul 2026, 08:10</td>
                      <td style={{ padding: '10px 14px' }}>Ashokvan ➔ RGIT Versova</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                          Malad Subway (68cm Flood)
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0284c7' }}>Metro 2A Viaduct</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>+24 min saved</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>On-Time</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>14 Jul 2026, 08:05</td>
                      <td style={{ padding: '10px 14px' }}>Ashokvan ➔ RGIT Versova</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 7px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                          WEH Pathanwadi Pileup
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0284c7' }}>Western Rail Fast</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>+18 min saved</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>On-Time</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>13 Jul 2026, 08:12</td>
                      <td style={{ padding: '10px 14px' }}>Ashokvan ➔ RGIT Versova</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>None (Clear Flow)</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>Motorcycle Direct</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>Standard 45m</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>Completed</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. FAST 1-CLICK PERSONA SWITCHER FOR EVALUATORS */}

          <div className="auth-persona-switcher-box minimal-card">
            <div className="aps-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} className="text-amber" />
                <h4>1-Click Evaluator Personas (For Demo & Testing)</h4>
              </div>
              <span className="aps-hint">Instantly toggles verified commuter profiles</span>
            </div>

            <div className="persona-cards-grid">
              {/* Persona 1: Sahil (Student 001) */}
              <div 
                className={`persona-card ${currentUser.user_code === 'STUDENT_001' ? 'active-persona' : ''}`}
                onClick={() => handleQuickLogin('STUDENT_001')}
              >
                <div className="pc-top">
                  <span className="role-chip student">🎓 Student 001</span>
                  {currentUser.user_code === 'STUDENT_001' && <span className="active-tag">ACTIVE</span>}
                </div>
                <h5>Sahil (Student 001)</h5>
                <span className="pc-org">RGIT Versova (B.Tech CE)</span>
                <div className="pc-route">
                  <span>Ashokvan</span>
                  <ArrowRight size={10} />
                  <span>RGIT Versova</span>
                </div>
                <div className="pc-mode">
                  <Bike size={12} /> Motorcycle • Dep: 08:00 AM
                </div>
                <button className="pc-btn">
                  {currentUser.user_code === 'STUDENT_001' ? 'Currently Active' : 'Switch to Sahil'}
                </button>
              </div>

              {/* Persona 2: Pooja Mehta (Corporate IT) */}
              <div 
                className={`persona-card ${currentUser.user_code === 'CORP_002' ? 'active-persona' : ''}`}
                onClick={() => handleQuickLogin('CORP_002')}
              >
                <div className="pc-top">
                  <span className="role-chip corporate">💼 Corporate IT</span>
                  {currentUser.user_code === 'CORP_002' && <span className="active-tag">ACTIVE</span>}
                </div>
                <h5>Pooja Mehta</h5>
                <span className="pc-org">TCS (Bandra Kurla Complex)</span>
                <div className="pc-route">
                  <span>Kandivali West</span>
                  <ArrowRight size={10} />
                  <span>BKC G-Block</span>
                </div>
                <div className="pc-mode">
                  <Train size={12} /> Suburban Train • Dep: 08:15 AM
                </div>
                <button className="pc-btn">
                  {currentUser.user_code === 'CORP_002' ? 'Currently Active' : 'Switch to Pooja'}
                </button>
              </div>

              {/* Persona 3: Dr. Vikram Rao (Emergency Trauma) */}
              <div 
                className={`persona-card ${currentUser.user_code === 'EMERGENCY_003' ? 'active-persona' : ''}`}
                onClick={() => handleQuickLogin('EMERGENCY_003')}
              >
                <div className="pc-top">
                  <span className="role-chip emergency">🚑 First Responder</span>
                  {currentUser.user_code === 'EMERGENCY_003' && <span className="active-tag">ACTIVE</span>}
                </div>
                <h5>Dr. Vikram Rao</h5>
                <span className="pc-org">KEM Hospital Trauma Care</span>
                <div className="pc-route">
                  <span>Andheri West</span>
                  <ArrowRight size={10} />
                  <span>KEM Hospital (Parel)</span>
                </div>
                <div className="pc-mode">
                  <Car size={12} /> Emergency Car • Dep: 07:30 AM
                </div>
                <button className="pc-btn">
                  {currentUser.user_code === 'EMERGENCY_003' ? 'Currently Active' : 'Switch to Dr. Vikram'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
            3. SIGN IN / SIGN UP AUTHENTICATION PORTAL (When signed out)
           ===================================================================== */
        <div className="auth-portal-card minimal-card">
          <div className="auth-tabs-toggle">
            <button 
              className={`auth-toggle-btn ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); setIsEditing(false); }}
            >
              <LogIn size={15} />
              <span>Sign In to UrbanPulse</span>
            </button>
            <button 
              className={`auth-toggle-btn ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
            >
              <UserPlus size={15} />
              <span>Create Commuter Profile (Sign Up)</span>
            </button>
          </div>

          {/* TAB 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <div className="auth-tab-content">
              <div className="auth-signin-grid">
                <form className="auth-form" onSubmit={handleSignIn}>
                  <div className="form-header">
                    <h3>Commuter Account Login</h3>
                    <p>Enter your credentials or choose a pre-loaded hackathon archetype:</p>
                  </div>

                  <div className="form-group">
                    <label>Email, Commuter Code, or Mobile Number</label>
                    <div className="input-with-icon">
                      <Mail size={15} />
                      <input 
                        type="text" 
                        placeholder="e.g. STUDENT_001 or sahil@rgit.edu.in"
                        value={loginIdentifier}
                        onChange={e => setLoginIdentifier(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="input-with-icon">
                      <Lock size={15} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Enter password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="toggle-pwd-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <span className="form-hint">Default password for demo accounts is <code>password123</code></span>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-auth-submit primary-glow"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={14} />
                        <span>Sign In & Load Commute Telemetry</span>
                      </>
                    )}
                  </button>
                </form>

                {/* 1-CLICK INSTANT LOGIN PANEL */}
                <div className="auth-quick-demo-panel">
                  <div className="qdp-header">
                    <Zap size={15} className="text-amber" />
                    <h4>⚡ 1-Click Evaluator Login</h4>
                  </div>
                  <p className="qdp-desc">
                    Click any archetype below to authenticate instantly with verified Supabase credentials:
                  </p>

                  <div className="qdp-persona-list">
                    <div 
                      className="qdp-persona-item"
                      onClick={() => handleQuickLogin('STUDENT_001')}
                    >
                      <div className="qdp-avatar student">🎓</div>
                      <div className="qdp-info">
                        <strong>Sahil (Student 001)</strong>
                        <span>Ashokvan ➔ RGIT Versova • Motorcycle</span>
                      </div>
                      <button className="qdp-action-btn">Sign In</button>
                    </div>

                    <div 
                      className="qdp-persona-item"
                      onClick={() => handleQuickLogin('CORP_002')}
                    >
                      <div className="qdp-avatar corporate">💼</div>
                      <div className="qdp-info">
                        <strong>Pooja Mehta (Corporate IT)</strong>
                        <span>Kandivali West ➔ BKC G-Block • Train</span>
                      </div>
                      <button className="qdp-action-btn">Sign In</button>
                    </div>

                    <div 
                      className="qdp-persona-item"
                      onClick={() => handleQuickLogin('EMERGENCY_003')}
                    >
                      <div className="qdp-avatar emergency">🚑</div>
                      <div className="qdp-info">
                        <strong>Dr. Vikram Rao (Trauma Care)</strong>
                        <span>Andheri West ➔ KEM Hospital • Car</span>
                      </div>
                      <button className="qdp-action-btn">Sign In</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIGN UP REGISTRATION FORM */}
          {authMode === 'signup' && (
            <div className="auth-tab-content">
              <form className="auth-signup-form" onSubmit={handleSignUp}>
                <div className="signup-intro">
                  <h3>New Mumbai Commuter Registration</h3>
                  <p>Register your daily origin, destination, and alert thresholds to receive live evasive rerouting:</p>
                </div>

                {/* STEP 1: PERSONAL DETAILS */}
                <div className="form-section-card">
                  <div className="fsc-header">
                    <span className="step-num">1</span>
                    <h4>Personal Identification</h4>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Full Name <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <User size={14} />
                        <input 
                          type="text" 
                          placeholder="e.g. Sahil Shinde"
                          value={formData.fullName}
                          onChange={e => handleInputChange('fullName', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email Address <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <Mail size={14} />
                        <input 
                          type="email" 
                          placeholder="commuter@mumbai.edu.in"
                          value={formData.email}
                          onChange={e => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Mobile Number <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <Phone size={14} />
                        <input 
                          type="tel" 
                          placeholder="+91 98200 12345"
                          value={formData.phone}
                          onChange={e => handleInputChange('phone', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Password <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <Lock size={14} />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={e => handleInputChange('password', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Confirm Password <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <Lock size={14} />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={e => handleInputChange('confirmPassword', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: PERSONA CATEGORY */}
                <div className="form-section-card">
                  <div className="fsc-header">
                    <span className="step-num">2</span>
                    <h4>Commuter Category & Affiliation</h4>
                  </div>
                  <div className="role-selector-pills">
                    {[
                      { id: 'STUDENT', label: 'Student', icon: '🎓', desc: 'College & university campus transit' },
                      { id: 'CORPORATE', label: 'Corporate IT', icon: '💼', desc: 'BKC, Mindspace, NESCO offices' },
                      { id: 'EMERGENCY', label: 'First Responder', icon: '🚑', desc: 'Hospital trauma & disaster teams' },
                      { id: 'CITIZEN', label: 'Daily Citizen', icon: '🚗', desc: 'General municipal commuting' }
                    ].map(r => (
                      <div 
                        key={r.id}
                        className={`role-choice-card ${formData.role === r.id ? 'active' : ''}`}
                        onClick={() => handleInputChange('role', r.id)}
                      >
                        <span className="rc-icon">{r.icon}</span>
                        <strong>{r.label}</strong>
                        <span className="rc-desc">{r.desc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>Institution / Company Name</label>
                      <div className="input-with-icon">
                        <Building2 size={14} />
                        <input 
                          type="text" 
                          placeholder="e.g. Rajiv Gandhi Institute of Technology (RGIT)"
                          value={formData.organization}
                          onChange={e => handleInputChange('organization', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Student Pass / Employee ID (Optional)</label>
                      <div className="input-with-icon">
                        <User size={14} />
                        <input 
                          type="text" 
                          placeholder="e.g. MUM-ENG-2026-001"
                          value={formData.studentOrEmployeeId}
                          onChange={e => handleInputChange('studentOrEmployeeId', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3: ROUTE SETTINGS */}
                <div className="form-section-card">
                  <div className="fsc-header">
                    <span className="step-num">3</span>
                    <h4>Daily Mumbai Commute Route</h4>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Default Origin (Home Area) <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <MapPin size={14} className="text-emerald" />
                        <input 
                          type="text"
                          list="origin-locations-list"
                          placeholder="e.g. Ashokvan (Borivali East)"
                          value={formData.defaultOrigin}
                          onChange={e => handleInputChange('defaultOrigin', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Default Destination <span className="req">*</span></label>
                      <div className="input-with-icon">
                        <MapPin size={14} className="text-rose" />
                        <input 
                          type="text"
                          list="dest-locations-list"
                          placeholder="e.g. Rajiv Gandhi Institute of Technology (RGIT, Versova)"
                          value={formData.defaultDestination}
                          onChange={e => handleInputChange('defaultDestination', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <datalist id="origin-locations-list">
                    {availableLocations.map((loc, i) => (
                      <option key={i} value={loc} />
                    ))}
                  </datalist>
                  <datalist id="dest-locations-list">
                    {availableLocations.map((loc, i) => (
                      <option key={i} value={loc} />
                    ))}
                  </datalist>

                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>Primary Travel Mode</label>
                      <select 
                        className="minimal-select"
                        value={formData.preferredMode}
                        onChange={e => handleInputChange('preferredMode', e.target.value)}
                      >
                        <option value="MOTORCYCLE">Motorcycle / Two-Wheeler</option>
                        <option value="TRAIN">Western Railway Local</option>
                        <option value="METRO">Metro Line 2A Elevated Viaduct</option>
                        <option value="BUS">BEST Bus Transit</option>
                        <option value="CAR">Personal Car / Taxi</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Backup Evasive Mode</label>
                      <select 
                        className="minimal-select"
                        value={formData.secondaryMode}
                        onChange={e => handleInputChange('secondaryMode', e.target.value)}
                      >
                        <option value="METRO">Metro Line 2A (Flood-Immune)</option>
                        <option value="TRAIN">Western Railway</option>
                        <option value="BUS">BEST Bus</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-auth-submit primary-glow"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Creating Profile in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Create Commuter Profile & Activate Reroute Monitor</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
