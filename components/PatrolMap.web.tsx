import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export interface PatrolMapProps {
  location: { latitude: number; longitude: number } | null;
  heading: number;
  currentZoneId: string | null;
  assignedZoneId: string | null;
  mapType?: string;
  onMapReady?: () => void;
}

export default function PatrolMap(_props: PatrolMapProps) {
  return (
    <View style={styles.root}>
      <MaterialCommunityIcons
        name="map-marker-radius-outline"
        size={56}
        color={Colors.dark.textMuted}
      />
      <Text style={styles.text}>Map view available on mobile</Text>
      <Text style={styles.sub}>Scan the QR code with Expo Go</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background,
    gap: 12,
  },
  text: {
    fontFamily: "RobotoMono_500Medium",
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  sub: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 13,
  },
});
