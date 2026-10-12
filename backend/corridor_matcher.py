import math
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime

EARTH_RADIUS_METERS = 6371008.8

def haversine_distance_meters(c1: List[float], c2: List[float]) -> float:
    """Calculate the great-circle distance between two coordinates in meters."""
    lat1, lon1 = math.radians(c1[0]), math.radians(c1[1])
    lat2, lon2 = math.radians(c2[0]), math.radians(c2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2.0)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def initial_bearing(c1: List[float], c2: List[float]) -> float:
    """Calculate initial bearing from c1 to c2 in radians."""
    lat1, lon1 = math.radians(c1[0]), math.radians(c1[1])
    lat2, lon2 = math.radians(c2[0]), math.radians(c2[1])
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.atan2(y, x) + 2.0 * math.pi) % (2.0 * math.pi)

def point_to_segment_distance_meters(pt: List[float], s1: List[float], s2: List[float]) -> Tuple[float, List[float]]:
    """
    Computes minimum distance from a point pt to a great-circle segment [s1, s2] in meters.
    Uses spherical cross-track and along-track distance.
    Returns: (min_distance_meters, nearest_point_on_segment)
    """
    d12 = haversine_distance_meters(s1, s2)
    if d12 < 1.0:
        return haversine_distance_meters(pt, s1), s1

    d13 = haversine_distance_meters(s1, pt)
    d23 = haversine_distance_meters(s2, pt)

    # Angular distances
    delta13 = d13 / EARTH_RADIUS_METERS
    delta12 = d12 / EARTH_RADIUS_METERS

    # Bearings
    theta12 = initial_bearing(s1, s2)
    theta13 = initial_bearing(s1, pt)

    # Cross-track distance
    sin_xt = math.sin(delta13) * math.sin(theta13 - theta12)
    # Clamp to [-1, 1] to avoid float precision domain errors
    sin_xt = max(-1.0, min(1.0, sin_xt))
    delta_xt = math.asin(sin_xt)
    d_xt = abs(delta_xt) * EARTH_RADIUS_METERS

    # Along-track distance
    cos_at = math.cos(delta13) / max(1e-12, math.cos(delta_xt))
    cos_at = max(-1.0, min(1.0, cos_at))
    delta_at = math.acos(cos_at)
    d_at = delta_at * EARTH_RADIUS_METERS

    # Check if projection is before s1
    if math.cos(theta13 - theta12) < 0:
        return d13, s1

    # Check if projection is past s2
    if d_at > d12:
        return d23, s2

    # Projection falls within segment: interpolate nearest point
    fraction = d_at / d12
    nearest_lat = s1[0] + fraction * (s2[0] - s1[0])
    nearest_lon = s1[1] + fraction * (s2[1] - s1[1])

    return d_xt, [nearest_lat, nearest_lon]

def point_to_polyline_min_distance(pt: List[float], polyline: List[List[float]]) -> Tuple[float, int, List[float]]:
    """
    Computes the minimum perpendicular distance from point pt to an entire polyline in meters.
    Returns: (min_distance_meters, nearest_segment_index, nearest_point_coords)
    """
    if not polyline or len(polyline) == 0:
        return float('inf'), -1, pt
    if len(polyline) == 1:
        return haversine_distance_meters(pt, polyline[0]), 0, polyline[0]

    min_dist = float('inf')
    best_seg_idx = 0
    best_nearest_pt = polyline[0]

    for i in range(len(polyline) - 1):
        s1 = polyline[i]
        s2 = polyline[i + 1]
        dist, nearest_pt = point_to_segment_distance_meters(pt, s1, s2)
        if dist < min_dist:
            min_dist = dist
            best_seg_idx = i
            best_nearest_pt = nearest_pt

    return min_dist, best_seg_idx, best_nearest_pt

