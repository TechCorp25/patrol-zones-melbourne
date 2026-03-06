#!/usr/bin/env python3
"""
Generate authoritative Melbourne CBD street-block dataset:

- Streets grouped by "between streets" blocks (from City of Melbourne Road Corridors)
- Street numbers assigned to blocks from City of Melbourne Street Addresses
- Sides determined via local segment bearing and point offset (left/right => N/S or E/W)

Authoritative sources:
- Road Corridors export URL (JSON/GeoJSON on data.melbourne.vic.gov.au)
- Street Addresses records API on data.melbourne.vic.gov.au

Outputs:
- Either a single consolidated JSON
- Or multiple files split by street-name buckets (A-F, G-M, N-S, T-Z, laneways)

Notes:
- This script intentionally uses a robust nearest-segment assignment with a spatial index.
- Side-of-street is inferred by projecting the address point onto the segment and using
  the cross product sign to determine left/right relative to segment direction.
"""

from __future__ import annotations

import argparse
import math
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import orjson
import requests
from shapely.geometry import LineString, MultiLineString, Point, Polygon, MultiPolygon, shape
from shapely.ops import linemerge, nearest_points, unary_union
from rtree.index import Index as RTree
from tqdm import tqdm


# ----------------------------
# Config / Constants
# ----------------------------

ROAD_SEGMENTS_EXPORT_GEOJSON = "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/road-segment/exports/geojson"
ROAD_CORRIDORS_EXPORT_GEOJSON = "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/road-corridors/exports/geojson"
STREET_ADDRESSES_EXPORT_JSONL = (
    "https://data.melbourne.vic.gov.au/api/explore/v2.1/"
    "catalog/datasets/street-addresses/exports/jsonl"
)

# Approximate CBD bbox (Spencer-Spring, Flinders-La Trobe).
CBD_BBOX = {
    "west": 144.9510,   # Spencer approx
    "south": -37.8225,  # Flinders approx
    "east": 144.9745,   # Spring approx
    "north": -37.8075   # La Trobe approx
}

# Street boundary rules user provided (used as metadata + validation)
BOUNDARY_STREETS = {
    "south": "Flinders Street",
    "north": "La Trobe Street",
    "west": "Spencer Street",
    "east": "Spring Street",
}

# If an address is more than this many meters from its assigned corridor segment,
# it is flagged into "unassigned" for review (still outputted, optionally).
MAX_ASSIGN_DIST_M = 60.0

# opendatasoft record paging
PAGE_SIZE = 100


# ----------------------------
# Helpers
# ----------------------------

