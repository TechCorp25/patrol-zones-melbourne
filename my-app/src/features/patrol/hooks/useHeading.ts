import { useMemo } from 'react';

export function useHeading(rawHeading: number | null) {
  return useMemo(() => {
    if (rawHeading == null) return 'N';
    if (rawHeading < 45 || rawHeading >= 315) return 'N';
    if (rawHeading < 135) return 'E';
    if (rawHeading < 225) return 'S';
    return 'W';
  }, [rawHeading]);
}
