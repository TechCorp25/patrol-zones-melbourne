export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface StreetSegment {
  street: string;
  coverage: "full" | "partial";
  segments: { from: string; to: string; to_landmark?: string }[];
}

export interface BoundarySegment {
  compass: string;
  street: string;
  lineStyle: "solid" | "broken";
  included: boolean;
}

export interface PatrolZone {
  id: string;
  name: string;
  color: string;
  fillColor: string;
  coordinates: LatLng[];
  description: string;
  patrolStreets: StreetSegment[];
  boundaries: BoundarySegment[];
}

const S = (lat: number, lng: number): LatLng => ({ latitude: lat, longitude: lng });

export const PATROL_ZONES: PatrolZone[] = [
  {
    id: 'flagstaff',
    name: 'FLAGSTAFF',
    color: '#3B82F6',
    fillColor: 'rgba(59,130,246,0.18)',
    description: 'Spencer–William, La Trobe–Lonsdale',
    // FLAGSTAFF (replace coordinates array)
    coordinates: [
      S(-37.8161500, 144.9526217),
      S(-37.8131046, 144.9512275),
      S(-37.8116054, 144.9563692),
      S(-37.8146801, 144.9577628),
      S(-37.8161570, 144.9526249),
      S(-37.8161648, 144.9525979),
    ],
    boundaries: [
      { compass: 'W', street: 'Spencer Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'La Trobe Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'William Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Little Bourke Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Alsop Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Altson Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Brights Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Brown Alley', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Chisholm Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Cleve Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Crombie Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Eagle Alley', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'La Trobe Street' }] },
      { street: 'Gough Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off King Street' }] },
      { street: 'Guests Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Healeys Lane', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'Lonsdale Street' }] },
      { street: 'King Street', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Lonsdale Street', to: 'La Trobe Street' }] },
      { street: 'La Trobe Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }, { from: 'William Street', to: 'King Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }, { from: 'William Street', to: 'King Street' }] },
      { street: 'Little Lonsdale Street', coverage: 'partial', segments: [{ from: 'William Street', to: 'King Street' }, { from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }, { from: 'William Street', to: 'King Street' }] },
      { street: 'Manton Lane', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'Lonsdale Street' }] },
      { street: 'Merriman Lane', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'Lonsdale Street' }] },
      { street: 'Nicholson Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Park Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Little Lonsdale Street' }] },
      { street: 'Pender Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Rose Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Spencer Street', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'La Trobe Street', to: 'Little Lonsdale Street' }] },
      { street: 'Uniacke Court', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Warner Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Wicklow Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'William Street', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }] },
    ],
  },
  {
    id: 'spencer',
    name: 'SPENCER',
    color: '#10B981',
    fillColor: 'rgba(16,185,129,0.18)',
    description: 'Spencer–William, Little Bourke–Collins',
    coordinates: [
      S(-37.8161572, 144.9526237),
      S(-37.8146594, 144.9577574),
      S(-37.8176366, 144.9591030),
      S(-37.8191123, 144.9539823),
    ],
    boundaries: [
      { compass: 'W', street: 'Spencer Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Little Bourke Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'William Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Collins Street', lineStyle: 'broken', included: false },
    ],
    patrolStreets: [
      { street: 'Bourke Street', coverage: 'partial', segments: [{ from: 'William Street', to: 'King Street' }, { from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Cosgrave Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Gallaghers Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Godfrey Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Goldsbrough Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Gresham Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'King Street', coverage: 'partial', segments: [{ from: 'Little Collins Street', to: 'Bourke Street' }, { from: 'Bourke Street', to: 'Little Bourke Street' }, { from: 'Collins Street', to: 'Little Collins Street' }] },
      { street: 'Langs Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Bourke Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'William Street', to: 'King Street' }, { from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'William Street', to: 'King Street' }, { from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Ramsay Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Spencer Street', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Bourke Street' }, { from: 'Bourke Street', to: 'Little Collins Street' }, { from: 'Little Collins Street', to: 'Collins Street' }] },
    ],
  },
  {
    id: 'rialto',
    name: 'RIALTO',
    color: '#8B5CF6',
    fillColor: 'rgba(139,92,246,0.18)',
    description: 'Spencer–William, Collins–Flinders',
    coordinates: [
      S(-37.8191123, 144.9539823),
      S(-37.8176366, 144.9591030),
      S(-37.8197494, 144.9600711),
      S(-37.8212448, 144.9549612),
    ],
    boundaries: [
      { compass: 'W', street: 'Spencer Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Collins Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'William Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Flinders Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Flinders Lane', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Flinders Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }] },
      { street: 'Francis Street', coverage: 'partial', segments: [{ from: 'King Street', to: 'Spencer Street' }] },
      { street: 'King Street', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Flinders Street' }] },
      { street: 'Spencer Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Collins Street' }] },
      { street: 'William Street', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Flinders Street' }] },
    ],
  },
  {
    id: 'supreme',
    name: 'SUPREME',
    color: '#F59E0B',
    fillColor: 'rgba(245,158,11,0.18)',
    description: 'William–Queen, La Trobe–Lonsdale',
    coordinates: [
      S(-37.8093350, 144.9564829),
      S(-37.8096622, 144.9583984),
      S(-37.8139745, 144.9602223),
      S(-37.8146801, 144.9577628),
      S(-37.8116054, 144.9563692),
      S(-37.8096213, 144.9551887),
    ],
    boundaries: [
      { compass: 'N', street: 'La Trobe Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'Queen Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Lonsdale Street', lineStyle: 'solid', included: true },
      { compass: 'W', street: 'William Street', lineStyle: 'broken', included: false },
    ],
    patrolStreets: [
      { street: 'A\'Beckett Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Wills Street' }, { from: 'Wills Street', to: 'William Street' }] },
      { street: 'Crown Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Lonsdale Street' }] },
      { street: 'Finlay Alley', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Little Lonsdale Street' }] },
      { street: 'Flanigan Lane', coverage: 'partial', segments: [{ from: 'Sutherland Street', to: 'Guildford Lane' }] },
      { street: 'Goldie Place', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Guildford Lane', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Sutherland Street' }] },
      { street: 'Hardware Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Hardware Street', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Lonsdale Street' }] },
      { street: 'Heape Court', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'La Trobe Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Wills Street' }, { from: 'Wills Street', to: 'William Street' }] },
      { street: 'Little Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'McLean Alley', coverage: 'partial', segments: [{ from: 'Sutherland Street', to: 'Guildford Lane' }] },
      { street: 'Queen Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'A\'Beckett Street' }, { from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }] },
      { street: 'Sutherland Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Little Lonsdale Street' }] },
      { street: 'Timothy Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'William Street', coverage: 'partial', segments: [{ from: 'A\'Beckett Street', to: 'La Trobe Street' }] },
      { street: 'Wills Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'A\'Beckett Street' }] },
    ],
  },
  {
    id: 'tavistock',
    name: 'TAVISTOCK',
    color: '#EC4899',
    fillColor: 'rgba(236,72,153,0.18)',
    description: 'William–Queen, Lonsdale–Collins',
    // TAVISTOCK (replace coordinates array)
    coordinates: [
      S(-37.8139745, 144.9602223),
      S(-37.8190226, 144.9625781),
      S(-37.8197494, 144.9600711),
      S(-37.8146801, 144.9577628),
    ],
    boundaries: [
      { compass: 'W', street: 'William Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Lonsdale Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Queen Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Collins Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Bourke Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'Briscoe Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Market Street' }, { from: 'Market Street', to: 'William Street' }] },
      { street: 'Collins Way', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Fleming Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Gills Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Hardware Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Kirks Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'William Street' }] },
      { street: 'Market Street', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Flinders Lane' }] },
      { street: 'McKillop Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Niagara Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Racing Club Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Rankins Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Somerset Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Warburton Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Warburton Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'White Hart Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'William Street', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }, { from: 'Little Bourke Street', to: 'Bourke Street' }, { from: 'Bourke Street', to: 'Little Collins Street' }, { from: 'Little Collins Street', to: 'Collins Street' }] },
    ],
  },
  {
    id: 'titles',
    name: 'TITLES',
    color: '#06B6D4',
    fillColor: 'rgba(6,182,212,0.18)',
    description: 'Queen–Elizabeth, La Trobe–Lonsdale',
    coordinates: [
      S(-37.8088059, 144.9578419),
      S(-37.8075914, 144.9580639),
      S(-37.8070526, 144.9598380),
      S(-37.8102837, 144.9613418),
      S(-37.8122743, 144.9622486),
      S(-37.8129854, 144.9598039),
      S(-37.8096622, 144.9583984),
      S(-37.8096324, 144.9582241),
    ],
    boundaries: [
      { compass: 'N', street: 'La Trobe Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Elizabeth Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Lonsdale Street', lineStyle: 'solid', included: true },
      { compass: 'W', street: 'Queen Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'A\'Beckett Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Anthony Street' }, { from: 'Anthony Street', to: 'Elizabeth Street' }] },
      { street: 'Anthony Street', coverage: 'partial', segments: [{ from: 'Franklin Street', to: 'A\'Beckett Street' }] },
      { street: 'Blender Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Franklin Street' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Franklin Street', to: 'Therry Street' }] },
      { street: 'Franklin Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Anthony Street' }, { from: 'Anthony Street', to: 'Elizabeth Street' }] },
      { street: 'La Trobe Street', coverage: 'partial', segments: [{ from: 'Elizabeth Street', to: 'Queen Street' }] },
      { street: 'Little Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Queen Street', coverage: 'partial', segments: [{ from: 'A\'Beckett Street', to: 'Franklin Street' }, { from: 'Franklin Street', to: 'Therry Street' }] },
      { street: 'St Bishoy Lane', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Sutherland Street' }] },
      { street: 'Sutherland Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Little Lonsdale Street' }] },
      { street: 'Therry Street', coverage: 'partial', segments: [{ from: 'Elizabeth Street', to: 'Queen Street' }] },
      { street: 'Zevenboom Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
    ],
  },
  {
    id: 'hardware',
    name: 'HARDWARE',
    color: '#F97316',
    fillColor: 'rgba(249,115,22,0.18)',
    description: 'Queen–Elizabeth, Lonsdale–Collins',
    // HARDWARE (replace coordinates array)
    coordinates: [
      S(-37.8122743, 144.9622486),
      S(-37.8152198, 144.9636037),
      S(-37.8159403, 144.9611463),
      S(-37.8137020, 144.9601071),
      S(-37.8129854, 144.9598039),
    ],
    boundaries: [
      { compass: 'N', street: 'Lonsdale Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Elizabeth Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Collins Street', lineStyle: 'solid', included: true },
      { compass: 'W', street: 'Queen Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Bourke Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Guildford Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Hardware Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Hardware Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Queen Street', to: 'Elizabeth Street' }] },
      { street: 'Penfold Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Queen Street', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }, { from: 'Little Collins Street', to: 'Bourke Street' }, { from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Rankins Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Bourke Street' }] },
      { street: 'Tattersalls Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
    ],
  },
  {
    id: 'banks',
    name: 'BANKS',
    color: '#A3E635',
    fillColor: 'rgba(163,230,53,0.18)',
    description: 'Queen–Elizabeth, Little Collins–Flinders',
    coordinates: [
      S(-37.8160016, 144.9611964),
      S(-37.8152990, 144.9636349),
      S(-37.8183082, 144.9650108),
      S(-37.8190226, 144.9625781),
    ],
    boundaries: [
      { compass: 'W', street: 'Queen Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Little Collins Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Elizabeth Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Flinders Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Bligh Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Bond Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'Elizabeth Street', to: 'Queen Street' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Equitable Place', coverage: 'partial', segments: [{ from: 'Little Collins Street', to: 'Collins Street' }] },
      { street: 'Flinders Court', coverage: 'partial', segments: [{ from: 'Flinders Lane', to: 'Flinders Street' }] },
      { street: 'Flinders Lane', coverage: 'partial', segments: [{ from: 'Elizabeth Street', to: 'Queen Street' }] },
      { street: 'Flinders Street', coverage: 'partial', segments: [{ from: 'Elizabeth Street', to: 'Queen Street' }] },
      { street: 'Fulham Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Mill Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Queen Street', coverage: 'partial', segments: [{ from: 'Flinders Lane', to: 'Collins Street' }, { from: 'Collins Street', to: 'Little Collins Street' }, { from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Ryrie Lane', coverage: 'partial', segments: [{ from: 'Flinders Lane', to: 'Queen Street' }] },
      { street: 'Staughton Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
    ],
  },
  {
    id: 'the_mac',
    name: 'THE MAC',
    color: '#E879F9',
    fillColor: 'rgba(232,121,249,0.18)',
    description: 'Elizabeth–Swanston, Franklin–La Trobe',
    coordinates: [
      S(-37.8061528, 144.9594530),
      S(-37.8068771, 144.9658829),
      S(-37.8076703, 144.9657592),
      S(-37.8088535, 144.9663182),
      S(-37.8102837, 144.9613418),
    ],
    boundaries: [
      { compass: 'N', street: 'Franklin Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Swanston Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'La Trobe Street', lineStyle: 'broken', included: false },
      { compass: 'W', street: 'Elizabeth Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'A\'Beckett Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Cardigan Terrace', coverage: 'partial', segments: [{ from: 'Victoria Street', to: 'Swanston Street' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Little La Trobe Street', to: 'A\'Beckett Street' }, { from: 'La Trobe Street', to: 'Little La Trobe Street' }, { from: 'A\'Beckett Street', to: 'Franklin Street' }] },
      { street: 'Franklin Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Stewart Street', coverage: 'partial', segments: [{ from: 'Franklin Street', to: 'A\'Beckett Street' }] },
      { street: 'Swanston Street', coverage: 'partial', segments: [{ from: 'A\'Beckett Street', to: 'Franklin Street' }, { from: 'Franklin Street', to: 'Victoria Street' }] },
      { street: 'Therry Street', coverage: 'partial', segments: [{ from: 'Victoria Street', to: 'Elizabeth Street' }] },
      { street: 'Victoria Street', coverage: 'partial', segments: [{ from: 'Cardigan Street', to: 'Swanston Street' }, { from: 'Swanston Street', to: 'Bouverie Street' }] },
    ],
  },
  {
    id: 'library',
    name: 'LIBRARY',
    color: '#34D399',
    fillColor: 'rgba(52,211,153,0.18)',
    description: 'Elizabeth–Russell, La Trobe–Little Bourke',
    coordinates: [
      S(-37.8102837, 144.9613418),
      S(-37.8088535, 144.9663182),
      S(-37.8118529, 144.9676938),
      S(-37.8132929, 144.9627177),
    ],
    boundaries: [
      { compass: 'N', street: 'La Trobe Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'Russell Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Little Bourke Street', lineStyle: 'solid', included: true },
      { compass: 'W', street: 'Elizabeth Street', lineStyle: 'broken', included: false },
    ],
    patrolStreets: [
      { street: 'Caledonian Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Celestial Avenue', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Drewery Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Drewery Lane' }] },
      { street: 'Drewery Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Lonsdale Street' }] },
      { street: 'Drewery Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Drewery Lane' }] },
      { street: 'Driver Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Globe Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Heffernan Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Knox Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Knox Place', coverage: 'partial', segments: [{ from: 'Knox Lane', to: 'Swanston Street' }] },
      { street: 'La Trobe Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }, { from: 'Russell Street', to: 'Swanston Street' }] },
      { street: 'Little Lonsdale Street', coverage: 'partial', segments: [{ from: 'Russell Street', to: 'Swanston Street' }, { from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }, { from: 'Russell Street', to: 'Swanston Street' }] },
      { street: 'McIntyre Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Knox Lane' }] },
      { street: 'Russell Street', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Sniders Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Drewery Lane' }] },
      { street: 'Stevenson Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Tattersalls Lane' }] },
      { street: 'Swanston Street', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Tattersalls Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
      { street: 'Waratah Place', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Bourke Street' }] },
    ],
  },
  {
    id: 'china_town',
    name: 'CHINA TOWN',
    color: '#FB7185',
    fillColor: 'rgba(251,113,133,0.18)',
    description: 'Elizabeth–Russell, Little Bourke–Collins',
    coordinates: [
      S(-37.8132929, 144.9627177),
      S(-37.8118529, 144.9676938),
      S(-37.8147493, 144.9690187),
      S(-37.8161926, 144.9640371),
    ],
    boundaries: [
      { compass: 'W', street: 'Elizabeth Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Little Bourke Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'Russell Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Collins Street', lineStyle: 'broken', included: false },
    ],
    patrolStreets: [
      { street: 'Albion Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Angel Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Balcombe Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Baptist Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Block Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Bourke Street', coverage: 'partial', segments: [{ from: 'Russell Street', to: 'Swanston Street' }, { from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Bullens Lane', coverage: 'partial', segments: [{ from: 'Russell Street', to: 'Little Bourke Street' }] },
      { street: 'Carson Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Dame Edna Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Dean Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Donaldson Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Russell Street' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Bourke Street' }, { from: 'Bourke Street', to: 'Little Collins Street' }, { from: 'Little Collins Street', to: 'Collins Street' }] },
      { street: 'Howey Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Hughs Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'La Trobe Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'Russell Street', to: 'Swanston Street' }, { from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Louden Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Masons Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Portland Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Russell Street' }] },
      { street: 'Presgrave Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Howey Place' }] },
      { street: 'Rainbow Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Royal Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Russell Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Russell Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }, { from: 'Little Collins Street', to: 'Bourke Street' }] },
      { street: 'Star Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Staughton Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Sugden Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Swanston Street', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Little Collins Street' }, { from: 'Bourke Street', to: 'Little Bourke Street' }, { from: 'Little Collins Street', to: 'Bourke Street' }] },
      { street: 'The Causeway', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Turners Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Swanston Street' }] },
      { street: 'Union Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
    ],
  },
  {
    id: 'city_square',
    name: 'CITY SQUARE',
    color: '#60A5FA',
    fillColor: 'rgba(96,165,250,0.18)',
    description: 'Elizabeth–Russell, Collins–Flinders',
    coordinates: [
      S(-37.8161926, 144.9640371),
      S(-37.8147493, 144.9690187),
      S(-37.8168519, 144.9699865),
      S(-37.8183082, 144.9650108),
    ],
    boundaries: [
      { compass: 'W', street: 'Elizabeth Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Collins Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Russell Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Flinders Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Centre Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Cocker Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }, { from: 'Russell Street', to: 'Swanston Street' }] },
      { street: 'Degraves Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Degraves Street' }] },
      { street: 'Degraves Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Elizabeth Street', coverage: 'partial', segments: [{ from: 'Flinders Lane', to: 'Collins Street' }] },
      { street: 'Flinders Lane', coverage: 'partial', segments: [{ from: 'Russell Street', to: 'Swanston Street' }, { from: 'Swanston Street', to: 'Elizabeth Street' }] },
      { street: 'Flinders Street', coverage: 'partial', segments: [{ from: 'Swanston Street', to: 'Elizabeth Street' }, { from: 'Russell Street', to: 'Swanston Street' }] },
      { street: 'Hosier Lane', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Lingham Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Manchester Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Monaghan Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Rothsay Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Rutledge Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Hosier Lane' }] },
      { street: 'Scott Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Swanston Street', coverage: 'partial', segments: [{ from: 'Flinders Lane', to: 'Collins Street' }, { from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Watson Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
    ],
  },
  {
    id: 'princess',
    name: 'PRINCESS',
    color: '#A855F7',
    fillColor: 'rgba(168,85,247,0.18)',
    description: 'Russell–Spring, Victoria–Bourke',
    coordinates: [
      S(-37.8069000, 144.9654223),
      S(-37.8052932, 144.9703773),
      S(-37.8113046, 144.9731756),
      S(-37.8128527, 144.9681523),
    ],
    boundaries: [
      { compass: 'W', street: 'Russell Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Victoria Street', lineStyle: 'solid', included: true },
      { compass: 'E', street: 'Spring Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Bourke Street', lineStyle: 'broken', included: false },
    ],
    patrolStreets: [
      { street: 'Amphlett Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Bell Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off MacKenzie Street' }] },
      { street: 'Belman Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Russell Street' }] },
      { street: 'Bennetts Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Bourke Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }, { from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Brien Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Cohen Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Corrs Lane', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Coverlid Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Croft Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Paynes Place' }] },
      { street: 'Crossley Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Davisons Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Elliott Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Victoria Street' }] },
      { street: 'Evans Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Exploration Lane' }, { from: '', to: '', to_landmark: 'off Little Lonsdale Street' }] },
      { street: 'Exhibition Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Lonsdale Street', to: 'La Trobe Street' }, { from: 'Little Bourke Street', to: 'Lonsdale Street' }, { from: 'La Trobe Street', to: 'Victoria Street' }] },
      { street: 'Exploration Lane', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Little Lonsdale Street' }] },
      { street: 'Golden Fleece Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Coverlid Place' }] },
      { street: 'Gordon Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Grange Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off MacKenzie Street' }] },
      { street: 'Grant Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Exhibition Street' }] },
      { street: 'Harwood Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Hayward Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Lonsdale Street', to: 'La Trobe Street' }] },
      { street: 'Jones Lane', coverage: 'partial', segments: [{ from: 'Lonsdale Street', to: 'Little Lonsdale Street' }] },
      { street: 'La Trobe Street', coverage: 'partial', segments: [{ from: 'Victoria Street', to: 'Exhibition Street' }, { from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'Lacey Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Lees Place', coverage: 'partial', segments: [{ from: 'Little Bourke Street', to: 'Exhibition Street' }] },
      { street: 'Little Bourke Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Little Bourke Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }, { from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Little Lonsdale Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }, { from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Liverpool Street', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Lonsdale Street', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Exhibition Street' }, { from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'MacKenzie Street', coverage: 'partial', segments: [{ from: 'Victoria Street', to: 'Russell Street' }] },
      { street: 'Market Lane', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Bourke Street' }] },
      { street: 'Mornane Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Exhibition Street' }] },
      { street: 'Paynes Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Pender Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Punch Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Bourke Street' }] },
      { street: 'Rathdowne Street', coverage: 'partial', segments: [{ from: 'Victoria Street', to: 'Queensberry Street' }] },
      { street: 'Russell Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'MacKenzie Street' }] },
      { street: 'Smythe Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Lonsdale Street' }] },
      { street: 'Spring Street', coverage: 'partial', segments: [{ from: 'Little Lonsdale Street', to: 'Victoria Parade' }, { from: 'Bourke Street', to: 'Little Bourke Street' }, { from: 'Lonsdale Street', to: 'Little Lonsdale Street' }, { from: 'Little Bourke Street', to: 'Lonsdale Street' }] },
      { street: 'Trades Hall Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Victoria Street' }] },
      { street: 'Turnbull Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Spring Street' }] },
      { street: 'Victoria Street', coverage: 'partial', segments: [{ from: 'La Trobe Street', to: 'Rathdowne Street' }, { from: 'Drummond Street', to: 'Lygon Street' }, { from: 'Rathdowne Street', to: 'Drummond Street' }] },
    ],
  },
  {
    id: 'hyatt',
    name: 'HYATT',
    color: '#14B8A6',
    fillColor: 'rgba(20,184,166,0.18)',
    description: 'Russell–Exhibition, Bourke–Flinders',
    coordinates: [
      S(-37.8128527, 144.9681523),
      S(-37.8120627, 144.9705629),
      S(-37.8161259, 144.9724621),
      S(-37.8168519, 144.9699865),
    ],
    boundaries: [
      { compass: 'W', street: 'Russell Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Bourke Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'Exhibition Street', lineStyle: 'broken', included: false },
      { compass: 'S', street: 'Flinders Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'ACDC Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Alfred Place', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Little Collins Street' }] },
      { street: 'Beaney Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Russell Street' }] },
      { street: 'Chester Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'Coromandel Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Duckboard Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Flinders Lane', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'Flinders Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'George Parade', coverage: 'partial', segments: [{ from: 'Collins Street', to: 'Flinders Lane' }] },
      { street: 'Higson Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Russell Street' }] },
      { street: 'Malthouse Lane', coverage: 'partial', segments: [{ from: 'Exhibition Street', to: 'Flinders Lane' }] },
      { street: 'Melbourne Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Russell Street' }] },
      { street: 'Oliver Lane', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }] },
      { street: 'Pink Alley', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Russell Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Collins Street' }, { from: 'Collins Street', to: 'Little Collins Street' }] },
      { street: 'Strachan Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Exhibition Street' }] },
    ],
  },
  {
    id: 'twin_towers',
    name: 'TWIN TOWERS',
    color: '#FBBF24',
    fillColor: 'rgba(251,191,36,0.18)',
    description: 'Exhibition–Spring, Bourke–Flinders',
    coordinates: [
      S(-37.8120627, 144.9705629),
      S(-37.8113046, 144.9731756),
      S(-37.8153663, 144.9750663),
      S(-37.8161259, 144.9724621),
    ],
    boundaries: [
      { compass: 'W', street: 'Exhibition Street', lineStyle: 'solid', included: true },
      { compass: 'N', street: 'Bourke Street', lineStyle: 'broken', included: false },
      { compass: 'E', street: 'Spring Street', lineStyle: 'solid', included: true },
      { compass: 'S', street: 'Flinders Street', lineStyle: 'solid', included: true },
    ],
    patrolStreets: [
      { street: 'Brabham Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Ridgway Place' }] },
      { street: 'Club Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Coates Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Collins Street', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Exhibition Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Collins Street' }, { from: 'Collins Street', to: 'Little Collins Street' }, { from: 'Little Collins Street', to: 'Bourke Street' }] },
      { street: 'Flinders Lane', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Flinders Street', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'Howitt Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Lane' }] },
      { street: 'Little Collins Street', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Exhibition Street' }] },
      { street: 'McGraths Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'McIlwraith Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Meyers Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Ridgway Place', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Little Collins Street' }] },
      { street: 'Spark Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Flinders Street' }] },
      { street: 'Spring Street', coverage: 'partial', segments: [{ from: 'Flinders Street', to: 'Flinders Lane' }, { from: 'Flinders Lane', to: 'Collins Street' }, { from: 'Little Collins Street', to: 'Bourke Street' }, { from: 'Collins Street', to: 'Little Collins Street' }] },
      { street: 'Throssell Lane', coverage: 'partial', segments: [{ from: 'Spring Street', to: 'Flinders Lane' }] },
      { street: 'Ulster Lane', coverage: 'partial', segments: [{ from: '', to: '', to_landmark: 'off Spring Street' }] },
      { street: 'Westwood Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
      { street: 'Windsor Place', coverage: 'partial', segments: [{ from: 'Bourke Street', to: 'Little Collins Street' }] },
    ],
  },
];

export function getZoneForLocation(lat: number, lng: number): PatrolZone | null {
  for (const zone of PATROL_ZONES) {
    if (isPointInPolygon({ latitude: lat, longitude: lng }, zone.coordinates)) {
      return zone;
    }
  }
  return null;
}

function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].longitude, yi = polygon[i].latitude;
    const xj = polygon[j].longitude, yj = polygon[j].latitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getHeadingLabel(heading: number): { cardinal: string; street: string } {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  const cardinal = dirs[index];
  const gridAngle = 30;
  const adjusted = ((heading - gridAngle) % 360 + 360) % 360;
  let street: string;
  if (adjusted >= 340 || adjusted < 20) street = 'Toward La Trobe';
  else if (adjusted >= 20 && adjusted < 70) street = 'Toward Spring';
  else if (adjusted >= 70 && adjusted < 110) street = 'Along E-W streets';
  else if (adjusted >= 110 && adjusted < 200) street = 'Toward Flinders';
  else if (adjusted >= 200 && adjusted < 250) street = 'Toward Spencer';
  else if (adjusted >= 250 && adjusted < 290) street = 'Along N-S streets';
  else street = 'Toward La Trobe';
  return { cardinal, street };
}
