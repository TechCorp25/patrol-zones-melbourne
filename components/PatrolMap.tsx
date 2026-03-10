import React, { forwardRef, memo, useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from "react-native";
import type { Region } from "react-native-maps";
import { PATROL_ZONES, MELBOURNE_CBD_REGION } from "@/constants/zones";
import { getAllStreetNumberMarkers } from "@/constants/streetNumbers";
import Colors from "@/constants/colors";

const mapsModule: typeof import("react-native-maps") | null = (() => {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-maps") as typeof import("react-native-maps");
  } catch {
    return null;
  }
})();

const MapView = mapsModule?.default;
const Polygon = mapsModule?.Polygon;
const Marker = mapsModule?.Marker;
const Circle = mapsModule?.Circle;
const Polyline = mapsModule?.Polyline;

const ZOOM_THRESHOLD_NUMBERS = 0.004;

const allStreetNumbers = getAllStreetNumberMarkers();

export interface PatrolMapProps {
  location: { latitude: number; longitude: number; accuracy?: number | null } | null;
  heading: number;
  currentZoneId: string | null;
  assignedZoneId: string | null;
  destinations?: { id: string; latitude: number; longitude: number; title: string; subtitle?: string }[];
  onDestinationPress?: (destinationId: string) => void;
  onDestinationLongPress?: (destinationId: string) => void;
  previewPin?: { latitude: number; longitude: number; label: string } | null;
  mapType?: string;
  onMapReady?: () => void;
  routePolyline?: { latitude: number; longitude: number }[];
  routeMode?: "foot" | "vehicle";
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

const DestinationPin = memo(function DestinationPin({ preview = false }: { preview?: boolean }) {
  return (
    <View style={styles.pinContainer}>
      <View style={[styles.pinHead, preview && styles.pinHeadPreview]} />
      <View style={[styles.pinNeedle, preview && styles.pinNeedlePreview]} />
    </View>
  );
});

/**
 * Wraps a single destination Marker and manages its own tracksViewChanges lifecycle.
 *
 * Starts with tracksViewChanges=true so the native layer has time to fully render
 * the custom View into a stable bitmap, then locks it to false after 500 ms to
 * prevent unnecessary re-renders on pan/zoom.  Each marker is independent, which
 * eliminates the multi-marker race condition where simultaneous snapshots would
 * capture blank views.
 */
const DestinationMarker = memo(function DestinationMarker({
  destination,
  onPress,
  onLongPress,
}: {
  destination: { id: string; latitude: number; longitude: number; title: string; subtitle?: string };
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Marker
      identifier={destination.id}
      coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      title={destination.title}
      description={destination.subtitle}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
      onCalloutPress={onLongPress}
    >
      <DestinationPin />
    </Marker>
  );
});

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

const PatrolMap = forwardRef<any, PatrolMapProps>(function PatrolMapInner(
  { location, heading, currentZoneId, assignedZoneId, destinations = [], onDestinationPress, onDestinationLongPress, previewPin, mapType, onMapReady, routePolyline, routeMode },
  ref,
) {
    const resolvedMapType = (mapType ?? (Platform.OS === "ios" ? "mutedStandard" : "standard")) as any;
    const isLightMap = LIGHT_BASED_MAP_TYPES.has(resolvedMapType);
    const isDarkStyle = !isLightMap;
    const roundedHeading = useMemo(() => Math.round(heading), [heading]);
    const [showNumbers, setShowNumbers] = useState(false);

    const handleRegionChange = useCallback((region: Region) => {
      const shouldShowNumbers = region.latitudeDelta < ZOOM_THRESHOLD_NUMBERS;
      setShowNumbers((previousValue) =>
        previousValue === shouldShowNumbers ? previousValue : shouldShowNumbers,
      );
    }, []);

    if (!MapView || !Polygon || !Marker || !Circle || !Polyline) {
      return (
        <View style={styles.fallbackRoot}>
          <Text style={styles.fallbackTitle}>Map unavailable in Expo Go</Text>
          <Text style={styles.fallbackText}>
            This project currently uses react-native-maps, which requires a development build.
          </Text>
        </View>
      );
    }

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

        {routePolyline && routePolyline.length > 1 && (
          <>
            {/* Shadow layer for contrast on all map types */}
            <Polyline
              coordinates={routePolyline}
              strokeColor="rgba(0,0,0,0.35)"
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routePolyline}
              strokeColor={routeMode === "foot" ? Colors.dark.success : Colors.dark.tint}
              strokeWidth={4}
              lineDashPattern={routeMode === "foot" ? [8, 6] : undefined}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {destinations.map((destination) => (
          <DestinationMarker
            key={destination.id}
            destination={destination}
            onPress={() => onDestinationPress?.(destination.id)}
            onLongPress={() => onDestinationLongPress?.(destination.id)}
          />
        ))}

        {previewPin && (
          <Marker
            key="preview-pin"
            identifier="preview-pin"
            coordinate={{ latitude: previewPin.latitude, longitude: previewPin.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            title={previewPin.label}
            description="Code 21 address"
            tracksViewChanges
          >
            <DestinationPin preview />
          </Marker>
        )}

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
              tracksViewChanges={false}
            >
              <View style={styles.arrowContainer}>
                <View style={styles.arrowOutline} />
                <View style={styles.arrowFill} />
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
  fallbackRoot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
    gap: 8,
  },
  fallbackTitle: {
    color: Colors.dark.warning,
    fontFamily: "RobotoMono_700Bold",
    fontSize: 14,
    textAlign: "center",
  },
  fallbackText: {
    color: Colors.dark.textSecondary,
    fontFamily: "RobotoMono_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowOutline: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#0A1628",
  },
  arrowFill: {
    position: "absolute",
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF6B00",
  },
  pinContainer: {
    alignItems: "center",
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.danger,
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
    elevation: 8,
  },
  pinHeadPreview: {
    backgroundColor: Colors.dark.tint,
    borderColor: "#ffffff",
  },
  pinNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.dark.danger,
    marginTop: -1,
  },
  pinNeedlePreview: {
    borderTopColor: Colors.dark.tint,
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
