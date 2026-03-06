#!/usr/bin/env node
/**
 * Fetch City of Melbourne road corridor segments and assign them to patrol zones.
 * Road corridors are polygon geometry (road surfaces) with seg_descr containing
 * street name and between-street info.
 *
 * Outputs com_assets_by_area.json with all CoM-managed roads per zone.
 */

import fs from "node:fs";
import path from "node:path";

const OUT_PATH = path.resolve(process.cwd(), "com_assets_by_area.json");

const ROAD_CORRIDORS_URL =
  "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/road-corridors/exports/geojson";

const ZONES = [
  { id: "flagstaff", name: "FLAGSTAFF", coords: [[-37.8161500,144.9526217],[-37.8131046,144.9512275],[-37.8116054,144.9563692],[-37.8146801,144.9577628],[-37.8161570,144.9526249],[-37.8161648,144.9525979]] },
  { id: "spencer", name: "SPENCER", coords: [[-37.8126017,144.9551062],[-37.8146801,144.9577628],[-37.8176963,144.9563692],[-37.8156179,144.9537126]] },
  { id: "rialto", name: "RIALTO", coords: [[-37.8156179,144.9537126],[-37.8176963,144.9563692],[-37.8207415,144.9549756],[-37.8186631,144.9523190]] },
  { id: "supreme", name: "SUPREME", coords: [[-37.8103265,144.9563592],[-37.8088059,144.9578419],[-37.8096324,144.9582241],[-37.8096622,144.9583984],[-37.8122743,144.9622486],[-37.8137851,144.9607577]] },
  { id: "tavistock", name: "TAVISTOCK", coords: [[-37.8137851,144.9607577],[-37.8122743,144.9622486],[-37.8152198,144.9636037],[-37.8167306,144.9621128]] },
  { id: "titles", name: "TITLES", coords: [[-37.8088059,144.9578419],[-37.8075914,144.9580639],[-37.8070526,144.9598380],[-37.8102837,144.9613418],[-37.8122743,144.9622486],[-37.8129854,144.9598039],[-37.8096622,144.9583984],[-37.8096324,144.9582241]] },
  { id: "hardware", name: "HARDWARE", coords: [[-37.8122743,144.9622486],[-37.8152198,144.9636037],[-37.8159403,144.9611463],[-37.8137020,144.9601071],[-37.8129854,144.9598039]] },
  { id: "banks", name: "BANKS", coords: [[-37.8152198,144.9636037],[-37.8183082,144.9650108],[-37.8190287,144.9625534],[-37.8159403,144.9611463]] },
  { id: "the_mac", name: "THE MAC", coords: [[-37.8070526,144.9598380],[-37.8057500,144.9622000],[-37.8063000,144.9644000],[-37.8102837,144.9613418]] },
  { id: "library", name: "LIBRARY", coords: [[-37.8102837,144.9613418],[-37.8088535,144.9663182],[-37.8118529,144.9676938],[-37.8132929,144.9627177]] },
  { id: "china_town", name: "CHINA TOWN", coords: [[-37.8132929,144.9627177],[-37.8118529,144.9676938],[-37.8147493,144.9690187],[-37.8161926,144.9640371]] },
  { id: "city_square", name: "CITY SQUARE", coords: [[-37.8161926,144.9640371],[-37.8147493,144.9690187],[-37.8168519,144.9699865],[-37.8183082,144.9650108]] },
  { id: "princess", name: "PRINCESS", coords: [[-37.8069000,144.9654223],[-37.8052932,144.9703773],[-37.8113046,144.9731756],[-37.8128527,144.9681523]] },
  { id: "hyatt", name: "HYATT", coords: [[-37.8128527,144.9681523],[-37.8120627,144.9705629],[-37.8161259,144.9724621],[-37.8168519,144.9699865]] },
  { id: "twin_towers", name: "TWIN TOWERS", coords: [[-37.8120627,144.9705629],[-37.8113046,144.9731756],[-37.8153663,144.9750663],[-37.8161259,144.9724621]] },
];

