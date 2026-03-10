import zones from '../../../../data/zones.json';

type Point = { latitude: number; longitude: number };

type Zone = (typeof zones)[number] & { bbox?: [number, number, number, number] };

const withBbox: Zone[] = zones.map((zone) => {
  const lats = zone.coordinates.map((c) => c.latitude);
  const lngs = zone.coordinates.map((c) => c.longitude);
  return { ...zone, bbox: [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)] };
});

export function detectZone(point: Point, previousZoneId?: string) {
  if (previousZoneId) {
    const prev = withBbox.find((z) => z.id === previousZoneId);
    if (prev && inside(point, prev)) return prev;
  }
  return withBbox.find((zone) => inside(point, zone));
}

function inside(point: Point, zone: Zone) {
  const [minLat, minLng, maxLat, maxLng] = zone.bbox!;
  if (point.latitude < minLat || point.latitude > maxLat || point.longitude < minLng || point.longitude > maxLng) return false;
  let odd = false;
  const pts = zone.coordinates;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (((pts[i].latitude > point.latitude) !== (pts[j].latitude > point.latitude)) &&
      point.longitude < ((pts[j].longitude - pts[i].longitude) * (point.latitude - pts[i].latitude)) / (pts[j].latitude - pts[i].latitude) + pts[i].longitude) odd = !odd;
  }
  return odd;
}
