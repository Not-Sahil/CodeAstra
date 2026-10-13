-- =============================================================================
-- CODEASTRA / URBANPULSE AI: CONSOLIDATED SUPABASE SCHEMA (Phase 12)
-- =============================================================================
-- Safe, idempotent PostgreSQL schema for UrbanPulse AI incident intelligence,
-- route corridor monitoring, source health, and automated daily SMS commute alerts.
-- Can be applied in one step via Supabase SQL Editor.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. COMMUTER PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'CITIZEN',
    organization VARCHAR(150),
    default_origin VARCHAR(255),
    default_destination VARCHAR(255),
    preferred_mode VARCHAR(50) DEFAULT 'DRIVE', -- DRIVE, MOTORCYCLE, TRANSIT, WALK
    scheduled_sms_time VARCHAR(10) DEFAULT '08:00', -- HH:MM in Asia/Kolkata
    sms_consent BOOLEAN DEFAULT false,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    alert_preferences JSONB DEFAULT '{"notify_sms": false, "notify_in_app": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for existing deployments
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scheduled_sms_time VARCHAR(10) DEFAULT '08:00';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS alert_preferences JSONB DEFAULT '{"notify_sms": false, "notify_in_app": true}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_origin VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_destination VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS saved_locations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nearby_radius_km DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS min_alert_severity VARCHAR(50) DEFAULT 'MODERATE';

