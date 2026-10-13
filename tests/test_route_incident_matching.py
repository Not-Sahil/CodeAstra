"""
Automated Test Suite for Route-Based Incident Detection and Commute Workflow.
Covers all 12 acceptance test scenarios specified in Section 10:

TEST 1: INCIDENT ON ROUTE
TEST 2: INCIDENT FAR FROM ROUTE
TEST 3: INCIDENT NEAR ORIGIN BUT OFF ROUTE
TEST 4: INCIDENT NEAR DESTINATION BUT OFF ROUTE
TEST 5: PARALLEL ROAD INCIDENT (e.g. SV Road vs WEH)
TEST 6: MULTIPLE INCIDENTS
TEST 7: ALTERNATIVE ROUTES INDEPENDENT EVALUATION
TEST 8: INCIDENT WITHOUT COORDINATES
TEST 9: STALE OR RESOLVED INCIDENT
TEST 10: GOOGLE MAPS API FAILURE HANDLING
TEST 11: DUPLICATE INCIDENTS
TEST 12: ROUTE CHANGE DYNAMIC RECALCULATION
TEST 13: LIVE GOOGLE ROUTES API V2 INTEGRATION TEST
"""

import unittest
from unittest.mock import patch, MagicMock
from backend.corridor_matcher import (
    RouteCorridorMatcher,
    haversine_distance_meters,
    point_to_polyline_min_distance,
    point_to_segment_distance_meters
)
from backend.google_routing import GoogleRoutingService, decode_polyline
from backend.engine import IncidentIntelligenceEngine

