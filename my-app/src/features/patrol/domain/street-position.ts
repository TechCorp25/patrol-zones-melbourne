import streets from '../../../../data/streets.json';

export function inferStreetPosition(latitude: number, longitude: number) {
  let best: any = null;
  for (const segment of streets) {
    const d = Math.hypot(segment.latitude - latitude, segment.longitude - longitude);
    if (!best || d < best.distance) best = { ...segment, distance: d };
  }
  return best;
}