-- -----------------------------------------------------------------------------
-- 2. URBAN INCIDENTS & PROVENANCE TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
    incident_id VARCHAR(50) PRIMARY KEY,
    scenario_type VARCHAR(100) NOT NULL,
    incident_title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    affected_radius_km DOUBLE PRECISION DEFAULT 1.0,
    affected_infrastructure TEXT NOT NULL,
    severity_level VARCHAR(50) NOT NULL, -- CRITICAL_LEVEL_4, MAJOR_LEVEL_3, MODERATE_LEVEL_2, LOW_LEVEL_1
    estimated_commuters_affected INTEGER DEFAULT 0,
    confidence_score DOUBLE PRECISION DEFAULT 0.80,
    known_cause TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CONTAINED, RESOLVED
    verification_status VARCHAR(50) DEFAULT 'OFFICIALLY_VERIFIED', -- OFFICIALLY_VERIFIED, COMMUNITY_UNVERIFIED, SIMULATED
    provenance VARCHAR(100) DEFAULT 'MUNICIPAL_DISRUPTION_FEED', -- MUNICIPAL_DISRUPTION_FEED, CITIZEN_REPORT, OPEN_METEO_API, SIMULATED_SCENARIO
    is_simulated BOOLEAN DEFAULT false,
    source VARCHAR(100) DEFAULT 'MUMBAI_DISASTER_MANAGEMENT_CAD_112',
    source_reliability DOUBLE PRECISION DEFAULT 0.90,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'OFFICIALLY_VERIFIED';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS provenance VARCHAR(100) DEFAULT 'MUNICIPAL_DISRUPTION_FEED';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- 3. MULTIMODAL INCOMING OBSERVATIONS (Sensor, Weather, Citizen Evidence)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_events (
    event_id VARCHAR(50) PRIMARY KEY,
    incident_id VARCHAR(50) REFERENCES public.incidents(incident_id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    received_timestamp TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    measured_value VARCHAR(100),
    raw_text_payload TEXT,
    source_reliability DOUBLE PRECISION DEFAULT 0.85,
    provenance VARCHAR(100) DEFAULT 'LIVE_EXTERNAL_DATA',
    is_simulated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incident_events ADD COLUMN IF NOT EXISTS provenance VARCHAR(100) DEFAULT 'LIVE_EXTERNAL_DATA';
ALTER TABLE public.incident_events ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;

-- -----------------------------------------------------------------------------
-- 4. COMMUTE EVALUATION AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commute_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(100) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    preferred_mode VARCHAR(50) NOT NULL,
    calculated_travel_time_min INTEGER,
    recommended_mode VARCHAR(50),
    net_time_saved_min INTEGER,
    incident_exposure_score VARCHAR(50),
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

-- -----------------------------------------------------------------------------
-- 5. SOURCE HEALTH & RESILIENCE AUDIT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_health (
    source_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- ONLINE, DEGRADED, OFFLINE, UNAVAILABLE, STANDBY
    is_authorized BOOLEAN DEFAULT true,
    last_successful_fetch TIMESTAMPTZ,
    consecutive_failures INTEGER DEFAULT 0,
    last_error TEXT,
    data_freshness VARCHAR(50) DEFAULT 'LIVE',
    operational_note TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. SCHEDULED COMMUTE ALERTS & FAST2SMS DELIVERY LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_commute_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    scheduled_time VARCHAR(10) NOT NULL, -- HH:MM (Asia/Kolkata)
    is_active BOOLEAN DEFAULT true,
    last_dispatched_at TIMESTAMPTZ,
    last_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    phone_masked VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL, -- accepted, rejected_by_gateway, validation_error, rate_limited, mock_accepted
    provider_request_id VARCHAR(100),
    is_successful BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. PERSONALIZED USER NOTIFICATIONS & AUDIT LEDGER (Objective 1 & 8)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_code VARCHAR(50),
    incident_id VARCHAR(50) REFERENCES public.incidents(incident_id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL, -- NEARBY, COMMUTE, UPDATE, SCHEDULED
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL, -- LOW, MODERATE, MAJOR, CRITICAL
    channels JSONB DEFAULT '["IN_APP"]'::jsonb, -- Array of channels e.g. ["IN_APP", "SMS", "WEB_PUSH"]
    delivery_status VARCHAR(50) DEFAULT 'DELIVERED', -- DELIVERED, ACCEPTED, FAILED, MOCKED, IN_APP_ONLY
    is_read BOOLEAN DEFAULT false,
    evidence_summary JSONB DEFAULT '{}'::jsonb,
    missing_data_qualification TEXT,
    idempotency_key VARCHAR(160) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. REPLAY & SIMULATION LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replay_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    resulting_confidence DOUBLE PRECISION,
    supporting_evidence_count INTEGER,
    contradictory_evidence_count INTEGER,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. INDEXES FOR FAST GEOSPATIAL & TEMPORAL QUERIES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_incidents_coords ON public.incidents(centroid_lat, centroid_lon);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_provenance ON public.incidents(provenance, is_simulated);
CREATE INDEX IF NOT EXISTS idx_events_incident ON public.incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.incident_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_commute_time ON public.commute_queries(searched_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_time ON public.sms_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notif_user_time ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notif_code_time ON public.user_notifications(user_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notif_incident ON public.user_notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_read ON public.user_notifications(user_id, is_read);

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commute_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_commute_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read access incidents" ON public.incidents;
    DROP POLICY IF EXISTS "Public read access source_health" ON public.source_health;
    DROP POLICY IF EXISTS "Public insert citizen reports" ON public.incidents;
    DROP POLICY IF EXISTS "Public access commute_queries" ON public.commute_queries;
    DROP POLICY IF EXISTS "Full access users" ON public.users;
    DROP POLICY IF EXISTS "Public access sms_logs" ON public.sms_delivery_logs;
    DROP POLICY IF EXISTS "Public full access events" ON public.incident_events;
    DROP POLICY IF EXISTS "Public full access user_notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Public full access replay" ON public.replay_logs;
END $$;

CREATE POLICY "Public read access incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Public insert citizen reports" ON public.incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access source_health" ON public.source_health FOR SELECT USING (true);
CREATE POLICY "Public access commute_queries" ON public.commute_queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access sms_logs" ON public.sms_delivery_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access events" ON public.incident_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access user_notifications" ON public.user_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access replay" ON public.replay_logs FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 11. MUNICIPAL WORK ORDERS & OPERATOR BRIEFINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.municipal_work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id VARCHAR(100) UNIQUE NOT NULL,
    incident_id VARCHAR(50) REFERENCES public.incidents(incident_id) ON DELETE SET NULL,
    incident_type VARCHAR(100) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    problem_description TEXT NOT NULL,
    observed_symptoms JSONB DEFAULT '[]'::jsonb,
    root_cause_hypothesis TEXT,
    supporting_evidence JSONB DEFAULT '[]'::jsonb,
    confidence_score DOUBLE PRECISION DEFAULT 0.85,
    recommended_response TEXT NOT NULL,
    suggested_resources JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(50) NOT NULL DEFAULT 'HIGH', -- CRITICAL, HIGH, MEDIUM, LOW
    department VARCHAR(150) NOT NULL DEFAULT 'MCGM Storm Water Drains Dept',
    verification_steps JSONB DEFAULT '[]'::jsonb,
    safety_considerations JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, APPROVED, REJECTED, CANCELLED, TRANSMITTED
    operator_notes TEXT,
    created_by VARCHAR(100) DEFAULT 'OPERATOR_DESK',
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    is_simulated BOOLEAN DEFAULT false,
    external_transmission_status VARCHAR(50) DEFAULT 'NOT_TRANSMITTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_order_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- DRAFT_CREATED, EDITED, APPROVED, REJECTED, CANCELLED, TRANSMIT_BLOCKED
    actor VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL, -- OPERATOR, ADMIN, CITIZEN
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operator_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) REFERENCES public.incidents(incident_id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    summary_q1_what_is_happening TEXT NOT NULL,
    supported_explanation_q2 TEXT NOT NULL,
    supporting_observations_q3 JSONB DEFAULT '[]'::jsonb,
    contradicting_observations_q4 JSONB DEFAULT '[]'::jsonb,
    confidence_delta_explanation_q5 TEXT NOT NULL,
    missing_stale_sources_q6 JSONB DEFAULT '[]'::jsonb,
    excluded_sensors_q7 JSONB DEFAULT '[]'::jsonb,
    potential_public_impact_q8 TEXT NOT NULL,
    recommended_action_q9 TEXT NOT NULL,
    uncertainties_q10 JSONB DEFAULT '[]'::jsonb,
    confidence_score DOUBLE PRECISION NOT NULL,
    generated_by VARCHAR(50) DEFAULT 'DETERMINISTIC_EVIDENCE_ENGINE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_incident ON public.municipal_work_orders(incident_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.municipal_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_audit_work_order ON public.work_order_audit_logs(work_order_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_incident ON public.operator_briefings(incident_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.municipal_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_briefings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public full access work_orders" ON public.municipal_work_orders;
    DROP POLICY IF EXISTS "Public full access work_order_audit" ON public.work_order_audit_logs;
    DROP POLICY IF EXISTS "Public full access operator_briefings" ON public.operator_briefings;
END $$;

CREATE POLICY "Public full access work_orders" ON public.municipal_work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access work_order_audit" ON public.work_order_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access operator_briefings" ON public.operator_briefings FOR ALL USING (true) WITH CHECK (true);

-- End of consolidated schema. No fake commuter or incident seed data inserted.

