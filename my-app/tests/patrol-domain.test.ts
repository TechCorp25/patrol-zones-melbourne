import { describe, expect, it } from 'vitest';
import { detectZone } from '../src/features/patrol/domain/zone-detection';

describe('detectZone', () => {
  it('finds zone for coordinate', () => {
    const zone = detectZone({ latitude: -37.8095, longitude: 144.9505 });
    expect(zone?.id).toBe('zone-1');
  });
});
