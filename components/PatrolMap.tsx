import React, { forwardRef, memo, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Platform } from "react-native";
import MapView, { Polygon, Marker, Circle, Region } from "react-native-maps";
import { PATROL_ZONES, MELBOURNE_CBD_REGION } from "@/constants/zones";
import { getAllStreetNumberMarkers } from "@/constants/streetNumbers";
import Colors from "@/constants/colors";

const ZOOM_THRESHOLD_NUMBERS = 0.004;

const allStreetNumbers = getAllStreetNumberMarkers();

export interface PatrolMapProps {
  location: { latitude: number; longitude: number; accuracy?: number | null } | null;
  heading: number;
  currentZoneId: string | null;
  assignedZoneId: string | null;
  destinations?: { id: string; latitude: number; longitude: number; title: string; subtitle?: string }[];
  onDestinationPress?: (destinationId: string) => void;
  mapType?: string;
  onMapReady?: () => void;
}

const LIGHT_BASED_MAP_TYPES = new Set(["standard", "satellite", "hybrid"]);

function saturateHexColor(hex: string, boost: number) {
  const normalizedHex = hex.replace("#", "");
  const r = parseInt(normalizedHex.slice(0, 2), 16) / 255;
  const g = parseInt(normalizedHex.slice(2, 4), 16) / 255;
  const b = parseInt(normalizedHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const boostedSaturation = Math.min(1, saturation + boost);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * boostedSaturation;
  const intermediate = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;

  let nextR = 0;
  let nextG = 0;
  let nextB = 0;

  if (hue < 60) {
    nextR = chroma;
    nextG = intermediate;
  } else if (hue < 120) {
    nextR = intermediate;
    nextG = chroma;
  } else if (hue < 180) {
    nextG = chroma;
    nextB = intermediate;
  } else if (hue < 240) {
    nextG = intermediate;
    nextB = chroma;
  } else if (hue < 300) {
    nextR = intermediate;
    nextB = chroma;
  } else {
    nextR = chroma;
    nextB = intermediate;
  }

  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(nextR)}${toHex(nextG)}${toHex(nextB)}`;
}

const ZonePolygons = memo(function ZonePolygons({
  currentZoneId,
  assignedZoneId,
  mapType,
}: {
  currentZoneId: string | null;
  assignedZoneId: string | null;
  mapType: string;
}) {
  const hasAssigned = !!assignedZoneId;
  const useHigherSaturation = LIGHT_BASED_MAP_TYPES.has(mapType);
  return (
    <>
      {PATROL_ZONES.map((zone) => {
        const isAssigned = assignedZoneId === zone.id;
        const isCurrent = currentZoneId === zone.id;
        const boundaryColor = useHigherSaturation ? saturateHexColor(zone.color, 0.28) : zone.color;
        let fillColor: string;
        let strokeWidth: number;
        let strokeColor: string;
        if (isAssigned) {
          const r = parseInt(boundaryColor.slice(1, 3), 16);
          const g = parseInt(boundaryColor.slice(3, 5), 16);
          const b = parseInt(boundaryColor.slice(5, 7), 16);
          const lr = Math.min(255, Math.round(r * 1.35));
          const lg = Math.min(255, Math.round(g * 1.35));
          const lb = Math.min(255, Math.round(b * 1.35));
          strokeColor = `rgb(${lr},${lg},${lb})`;
          fillColor = `${zone.color}59`;
          strokeWidth = 3;
        } else if (hasAssigned) {
          fillColor = `${zone.color}1A`;
          strokeWidth = 1.2;
          strokeColor = `${boundaryColor}99`;
        } else if (isCurrent) {
          fillColor = `${zone.color}46`;
          strokeWidth = 2;
          strokeColor = boundaryColor;
        } else {
          fillColor = zone.fillColor;
          strokeWidth = 1.2;
          strokeColor = boundaryColor;
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

const PatrolMap = forwardRef<MapView, PatrolMapProps>(function PatrolMapInner(
  { location, heading, currentZoneId, assignedZoneId, destinations = [], onDestinationPress, mapType, onMapReady },
  ref,
) {
    const resolvedMapType = (mapType ?? (Platform.OS === "ios" ? "mutedStandard" : "standard")) as any;
    const isLightMap = LIGHT_BASED_MAP_TYPES.has(resolvedMapType);
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
        <ZonePolygons currentZoneId={currentZoneId} assignedZoneId={assignedZoneId} mapType={resolvedMapType} />
        <StreetNumberMarkers visible={showNumbers} dark={isDarkStyle} />

        {destinations.map((destination) => (
          <Marker
            key={destination.id}
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            pinColor={Colors.dark.warning}
            title={destination.title}
            description={destination.subtitle}
            onPress={() => onDestinationPress?.(destination.id)}
          />
        ))}

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
  },
);

PatrolMap.displayName = "PatrolMap";

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
