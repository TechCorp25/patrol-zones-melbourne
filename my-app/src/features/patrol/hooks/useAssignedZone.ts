import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'assigned_zone';
export function useAssignedZone() {
  const [assignedZoneId, setAssignedZoneId] = useState<string | null>(null);
  useEffect(() => { AsyncStorage.getItem(KEY).then(setAssignedZoneId); }, []);
  const assign = async (zoneId: string) => { setAssignedZoneId(zoneId); await AsyncStorage.setItem(KEY, zoneId); };
  return { assignedZoneId, assign };
}
