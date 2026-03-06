import React, { forwardRef, memo, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Platform } from "react-native";
import MapView, { Polygon, Marker, Circle, Region } from "react-native-maps";
import { PATROL_ZONES, MELBOURNE_CBD_REGION } from "@/constants/zones";
import { getAllStreetNumberMarkers } from "@/constants/streetNumbers";
import Colors from "@/constants/colors";

const ZOOM_THRESHOLD = 0.012;
const ZOOM_THRESHOLD_NUMBERS = 0.004;

const allStreetNumbers = getAllStreetNumberMarkers();

export interface PatrolMapProps {
  location: { latitude: number; longitude: number; accuracy?: number | null } | null;
  heading: number;
  currentZoneId: string | null;
  assignedZoneId: string | null;
  mapType?: string;
  onMapReady?: () => void;
}

const ZonePolygons = memo(function ZonePolygons({ currentZoneId, assignedZoneId }: { currentZoneId: string | null; assignedZoneId: string | null }) {
  const hasAssigned = !!assignedZoneId;
  return (
    <>
      {PATROL_ZONES.map((zone) => {
        const isAssigned = assignedZoneId === zone.id;
        const isCurrent = currentZoneId === zone.id;
        let fillColor: string;
        let strokeWidth: number;
        let strokeColor: string;
        if (isAssigned) {
          const r = parseInt(zone.color.slice(1, 3), 16);
          const g = parseInt(zone.color.slice(3, 5), 16);
          const b = parseInt(zone.color.slice(5, 7), 16);
          const lr = Math.min(255, Math.round(r * 1.35));
          const lg = Math.min(255, Math.round(g * 1.35));
          const lb = Math.min(255, Math.round(b * 1.35));
          strokeColor = `rgb(${lr},${lg},${lb})`;
          fillColor = `${zone.color}59`;
          strokeWidth = 3;
        } else if (hasAssigned) {
          fillColor = `${zone.color}1A`;
          strokeWidth = 1.2;
          strokeColor = `${zone.color}99`;
        } else if (isCurrent) {
          fillColor = `${zone.color}46`;
          strokeWidth = 2;
          strokeColor = zone.color;
        } else {
          fillColor = zone.fillColor;
          strokeWidth = 1.2;
          strokeColor = zone.color;
        }
        return (
          <Polygon
            key={zone.id}
            coordinates={zone.coordinates}
            strokeColor={strokeColor}
            fillColor={fillColor}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </>
  );
});

const StreetNumberMarkers = memo(function StreetNumberMarkers({
  visible,
  dark,
}: {
  visible: boolean;
  dark: boolean;
}) {
  if (!visible) return null;
  const textStyle = dark ? styles.addressTextDark : styles.addressTextLight;
  return (
    <>
      {allStreetNumbers.map((m, i) => (
        <Marker
          key={`sn-${i}`}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
        >
          <Text style={textStyle}>{m.label}</Text>
        </Marker>
      ))}
    </>
  );
});

const PatrolMap = forwardRef<MapView, PatrolMapProps>(
  ({ location, heading, currentZoneId, assignedZoneId, mapType, onMapReady }, ref) => {
    const resolvedMapType = (mapType ?? (Platform.OS === "ios" ? "mutedStandard" : "standard")) as any;
    const isLightMap = resolvedMapType === 'standard';
    const isDarkStyle = !isLightMap;
    const roundedHeading = useMemo(() => Math.round(heading), [heading]);
    const [showNumbers, setShowNumbers] = useState(false);

    const handleRegionChange = useCallback((region: Region) => {
      setShowNumbers(region.latitudeDelta < ZOOM_THRESHOLD_NUMBERS);
    }, []);

    return (
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={MELBOURNE_CBD_REGION}
        mapType={resolvedMapType}
        userInterfaceStyle={isDarkStyle ? "dark" : "light"}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={onMapReady}
        onRegionChangeComplete={handleRegionChange}
      >
        <ZonePolygons currentZoneId={currentZoneId} assignedZoneId={assignedZoneId} />
        <StreetNumberMarkers visible={showNumbers} dark={isDarkStyle} />

        {location && (
          <>
            <Circle
              center={{ latitude: location.latitude, longitude: location.longitude }}
              radius={location.accuracy ? Math.min(location.accuracy, 60) : 20}
              fillColor="rgba(14,165,233,0.12)"
              strokeColor="rgba(14,165,233,0.30)"
              strokeWidth={1}
            />
            <Marker
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={roundedHeading}
            >
              <View style={styles.userDot}>
                <View style={styles.userDotInner} />
              </View>
            </Marker>
          </>
        )}
      </MapView>
    );
  }
);

export default memo(PatrolMap);

const styles = StyleSheet.create({
  userDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.tint,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  userDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  addressTextDark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  addressTextLight: {
    color: "#1A1A2E",
    fontSize: 13,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    textShadowColor: "rgba(255,255,255,0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
