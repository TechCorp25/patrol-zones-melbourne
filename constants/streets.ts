export interface StreetPosition {
  street: string;
  from: string;
  to: string;
  side: string;
  distance: number;
}

interface IntersectionPoint {
  name: string;
  lat: number;
  lng: number;
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
    points: [
      { name: 'La Trobe Street', lat: -37.8131741, lng: 144.9514331 },
      { name: 'Little Lonsdale Street', lat: -37.8141521, lng: 144.9519721 },
      { name: 'Lonsdale Street', lat: -37.8151383, lng: 144.9523347 },
      { name: 'Little Bourke Street', lat: -37.8161135, lng: 144.9528101 },
      { name: 'Bourke Street', lat: -37.8171167, lng: 144.9532945 },
      { name: 'Little Collins Street', lat: -37.8180351, lng: 144.9536954 },
      { name: 'Collins Street', lat: -37.8190645, lng: 144.9541564 },
      { name: 'Flinders Lane', lat: -37.8200746, lng: 144.9547177 },
      { name: 'Flinders Street', lat: -37.8210771, lng: 144.9550637 },
    ],
  },
  {
    name: 'King Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [300, 252, 222, 174, 145, 96, 68, 25, 2],
    points: [
      { name: 'La Trobe Street', lat: -37.8124532, lng: 144.9539159 },
      { name: 'Little Lonsdale Street', lat: -37.8134513, lng: 144.9543800 },
      { name: 'Lonsdale Street', lat: -37.8144263, lng: 144.9548017 },
      { name: 'Little Bourke Street', lat: -37.8154093, lng: 144.9552572 },
      { name: 'Bourke Street', lat: -37.8163813, lng: 144.9557073 },
      { name: 'Little Collins Street', lat: -37.8173730, lng: 144.9561702 },
      { name: 'Collins Street', lat: -37.8183478, lng: 144.9566209 },
      { name: 'Flinders Lane', lat: -37.8193907, lng: 144.9571057 },
      { name: 'Flinders Street', lat: -37.8202612, lng: 144.9575086 },
    ],
  },
  {
    name: 'William Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [364, 331, 276, 243, 188, 155, 100, 55, 22, 2],
    points: [
      { name: 'A\'Beckett Street', lat: -37.8106426, lng: 144.9560066 },
      { name: 'La Trobe Street', lat: -37.8117295, lng: 144.9564160 },
      { name: 'Little Lonsdale Street', lat: -37.8127354, lng: 144.9568802 },
      { name: 'Lonsdale Street', lat: -37.8137003, lng: 144.9573246 },
      { name: 'Little Bourke Street', lat: -37.8146840, lng: 144.9577773 },
      { name: 'Bourke Street', lat: -37.8156703, lng: 144.9582171 },
      { name: 'Little Collins Street', lat: -37.8166576, lng: 144.9586628 },
      { name: 'Collins Street', lat: -37.8176274, lng: 144.9591082 },
      { name: 'Flinders Lane', lat: -37.8186489, lng: 144.9595875 },
      { name: 'Flinders Street', lat: -37.8195967, lng: 144.9600377 },
    ],
  },
  {
    name: 'Queen Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [397, 364, 309, 276, 221, 188, 133, 100, 36, 2],
    points: [
      { name: 'A\'Beckett Street', lat: -37.8099531, lng: 144.9584124 },
      { name: 'La Trobe Street', lat: -37.8110139, lng: 144.9588903 },
      { name: 'Little Lonsdale Street', lat: -37.8120172, lng: 144.9593613 },
      { name: 'Lonsdale Street', lat: -37.8129889, lng: 144.9597964 },
      { name: 'Little Bourke Street', lat: -37.8139743, lng: 144.9602430 },
      { name: 'Bourke Street', lat: -37.8149369, lng: 144.9606813 },
      { name: 'Little Collins Street', lat: -37.8159444, lng: 144.9611504 },
      { name: 'Collins Street', lat: -37.8169049, lng: 144.9615953 },
      { name: 'Flinders Lane', lat: -37.8179089, lng: 144.9620592 },
      { name: 'Flinders Street', lat: -37.8188999, lng: 144.9625059 },
    ],
  },
  {
    name: 'Elizabeth Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [394, 361, 301, 268, 208, 175, 115, 82, 38, 2],
    points: [
      { name: 'A\'Beckett Street', lat: -37.8092364, lng: 144.9608622 },
      { name: 'La Trobe Street', lat: -37.8103112, lng: 144.9613574 },
      { name: 'Little Lonsdale Street', lat: -37.8113032, lng: 144.9618149 },
      { name: 'Lonsdale Street', lat: -37.8122734, lng: 144.9622609 },
      { name: 'Little Bourke Street', lat: -37.8132628, lng: 144.9627153 },
      { name: 'Bourke Street', lat: -37.8142440, lng: 144.9631682 },
      { name: 'Little Collins Street', lat: -37.8152319, lng: 144.9636245 },
      { name: 'Collins Street', lat: -37.8161906, lng: 144.9640651 },
      { name: 'Flinders Lane', lat: -37.8171925, lng: 144.9645186 },
      { name: 'Flinders Street', lat: -37.8181091, lng: 144.9649631 },
    ],
  },
  {
    name: 'Swanston Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [400, 355, 305, 270, 220, 185, 135, 100, 37, 2],
    points: [
      { name: 'A\'Beckett Street', lat: -37.8086716, lng: 144.9633388 },
      { name: 'La Trobe Street', lat: -37.8095865, lng: 144.9638292 },
      { name: 'Little Lonsdale Street', lat: -37.8105744, lng: 144.9642796 },
      { name: 'Lonsdale Street', lat: -37.8115564, lng: 144.9647317 },
      { name: 'Little Bourke Street', lat: -37.8125390, lng: 144.9651841 },
      { name: 'Bourke Street', lat: -37.8135238, lng: 144.9656320 },
      { name: 'Little Collins Street', lat: -37.8145043, lng: 144.9660841 },
      { name: 'Collins Street', lat: -37.8154881, lng: 144.9665452 },
      { name: 'Flinders Lane', lat: -37.8164700, lng: 144.9669901 },
      { name: 'Flinders Street', lat: -37.8174614, lng: 144.9674447 },
    ],
  },
  {
    name: 'Russell Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [308, 260, 228, 180, 145, 112, 60, 30, 2],
    points: [
      { name: 'La Trobe Street', lat: -37.8088606, lng: 144.9663048 },
      { name: 'Little Lonsdale Street', lat: -37.8098474, lng: 144.9667563 },
      { name: 'Lonsdale Street', lat: -37.8108353, lng: 144.9672082 },
      { name: 'Little Bourke Street', lat: -37.8118261, lng: 144.9676617 },
      { name: 'Bourke Street', lat: -37.8127875, lng: 144.9681001 },
      { name: 'Little Collins Street', lat: -37.8137853, lng: 144.9685579 },
      { name: 'Collins Street', lat: -37.8147601, lng: 144.9690008 },
      { name: 'Flinders Lane', lat: -37.8157426, lng: 144.9694579 },
      { name: 'Flinders Street', lat: -37.8167308, lng: 144.9699358 },
    ],
  },
  {
    name: 'Exhibition Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [318, 268, 234, 186, 150, 115, 62, 30, 2],
    points: [
      { name: 'La Trobe Street', lat: -37.8081442, lng: 144.9687634 },
      { name: 'Little Lonsdale Street', lat: -37.8091292, lng: 144.9692181 },
      { name: 'Lonsdale Street', lat: -37.8101064, lng: 144.9696678 },
      { name: 'Little Bourke Street', lat: -37.8111009, lng: 144.9701321 },
      { name: 'Bourke Street', lat: -37.8120732, lng: 144.9705652 },
      { name: 'Little Collins Street', lat: -37.8130661, lng: 144.9710212 },
      { name: 'Collins Street', lat: -37.8140436, lng: 144.9714740 },
      { name: 'Flinders Lane', lat: -37.8150221, lng: 144.9719285 },
      { name: 'Flinders Street', lat: -37.8159903, lng: 144.9723944 },
    ],
  },
  {
    name: 'Spring Street',
    orientation: 'ns',
    sides: ['West', 'East'],
    numberDirection: 'north',
    addresses: [240, 212, 168, 140, 94, 66, 28, 2],
    points: [
      { name: 'Little Lonsdale Street', lat: -37.8084183, lng: 144.9716133 },
      { name: 'Lonsdale Street', lat: -37.8093773, lng: 144.9721432 },
      { name: 'Little Bourke Street', lat: -37.8103791, lng: 144.9725428 },
      { name: 'Bourke Street', lat: -37.8113301, lng: 144.9730360 },
      { name: 'Little Collins Street', lat: -37.8123197, lng: 144.9735036 },
      { name: 'Collins Street', lat: -37.8132325, lng: 144.9739123 },
      { name: 'Flinders Lane', lat: -37.8143103, lng: 144.9743508 },
      { name: 'Flinders Street', lat: -37.8152758, lng: 144.9749019 },
    ],
  },
  {
    name: 'La Trobe Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [600, 510, 420, 345, 265, 185, 110, 35],
    points: [
      { name: 'Spencer Street', lat: -37.8131741, lng: 144.9514331 },
      { name: 'King Street', lat: -37.8124532, lng: 144.9539159 },
      { name: 'William Street', lat: -37.8117295, lng: 144.9564160 },
      { name: 'Queen Street', lat: -37.8110139, lng: 144.9588903 },
      { name: 'Elizabeth Street', lat: -37.8103112, lng: 144.9613574 },
      { name: 'Swanston Street', lat: -37.8095865, lng: 144.9638292 },
      { name: 'Russell Street', lat: -37.8088606, lng: 144.9663048 },
      { name: 'Exhibition Street', lat: -37.8081442, lng: 144.9687634 },
    ],
  },
  {
    name: 'Little Lonsdale Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [660, 580, 490, 420, 345, 275, 180, 90, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8141521, lng: 144.9519721 },
      { name: 'King Street', lat: -37.8134513, lng: 144.9543800 },
      { name: 'William Street', lat: -37.8127354, lng: 144.9568802 },
      { name: 'Queen Street', lat: -37.8120172, lng: 144.9593613 },
      { name: 'Elizabeth Street', lat: -37.8113032, lng: 144.9618149 },
      { name: 'Swanston Street', lat: -37.8105744, lng: 144.9642796 },
      { name: 'Russell Street', lat: -37.8098474, lng: 144.9667563 },
      { name: 'Exhibition Street', lat: -37.8091292, lng: 144.9692181 },
      { name: 'Spring Street', lat: -37.8084183, lng: 144.9716133 },
    ],
  },
  {
    name: 'Lonsdale Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [680, 600, 510, 435, 365, 300, 200, 100, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8151383, lng: 144.9523347 },
      { name: 'King Street', lat: -37.8144263, lng: 144.9548017 },
      { name: 'William Street', lat: -37.8137003, lng: 144.9573246 },
      { name: 'Queen Street', lat: -37.8129889, lng: 144.9597964 },
      { name: 'Elizabeth Street', lat: -37.8122734, lng: 144.9622609 },
      { name: 'Swanston Street', lat: -37.8115564, lng: 144.9647317 },
      { name: 'Russell Street', lat: -37.8108353, lng: 144.9672082 },
      { name: 'Exhibition Street', lat: -37.8101064, lng: 144.9696678 },
      { name: 'Spring Street', lat: -37.8093773, lng: 144.9721432 },
    ],
  },
  {
    name: 'Little Bourke Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [690, 608, 513, 438, 358, 275, 185, 95, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8161135, lng: 144.9528101 },
      { name: 'King Street', lat: -37.8154093, lng: 144.9552572 },
      { name: 'William Street', lat: -37.8146840, lng: 144.9577773 },
      { name: 'Queen Street', lat: -37.8139743, lng: 144.9602430 },
      { name: 'Elizabeth Street', lat: -37.8132628, lng: 144.9627153 },
      { name: 'Swanston Street', lat: -37.8125390, lng: 144.9651841 },
      { name: 'Russell Street', lat: -37.8118261, lng: 144.9676617 },
      { name: 'Exhibition Street', lat: -37.8111009, lng: 144.9701321 },
      { name: 'Spring Street', lat: -37.8103791, lng: 144.9725428 },
    ],
  },
  {
    name: 'Bourke Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [700, 615, 515, 440, 350, 250, 170, 90, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8171167, lng: 144.9532945 },
      { name: 'King Street', lat: -37.8163813, lng: 144.9557073 },
      { name: 'William Street', lat: -37.8156703, lng: 144.9582171 },
      { name: 'Queen Street', lat: -37.8149369, lng: 144.9606813 },
      { name: 'Elizabeth Street', lat: -37.8142440, lng: 144.9631682 },
      { name: 'Swanston Street', lat: -37.8135238, lng: 144.9656320 },
      { name: 'Russell Street', lat: -37.8127875, lng: 144.9681001 },
      { name: 'Exhibition Street', lat: -37.8120732, lng: 144.9705652 },
      { name: 'Spring Street', lat: -37.8113301, lng: 144.9730360 },
    ],
  },
  {
    name: 'Little Collins Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [670, 585, 487, 417, 330, 241, 163, 84, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8180351, lng: 144.9536954 },
      { name: 'King Street', lat: -37.8173730, lng: 144.9561702 },
      { name: 'William Street', lat: -37.8166576, lng: 144.9586628 },
      { name: 'Queen Street', lat: -37.8159444, lng: 144.9611504 },
      { name: 'Elizabeth Street', lat: -37.8152319, lng: 144.9636245 },
      { name: 'Swanston Street', lat: -37.8145043, lng: 144.9660841 },
      { name: 'Russell Street', lat: -37.8137853, lng: 144.9685579 },
      { name: 'Exhibition Street', lat: -37.8130661, lng: 144.9710212 },
      { name: 'Spring Street', lat: -37.8123197, lng: 144.9735036 },
    ],
  },
  {
    name: 'Collins Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [640, 555, 459, 394, 310, 232, 155, 78, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8190645, lng: 144.9541564 },
      { name: 'King Street', lat: -37.8183478, lng: 144.9566209 },
      { name: 'William Street', lat: -37.8176274, lng: 144.9591082 },
      { name: 'Queen Street', lat: -37.8169049, lng: 144.9615953 },
      { name: 'Elizabeth Street', lat: -37.8161906, lng: 144.9640651 },
      { name: 'Swanston Street', lat: -37.8154881, lng: 144.9665452 },
      { name: 'Russell Street', lat: -37.8147601, lng: 144.9690008 },
      { name: 'Exhibition Street', lat: -37.8140436, lng: 144.9714740 },
      { name: 'Spring Street', lat: -37.8132325, lng: 144.9739123 },
    ],
  },
  {
    name: 'Flinders Lane',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [630, 545, 460, 390, 310, 230, 150, 75, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8200746, lng: 144.9547177 },
      { name: 'King Street', lat: -37.8193907, lng: 144.9571057 },
      { name: 'William Street', lat: -37.8186489, lng: 144.9595875 },
      { name: 'Queen Street', lat: -37.8179089, lng: 144.9620592 },
      { name: 'Elizabeth Street', lat: -37.8171925, lng: 144.9645186 },
      { name: 'Swanston Street', lat: -37.8164700, lng: 144.9669901 },
      { name: 'Russell Street', lat: -37.8157426, lng: 144.9694579 },
      { name: 'Exhibition Street', lat: -37.8150221, lng: 144.9719285 },
      { name: 'Spring Street', lat: -37.8143103, lng: 144.9743508 },
    ],
  },
  {
    name: 'Flinders Street',
    orientation: 'ew',
    sides: ['South', 'North'],
    numberDirection: 'west',
    addresses: [640, 560, 475, 400, 320, 240, 160, 80, 2],
    points: [
      { name: 'Spencer Street', lat: -37.8210771, lng: 144.9550637 },
      { name: 'King Street', lat: -37.8202612, lng: 144.9575086 },
      { name: 'William Street', lat: -37.8195967, lng: 144.9600377 },
      { name: 'Queen Street', lat: -37.8188999, lng: 144.9625059 },
      { name: 'Elizabeth Street', lat: -37.8181091, lng: 144.9649631 },
      { name: 'Swanston Street', lat: -37.8174614, lng: 144.9674447 },
      { name: 'Russell Street', lat: -37.8167308, lng: 144.9699358 },
      { name: 'Exhibition Street', lat: -37.8159903, lng: 144.9723944 },
      { name: 'Spring Street', lat: -37.8152758, lng: 144.9749019 },
    ],
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