def slug(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

def norm_street(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def safe_int(x: Any) -> Optional[int]:
    try:
        if x is None:
            return None
        x = str(x).strip()
        if not x:
            return None
        m = re.match(r"^(\d+)", x)
        return int(m.group(1)) if m else None
    except Exception:
        return None

def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def bbox_where_clause(b: Dict[str, float]) -> str:
    return f"{b['west']},{b['south']},{b['east']},{b['north']}"

def is_east_west_street(street_name: str) -> bool:
    s = street_name.lower()
    return any(k in s for k in ["street", "st"]) and not any(k in s for k in ["road", "rd", "avenue", "ave"])

def bearing_deg(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    lon1, lat1 = map(math.radians, p1)
    lon2, lat2 = map(math.radians, p2)
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1)*math.sin(lat2) - math.sin(lat1)*math.cos(lat2)*math.cos(dlon)
    brng = math.degrees(math.atan2(x, y))
    return (brng + 360.0) % 360.0

def approx_orientation_from_bearing(brng: float) -> str:
    if (45 <= brng <= 135) or (225 <= brng <= 315):
        return "EW"
    return "NS"


@dataclass
class CorridorSeg:
    street: str
    between_1: str
    between_2: str
    geom: LineString
    poly: Any
    props: Dict[str, Any]
    axis_from: Optional[Tuple[float, float]] = None
    axis_to: Optional[Tuple[float, float]] = None
    axis_orient: Optional[str] = None


# ----------------------------
# Fetchers
# ----------------------------

def fetch_geojson(url: str) -> Dict[str, Any]:
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    return r.json()

def fetch_addresses_bbox(bbox: Dict[str, float]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []

    where = (
        "in_bbox(geo_point_2d,"
        f"{bbox['south']},{bbox['west']},"
        f"{bbox['north']},{bbox['east']})"
    )

    params = {
        "select": "street_no,str_name,longitude,latitude,suburb,geo_point_2d",
        "where": where,
    }

    with requests.get(
        STREET_ADDRESSES_EXPORT_JSONL,
        params=params,
        stream=True,
        timeout=300,
        headers={"Accept": "application/json"},
    ) as r:
        r.raise_for_status()

        for raw in r.iter_lines(decode_unicode=False):
            if not raw:
                continue
            try:
                f = orjson.loads(raw)
            except Exception:
                continue

            street = norm_street(f.get("str_name") or "")
            lon = f.get("longitude")
            lat = f.get("latitude")
            if not street or lon is None or lat is None:
                continue

            no_raw = f.get("street_no")
            out.append({
                "street": street,
                "street_no_raw": no_raw,
                "street_no": safe_int(no_raw),
                "lon": float(lon),
                "lat": float(lat),
                "suburb": norm_street(f.get("suburb") or ""),
            })

    return out


# ----------------------------
# Core logic
# ----------------------------

def _largest_polygon(g):
    if isinstance(g, Polygon):
        return g
    if isinstance(g, MultiPolygon):
        return max(list(g.geoms), key=lambda p: p.area)
    return None

def _longest_line(g):
    if isinstance(g, LineString):
        return g
    if isinstance(g, MultiLineString):
        return max(list(g.geoms), key=lambda ln: ln.length)
    return None

def _polygon_centerline(poly: Polygon) -> Optional[LineString]:
    coords = list(poly.exterior.coords)
    if len(coords) < 4:
        return None
    n = len(coords) - 1
    edges = []
    for i in range(n):
        p1 = coords[i]
        p2 = coords[(i + 1) % n]
        length = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        edges.append((i, p1, p2, length))
    edges.sort(key=lambda e: e[3], reverse=True)
    if len(edges) < 2:
        return None
    _, a1, a2, _ = edges[0]
    _, b1, b2, _ = edges[1]
    mid1 = ((a1[0] + b2[0]) / 2.0, (a1[1] + b2[1]) / 2.0)
    mid2 = ((a2[0] + b1[0]) / 2.0, (a2[1] + b1[1]) / 2.0)
    if mid1 == mid2:
        return None
    return LineString([mid1, mid2])

def _as_assignment_line(geom) -> Optional[LineString]:
    if geom is None:
        return None

    if geom.geom_type in ("LineString", "MultiLineString"):
        return _longest_line(geom)

    if geom.geom_type in ("Polygon", "MultiPolygon"):
        poly = _largest_polygon(geom)
        if poly is None:
            return None
        cl = _polygon_centerline(poly)
        if cl is not None and not cl.is_empty:
            return cl
        b = poly.boundary
        if b.geom_type == "MultiLineString":
            merged = linemerge(b)
            return _longest_line(merged)
        if b.geom_type == "LineString":
            return b
        return None

    return None

def build_corridor_segments(geojson: Dict[str, Any]) -> List[CorridorSeg]:
    segs: List[CorridorSeg] = []
    skipped = 0
    for feat in geojson.get("features", []):
        props = feat.get("properties") or {}

        street = norm_street(
            props.get("streetname")
            or props.get("street_name")
            or props.get("street")
            or props.get("roadname")
            or props.get("rd_name")
            or ""
        )
        b1 = norm_street(
            props.get("streetfrom")
            or props.get("between_1")
            or props.get("between_st_1")
            or props.get("between_street_1")
            or props.get("from_street")
            or props.get("from_st")
            or ""
        )
        b2 = norm_street(
            props.get("streetto")
            or props.get("between_2")
            or props.get("between_st_2")
            or props.get("between_street_2")
            or props.get("to_street")
            or props.get("to_st")
            or ""
        )

        if not street:
            continue

        raw_geom = shape(feat.get("geometry"))
        poly = _largest_polygon(raw_geom) if raw_geom.geom_type in ("Polygon", "MultiPolygon") else None
        if poly is None or poly.is_empty:
            skipped += 1
            continue

        assign_line = _as_assignment_line(raw_geom)
        if assign_line is None or assign_line.is_empty:
            skipped += 1
            continue

        segs.append(CorridorSeg(
            street=street,
            between_1=b1,
            between_2=b2,
            geom=assign_line,
            poly=poly,
            props=props
        ))
    if skipped:
        print(f"  Skipped {skipped} features (unsupported geometry)")
    return segs

def build_street_polygon_index(segs: List[CorridorSeg]) -> Dict[str, Any]:
    by_street: Dict[str, List[Any]] = {}
    for s in segs:
        by_street.setdefault(s.street.lower(), []).append(s.poly)
    return {k: unary_union(v) for k, v in by_street.items() if v}

def compute_segment_axes(segs: List[CorridorSeg], street_polys: Dict[str, Any]) -> None:
    resolved = 0
    for s in tqdm(segs, desc="Computing segment axes"):
        p_from = street_polys.get(s.between_1.lower()) if s.between_1 else None
        p_to = street_polys.get(s.between_2.lower()) if s.between_2 else None

        if p_from is None or p_to is None:
            continue

        i_from = s.poly.buffer(0.00002).intersection(p_from.buffer(0.00002))
        i_to = s.poly.buffer(0.00002).intersection(p_to.buffer(0.00002))

        if i_from.is_empty or i_to.is_empty:
            continue

        rp_from = i_from.representative_point()
        rp_to = i_to.representative_point()

        s.axis_from = (rp_from.x, rp_from.y)
        s.axis_to = (rp_to.x, rp_to.y)

        brng = bearing_deg(s.axis_from, s.axis_to)
        s.axis_orient = approx_orientation_from_bearing(brng)
        resolved += 1

    print(f"  Resolved axes for {resolved}/{len(segs)} segments")

def build_spatial_index(segs: List[CorridorSeg]) -> Tuple[RTree, List[CorridorSeg]]:
    idx = RTree()
    for i, s in enumerate(segs):
        minx, miny, maxx, maxy = s.geom.bounds
        idx.insert(i, (minx, miny, maxx, maxy))
    return idx, segs

def pick_best_segment(
    street: str,
    pt: Point,
    idx: RTree,
    segs: List[CorridorSeg],
    k: int = 8
) -> Optional[Tuple[int, float]]:
    cand = list(idx.nearest((pt.x, pt.y, pt.x, pt.y), num_results=k))
    best_i: Optional[int] = None
    best_d = float("inf")

    if len(cand) < k:
        cand = list(idx.nearest((pt.x, pt.y, pt.x, pt.y), num_results=max(k, 30)))

    for i in cand:
        s = segs[i]
        if s.street.lower() != street.lower():
            continue
        d = s.geom.distance(pt)
        if d < best_d:
            best_d = d
            best_i = i

    if best_i is None:
        cand2 = list(idx.nearest((pt.x, pt.y, pt.x, pt.y), num_results=k))
        for i in cand2:
            s = segs[i]
            d = s.geom.distance(pt)
            if d < best_d:
                best_d = d
                best_i = i

    if best_i is None:
        return None
    return best_i, best_d

def infer_side(seg: CorridorSeg, pt: Point) -> str:
    if seg.axis_from is not None and seg.axis_to is not None and seg.axis_orient is not None:
        x1, y1 = seg.axis_from
        x2, y2 = seg.axis_to

        vx = x2 - x1
        vy = y2 - y1
        wx = pt.x - x1
        wy = pt.y - y1
        cross = vx * wy - vy * wx
        left = cross > 0

        brng = bearing_deg((x1, y1), (x2, y2))

        if seg.axis_orient == "EW":
            eastish = 45 <= brng <= 135
            if left:
                return "north_side" if eastish else "south_side"
            else:
                return "south_side" if eastish else "north_side"
        else:
            northish = (brng >= 315) or (brng <= 45)
            if left:
                return "west_side" if northish else "east_side"
            else:
                return "east_side" if northish else "west_side"

    coords = list(seg.geom.coords)
    if len(coords) < 2:
        return "unknown"

    p1 = coords[0]
    p2 = coords[-1]
    brng = bearing_deg((p1[0], p1[1]), (p2[0], p2[1]))
    orient = approx_orientation_from_bearing(brng)

    vx = p2[0] - p1[0]
    vy = p2[1] - p1[1]
    wx = pt.x - p1[0]
    wy = pt.y - p1[1]
    cross = vx * wy - vy * wx
    left = cross > 0

    if orient == "EW":
        eastish = 45 <= brng <= 135
        if left:
            return "north_side" if eastish else "south_side"
        else:
            return "south_side" if eastish else "north_side"
    else:
        northish = (brng >= 315) or (brng <= 45)
        if left:
            return "west_side" if northish else "east_side"
        else:
            return "east_side" if northish else "west_side"

def block_key(b1: str, b2: str) -> str:
    a = slug(b1) if b1 else "unknown"
    b = slug(b2) if b2 else "unknown"
    if a <= b:
        return f"between_{a}_and_{b}"
    return f"between_{b}_and_{a}"

def add_number(out: Dict[str, Any], street: str, blk: str, side: str, no: int) -> None:
    streets = out.setdefault("streets", {})
    s = streets.setdefault(street, {})
    b = s.setdefault(blk, {})
    arr = b.setdefault(side, [])
    arr.append(no)

def finalize(out: Dict[str, Any]) -> None:
    for street, blocks in out.get("streets", {}).items():
        for blk, sides in blocks.items():
            for side, nums in sides.items():
                nums2 = sorted({int(n) for n in nums if isinstance(n, int)})
                sides[side] = nums2


# ----------------------------
# File splitting
# ----------------------------

def bucket_for_street(name: str) -> str:
    n = name.strip().upper()
    if not n:
        return "misc"
    first = n[0]
    if first.isalpha():
        if "LANE" in n or "ALLEY" in n or "COURT" in n or "PLACE" in n or "ARCADE" in n:
            return "laneways"
        if "LITTLE " in n:
            return "little_streets"
        if "A" <= first <= "F":
            return "A-F"
        if "G" <= first <= "M":
            return "G-M"
        if "N" <= first <= "S":
            return "N-S"
        return "T-Z"
    return "misc"

def split_outputs(master: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    by_bucket: Dict[str, Dict[str, Any]] = {}
    for street, blocks in master.get("streets", {}).items():
        b = bucket_for_street(street)
        doc = by_bucket.setdefault(b, {
            "metadata": dict(master.get("metadata", {})),
            "streets": {}
        })
        doc["streets"][street] = blocks
    return by_bucket


# ----------------------------
# Main
# ----------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outdir", default="out", help="Output directory")
    ap.add_argument("--single", action="store_true", help="Write single consolidated JSON")
    ap.add_argument("--include-unassigned", action="store_true", help="Include unassigned addresses section")
    ap.add_argument("--max-assign-dist-m", type=float, default=MAX_ASSIGN_DIST_M)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    print("Fetching road segments (geojson)...")
    corridors_gj = fetch_geojson(ROAD_SEGMENTS_EXPORT_GEOJSON)
    segs = build_corridor_segments(corridors_gj)
    print(f"  Loaded {len(segs)} segments")

    print("Building street polygon index...")
    street_polys = build_street_polygon_index(segs)
    compute_segment_axes(segs, street_polys)

    idx, segs = build_spatial_index(segs)

    print("Fetching street addresses (CBD bbox)...")
    addrs = fetch_addresses_bbox(CBD_BBOX)

    out: Dict[str, Any] = {
        "metadata": {
            "area": "Melbourne CBD (Spencer-Spring, Flinders-La Trobe)",
            "boundary_rules": BOUNDARY_STREETS,
            "bbox": CBD_BBOX,
            "max_assign_dist_m": args.max_assign_dist_m,
            "sources": {
                "road_segments_export_geojson": ROAD_SEGMENTS_EXPORT_GEOJSON,
                "street_addresses_export_jsonl": STREET_ADDRESSES_EXPORT_JSONL
            }
        },
        "streets": {}
    }

    unassigned: List[Dict[str, Any]] = []

    for a in tqdm(addrs, desc="Assigning addresses"):
        if a["street_no"] is None:
            continue

        street = a["street"]
        pt = Point(a["lon"], a["lat"])

        best = pick_best_segment(street, pt, idx, segs, k=24)
        if not best:
            unassigned.append(a)
            continue

        seg_i, d = best
        seg = segs[seg_i]

        p_proj = seg.geom.interpolate(seg.geom.project(pt))
        dm = haversine_m(a["lon"], a["lat"], p_proj.x, p_proj.y)

        if dm > args.max_assign_dist_m:
            unassigned.append({**a, "reason": "too_far", "dist_m": round(dm, 2)})
            continue

        blk = block_key(seg.between_1, seg.between_2)
        side = infer_side(seg, pt)

        add_number(out, seg.street, blk, side, int(a["street_no"]))

    finalize(out)

    if args.include_unassigned:
        out["unassigned_addresses"] = unassigned

    if args.single:
        path = os.path.join(args.outdir, "melbourne_cbd_street_blocks.json")
        with open(path, "wb") as f:
            f.write(orjson.dumps(out, option=orjson.OPT_INDENT_2 | orjson.OPT_SORT_KEYS))
        print(f"Wrote: {path}")
    else:
        parts = split_outputs(out)
        for k, doc in parts.items():
            path = os.path.join(args.outdir, f"melbourne_cbd_street_blocks__{k}.json")
            with open(path, "wb") as f:
                f.write(orjson.dumps(doc, option=orjson.OPT_INDENT_2 | orjson.OPT_SORT_KEYS))
            print(f"Wrote: {path}")

        manifest = {
            "metadata": out["metadata"],
            "files": sorted([f for f in os.listdir(args.outdir) if f.endswith(".json")])
        }
        mpath = os.path.join(args.outdir, "manifest.json")
        with open(mpath, "wb") as f:
            f.write(orjson.dumps(manifest, option=orjson.OPT_INDENT_2 | orjson.OPT_SORT_KEYS))
        print(f"Wrote: {mpath}")


if __name__ == "__main__":
    main()
