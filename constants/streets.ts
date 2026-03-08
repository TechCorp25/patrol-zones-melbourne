import { STREET_INTERSECTIONS, IntersectionPoint } from './intersections';

export interface StreetPosition {
  street: string;
  from: string;
  to: string;
  side: string;
  distance: number;
}

interface StreetDef {
  name: string;
  points: IntersectionPoint[];
  sides: [string, string];
  orientation: 'ns' | 'ew';
  numberDirection: 'north' | 'south' | 'east' | 'west';
  addresses: number[];
}

const LAT_TO_M = 111000;
const LNG_TO_M = 111000 * Math.cos(-37.815 * Math.PI / 180);

const STREETS: StreetDef[] = [
  {
    name: 'Spencer Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [292, 244, 216, 168, 140, 92, 65, 25, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Spencer Street')!.points,
  },
  {
    name: 'King Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [300, 252, 222, 174, 145, 96, 68, 25, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'King Street')!.points,
  },
  {
    name: 'William Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [364, 331, 276, 243, 188, 155, 100, 55, 22, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'William Street')!.points,
  },
  {
    name: 'Queen Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [397, 364, 309, 276, 221, 188, 133, 100, 36, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Queen Street')!.points,
  },
  {
    name: 'Elizabeth Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [394, 361, 301, 268, 208, 175, 115, 82, 38, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Elizabeth Street')!.points,
  },
  {
    name: 'Swanston Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [400, 355, 305, 270, 220, 185, 135, 100, 37, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Swanston Street')!.points,
  },
  {
    name: 'Russell Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [308, 260, 228, 180, 145, 112, 60, 30, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Russell Street')!.points,
  },
  {
    name: 'Exhibition Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [318, 268, 234, 186, 150, 115, 62, 30, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Exhibition Street')!.points,
  },
  {
    name: 'Spring Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [240, 212, 168, 140, 94, 66, 28, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Spring Street')!.points,
  },
  {
    name: 'La Trobe Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [600, 510, 420, 345, 265, 185, 110, 35],
    points: STREET_INTERSECTIONS.find(s => s.name === 'La Trobe Street')!.points,
  },
  {
    name: 'Little Lonsdale Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [660, 580, 490, 420, 345, 275, 180, 90, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Little Lonsdale Street')!.points,
  },
  {
    name: 'Lonsdale Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [680, 600, 510, 435, 365, 300, 200, 100, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Lonsdale Street')!.points,
  },
  {
    name: 'Little Bourke Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [690, 608, 513, 438, 358, 275, 185, 95, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Little Bourke Street')!.points,
  },
  {
    name: 'Bourke Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [700, 615, 515, 440, 350, 250, 170, 90, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Bourke Street')!.points,
  },
  {
    name: 'Little Collins Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [670, 585, 487, 417, 330, 241, 163, 84, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Little Collins Street')!.points,
  },
  {
    name: 'Collins Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [640, 555, 459, 394, 310, 232, 155, 78, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Collins Street')!.points,
  },
  {
    name: 'Flinders Lane',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [630, 545, 460, 390, 310, 230, 150, 75, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Flinders Lane')!.points,
  },
  {
    name: 'Flinders Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [640, 560, 475, 400, 320, 240, 160, 80, 2],
    points: STREET_INTERSECTIONS.find(s => s.name === 'Flinders Street')!.points,
  },
];

const MAX_STREET_DISTANCE = 30;
const SIDE_MIN_DISTANCE = 4;

export interface AddressMarker {
  address: number;
  lat: number;
  lng: number;
  orientation: 'ns' | 'ew';
}

const NS_OFFSET_M = 22;
const EW_OFFSET_M = 22;
const NS_LAT_NUDGE = 8 / LAT_TO_M;
const NS_LNG_OFFSET = NS_OFFSET_M / LNG_TO_M;
const EW_LAT_OFFSET = EW_OFFSET_M / LAT_TO_M;
const EW_LNG_NUDGE = 8 / LNG_TO_M;

export function getAddressMarkers(): AddressMarker[] {
  const markers: AddressMarker[] = [];
  for (const street of STREETS) {
    const pts = street.points;
    const addrs = street.addresses;
    if (addrs.length !== pts.length) continue;
    for (let i = 0; i < pts.length; i++) {
      let lat = pts[i].lat;
      let lng = pts[i].lng;
      if (street.orientation === 'ns') {
        lng -= NS_LNG_OFFSET;
        lat += NS_LAT_NUDGE;
      } else {
        lat += EW_LAT_OFFSET;
        lng += EW_LNG_NUDGE;
      }
      markers.push({
        address: addrs[i],
        lat,
        lng,
        orientation: street.orientation,
      });
    }
  }
  return markers;
}

function distToSegment(
  lat: number, lng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): { dist: number; t: number; cross: number } {
  const dx = (bLat - aLat) * LAT_TO_M;
  const dy = (bLng - aLng) * LNG_TO_M;
  const px = (lat - aLat) * LAT_TO_M;
  const py = (lng - aLng) * LNG_TO_M;

  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.sqrt(px * px + py * py), t: 0, cross: 0 };

  let t = (px * dx + py * dy) / lenSq;
  const tClamped = Math.max(0, Math.min(1, t));

  const closestX = tClamped * dx;
  const closestY = tClamped * dy;
  const distX = px - closestX;
  const distY = py - closestY;

  return {
    dist: Math.sqrt(distX * distX + distY * distY),
    t: tClamped,
    cross: dx * py - dy * px,
  };
}

export function getCurrentStreetPosition(lat: number, lng: number, gpsAccuracy?: number | null): StreetPosition | null {
  let best: { street: StreetDef; segIdx: number; dist: number; t: number; cross: number } | null = null;

  for (const street of STREETS) {
    for (let i = 0; i < street.points.length - 1; i++) {
      const a = street.points[i];
      const b = street.points[i + 1];
      const result = distToSegment(lat, lng, a.lat, a.lng, b.lat, b.lng);

      if (result.dist < (best ? best.dist : MAX_STREET_DISTANCE)) {
        best = { street, segIdx: i, dist: result.dist, t: result.t, cross: result.cross };
      }
    }
  }

  if (!best) return null;

  const { street, segIdx, dist, cross } = best;
  const fromPt = street.points[segIdx];
  const toPt = street.points[segIdx + 1];

  let from: string;
  let to: string;
  if (street.orientation === 'ns') {
    from = toPt.name;
    to = fromPt.name;
  } else {
    from = fromPt.name;
    to = toPt.name;
  }

  const accuracy = gpsAccuracy ?? 0;
  const sideThreshold = Math.max(SIDE_MIN_DISTANCE, accuracy * 0.7);
  const side = dist < sideThreshold
    ? ''
    : cross > 0 ? street.sides[0] : street.sides[1];

  return { street: street.name, from, to, side, distance: dist };
}
