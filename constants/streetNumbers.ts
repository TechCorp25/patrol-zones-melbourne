import { STREET_INTERSECTIONS, IntersectionPoint as IntersectionCoord } from './intersections';

export interface StreetNumberMarker {
  label: string;
  lat: number;
  lng: number;
  side: 'north' | 'south' | 'east' | 'west';
  orientation: 'ns' | 'ew';
}

const LAT_TO_M = 111000;
const LNG_TO_M = 111000 * Math.cos(-37.815 * Math.PI / 180);

const SIDE_OFFSET_M = 14;
const SIDE_OFFSET_LAT = SIDE_OFFSET_M / LAT_TO_M;
const SIDE_OFFSET_LNG = SIDE_OFFSET_M / LNG_TO_M;

interface StreetBlock {
  street: string;
  from: string;
  to: string;
  northSide?: number[];
  southSide?: number[];
  eastSide?: number[];
  westSide?: number[];
}

function normalizeStreetName(name: string): string {
  return name.toLowerCase().replace(/[\u2019'']/g, "'").replace(/\s+/g, ' ').trim();
}

function findIntersectionPoint(
  streetName: string,
  crossStreetName: string
): IntersectionCoord | null {
  const sn = normalizeStreetName(streetName);
  const csn = normalizeStreetName(crossStreetName);
  const street = STREET_INTERSECTIONS.find(s => normalizeStreetName(s.name) === sn);
  if (!street) return null;
  return street.points.find(p => normalizeStreetName(p.name) === csn) || null;
}

function selectRepresentativeNumbers(nums: number[]): number[] {
  if (nums.length <= 4) return nums;

  const first = nums[0];
  const last = nums[nums.length - 1];
  const range = last - first;
  if (range <= 0) return [first];

  const TARGET_SPACING = 30;
  const count = Math.max(2, Math.min(5, Math.ceil(range / TARGET_SPACING) + 1));

  if (count >= nums.length) return nums;

  const result: number[] = [first];
  for (let i = 1; i < count - 1; i++) {
    const targetVal = first + (range * i) / (count - 1);
    let closest = nums[0];
    let closestDist = Math.abs(nums[0] - targetVal);
    for (const n of nums) {
      const d = Math.abs(n - targetVal);
      if (d < closestDist) {
        closest = n;
        closestDist = d;
      }
    }
    if (!result.includes(closest)) {
      result.push(closest);
    }
  }
  if (!result.includes(last)) {
    result.push(last);
  }
  return result.sort((a, b) => a - b);
}

let _allMarkers: StreetNumberMarker[] | null = null;

export function getAllStreetNumberMarkers(): StreetNumberMarker[] {
  if (_allMarkers) return _allMarkers;
  const markers: StreetNumberMarker[] = [];

  for (const block of STREET_BLOCKS) {
    const ptFrom = findIntersectionPoint(block.street, block.from);
    const ptTo = findIntersectionPoint(block.street, block.to);
    if (!ptFrom || !ptTo) continue;

    const street = STREET_INTERSECTIONS.find(
      s => normalizeStreetName(s.name) === normalizeStreetName(block.street)
    );
    if (!street) continue;

    const sides: { key: 'northSide' | 'southSide' | 'eastSide' | 'westSide'; side: 'north' | 'south' | 'east' | 'west'; latOff: number; lngOff: number }[] = street.orientation === 'ew'
      ? [
          { key: 'northSide', side: 'north', latOff: SIDE_OFFSET_LAT, lngOff: 0 },
          { key: 'southSide', side: 'south', latOff: -SIDE_OFFSET_LAT, lngOff: 0 },
        ]
      : [
          { key: 'eastSide', side: 'east', latOff: 0, lngOff: SIDE_OFFSET_LNG },
          { key: 'westSide', side: 'west', latOff: 0, lngOff: -SIDE_OFFSET_LNG },
        ];

    for (const { key, side, latOff, lngOff } of sides) {
      const nums = block[key];
      if (!nums || nums.length === 0) continue;

      const lo = nums[0];
      const hi = nums[nums.length - 1];
      const range = hi - lo;

      const picks = selectRepresentativeNumbers(nums);

      for (const num of picks) {
        const t = range > 0 ? (num - lo) / range : 0.5;
        const frac = 0.08 + t * 0.84;
        const lat = ptFrom.lat + (ptTo.lat - ptFrom.lat) * frac + latOff;
        const lng = ptFrom.lng + (ptTo.lng - ptFrom.lng) * frac + lngOff;

        markers.push({
          label: String(num),
          lat,
          lng,
          side,
          orientation: street.orientation,
        });
      }
    }
  }

  _allMarkers = markers;
  return markers;
}

export function getVisibleStreetNumberMarkers(
  centerLat: number,
  centerLng: number,
  latDelta: number,
  lngDelta: number
): StreetNumberMarker[] {
  const all = getAllStreetNumberMarkers();
  const halfLat = latDelta / 2 + 0.0002;
  const halfLng = lngDelta / 2 + 0.0002;
  const minLat = centerLat - halfLat;
  const maxLat = centerLat + halfLat;
  const minLng = centerLng - halfLng;
  const maxLng = centerLng + halfLng;

  return all.filter(m =>
    m.lat >= minLat && m.lat <= maxLat &&
    m.lng >= minLng && m.lng <= maxLng
  );
}

