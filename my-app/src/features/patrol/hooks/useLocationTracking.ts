import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useLocationTracking() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    Location.requestForegroundPermissionsAsync().then((status) => {
      if (!status.granted) return;
      Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 }, (loc) => setLocation(loc.coords)).then((s) => { sub = s; });
    });
    return () => sub?.remove();
  }, []);
  return location;
}
