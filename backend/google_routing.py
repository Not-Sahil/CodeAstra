import os
import re
import json
import math
import logging
import urllib.request
import urllib.error
import requests
from typing import Dict, List, Tuple, Optional, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("codeastra.routing")

def decode_polyline(encoded: str) -> List[List[float]]:
    """
    Decodes an encoded polyline string (Google Maps format) into a list of [lat, lon] coordinates.
    Precision: 1e-5 (standard Google Maps polyline).
    """
    if not encoded:
        return []
    
    coordinates = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)

    while index < length:
        # Decode Latitude
        shift = 0
        result = 0
        while True:
            if index >= length:
                break
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        # Decode Longitude
        shift = 0
        result = 0
        while True:
            if index >= length:
                break
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append([round(lat * 1e-5, 6), round(lng * 1e-5, 6)])

    return coordinates

class GoogleRoutingService:
    """
    Authoritative routing service using the modern Google Maps Routes API v2
    (https://routes.googleapis.com/directions/v2:computeRoutes).
    """

    MUMBAI_BOUNDS = {
        "min_lat": 18.85,
        "max_lat": 19.35,
        "min_lon": 72.75,
        "max_lon": 73.15
    }

    # Verified coordinates for key Mumbai transit origins, destinations, and hubs
    VERIFIED_MUMBAI_LOCATIONS = {
        "ashokvan (borivali east)": [19.2372, 72.8695],
        "ashokvan": [19.2372, 72.8695],
        "borivali railway station": [19.2290, 72.8569],
        "borivali": [19.2290, 72.8569],
        "borivali west": [19.2295, 72.8510],
        "kandivali railway station": [19.2045, 72.8522],
        "kandivali": [19.2045, 72.8522],
        "kandivali west": [19.2085, 72.8380],
        "mithchowki junction (kandivali)": [19.2001, 72.8372],
        "mithchowki": [19.2001, 72.8372],
        "malad railway station": [19.1868, 72.8488],
        "malad": [19.1868, 72.8488],
        "malad subway": [19.1875, 72.8504],
        "malad west (link road)": [19.1865, 72.8380],
        "mindspace (malad west)": [19.1780, 72.8350],
        "mindspace": [19.1780, 72.8350],
        "pathanwadi (goregaon east)": [19.1814, 72.8591],
        "pathanwadi flyover": [19.1814, 72.8591],
        "pathanwadi": [19.1814, 72.8591],
        "goregaon railway station": [19.1645, 72.8490],
        "goregaon": [19.1645, 72.8490],
        "nesco it park (goregaon east)": [19.1555, 72.8542],
        "nesco": [19.1555, 72.8542],
        "jogeshwari railway station": [19.1359, 72.8490],
        "jogeshwari": [19.1359, 72.8490],
        "jvlr (jogeshwari vikhroli link rd)": [19.1380, 72.8560],
        "jvlr": [19.1380, 72.8560],
        "andheri railway station": [19.1197, 72.8464],
        "andheri": [19.1197, 72.8464],
        "andheri west (d.n. nagar) metro station": [19.1308, 72.8322],
        "d.n. nagar metro station": [19.1308, 72.8322],
        "d.n. nagar": [19.1308, 72.8322],
        "andheri subway": [19.1196, 72.8433],
        "rgit (versova)": [19.1342, 72.8145],
        "rajiv gandhi institute of technology (rgit, versova)": [19.1342, 72.8145],
        "rgit": [19.1342, 72.8145],
        "versova": [19.1315, 72.8172],
        "versova metro station": [19.1315, 72.8172],
        "kokilaben hospital (andheri west)": [19.1312, 72.8252],
        "bhavan's college (andheri west)": [19.1245, 72.8355],
        "vile parle railway station": [19.0999, 72.8438],
        "vile parle": [19.0999, 72.8438],
        "mithibai college (vile parle west)": [19.1028, 72.8372],
        "mithibai": [19.1028, 72.8372],
        "santacruz railway station": [19.0818, 72.8407],
        "milan subway (santacruz)": [19.0885, 72.8420],
        "milan subway": [19.0885, 72.8420],
        "bandra railway station": [19.0544, 72.8406],
        "bandra": [19.0544, 72.8406],
        "bandra kurla complex (bkc)": [19.0657, 72.8687],
        "bkc": [19.0657, 72.8687],
        "kurla railway station": [19.0680, 72.8790],
        "kurla": [19.0680, 72.8790],
        "sion railway station": [19.0390, 72.8615],
        "ghatkopar railway station": [19.0863, 72.9080],
        "ghatkopar": [19.0863, 72.9080],
        "powai (iit bombay)": [19.1334, 72.9133],
        "powai": [19.1334, 72.9133],
        "dadar railway station": [19.0178, 72.8478],
        "dadar": [19.0178, 72.8478],
        "dadar tt circle": [19.0195, 72.8430],
        "hindmata (dadar east)": [19.0125, 72.8415],
        "kem hospital (parel)": [19.0028, 72.8422],
        "kem hospital": [19.0028, 72.8422],
        "lower parel": [18.9950, 72.8248],
        "worli seaface": [19.0128, 72.8155],
        "mumbai central railway station": [18.9696, 72.8193],
        "csmt": [18.9402, 72.8356],
        "chhatrapati shivaji maharaj terminus (csmt)": [18.9402, 72.8356],
        "churchgate railway station": [18.9322, 72.8264],
        "churchgate": [18.9322, 72.8264],
        "colaba": [18.9220, 72.8347],
        "nariman point": [18.9260, 72.8230]
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY")

    def validate_coordinates(self, lat: float, lon: float) -> Tuple[bool, str]:
        """Validate that coordinates are within proper physical boundaries and Mumbai region."""
        if lat is None or lon is None:
            return False, "Coordinates cannot be null"
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return False, f"Coordinates out of physical range: ({lat}, {lon})"
        if not (self.MUMBAI_BOUNDS["min_lat"] <= lat <= self.MUMBAI_BOUNDS["max_lat"] and
                self.MUMBAI_BOUNDS["min_lon"] <= lon <= self.MUMBAI_BOUNDS["max_lon"]):
            return False, f"Coordinates ({lat}, {lon}) outside Mumbai Metropolitan Region monitoring perimeter"
        return True, "Valid Mumbai coordinates"

    def resolve_location(self, loc_input: Any) -> Tuple[Optional[List[float]], bool, str]:
        """
        Resolves a location input into [latitude, longitude].
        Supports:
        - [lat, lon] array / tuple
        - "lat, lon" or "GPS: lat, lon" coordinate string
        - Verified landmark name string from database
        - OpenStreetMap Nominatim free geocoding fallback for broad location search
        Returns: ([lat, lon], is_verified, message)
        """
        if not loc_input:
            return None, False, "Location input is empty"

        # 1. If already a coordinate list or tuple
        if isinstance(loc_input, (list, tuple)) and len(loc_input) >= 2:
            try:
                lat, lon = float(loc_input[0]), float(loc_input[1])
                is_valid, msg = self.validate_coordinates(lat, lon)
                return [round(lat, 6), round(lon, 6)], is_valid, msg
            except (ValueError, TypeError):
                pass

        loc_str = str(loc_input).strip()

        # 2. Extract numeric coordinates using regex (handles "GPS: 19.1196, 72.8433", "(19.1, 72.8)", etc.)
        coord_nums = re.findall(r"[-+]?\d*\.\d+|\b[-+]?\d+\b", loc_str)
        if len(coord_nums) >= 2:
            try:
                lat = float(coord_nums[0])
                lon = float(coord_nums[1])
                if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                    is_valid, msg = self.validate_coordinates(lat, lon)
                    if is_valid:
                        return [round(lat, 6), round(lon, 6)], True, "Resolved coordinates from device location"
            except (ValueError, TypeError):
                pass

        # 3. Known Verified Mumbai Landmark Dictionary
        loc_clean = loc_str.lower()
        if loc_clean in self.VERIFIED_MUMBAI_LOCATIONS:
            coords = self.VERIFIED_MUMBAI_LOCATIONS[loc_clean]
            return coords, True, f"Resolved verified landmark: {loc_str}"

        # Substring search in verified dictionary
        for key, coords in self.VERIFIED_MUMBAI_LOCATIONS.items():
            if key in loc_clean or loc_clean in key:
                return coords, True, f"Matched verified Mumbai landmark: {key.title()}"

        # 4. OpenStreetMap Nominatim Geocoding Fallback (Phase 8.A: broad location search)
        try:
            query = loc_str if "mumbai" in loc_clean else f"{loc_str}, Mumbai"
            resp = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": "UrbanPulseAI-Geocoding-Service"},
                timeout=3.5
            )
            if resp.status_code == 200:
                results = resp.json()
                if results and len(results) > 0:
                    g_lat = float(results[0]["lat"])
                    g_lon = float(results[0]["lon"])
                    is_valid, msg = self.validate_coordinates(g_lat, g_lon)
                    if is_valid:
                        return [round(g_lat, 6), round(g_lon, 6)], True, f"Geocoded location: {results[0].get('display_name', loc_str)[:45]}"
        except Exception as ge_err:
            logger.debug(f"Nominatim geocoding fallback note: {ge_err}")

        # 5. Unknown / Unverified location
        return None, False, f"Location '{loc_str}' cannot be resolved reliably. Marking as location-unverified."

    def map_travel_mode(self, mode_str: str) -> str:
        """Maps user travel mode string to official Google Routes API travelMode enum."""
        m = (mode_str or "MOTORCYCLE").upper().strip()
        if m in ["MOTORCYCLE", "TWO_WHEELER", "BIKE", "SCOOTER"]:
            return "TWO_WHEELER"
        if m in ["CAR", "DRIVING", "TAXI", "CAB", "PERSONAL_VEHICLE"]:
            return "DRIVE"
        if m in ["WALK", "WALKING", "PEDESTRIAN"]:
            return "WALK"
        if m in ["BICYCLE", "CYCLING"]:
            return "BICYCLE"
        if m in ["TRANSIT", "TRAIN", "METRO", "BUS"]:
            # Note: Google Routes API supports TRANSIT where public transit data exists
            return "TRANSIT"
        return "DRIVE"

    def compute_routes(
        self,
        origin_coords: List[float],
        dest_coords: List[float],
        travel_mode: str = "DRIVE",
        compute_alternatives: bool = True
    ) -> Dict[str, Any]:
        """
        Calls Google Maps Routes API v2 to calculate authoritative route geometry.
        Returns detailed route results including decoded polyline coordinates and metadata.
        """
        if not self.api_key:
            return {
                "status": "API_KEY_MISSING",
                "success": False,
                "error_message": "GOOGLE_MAPS_API_KEY environment variable is not configured.",
                "routes": []
            }

        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        google_mode = self.map_travel_mode(travel_mode)

        payload = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": origin_coords[0],
                        "longitude": origin_coords[1]
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": dest_coords[0],
                        "longitude": dest_coords[1]
                    }
                }
            },
            "travelMode": google_mode,
            "computeAlternativeRoutes": bool(compute_alternatives),
            "routingPreference": "TRAFFIC_AWARE" if google_mode in ["DRIVE", "TWO_WHEELER"] else "ROUTING_PREFERENCE_UNSPECIFIED"
        }

        # TRANSIT mode cannot specify routingPreference in Routes API
        if google_mode == "TRANSIT":
            payload.pop("routingPreference", None)

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs"
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=8.0) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))

            routes_data = resp_data.get("routes", [])
            if not routes_data:
                return {
                    "status": "ZERO_ROUTES_FOUND",
                    "success": False,
                    "error_message": f"Google Routes API found zero routes between origin ({origin_coords}) and destination ({dest_coords}) for mode {google_mode}.",
                    "routes": []
                }

            processed_routes = []
            for idx, r in enumerate(routes_data):
                enc_poly = r.get("polyline", {}).get("encodedPolyline", "")
                decoded_points = decode_polyline(enc_poly)
                
                # Duration in seconds
                duration_str = r.get("duration", "0s")
                duration_sec = 0
                if duration_str.endswith("s"):
                    try:
                        duration_sec = int(float(duration_str[:-1]))
                    except ValueError:
                        duration_sec = 0

                dist_meters = r.get("distanceMeters", 0)
                description = r.get("description", "") or (f"Route {idx + 1}" if idx > 0 else "Primary Corridor")

                # Extract route steps / road names from legs if available
                road_names = []
                for leg in r.get("legs", []):
                    for step in leg.get("steps", []):
                        nav_instruction = step.get("navigationInstruction", {}).get("instructions", "")
                        if nav_instruction and nav_instruction not in road_names:
                            road_names.append(nav_instruction)

                processed_routes.append({
                    "route_index": idx,
                    "is_primary": (idx == 0),
                    "travel_mode": google_mode,
                    "description": description,
                    "distance_meters": dist_meters,
                    "distance_km": round(dist_meters / 1000.0, 2),
                    "duration_seconds": duration_sec,
                    "duration_minutes": round(duration_sec / 60.0, 1),
                    "encoded_polyline": enc_poly,
                    "polyline_points_count": len(decoded_points),
                    "polyline_coords": decoded_points,
                    "road_names": road_names[:5]
                })

            return {
                "status": "SUCCESS",
                "success": True,
                "provider": "GOOGLE_ROUTES_API_V2",
                "total_routes_count": len(processed_routes),
                "routes": processed_routes
            }

        except urllib.error.HTTPError as he:
            err_body = ""
            try:
                err_body = he.read().decode("utf-8")
                err_json = json.loads(err_body)
                err_msg = err_json.get("error", {}).get("message", err_body)
                err_status = err_json.get("error", {}).get("status", str(he.code))
            except Exception:
                err_msg = str(he)
                err_status = str(he.code)

            logger.error(f"Google Routes API HTTP {he.code}: {err_msg}")
            return {
                "status": f"HTTP_ERROR_{err_status}",
                "success": False,
                "error_message": f"Google Maps Routes API error ({err_status}): {err_msg}",
                "routes": []
            }
        except urllib.error.URLError as ue:
            logger.error(f"Google Routes API Network Error: {ue}")
            return {
                "status": "NETWORK_TIMEOUT_OR_UNREACHABLE",
                "success": False,
                "error_message": f"Network error connecting to Google Maps Platform: {ue.reason}",
                "routes": []
            }
        except Exception as ex:
            logger.error(f"Unexpected routing exception: {ex}")
            return {
                "status": "INTERNAL_ROUTING_EXCEPTION",
                "success": False,
                "error_message": f"Routing calculation exception: {str(ex)}",
                "routes": []
            }