const STREET_BLOCKS: StreetBlock[] = [
  { street: "Spencer Street", from: "Batman Street", to: "Jeffcott Street", eastSide: [362,364,366] },
  { street: "Spencer Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [164,166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,196,198,200], westSide: [157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195,197,199,201,204,206] },
  { street: "Spencer Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160], westSide: [125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155] },
  { street: "Spencer Street", from: "Collins Street", to: "Flinders Lane", westSide: [44,46,48,50,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83] },
  { street: "Spencer Street", from: "Collins Street", to: "Little Collins Street", eastSide: [86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120], westSide: [93,95,97,99,101,103,105,107,109,111,113,115,117,119,121,123] },
  { street: "Spencer Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40], westSide: [27,29,31,33,35,37,39,41,43,45,47,49,51] },
  { street: "Spencer Street", from: "Flinders Street", to: "Spencer Street Bridge", eastSide: [2], westSide: [3,5,7,9,11,13,15,17,19,21,23] },
  { street: "Spencer Street", from: "Jeffcott Street", to: "La Trobe Street", eastSide: [318,320,322,324,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358], westSide: [317,319,321,323,325,327,329,331,333,335,337] },
  { street: "Spencer Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [278,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314], westSide: [269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,313] },
  { street: "Spencer Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [208,210,212,214,216,218,220,222,224,226,228,230], westSide: [201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,232,234,236,238,240] },
  { street: "Spencer Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [264,266,268,270,272,274,276], westSide: [201,233,235,237,239,241,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,265,267] },
  { street: "King Street", from: "Batman Street", to: "Dudley Street", eastSide: [334], westSide: [419,421,423,425,427,429,431,433,435,437,439,441,443,445,447,449,451,453,455,457,459] },
  { street: "King Street", from: "Batman Street", to: "Jeffcott Street", eastSide: [383,385,387,389,391,393,395,397,399,401,403,405,407,409,411,413,415] },
  { street: "King Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [160,162,164,166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,196,198,200], westSide: [159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195] },
  { street: "King Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [111,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156], westSide: [115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153] },
  { street: "King Street", from: "Collins Street", to: "Flinders Lane", eastSide: [42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76], westSide: [43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77] },
  { street: "King Street", from: "Collins Street", to: "Little Collins Street", eastSide: [80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116], westSide: [81,83,85,87,89,91,93,95,97,99,101,103,105,107,109] },
  { street: "King Street", from: "Dudley Street", to: "Walsh Street", eastSide: [336,338,340,342,344,346,348,350,352], westSide: [461,463,465,467,469,471,473] },
  { street: "King Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,14,16,18,20,22,24,26,28,30,32,34], westSide: [1,3,5,7,9,11,13,15,19,21,23,25,27,29,31,33,35] },
  { street: "King Street", from: "Jeffcott Street", to: "La Trobe Street", eastSide: [332,339,341,343,347,349,351,353,355,357,359,361,363,365,367,369,371,373,375,377,379] },
  { street: "King Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330], westSide: [295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335] },
  { street: "King Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [197,199,202,204,206,208,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242,244], westSide: [203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241] },
  { street: "King Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [248,250,256,258,260,262,264,266,268,270,272,274,276,278,280,282], westSide: [247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285,287] },
  { street: "King Street", from: "Rosslyn Street", to: "Stanley Street", eastSide: [372,501,503,505,507,509,511,513,515,517,519,521,523] },
  { street: "King Street", from: "Rosslyn Street", to: "Walsh Street", eastSide: [356,358,360,362,364,366,368], westSide: [475,477,479,481,483,485,487,489,491,493,495] },
  { street: "William Street", from: "A Beckett Street", to: "Franklin Street", westSide: [311,370,372,374,376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406,408,410,412] },
  { street: "William Street", from: "A Beckett Street", to: "La Trobe Street", eastSide: [324,326,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358,360,362,364,366], westSide: [309] },
  { street: "William Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [152,154,156,158,160,162,164,166,170,172,174,176,178,180,182,184,186], westSide: [147,149,151,153,155,157,159,161,163,165,167,169,171,173,175,177,179,181] },
  { street: "William Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148], westSide: [111,113,115,117,119,121,123,125,127,129,131,133,135,137] },
  { street: "William Street", from: "Capel Street", to: "Rosslyn Street", northSide: [428], southSide: [333,335,337,339,341,343,345,347] },
  { street: "William Street", from: "Collins Street", to: "Flinders Lane", eastSide: [42,44,46,48,50,52,54,56,58,60,62,64,66,68,70], westSide: [35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73] },
  { street: "William Street", from: "Collins Street", to: "Little Collins Street", eastSide: [74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110], westSide: [77,79,81,83,85,87,89,91,93,95,97,99,101,103,105,107] },
  { street: "William Street", from: "Dudley Street", to: "Walsh Street", eastSide: [313,315,317,319,321,323,325,327,329,331,420,422,424,426] },
  { street: "William Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33] },
  { street: "William Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318], westSide: [269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307] },
  { street: "William Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [183,185,188,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228], westSide: [189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229] },
  { street: "William Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274,276,278], westSide: [233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267] },
  { street: "Queen Street", from: "A Beckett Street", to: "Franklin Street", eastSide: [365,382,384,386,388,390,392,394,396,398,400,402,404,406], westSide: [367,369,371,373,375] },
  { street: "Queen Street", from: "A Beckett Street", to: "La Trobe Street", eastSide: [338,340,342,344,346,348,350,352,354,356,358,360,362,364,366,368,370,372,374,376], westSide: [321,323,325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355,357,359,361] },
  { street: "Queen Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [158,160,162,164,166,168,170,172,174,176,178,180,182,184,186,188,190,192], westSide: [155,157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195,197,199] },
  { street: "Queen Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156], westSide: [111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151] },
  { street: "Queen Street", from: "Collins Street", to: "Flinders Lane", eastSide: [40,42,44,46,48,50,52,56,58,60,62,64,66,68,70], westSide: [37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69] },
  { street: "Queen Street", from: "Collins Street", to: "Little Collins Street", eastSide: [74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110], westSide: [73,75,77,79,81,83,85,87,89,91,93,95,97,99,101,103,105] },
  { street: "Queen Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35] },
  { street: "Queen Street", from: "Franklin Street", to: "Therry Street", eastSide: [426,428,432,434,436,438,440,442,444,446,448,450,452,454,456,458,460], westSide: [411,413,415,417,419,421,422,423,424,425,427,429,431,433,435,437,439,441,443,445,447,449,451,453,455] },
  { street: "Queen Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322], westSide: [287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319] },
  { street: "Queen Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236], westSide: [203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243] },
  { street: "Queen Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [244,246,248,250,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282], westSide: [247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283] },
  { street: "Queen Street", from: "Therry Street", to: "Victoria Street", westSide: [457,459,461,462,463,464,465,466,467,468,469,471] },
  { street: "Elizabeth Street", from: "A Beckett Street", to: "Franklin Street", eastSide: [412,414,416,418,420,422,424,426,428,430,432,434,436,438,440,442,444,446,448,450], westSide: [413,415,417,419,421,423,425,427,429,431,433,435,437,439,441,443,445,447,449,451,453,455,457,459] },
  { street: "Elizabeth Street", from: "A Beckett Street", to: "Little La Trobe Street", eastSide: [410], westSide: [387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,409,411] },
  { street: "Elizabeth Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [161,163,165,168,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218], westSide: [173,175,177,179,181,183,185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,222,224] },
  { street: "Elizabeth Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,166], westSide: [133,135,137,139,141,143,145,147,149,151,153,155,157,159,385] },
  { street: "Elizabeth Street", from: "Collins Street", to: "Flinders Lane", eastSide: [36,37,39,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76], westSide: [43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83] },
  { street: "Elizabeth Street", from: "Collins Street", to: "Little Collins Street", eastSide: [80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118], westSide: [87,89,91,93,95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,124,125,129,131,335,336,337] },
  { street: "Elizabeth Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35] },
  { street: "Elizabeth Street", from: "Franklin Street", to: "Therry Street", eastSide: [452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488], westSide: [463,465,467,469,471,473,475,477,479,481,483,485,487,489] },
  { street: "Elizabeth Street", from: "La Trobe Street", to: "Little La Trobe Street", eastSide: [368,370,372,374,376,378,380,382,384], westSide: [365,367,369,371,373,375,377,379,381,383,385] },
  { street: "Elizabeth Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [318,320,322,324,326,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358,360,362,364], westSide: [315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355,357] },
  { street: "Elizabeth Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [226,228,230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260], westSide: [221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267,269] },
  { street: "Elizabeth Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [266,268,270,272,274,276,278,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310], westSide: [273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,316] },
  { street: "Swanston Street", from: "A Beckett Street", to: "Franklin Street", eastSide: [376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406,408,410,412,414,416,418], westSide: [427,429,431,433,435,437,439,441,443,445,447,449,451,453,455,457,459,461,463,465,467,469] },
  { street: "Swanston Street", from: "A Beckett Street", to: "Little La Trobe Street", eastSide: [352,354,356,358,360,362,364,366,368,370,372,374,401,403,405,407,409], westSide: [411,413,415,417,419,421,423] },
  { street: "Swanston Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [184,186,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228], westSide: [179,181,183,185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225] },
  { street: "Swanston Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [129,130,131,133,134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,166,168,172,174,176,178], westSide: [135,137,139,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173] },
  { street: "Swanston Street", from: "Collins Street", to: "Flinders Lane", eastSide: [44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86], westSide: [45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87,89] },
  { street: "Swanston Street", from: "Collins Street", to: "Little Collins Street", eastSide: [90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128], westSide: [91,93,95,97,99,101,103,105,107,109,111,113,115,117,119,120,121,123,125,127,129] },
  { street: "Swanston Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [24,26,28,30,32,34,36,38,40], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41] },
  { street: "Swanston Street", from: "Flinders Street", to: "Princes Bridge", eastSide: [2,4,6,8,10,12,14,16,18,20] },
  { street: "Swanston Street", from: "La Trobe Street", to: "Little La Trobe Street", eastSide: [330,332,334,336,338,340,342,344,346,348,350,391,393,395,397], westSide: [377,379,381,383,385,387,389] },
  { street: "Swanston Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [296,298,300,304,306,308,310,312,314,316,317,318,319,320,321,322,323,324,326,328], westSide: [329,331,333,335,337,339,341,343,345,347,349,351,353,355,357,359,361,363,365,367,369,371,373] },
  { street: "Swanston Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274], westSide: [231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,278,279] },
  { street: "Swanston Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,297,299,301,303,305,307,309,311,313,315] },
  { street: "Russell Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [148,151,152,153,154,156,158,159,160,161,162,163,164,166,168,170,172,174,176,178,180,182,184,186,188,190], westSide: [155,157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195,197] },
  { street: "Russell Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [114,116,118,120,122,124,126,128,130,132,134,138,140,142,144,146], westSide: [117,119,121,123,125,127,131,133,135,137,139,141,143,145,147,149] },
  { street: "Russell Street", from: "Collins Street", to: "Flinders Lane", eastSide: [42,44,46,48,50,52,54,56,58,60,62,64,68,70,72,74], westSide: [41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73] },
  { street: "Russell Street", from: "Collins Street", to: "Little Collins Street", eastSide: [78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112], westSide: [77,79,81,83,85,87,89,91,93,95,97,99,101,103,105,107,109,111,113,115] },
  { street: "Russell Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37] },
  { street: "Russell Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [277,279,281,284,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334], westSide: [285,287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321] },
  { street: "Russell Street", from: "La Trobe Street", to: "Mackenzie Street", eastSide: [336,338,340,342,344,346,348,350,352,354,356,358,360,362,364,366,368,370,372,374,376], westSide: [325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355,357,359,361,363,365,367,369,371,380,382] },
  { street: "Russell Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [158,160,162,196,198,200,202,204,206,208,210,212,214,216,218,220,222,226,228,230,232,234,236], westSide: [199,201,203,205,207,209,211,213,215,217,219,221,223,225,229,231,233,235,237,239,241] },
  { street: "Russell Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [238,240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282], westSide: [245,247,249,251,253,257,259,261,263,265,271,273,275] },
  { street: "Russell Street", from: "Mackenzie Street", to: "Victoria Street", westSide: [373,375,377,379,381,383,385] },
  { street: "Exhibition Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [156,158,160,162,166,168,170,172,174,176,178,180,182,184,186,188,190,192], westSide: [153,155,157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195] },
  { street: "Exhibition Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154], westSide: [113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149] },
  { street: "Exhibition Street", from: "Collins Street", to: "Flinders Lane", eastSide: [37,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72], westSide: [41,43,45,47,49,51,53,55,57,59,61,63,67,69,71,73] },
  { street: "Exhibition Street", from: "Collins Street", to: "Little Collins Street", eastSide: [76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110], westSide: [75,77,79,81,83,85,87,89,91,93,95,97,99,101,103,105,107,109] },
  { street: "Exhibition Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,30,32,34,36,38,40], westSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35] },
  { street: "Exhibition Street", from: "La Trobe Street", to: "Little Lonsdale Street", eastSide: [288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326], westSide: [287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329] },
  { street: "Exhibition Street", from: "La Trobe Street", to: "Victoria Street", westSide: [333,335,337,339,341,343,345,347,349,351,353,355] },
  { street: "Exhibition Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240], westSide: [199,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239] },
  { street: "Exhibition Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,284], westSide: [245,247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285] },
  { street: "Spring Street", from: "Bourke Street", to: "Little Bourke Street", eastSide: [143,145,147,149,151,152,154,155,156,157,158,159,160,161,163,165,167,169,171,173,175,177,179,181] },
  { street: "Spring Street", from: "Bourke Street", to: "Little Collins Street", eastSide: [105,107,108,109,110,111,112,113,114,115,116,117,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150], westSide: [119,121,123,125,127,129,131,133,135,137] },
  { street: "Spring Street", from: "Collins Street", to: "Flinders Lane", eastSide: [14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68], westSide: [35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65] },
  { street: "Spring Street", from: "Collins Street", to: "Little Collins Street", eastSide: [70,74,76,78,80,82,84,86,88,90,92,94,95,96,97,98,99,100,101,102,103,104,106], westSide: [69,71,73,75,77,79,81,85,87,89,91,93] },
  { street: "Spring Street", from: "Flinders Lane", to: "Flinders Street", eastSide: [13,15,17,19], westSide: [21,23,25,27,29,31] },
  { street: "Spring Street", from: "Little Bourke Street", to: "Lonsdale Street", eastSide: [210,212,214,216,218,220,222,224,226,228,230], westSide: [185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225,227] },
  { street: "Spring Street", from: "Little Lonsdale Street", to: "Lonsdale Street", eastSide: [250,252,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282], westSide: [235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267,269,271] },
  { street: "Spring Street", from: "Little Lonsdale Street", to: "Victoria Parade", eastSide: [284,286,288,290], westSide: [275,277,279,281,283,285,287,289,291,293,295,297,299,301,303] },
  { street: "La Trobe Street", from: "Adderley Street", to: "Spencer Street", northSide: [534,536,538,540], southSide: [593,595,597,599,601,603] },
  { street: "La Trobe Street", from: "Elizabeth Street", to: "Queen Street", northSide: [284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358,360,362,364,366], southSide: [271,273,275,279,281,283,285,287,289,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,343,345,347,349,351] },
  { street: "La Trobe Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,269,270,272,274,276,278,280], southSide: [183,185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,300] },
  { street: "La Trobe Street", from: "Exhibition Street", to: "Russell Street", northSide: [16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86], southSide: [105,107,109,111,113,115,117,119,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173,175,177] },
  { street: "La Trobe Street", from: "Exhibition Street", to: "Victoria Street", northSide: [2,4,6,8,10,12,14,95,97,99,101,103], southSide: [15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87,89,91] },
  { street: "La Trobe Street", from: "King Street", to: "Spencer Street", northSide: [444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,492,494,496,498,500,502,504,506,508,510,512,514,516,518,520,522,524,526,528,530], southSide: [513,515,517,519,521,523,525,527,529,531,533,535,537,539,541,543,545,547,549,551,553,555,557,559,561,563,565,567,569,571,573,575,577,581,583,585,587,589] },
  { street: "La Trobe Street", from: "King Street", to: "William Street", northSide: [440,442], southSide: [431,433,435,437,439,441,443,445,447,449,451,453,455,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503,507,509] },
  { street: "La Trobe Street", from: "Queen Street", to: "Wills Street", northSide: [404,406,408], southSide: [355,357,359,361,363,365,367,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,396,398,400,402] },
  { street: "La Trobe Street", from: "Russell Street", to: "Swanston Street", northSide: [100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,166,168,170,172,174,176,178,180,182,184,186], southSide: [179,181] },
  { street: "La Trobe Street", from: "William Street", to: "Wills Street", northSide: [410,412,414,416,418,420,424,426,428,430,432,434,436,438], southSide: [395,397,399,401,403,405,407,409,411,413,415,417,419,421,423,425,427,429] },
  { street: "Little Lonsdale Street", from: "Elizabeth Street", to: "Queen Street", northSide: [292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334,336,338,340,342,344], southSide: [375,377,379,381,383,385,387,389,391,393,395,397,399,401,405,407,409,411,413,415,417,419,421,423,425] },
  { street: "Little Lonsdale Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,262,266,268,270,274,333,335,337,339,341,343,347,349,351,353,355], southSide: [283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331] },
  { street: "Little Lonsdale Street", from: "Exhibition Street", to: "Russell Street", northSide: [96,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144], southSide: [97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143] },
  { street: "Little Lonsdale Street", from: "Exhibition Street", to: "Spring Street", northSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,89,90,91,92,93,94,95], southSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85] },
  { street: "Little Lonsdale Street", from: "King Street", to: "Spencer Street", northSide: [516,518,520,522,524,528,530,532,536,538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,576,578,580,582,584,586,588,590], southSide: [589,593,595,597,599,601,603,605,607,609,611,615,617,619,621,623,625,627,629,631,633,635,637,639,641,643,645,647,649,651,653,655,657,659,661,663] },
  { street: "Little Lonsdale Street", from: "King Street", to: "William Street", northSide: [438,440,442,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,492,494,496,498,500], southSide: [519,523,525,527,529,531,533,535,537,539,541,543,545,547,549,551,553,555,557,559,561,563,565,567,569,571,573,575] },
  { street: "Little Lonsdale Street", from: "Queen Street", to: "William Street", northSide: [370,372,374,376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406,408,410,412,414,416,418,420,422,424,426,430,432,434,436,507,511,513,515,517], southSide: [449,451,453,455,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503,505] },
  { street: "Little Lonsdale Street", from: "Russell Street", to: "Swanston Street", northSide: [172,174,176], southSide: [1,3,5,7,9,11,13,15,17,19,21,166,167,168,169,170,171,177,179,181,183,185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255] },
  { street: "Lonsdale Street", from: "Elizabeth Street", to: "Queen Street", northSide: [352,354,356,358,360,362,364,366,368,370,372,374,376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406], southSide: [347,349,351,353,355,357,359,361,363,365,367,369,371,373,375,377,379,381,383,385,387,389,391,393,395,399,401,403,405,407,409,411] },
  { street: "Lonsdale Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [260,262,264,268,270,272,274,276,278,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334,336,338,340,342,344], southSide: [259,261,263,265,269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345] },
  { street: "Lonsdale Street", from: "Exhibition Street", to: "Russell Street", northSide: [94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,166,168,170], southSide: [93,95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173] },
  { street: "Lonsdale Street", from: "Exhibition Street", to: "Spring Street", northSide: [4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88], southSide: [3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87] },
  { street: "Lonsdale Street", from: "King Street", to: "Spencer Street", northSide: [600,602,604,606,608,610,612,614,616,618,620,624,626,628,630,632,634,636,638,640,642,644,646,648,650,652,654,656,658], southSide: [595,597,599,601,603,605,607,609,611,613,617,619,621,623,625,627,629,631,633,635,637,639,641,643,645,647,649] },
  { street: "Lonsdale Street", from: "King Street", to: "William Street", northSide: [512,514,516,518,520,522,524,526,528,530,532,534,536,538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570], southSide: [509,511,513,515,517,519,521,523,525,527,529,531,533,535,537,539,541,543,545,547,549,551,553,555,557,561,563,565,567,569] },
  { street: "Lonsdale Street", from: "Queen Street", to: "William Street", northSide: [448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,492,494,496,498,500,502], southSide: [453,455,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503,505] },
  { street: "Lonsdale Street", from: "Russell Street", to: "Swanston Street", northSide: [172,174,176,178,180,182,184,186,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242], southSide: [177,179,181,183,185,187,189,191,193,195,197,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243] },
  { street: "Little Bourke Street", from: "Elizabeth Street", to: "Queen Street", northSide: [346,348,350,354,356,358,360,362,364,368,370,372,374,376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406,408], southSide: [349,351,353,355,357,359,361,363,365,367,369,371,373,375,377,379,383,385,387,393,395,397,401,403,405,407,409,411,413] },
  { street: "Little Bourke Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [264,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,326,328], southSide: [265,267,269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333] },
  { street: "Little Bourke Street", from: "Exhibition Street", to: "Russell Street", northSide: [76,78,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134], southSide: [72,73,74,75,77,79,83,85,87,89,91,93,95,97,99,101,103,105,107,109,113,115,117,119,121,123,125,127,131] },
  { street: "Little Bourke Street", from: "Exhibition Street", to: "Spring Street", northSide: [2,4,6,8,10,12,14,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,50,52,54,56], southSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55] },
  { street: "Little Bourke Street", from: "King Street", to: "Spencer Street", northSide: [590,592,594,596,598,600,602,604,606,610,612,614,616,620,622,624,626,628,630,632,634,636,638,640,642,644,646,648,650,652,654,656,658], southSide: [593,595,597,599,601,603,605,607,609,611,613,615,617,619,621,623,625,627,629,631,633,635,637,639,641,643,645,647,649,651,653,655,657,659] },
  { street: "Little Bourke Street", from: "King Street", to: "William Street", northSide: [504,506,508,510,512,514,516,518,520,522,524,526,528,530,532,534,536,538,540,542,544], southSide: [502,507,509,511,513,515,517,519,521,523,525,527,529,531,533,535,537,539,541] },
  { street: "Little Bourke Street", from: "Queen Street", to: "William Street", northSide: [440,442,444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,492,494,495,496,498], southSide: [449,451,453,455,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,497,499,501] },
  { street: "Little Bourke Street", from: "Russell Street", to: "Swanston Street", northSide: [182,184,186,188,190,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,242,244,246,248,250,252,254], southSide: [185,187,189,191,193,195,197,199,201,203,205,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251] },
  { street: "Bourke Street", from: "Elizabeth Street", to: "Queen Street", northSide: [376,378,380,382,384,386,388,390,392,394,396,398,400,402,404,406,408,410,412,414,416,418,420,422,424,426,428,430,432,434], southSide: [381,383,385,387,389,391,393,395,397,399,401,403,405,407,409,411,413,415,417,419,421,423,425,427,429,431,433,435] },
  { street: "Bourke Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [246,272,274,276,278,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334,336,338,340,342,344,346], southSide: [256,258,260,263,265,267,270,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345,347,349] },
  { street: "Bourke Street", from: "Exhibition Street", to: "Russell Street", northSide: [94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,166,168,170,172], southSide: [95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155,157,159,161,163,165,169,171,173] },
  { street: "Bourke Street", from: "Exhibition Street", to: "Spring Street", northSide: [20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,54,56,58,60,62,66,68,70,72], southSide: [23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,57,59,61,63,65,67,69] },
  { street: "Bourke Street", from: "King Street", to: "Spencer Street", northSide: [612,614,616,618,620,624,626,628,630,632,634,636,638,640,642,644,646,648,650,652,654,656,658,660,662,664,666,668,670,672,674,676,678,680,682,684,686,688,690,692,694,696], southSide: [607,609,611,613,615,617,619,621,623,625,627,629,631,633,635,637,639,641,643,645,647,649,651,653,655,657,659,661,663,665,667,669,671,673,675,677,679,681,683,685,687,689] },
  { street: "Bourke Street", from: "King Street", to: "William Street", northSide: [532,534,536,538,540,542,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,578,580,582,584,586,588,590,592,594,596,598,600,602,604,606], southSide: [531,533,535,537,539,541,543,545,547,549,551,553,555,561,563,565,567,569,571,573,575,577,579,581,583,585,589,591,593,595,597,599,601,603] },
  { street: "Bourke Street", from: "Queen Street", to: "William Street", northSide: [470,472,474,476,478,480,482,484,486,488,490,492,494,496,498,500,502,504,506,508,510,512,516,518,520,522,524,526,527,529,530], southSide: [471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503,505,507,509,511,513,515,517,519,521,523] },
  { street: "Bourke Street", from: "Russell Street", to: "Swanston Street", northSide: [186,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242,244,246,248,250,252,254], southSide: [185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,219,221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261] },
  { street: "Little Collins Street", from: "Elizabeth Street", to: "Queen Street", northSide: [370,372,374,376,378,380,382,384,386,388,390,392,394,396,400,402,404], southSide: [375,377,379,381,383,385,387,389,391,393,395,397,399,401,403,405,407,409] },
  { street: "Little Collins Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [256,258,260,262,264,266,268,270,272,274,276,278,280,282,284,286,288,290,292,294,296,298,300,302,304,306,308,310,312,314], southSide: [253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301,303,305,309,311,313,315] },
  { street: "Little Collins Street", from: "Exhibition Street", to: "Russell Street", northSide: [106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,160,162,167,169], southSide: [107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155,157,159,161] },
  { street: "Little Collins Street", from: "Exhibition Street", to: "Spring Street", northSide: [8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52], southSide: [5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55] },
  { street: "Little Collins Street", from: "King Street", to: "Spencer Street", northSide: [564,566,568,570,572,574,576,578,580,582,584,586,588,590,592,594,596,598,600,602,604,606,608,610,612,614,616,618,620,622,626,628,630,632,634,636], southSide: [565,567,569,571,573,575,577,579,581,583,585,587,589,591,593,595,597,599,601,603,605,607,609,611,613,615,617,619,621,623,625,627,629,631,633,635,637,639] },
  { street: "Little Collins Street", from: "King Street", to: "William Street", northSide: [494,496,498,500,502,504,506,508,510,512,514,516,520,522,524,526,528,530,532,534,536,538,540,542,544,546,548,550,552,554,556], southSide: [493,495,499,501,503,505,507,509,511,513,515,517,519,521,523,525,529,531,533,535,537,539,541,543,545,547,549,551,553,555,557] },
  { street: "Little Collins Street", from: "Queen Street", to: "William Street", northSide: [426,428,430,432,434,436,438,440,442,444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484], southSide: [427,429,431,433,435,437,439,441,443,445,447,449,451,453,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485] },
  { street: "Little Collins Street", from: "Russell Street", to: "Swanston Street", northSide: [178,180,182,184,186,188,190,192,194,196,198,200,202,204,206,208,210,212,218,220,222,224,226,228,230,232,234,236,238,240,242], southSide: [185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221,223,225,227,229,231,233,235,237,239] },
  { street: "Collins Street", from: "Batmans Hill Drive", to: "Spencer Street", northSide: [630,632,634,636,638,640,642,644,646,648,650,652,654,656,658,660,662,664,666,668,670,672,674,676,678,680,682,684,686,688,690], southSide: [631,633,635,637,639,641,643,645,647,649,651,653,655,657,659,661,663,665,667,669,671,673,675,677,679,681,683,685,687,689,691,693,695,697] },
  { street: "Collins Street", from: "Elizabeth Street", to: "Queen Street", northSide: [308,310,312,314,316,318,320,322,324,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358,360,362,364,366,368,370,372,374,376,378,380,382,384,386,388,390], southSide: [303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355,357,359,361,363,365,367,369,371,373,375,377,379,381,383] },
  { street: "Collins Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [220,222,224,226,228,230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,284,286,288,290,292,294,296,298,300,302,304], southSide: [221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285,287,289,291,293,295,297,299,301] },
  { street: "Collins Street", from: "Exhibition Street", to: "Russell Street", northSide: [72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132], southSide: [75,77,79,81,83,85,87,89,91,93,95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137] },
  { street: "Collins Street", from: "Exhibition Street", to: "Spring Street", northSide: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,68,69,70,71,73], southSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65] },
  { street: "Collins Street", from: "King Street", to: "Spencer Street", northSide: [538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,576,578,580,582,584,586,588,590,592,594,596,598,600,602,604,606,608,610,612,614,616,618,620,622,624,627,628,629], southSide: [539,541,543,545,547,549,551,553,555,557,559,561,563,565,567,569,571,573,575,577,579,581,583,585,587,589,591,593,595,597,599,601,603,605,607,609,611,613,615,617,619,621,623] },
  { street: "Collins Street", from: "King Street", to: "William Street", northSide: [462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,500,502,504,506,508,510,512,514,516,518,520,522,524,526,528,530,532,534], southSide: [463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503,505,507,509,511,513,515,517,519,521,523,525,527,529,531,533,535] },
  { street: "Collins Street", from: "Market Street", to: "Queen Street", northSide: [394,396,398,400,402,404,406,408,410,412,414,416,418,420,422,424,426], southSide: [389,391,393,395,397,399,401,403,405,407,409,411,413,415,417,419,421,423,425,427,429] },
  { street: "Collins Street", from: "Market Street", to: "William Street", northSide: [428,430,432,434,436,438,440,442,446,448,450,452,454,456,460], southSide: [431,433,435,437,439,441,443,445,447,449,451,453,455,459,461] },
  { street: "Collins Street", from: "Russell Street", to: "Swanston Street", northSide: [140,142,144,146,148,150,152,154,156,158,160,162,164,166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216], southSide: [134,136,139,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219] },
  { street: "Flinders Lane", from: "Elizabeth Street", to: "Queen Street", northSide: [308,310,312,314,316,318,320,322,324,326,328,332,334,336,338,340,342,344,346,348,350], southSide: [307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355] },
  { street: "Flinders Lane", from: "Elizabeth Street", to: "Swanston Street", northSide: [230,232,234,236,238,240,242,244,246,248,250,252,254,258,260,262,264,266,268,270,272,274,276,278,280,282,284,286,288,290,292,294], southSide: [235,237,239,241,243,247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285,287,289,291] },
  { street: "Flinders Lane", from: "Exhibition Street", to: "Russell Street", northSide: [96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142], southSide: [95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143] },
  { street: "Flinders Lane", from: "Exhibition Street", to: "Spring Street", northSide: [2,4,6,8,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,79,80,81,82,83], southSide: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77] },
  { street: "Flinders Lane", from: "King Street", to: "Spencer Street", northSide: [518,520,522,524,526,528,530,532,534,536,538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,576,578,580,582,584,586,588,590,592,594], southSide: [519,521,523,525,527,529,531,533,535,537,539,541,543,545,547,549,551,553,555,561,563,565,567,569,571,573,575,577,579,581,583,585] },
  { street: "Flinders Lane", from: "King Street", to: "William Street", northSide: [434,436,438,440,442,444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,492,494,498,500,502], southSide: [433,435,437,439,441,443,445,447,449,451,453,455,457,459,461,463,465,467,469,471,473,475,477,479,481,483,485,487,489,491,493,495,497,499,501,503] },
  { street: "Flinders Lane", from: "Market Street", to: "Queen Street", northSide: [366,368,370,372,374,376,378,380,382,384,386,388,390,392,394,396], southSide: [369,371,373,375,377,381,383,385,387,389,391,393,395] },
  { street: "Flinders Lane", from: "Market Street", to: "William Street", northSide: [397,398,399,400,401,402,404,406,408,410,412,414,416,418,420,422,424,426,430,432], southSide: [405,407,409,411,413,415,417,419,421,423,425,429,431] },
  { street: "Flinders Lane", from: "Russell Street", to: "Swanston Street", northSide: [182,184,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,225,226,227,228,229,231,233], southSide: [185,187,189,191,193,195,197,199,201,203,205,207,209,211,213,215,217,219,221] },
  { street: "Flinders Street", from: "Elizabeth Street", to: "Queen Street", northSide: [286,288,290,292,294,296,298,300,302,304,306,308,310,312,314,316,318,320,322,324,326,328,330,332,334,336,338,340,342,344,346,348,350,352,354,356,358], southSide: [287,289,291,293,295,297,299,301,303,305,307,309,311,313,315,317,319,321,323,325,327,329,331,333,335,337,339,341,343,345,347,349,351,353,355,357,359,361,363] },
  { street: "Flinders Street", from: "Elizabeth Street", to: "Swanston Street", northSide: [216,218,220,222,224,228,230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,262,264,266,268,270,272,274,276,278,280,282], southSide: [211,213,215,217,219,221,223,225,227,229,231,233,235,237,239,241,243,245,247,249,251,253,255,257,259,261,263,265,267,269,271,273,275,277,279,281,283,285] },
  { street: "Flinders Street", from: "Exhibition Street", to: "Russell Street", southSide: [21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,134,136,138,140,142,144,146,148] },
  { street: "Flinders Street", from: "Exhibition Street", to: "Spring Street", northSide: [14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56], southSide: [17] },
  { street: "Flinders Street", from: "King Street", to: "Spencer Street", northSide: [526,528,532,534,536,538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,575,576,577,578,579,580,581,583], southSide: [533,535,537,539,541,545,547,549,551,553,555,557,561,563,565,567,569,571,573] },
  { street: "Flinders Street", from: "King Street", to: "William Street", northSide: [426,428,430,432,434,436,438,440,442,444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474], southSide: [469,471,473,475,477,479,483,485,487,489] },
  { street: "Flinders Street", from: "Market Street", to: "Queen Street", northSide: [360,362,364,366,368,370,372,376,378,380,382,384,386,388,390,392], southSide: [365,367,369,371,373,375,377,379,381,383,385,387,389,391,393,395,397] },
  { street: "Flinders Street", from: "Market Street", to: "William Street", southSide: [394,396,398,400,402,404,406,408,410,412,414,416,418,420,422,424] },
  { street: "Flinders Street", from: "Russell Street", to: "Swanston Street", northSide: [150,152,154,156,158,160,162,164,166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,196,198,200,202,204,206], southSide: [133,135,137,139,141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173,175,177,179,181,183,185,187,189,191,193,195,197,199,201] },
  { street: "Flinders Street", from: "Spencer Street", to: "Wurundjeri Way", northSide: [600,602,604,606,608,610,612,614,616,618,620,622,624,626,628,630,632,634,636,638,640,642,644,646,648,650,652,654,656,658,660,662,664,666], southSide: [595,597,599,601,603,605,607,609,611,613,615,617,619,621,623,625,627,629,631,633,635,637,639,641,643,645,647,649,651,653,655,657,659,661,663,665,667,669,671,673,675,677,679,681,683,685,687,689,691,693,695,697,699,701] },
  { street: "Flinders Street", from: "Unknown", to: "Unknown", northSide: [399], southSide: [401] },
];

export interface StreetAddressOption {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

let _addressOptions: StreetAddressOption[] | null = null;

export function getAllAddressOptions(): StreetAddressOption[] {
  if (_addressOptions) return _addressOptions;
  const options: StreetAddressOption[] = [];

  for (const block of STREET_BLOCKS) {
    const ptFrom = findIntersectionPoint(block.street, block.from);
    const ptTo = findIntersectionPoint(block.street, block.to);
    if (!ptFrom || !ptTo) continue;

    const street = STREET_INTERSECTIONS.find(
      s => normalizeStreetName(s.name) === normalizeStreetName(block.street),
    );
    if (!street) continue;

    const sides: { key: 'northSide' | 'southSide' | 'eastSide' | 'westSide'; latOff: number; lngOff: number }[] =
      street.orientation === 'ew'
        ? [
            { key: 'northSide', latOff: SIDE_OFFSET_LAT, lngOff: 0 },
            { key: 'southSide', latOff: -SIDE_OFFSET_LAT, lngOff: 0 },
          ]
        : [
            { key: 'eastSide', latOff: 0, lngOff: SIDE_OFFSET_LNG },
            { key: 'westSide', latOff: 0, lngOff: -SIDE_OFFSET_LNG },
          ];

    for (const { key, latOff, lngOff } of sides) {
      const nums = block[key];
      if (!nums || nums.length === 0) continue;

      const lo = nums[0];
      const hi = nums[nums.length - 1];
      const range = hi - lo;

      for (const num of nums) {
        const t = range > 0 ? (num - lo) / range : 0.5;
        const frac = 0.08 + t * 0.84;
        const lat = ptFrom.lat + (ptTo.lat - ptFrom.lat) * frac + latOff;
        const lng = ptFrom.lng + (ptTo.lng - ptFrom.lng) * frac + lngOff;
        const label = `${num} ${block.street}`;
        options.push({
          id: `addr-${label}-${lat.toFixed(5)}`,
          label,
          lat,
          lng,
        });
      }
    }
  }

  _addressOptions = options;
  return options;
}