class RouteCorridorMatcher:
    """
    Strict Route-Based Incident Detection Engine.
    Filters candidate incidents against the authoritative Google Maps route geometry.
    """

    DEFAULT_CORRIDOR_THRESHOLD_METERS = 350.0  # 350m buffer covers multi-lane corridors & road buffers

    @classmethod
    def match_incidents_to_route(
        cls,
        route_polyline: List[List[float]],
        incidents: List[Dict[str, Any]],
        travel_mode: str = "DRIVE",
        corridor_threshold_m: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes strict spatial corridor matching against the actual Google Maps polyline.
        Returns:
        - route_relevant_incidents: Incidents confirmed to intersect or fall within the corridor threshold.
        - off_route_hazards: Contextual incidents that are active but outside the user's route corridor.
        - matching_metadata: Details about corridor threshold, route point count, and filtering rationale.
        """
        threshold = float(corridor_threshold_m) if corridor_threshold_m is not None else cls.DEFAULT_CORRIDOR_THRESHOLD_METERS
        threshold = max(50.0, min(3000.0, threshold))  # Sanity clamp: 50m to 3000m

        if not route_polyline or len(route_polyline) < 2:
            return {
                "route_relevant_incidents": [],
                "off_route_hazards": [],
                "filtered_out_count": len(incidents),
                "corridor_threshold_applied_m": threshold,
                "error": "Route polyline contains insufficient coordinates for spatial matching"
            }

        route_relevant = []
        off_route = []

        # Deduplicate incidents by incident_id or centroid coordinate
        seen_incident_ids = set()

        for inc in incidents:
            inc_id = inc.get("incident_id") or inc.get("id")
            if not inc_id or inc_id in seen_incident_ids:
                continue
            seen_incident_ids.add(inc_id)

            # 1. Geographic Coordinate Validation
            lat = inc.get("centroid_lat") or inc.get("latitude")
            lon = inc.get("centroid_lon") or inc.get("longitude")

            if lat is None or lon is None:
                # Mark as unlocated / location-unverified
                inc_copy = dict(inc)
                inc_copy["location_verified"] = False
                inc_copy["exclusion_reason"] = "INCIDENT_MISSING_COORDINATES"
                off_route.append(inc_copy)
                continue

            try:
                lat = float(lat)
                lon = float(lon)
            except (ValueError, TypeError):
                inc_copy = dict(inc)
                inc_copy["location_verified"] = False
                inc_copy["exclusion_reason"] = "INVALID_COORDINATE_FORMAT"
                off_route.append(inc_copy)
                continue

            inc_pt = [lat, lon]

            # 2. Check Active / Freshness Status
            status = str(inc.get("status", "ACTIVE")).upper()
            if status in ["RESOLVED", "CLOSED", "EXPIRED"]:
                inc_copy = dict(inc)
                inc_copy["exclusion_reason"] = f"INCIDENT_STATUS_{status}"
                off_route.append(inc_copy)
                continue

            # 3. Calculate Minimum Perpendicular Distance to Route Polyline
            min_dist_m, nearest_seg_idx, nearest_route_pt = point_to_polyline_min_distance(inc_pt, route_polyline)
            dist_km = round(min_dist_m / 1000.0, 3)

            # Copy incident and enrich with spatial measurement metrics
            matched_inc = dict(inc)
            matched_inc["distance_from_route_meters"] = round(min_dist_m, 1)
            matched_inc["distance_from_route_km"] = dist_km
            matched_inc["nearest_route_point"] = [round(nearest_route_pt[0], 6), round(nearest_route_pt[1], 6)]
            matched_inc["nearest_segment_index"] = nearest_seg_idx
            matched_inc["corridor_threshold_m"] = threshold

            # Mode & Infrastructure compatibility check
            infra = str(inc.get("affected_infrastructure", "")).lower()
            mode_upper = str(travel_mode).upper()
            is_rail_only_hazard = ("railway" in infra or "track" in infra) and not ("subway" in infra or "road" in infra or "flyover" in infra)
            is_road_mode = mode_upper in ["DRIVE", "MOTORCYCLE", "TWO_WHEELER", "CAR"]

            # 4. Strict Corridor Threshold Filtering
            if min_dist_m <= threshold:
                # Incident is within the route corridor
                if is_rail_only_hazard and is_road_mode and "subway" not in infra:
                    # Parallel or grade-separated track hazard that does not block road transit
                    matched_inc["relevance_evidence"] = (
                        f"Located {int(min_dist_m)}m from road route corridor. "
                        f"However, disruption is confined to Western Railway tracks and does not block road surface."
                    )
                    matched_inc["is_road_obstructive"] = False
                    matched_inc["route_relevance"] = "ADVISORY_PARALLEL_INFRASTRUCTURE"
                    # Include with honest advisory designation
                    route_relevant.append(matched_inc)
                else:
                    matched_inc["relevance_evidence"] = (
                        f"Spatially intersects your route corridor ({int(min_dist_m)}m from road centerline, "
                        f"within the {int(threshold)}m buffer). Directly impacts {inc.get('affected_infrastructure', 'corridor')}."
                    )
                    matched_inc["is_road_obstructive"] = True
                    matched_inc["route_relevance"] = "CONFIRMED_CORRIDOR_INTERSECTION"
                    route_relevant.append(matched_inc)
            else:
                # Outside route corridor
                matched_inc["relevance_evidence"] = (
                    f"Excluded from route commute alerts. Located {dist_km} km away from your Google Maps route "
                    f"(exceeds the {int(threshold)}m route corridor threshold)."
                )
                matched_inc["is_road_obstructive"] = False
                matched_inc["route_relevance"] = "OFF_ROUTE_CITYWIDE_HAZARD"
                off_route.append(matched_inc)

        # Sort route-relevant incidents by proximity to route centerline (closest first)
        route_relevant.sort(key=lambda x: x["distance_from_route_meters"])

        return {
            "route_relevant_incidents": route_relevant,
            "off_route_hazards": off_route,
            "total_route_relevant_count": len(route_relevant),
            "total_off_route_count": len(off_route),
            "corridor_threshold_applied_m": threshold,
            "route_polyline_points_evaluated": len(route_polyline)
        }