function isPointInPolygon(point, ring) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bboxesOverlap(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function segmentBBox(coords) {
  let minX = coords[0][0], maxX = coords[0][0], minY = coords[0][1], maxY = coords[0][1];
  for (const [x, y] of coords) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function centroidOfPolygon(coords) {
  let sx = 0, sy = 0, n = 0;
  const walk = (arr) => {
    if (!Array.isArray(arr)) return;
    if (typeof arr[0] === "number" && typeof arr[1] === "number") { sx += arr[0]; sy += arr[1]; n++; }
    else for (const x of arr) walk(x);
  };
  walk(coords);
  return n > 0 ? [sx / n, sy / n] : null;
}

function parseSegDescr(segDescr) {
  if (!segDescr) return null;
  const s = segDescr.trim();

  let streetName = "";
  let from = "";
  let to = "";

  const betweenMatch = s.match(/^(.+?)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (betweenMatch) {
    streetName = betweenMatch[1].trim();
    from = betweenMatch[2].trim();
    to = betweenMatch[3].trim();
  } else {
    const fromMatch = s.match(/^(.+?)\s+from\s+(.+)$/i);
    if (fromMatch) {
      streetName = fromMatch[1].trim();
      from = fromMatch[2].trim();
    } else {
      const interMatch = s.match(/^Intersection of\s+(.+?)\s+and\s+(.+)$/i);
      if (interMatch) {
        streetName = `Intersection: ${interMatch[1].trim()} & ${interMatch[2].trim()}`;
      } else {
        streetName = s;
      }
    }
  }

  if (!streetName) return null;

  const result = { name: streetName };
  if (from && to) result.between = { from, to };
  else if (from) result.off = from;

  return result;
}

function guessType(name) {
  const n = name.toLowerCase();
  if (n.includes(" lane")) return "lane";
  if (n.includes(" alley")) return "alley";
  if (n.includes(" arcade")) return "arcade";
  if (n.includes(" court")) return "court";
  if (n.includes(" place")) return "place";
  if (n.includes(" avenue")) return "avenue";
  if (n.includes(" walk")) return "walk";
  if (n.includes("intersection")) return "intersection";
  if (n.includes(" street") || /\bst\b/.test(n)) return "street";
  return "road";
}

async function main() {
  const zoneIndex = ZONES.map((z) => {
    const ring = z.coords.map(([lat, lng]) => [lng, lat]);
    if (ring.length > 0 && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) {
      ring.push([...ring[0]]);
    }
    const bb = segmentBBox(ring);
    return { area: z.name, id: z.id, bb, ring };
  });

  console.log(`Loaded ${zoneIndex.length} patrol zones`);

  console.log("Fetching road corridors...");
  const res = await fetch(ROAD_CORRIDORS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const roadCorridorsFC = await res.json();
  console.log(`Road corridors: ${roadCorridorsFC.features?.length ?? 0} features`);

  const out = { metadata: { jurisdiction: "City of Melbourne (CBD)", generated: new Date().toISOString() }, areas: {} };
  const seen = new Set();
  let assigned = 0, unassigned = 0, noGeom = 0;

  for (const f of roadCorridorsFC.features ?? []) {
    const props = f.properties ?? {};
    const geom = f.geometry;
    if (!geom) { noGeom++; continue; }

    const centroid = centroidOfPolygon(geom.coordinates);
    if (!centroid) { noGeom++; continue; }

    const asset = parseSegDescr(props.seg_descr);
    if (!asset) continue;
    asset.type = guessType(asset.name);
    asset.str_type = props.str_type || "";

    const cBB = [centroid[0], centroid[1], centroid[0], centroid[1]];
    let assignedArea = null;
    for (const z of zoneIndex) {
      if (!bboxesOverlap(cBB, z.bb)) continue;
      if (isPointInPolygon(centroid, z.ring)) { assignedArea = z.area; break; }
    }
    if (!assignedArea) { unassigned++; continue; }

    const sig = JSON.stringify([assignedArea.toLowerCase(), asset.name.toLowerCase(), asset.between ?? null, asset.off ?? null]);
    if (seen.has(sig)) continue;
    seen.add(sig);

    out.areas[assignedArea] ??= { assets: [] };
    out.areas[assignedArea].assets.push(asset);
    assigned++;
  }

  for (const area of Object.keys(out.areas)) {
    out.areas[area].assets.sort((a, b) => a.name.localeCompare(b.name));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nDone! Assigned: ${assigned}, Unassigned: ${unassigned}, No geometry: ${noGeom}`);
  console.log(`Wrote: ${OUT_PATH} (${Object.keys(out.areas).length} areas)`);

  for (const [area, data] of Object.entries(out.areas).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${area}: ${data.assets.length} assets`);
    for (const a of data.assets) {
      const loc = a.between ? `${a.between.from} → ${a.between.to}` : a.off ? `off ${a.off}` : "";
      console.log(`    - ${a.name} [${a.type}] ${loc}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
