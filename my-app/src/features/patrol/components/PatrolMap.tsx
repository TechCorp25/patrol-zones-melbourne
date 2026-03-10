import MapView, { Marker } from 'react-native-maps';

export function PatrolMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return <MapView style={{ flex: 1 }} region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}><Marker coordinate={{ latitude, longitude }} /></MapView>;
}
