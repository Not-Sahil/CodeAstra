-- =============================================================================
-- CODEASTRA / URBANPULSE: SUPABASE DATABASE MIGRATION SCHEMA
-- =============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This creates all required tables, foreign keys, indexes, and initial seed data.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & COMMUTER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'STUDENT',
    organization VARCHAR(150),
    default_origin VARCHAR(150) DEFAULT 'Ashokvan (Borivali East)',
    default_destination VARCHAR(150) DEFAULT 'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
    preferred_mode VARCHAR(50) DEFAULT 'TRAIN', -- TRAIN, METRO, PERSONAL_VEHICLE, BUS
    secondary_mode VARCHAR(50) DEFAULT 'METRO',
    departure_time TIME DEFAULT '08:00:00',
    target_arrival_time TIME DEFAULT '09:00:00',
    alert_preferences JSONB DEFAULT '{"flood_sensitivity": "HIGH", "delay_sensitivity_min": 10, "notify_in_app": true, "notify_sms_whatsapp": true}'::jsonb,
    emergency_contact JSONB DEFAULT '{"name": "Emergency Contact", "phone": "+91 9800000000"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility ALTER statements if users table already exists:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization VARCHAR(150);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS secondary_mode VARCHAR(50) DEFAULT 'METRO';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS departure_time TIME DEFAULT '08:00:00';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS alert_preferences JSONB DEFAULT '{"flood_sensitivity": "HIGH", "delay_sensitivity_min": 10, "notify_in_app": true, "notify_sms_whatsapp": true}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{"name": "Emergency Contact", "phone": "+91 9800000000"}'::jsonb;


-- 2. LIVE URBAN INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS public.incidents (
    incident_id VARCHAR(50) PRIMARY KEY,
    scenario_type VARCHAR(100) NOT NULL, -- Urban Flooding, Road Accident, Utility Failure, Public Transport Disruption
    incident_title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    affected_radius_km DOUBLE PRECISION DEFAULT 1.5,
    affected_infrastructure TEXT NOT NULL,
    severity_level VARCHAR(50) NOT NULL, -- CRITICAL_LEVEL_4, MAJOR_LEVEL_3, MODERATE_LEVEL_2, LOW_LEVEL_1
    estimated_commuters_affected INTEGER DEFAULT 0,
    economic_impact_score DOUBLE PRECISION DEFAULT 0.0,
    confidence_score DOUBLE PRECISION DEFAULT 0.90,
    known_cause TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CONTAINED, RESOLVED, VERIFYING
    is_simulated BOOLEAN DEFAULT true, -- Explicitly distinguishes simulated scenarios from real-world incidents
    location_verified BOOLEAN DEFAULT true, -- Marks whether geographic coordinates have been validated
    source VARCHAR(100) DEFAULT 'MUMBAI_DISASTER_MANAGEMENT_CAD_112',
    source_reliability DOUBLE PRECISION DEFAULT 0.94,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility ALTER statements for incidents:
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT true;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT true;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'MUMBAI_DISASTER_MANAGEMENT_CAD_112';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS source_reliability DOUBLE PRECISION DEFAULT 0.94;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- 3. MULTIMODAL INCOMING EVENTS TABLE (Sensors, Feeds, Citizen Reports)
CREATE TABLE IF NOT EXISTS public.incident_events (
    event_id VARCHAR(50) PRIMARY KEY,
    incident_id VARCHAR(50) REFERENCES public.incidents(incident_id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL, -- SENSOR_ULTRASONIC, TRAFFIC_SPEED_RADAR, SCADA_FEED, CITIZEN_CAD_112, TWITTER_FEED
    event_type VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    received_timestamp TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    measured_value VARCHAR(100),
    raw_text_payload TEXT,
    source_reliability DOUBLE PRECISION DEFAULT 0.85,
    relationship_status VARCHAR(50) DEFAULT 'OBSERVED', -- PARENT_TRIGGER, PRIMARY_OBSERVATION, CORRELATED, DUPLICATE_REPORT, CONTRADICTORY_NOISE
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER COMMUTE QUERIES & LIVE ALERT LOGS
CREATE TABLE IF NOT EXISTS public.commute_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(100) NOT NULL,
    origin VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    preferred_mode VARCHAR(50) NOT NULL,
    calculated_travel_time_min INTEGER,
    recommended_mode VARCHAR(50),
    net_time_saved_min INTEGER,
    incident_exposure_score VARCHAR(50), -- LOW, MODERATE, HIGH, CRITICAL
    nearby_hazards_count INTEGER DEFAULT 0,
    intersecting_incidents JSONB DEFAULT '[]'::jsonb,
    itinerary_details JSONB DEFAULT '{}'::jsonb,
    corridor_threshold_m DOUBLE PRECISION DEFAULT 350.0,
    route_geometry JSONB DEFAULT '{}'::jsonb,
    alternative_routes JSONB DEFAULT '[]'::jsonb,
    is_authoritative_google_route BOOLEAN DEFAULT true,
    routing_provider VARCHAR(100) DEFAULT 'GOOGLE_ROUTES_API_V2',
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility ALTER statements for commute_queries:
ALTER TABLE public.commute_queries ADD COLUMN IF NOT EXISTS corridor_threshold_m DOUBLE PRECISION DEFAULT 350.0;
ALTER TABLE public.commute_queries ADD COLUMN IF NOT EXISTS route_geometry JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.commute_queries ADD COLUMN IF NOT EXISTS alternative_routes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.commute_queries ADD COLUMN IF NOT EXISTS is_authoritative_google_route BOOLEAN DEFAULT true;
ALTER TABLE public.commute_queries ADD COLUMN IF NOT EXISTS routing_provider VARCHAR(100) DEFAULT 'GOOGLE_ROUTES_API_V2';

-- 5. REPLAY LAB & RESILIENCE STRESS LOGS
CREATE TABLE IF NOT EXISTS public.replay_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(100) NOT NULL, -- INJECT_DUPLICATE, DELAY_EVENT, ADD_CONTRADICTION, DISCONNECT_SENSOR, RESET
    payload JSONB DEFAULT '{}'::jsonb,
    resulting_confidence DOUBLE PRECISION,
    supporting_evidence_count INTEGER,
    contradictory_evidence_count INTEGER,
    duplicate_reports_excluded INTEGER,
    stale_sensors_count INTEGER,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES FOR FAST GEOSPATIAL & TEMPORAL QUERIES
CREATE INDEX IF NOT EXISTS idx_incidents_coords ON public.incidents(centroid_lat, centroid_lon);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_events_incident ON public.incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.incident_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_commute_time ON public.commute_queries(searched_at);

-- INSERT SEED STUDENT PROFILE (Story Hero: Student 001)
INSERT INTO public.users (user_code, full_name, email, role, default_origin, default_destination, preferred_mode, target_arrival_time)
VALUES (
    'STUDENT_001',
    'Sahil (Student 001)',
    'sahil.student@rgit.edu.in',
    'STUDENT',
    'Ashokvan (Borivali East)',
    'Rajiv Gandhi Institute of Technology (RGIT, Versova)',
    'MOTORCYCLE',
    '09:00:00'
)
ON CONFLICT (user_code) DO NOTHING;

-- ROW LEVEL SECURITY (RLS) POLICIES (Read accessible to public, writes allowed for demo)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commute_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for prototype demonstration
CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access events" ON public.incident_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access queries" ON public.commute_queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access replay" ON public.replay_logs FOR ALL USING (true) WITH CHECK (true);