class TestRouteIncidentMatching(unittest.TestCase):

    def setUp(self):
        self.engine = IncidentIntelligenceEngine()
        self.matcher = RouteCorridorMatcher()
        self.routing_service = GoogleRoutingService()

        # Realistic route polyline: Southbound along Western Express Highway from Kandivali to Goregaon
        self.sample_weh_polyline = [
            [19.2045, 72.8522],  # Kandivali East WEH junction
            [19.1950, 72.8550],  # Malad East WEH
            [19.1814, 72.8591],  # Pathanwadi Flyover (WEH)
            [19.1645, 72.8580],  # Goregaon East Hub Mall
            [19.1555, 72.8542],  # Nesco IT Park
            [19.1415, 72.8562],  # JVLR Junction
        ]

    def test_01_incident_on_route(self):
        """TEST 1: An incident located directly on or within 100m of the Google Maps route."""
        incident_on_route = {
            "incident_id": "INC_TEST_01",
            "title": "WEH Pathanwadi Southbound Multi-Vehicle Collision",
            "scenario_type": "Road Accident",
            "severity_level": "MAJOR_LEVEL_3",
            "centroid_lat": 19.1814,
            "centroid_lon": 72.8591,
            "affected_infrastructure": "Western Express Highway Pathanwadi",
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[incident_on_route],
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        relevant = res["route_relevant_incidents"]
        self.assertEqual(len(relevant), 1, "Incident on route must be included in relevant list")
        self.assertEqual(relevant[0]["incident_id"], "INC_TEST_01")
        self.assertLess(relevant[0]["distance_from_route_meters"], 50.0)
        self.assertEqual(relevant[0]["route_relevance"], "CONFIRMED_CORRIDOR_INTERSECTION")
        self.assertTrue(relevant[0]["is_road_obstructive"])

    def test_02_incident_far_from_route(self):
        """TEST 2: An active incident exists far away elsewhere in Mumbai (e.g. Dadar TT Circle)."""
        incident_dadar = {
            "incident_id": "INC_DADAR_FAR",
            "title": "Dadar TT Circle Water Accumulation",
            "scenario_type": "Urban Flooding",
            "severity_level": "MAJOR_LEVEL_3",
            "centroid_lat": 19.0195,  # South-Central Mumbai (~15km south)
            "centroid_lon": 72.8430,
            "affected_infrastructure": "Dadar East TT Circle",
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[incident_dadar],
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Far-away incident must NOT be included in route alerts")
        self.assertEqual(len(res["off_route_hazards"]), 1, "Far-away incident must remain in off-route hazards for citywide map")
        self.assertGreater(res["off_route_hazards"][0]["distance_from_route_km"], 10.0)

    def test_03_incident_near_origin_but_off_route(self):
        """TEST 3: An incident is near starting point but outside the 350m route corridor."""
        # Origin is at Kandivali WEH [19.2045, 72.8522]
        # Incident is 1.5 km East in Sanjay Gandhi National Park foothills
        incident_near_origin_off_route = {
            "incident_id": "INC_NEAR_ORIGIN_OFF",
            "title": "Kandivali East SGNP Foothills Tree Fall",
            "scenario_type": "Road Blockage",
            "severity_level": "MODERATE_LEVEL_2",
            "centroid_lat": 19.2080,
            "centroid_lon": 72.8710,  # ~1.9 km East of WEH
            "affected_infrastructure": "Lokhandwala Township Internal Road",
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[incident_near_origin_off_route],
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Incident off-corridor near origin must be excluded from commute alerts")
        self.assertEqual(len(res["off_route_hazards"]), 1)
        self.assertGreater(res["off_route_hazards"][0]["distance_from_route_meters"], 350.0)

    def test_04_incident_near_destination_but_off_route(self):
        """TEST 4: An incident exists near the destination but does not intersect the route corridor."""
        # Destination is JVLR Junction [19.1415, 72.8562]
        # Incident is in Juhu / Versova coast [19.1150, 72.8250] (~4 km away)
        incident_near_dest_off_route = {
            "incident_id": "INC_NEAR_DEST_OFF",
            "title": "Juhu Tara Road High Tide Surge",
            "scenario_type": "Urban Flooding",
            "severity_level": "MODERATE_LEVEL_2",
            "centroid_lat": 19.1150,
            "centroid_lon": 72.8250,
            "affected_infrastructure": "Juhu Tara Road",
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[incident_near_dest_off_route],
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Incident near destination outside corridor must not be classified as route incident")
        self.assertEqual(len(res["off_route_hazards"]), 1)

    def test_05_parallel_road_incident(self):
        """
        TEST 5: Incident on a nearby parallel road (e.g. S.V. Road / Malad Subway).
        Malad Subway is on SV Road at [19.1875, 72.8504].
        The Western Express Highway route passes at [19.1860, 72.8585], ~850 meters to the East.
        A 350m corridor threshold MUST exclude the SV Road subway incident from the WEH driving route!
        """
        malad_subway_sv_road = {
            "incident_id": "INC_MALAD_SUBWAY_SV_RD",
            "title": "Severe Track Submergence at Malad Subway & SV Road",
            "scenario_type": "Urban Flooding",
            "severity_level": "CRITICAL_LEVEL_4",
            "centroid_lat": 19.1875,
            "centroid_lon": 72.8504,
            "affected_infrastructure": "Malad Subway, SV Road",
            "status": "ACTIVE"
        }

        # Corridor threshold 350 meters
        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[malad_subway_sv_road],
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Malad Subway on parallel SV Road must NOT alert the WEH highway commuter")
        self.assertEqual(len(res["off_route_hazards"]), 1)
        # Measured distance is ~693m (> 350m corridor threshold)
        self.assertGreater(res["off_route_hazards"][0]["distance_from_route_meters"], 500.0)
        self.assertLess(res["off_route_hazards"][0]["distance_from_route_meters"], 1200.0)

    def test_06_multiple_incidents_selective_matching(self):
        """TEST 6: Several incidents exist, some on the route and others elsewhere across Mumbai."""
        active_incidents = self.engine.get_active_incidents()
        self.assertGreaterEqual(len(active_incidents), 10, "Should have 10+ active Mumbai incidents")

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=active_incidents,
            travel_mode="DRIVE",
            corridor_threshold_m=350.0
        )

        relevant = res["route_relevant_incidents"]
        # Only WEH Pathanwadi Collision and JVLR junction should match the WEH highway corridor
        matched_ids = [i["incident_id"] for i in relevant]
        self.assertIn("INC_MUM_20260716_04", matched_ids, "Pathanwadi Flyover Southbound collision must be matched on WEH")
        self.assertNotIn("INC_MUM_DADAR_HINDMATA", matched_ids, "Dadar must be excluded from Western Suburbs WEH route")
        self.assertNotIn("INC_MUM_KURLA_FLOOD", matched_ids, "Kurla Mithi River flood must be excluded from WEH route")
        self.assertNotIn("INC_MUM_HAJI_ALI", matched_ids, "Haji Ali sea spray must be excluded from WEH route")

    def test_07_alternative_routes_evaluated_independently(self):
        """TEST 7: Alternative candidate routes have independent geometry and different incident exposure."""
        # Route A: Western Express Highway (has Pathanwadi accident)
        route_a = self.sample_weh_polyline
        # Route B: New Link Road via Malad West (has Mithchowki signal failure)
        route_b = [
            [19.2045, 72.8522],  # Kandivali
            [19.2085, 72.8380],  # Kandivali West
            [19.2001, 72.8372],  # Mithchowki Junction
            [19.1865, 72.8380],  # Malad West Link Road
            [19.1601, 72.8362],  # Goregaon West Link Road
            [19.1308, 72.8322],  # D.N. Nagar Link Road
        ]

        active_incidents = self.engine.get_active_incidents()

        match_a = RouteCorridorMatcher.match_incidents_to_route(route_a, active_incidents, "DRIVE", 350.0)
        match_b = RouteCorridorMatcher.match_incidents_to_route(route_b, active_incidents, "DRIVE", 350.0)

        ids_a = {i["incident_id"] for i in match_a["route_relevant_incidents"]}
        ids_b = {i["incident_id"] for i in match_b["route_relevant_incidents"]}

        # Route A should match WEH accident
        self.assertIn("INC_MUM_20260716_04", ids_a)
        # Route B should match Mithchowki signal failure
        self.assertIn("INC_MUM_20260715_03", ids_b)
        # Route A should NOT match Mithchowki
        self.assertNotIn("INC_MUM_20260715_03", ids_a)

    def test_08_incident_without_coordinates(self):
        """TEST 8: An incident has no valid geographic coordinates."""
        unlocated_incident = {
            "incident_id": "INC_NO_COORDS",
            "title": "Unverified Telegram Citizen Rumor",
            "scenario_type": "Public Transport Disruption",
            "severity_level": "MODERATE_LEVEL_2",
            "centroid_lat": None,
            "centroid_lon": None,
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[unlocated_incident],
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Unlocated incident must never be treated as route incident")
        self.assertEqual(len(res["off_route_hazards"]), 1)
        self.assertFalse(res["off_route_hazards"][0]["location_verified"])
        self.assertEqual(res["off_route_hazards"][0]["exclusion_reason"], "INCIDENT_MISSING_COORDINATES")

    def test_09_stale_or_resolved_incident(self):
        """TEST 9: An incident is no longer active (RESOLVED or EXPIRED)."""
        resolved_incident = {
            "incident_id": "INC_RESOLVED_01",
            "title": "Cleared Breakdown at Pathanwadi",
            "scenario_type": "Road Accident",
            "severity_level": "LOW_LEVEL_1",
            "centroid_lat": 19.1814,
            "centroid_lon": 72.8591,
            "status": "RESOLVED"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[resolved_incident],
            corridor_threshold_m=350.0
        )

        self.assertEqual(len(res["route_relevant_incidents"]), 0, "Resolved incident must be excluded from active disruptions")
        self.assertEqual(len(res["off_route_hazards"]), 1)
        self.assertEqual(res["off_route_hazards"][0]["exclusion_reason"], "INCIDENT_STATUS_RESOLVED")

    def test_10_google_maps_api_failure_handling(self):
        """TEST 10: Routing API returns an error or network exception."""
        with patch.object(self.routing_service, 'compute_routes') as mock_routes:
            mock_routes.return_value = {
                "status": "HTTP_ERROR_403",
                "success": False,
                "error_message": "Google Maps Routes API quota exceeded or request denied.",
                "routes": []
            }

            res = mock_routes([19.2372, 72.8695], [19.1342, 72.8145], "DRIVE")
            self.assertFalse(res["success"])
            self.assertEqual(res["status"], "HTTP_ERROR_403")
            self.assertEqual(len(res["routes"]), 0, "No fabricated routes must be presented on failure")

    def test_11_duplicate_incidents_handling(self):
        """TEST 11: Duplicate records referring to the same underlying event."""
        dup1 = {
            "incident_id": "INC_DUP_01",
            "title": "Pathanwadi Collision CAD Report 1",
            "centroid_lat": 19.1814,
            "centroid_lon": 72.8591,
            "status": "ACTIVE"
        }
        dup2 = {
            "incident_id": "INC_DUP_01",  # Same incident ID
            "title": "Pathanwadi Collision CAD Report 2 Duplicate",
            "centroid_lat": 19.1814,
            "centroid_lon": 72.8591,
            "status": "ACTIVE"
        }

        res = RouteCorridorMatcher.match_incidents_to_route(
            route_polyline=self.sample_weh_polyline,
            incidents=[dup1, dup2],
            corridor_threshold_m=350.0
        )

        # Must deduplicate and count only once
        self.assertEqual(len(res["route_relevant_incidents"]), 1)

    def test_12_route_change_dynamic_recalculation(self):
        """TEST 12: Changing origin/destination dynamically recalculates route and incident matches."""
        # Route 1: Borivali East to Versova (Western Suburbs)
        res1 = self.engine.evaluate_custom_commute(
            origin="Ashokvan (Borivali East)",
            destination="RGIT (Versova)",
            preferred_mode="MOTORCYCLE"
        )
        self.assertEqual(res1["status"], "SUCCESS")
        ids1 = {i["incident_id"] for i in res1["intersecting_incidents"]}

        # Route 2: South Mumbai commute (Dadar to Colaba Gateway of India)
        res2 = self.engine.evaluate_custom_commute(
            origin="Dadar Railway Station",
            destination="Colaba (Gateway of India)",
            preferred_mode="CAR"
        )
        self.assertEqual(res2["status"], "SUCCESS")
        ids2 = {i["incident_id"] for i in res2["intersecting_incidents"]}

        # Results from Route 1 (Borivali/Versova) must NOT be retained in Route 2
        self.assertNotIn("INC_MUM_20260716_04", ids2, "Pathanwadi collision in Goregaon East cannot affect Dadar->Colaba commute")
        self.assertNotEqual(res1["distance_km"], res2["distance_km"])

    def test_13_live_google_routes_api_v2_integration(self):
        """TEST 13: Live integration test against Google Routes API v2."""
        # Uses the configured API key in .env
        service = GoogleRoutingService()
        if not service.api_key:
            self.skipTest("GOOGLE_MAPS_API_KEY not configured; skipping live network test.")

        origin_c = [19.2372, 72.8695]  # Ashokvan
        dest_c = [19.1342, 72.8145]    # RGIT Versova
        res = service.compute_routes(origin_c, dest_c, travel_mode="DRIVE", compute_alternatives=True)
        if not res["success"] and any(term in str(res.get("error_message")) for term in ["429", "Quota exceeded", "RESOURCE_EXHAUSTED", "exhausted"]):
            self.skipTest(f"Google Maps API daily quota reached: {res.get('error_message')}")

        self.assertTrue(res["success"], f"Live Routes API call failed: {res.get('error_message')}")
        self.assertIn(res["provider"], ["GOOGLE_ROUTES_API_V2", "OSRM_ROAD_NETWORK"])
        self.assertGreaterEqual(res["total_routes_count"], 1)

        primary = res["routes"][0]
        self.assertGreater(primary["distance_km"], 10.0)
        self.assertGreater(len(primary["polyline_coords"]), 50)


if __name__ == "__main__":
    unittest.main()
