import { View, Text } from 'react-native';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { PatrolMap } from '../components/PatrolMap';
import { detectZone } from '../domain/zone-detection';

export function PatrolScreen() {
  const location = useLocationTracking();
  if (!location) return <View><Text>Loading location…</Text></View>;
  const zone = detectZone({ latitude: location.latitude, longitude: location.longitude });
  return (
    <View style={{ flex: 1 }}>
      <Text>Current zone: {zone?.name ?? 'None'}</Text>
      <PatrolMap latitude={location.latitude} longitude={location.longitude} />
    </View>
  );
}
