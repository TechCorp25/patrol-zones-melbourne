import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Linking,
  PanResponder,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import {
  PATROL_ZONES,
  getZoneForLocation,
  getHeadingLabel,
  type PatrolZone,
} from "@/constants/zones";
import Compass from "@/components/Compass";
import PatrolMap from "@/components/PatrolMap";
import ZoneInfoModal from "@/components/ZoneInfoModal";
import { getCurrentStreetPosition, type StreetPosition } from "@/constants/streets";
import { getParkingZones } from "@/constants/parkingZones";
import {
  getCode21Types,
  getVehicleColours,
  getVehicleMakes,
  optimiseCode21Route,
  searchAddressOptions,
  searchFilterOptions,
  type Code21Request,
  type Code21Type,
} from "@/constants/code21";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PANEL_MIN = 196;
const PANEL_MAX = SCREEN_HEIGHT * 0.55;
const SWIPE_UP_THRESHOLD = 40;
const PULL_TAB_HEIGHT = 44;
const ASSIGNED_ZONE_KEY = "patrol_assigned_zone";
const DEFAULT_OFFICER_NUMBER = "PZ-001";
const IS_WEB = Platform.OS === "web";
const HEADING_THRESHOLD = 2;
const HEADING_UPDATE_INTERVAL = 150;
const SPRING_CONFIG = { damping: 20, stiffness: 180, overshootClamping: true };

export default function PatrolMapScreen() {
  const insets = useSafeAreaInsets();

  // Permission hook — always call, works on both native and web
  const [permission, requestPermission] = Location.useForegroundPermissions();

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [heading, setHeading] = useState(0);
  const [currentZone, setCurrentZone] = useState<PatrolZone | null>(null);
  const [assignedZone, setAssignedZone] = useState<PatrolZone | null>(null);
  const [streetPosition, setStreetPosition] = useState<StreetPosition | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [zoneInfoVisible, setZoneInfoVisible] = useState(false);
  const [mapTypeIndex, setMapTypeIndex] = useState(0);
  const [code21ModalVisible, setCode21ModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{ label: string; latitude: number; longitude: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState(() => searchAddressOptions(""));
  const [code21Requests, setCode21Requests] = useState<Code21Request[]>([]);
  const [officerNumber, setOfficerNumber] = useState(DEFAULT_OFFICER_NUMBER);
  const [serviceRequestNumber, setServiceRequestNumber] = useState("");
  const [requestTime, setRequestTime] = useState(new Date().toISOString().slice(0, 16));
  const [offenceDate, setOffenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [offenceTime, setOffenceTime] = useState(new Date().toISOString().slice(11, 16));
  const [code21Type, setCode21Type] = useState<Code21Type>("621 - Stopped in no parking");
  const [description, setDescription] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [vehicleMakeQuery, setVehicleMakeQuery] = useState("");
  const [vehicleColourQuery, setVehicleColourQuery] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [vehicleRego, setVehicleRego] = useState("");
  const [travelMode, setTravelMode] = useState<"foot" | "vehicle">("foot");
  const MAP_TYPES = Platform.OS === 'ios'
    ? ['mutedStandard', 'standard', 'satellite', 'hybrid'] as const
    : ['standard', 'satellite', 'hybrid'] as const;
  const MAP_TYPE_LABELS = Platform.OS === 'ios'
    ? ['Dark', 'Light', 'Satellite', 'Hybrid']
    : ['Standard', 'Satellite', 'Hybrid'];
  const MAP_TYPE_ICONS: ('map-outline' | 'sunny-outline' | 'earth-outline' | 'layers-outline')[] = Platform.OS === 'ios'
    ? ['map-outline', 'sunny-outline', 'earth-outline', 'layers-outline']
    : ['map-outline', 'earth-outline', 'layers-outline'];

  const mapRef = useRef<any>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const headingSub = useRef<{ remove: () => void } | null>(null);
  const lastHeadingRef = useRef(0);
  const lastHeadingTimeRef = useRef(0);

  const panelHeight = useSharedValue(PANEL_MIN);
  const safeBottom = insets.bottom > 0 ? insets.bottom : 8;
  const minOverlayBottom = safeBottom + PULL_TAB_HEIGHT + 12;

  const panelStyle = useAnimatedStyle(() => ({
    height: Math.max(panelHeight.value, 0),
    opacity: interpolate(
      panelHeight.value,
      [0, PANEL_MIN * 0.15, PANEL_MIN * 0.4],
      [0, 0.3, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const overlayBtnStyle = useAnimatedStyle(() => ({
    bottom: Math.max(panelHeight.value + safeBottom + 16, minOverlayBottom),
  }));

  // Load saved assigned zone
  useEffect(() => {
    if (IS_WEB) return;
    AsyncStorage.getItem(ASSIGNED_ZONE_KEY).then((id) => {
      if (id) {
        const zone = PATROL_ZONES.find((z) => z.id === id);
        if (zone) setAssignedZone(zone);
      }
    });
  }, []);

  // Start watching location + heading once permission is granted
  useEffect(() => {
    if (IS_WEB || !permission?.granted) return;

    let cancelled = false;

    (async () => {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 3 },
        (loc) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = loc.coords;
          setLocation({ latitude, longitude, accuracy: accuracy ?? null });
          setCurrentZone(getZoneForLocation(latitude, longitude));
          setStreetPosition(getCurrentStreetPosition(latitude, longitude, accuracy));
        }
      );

      try {
        headingSub.current = await Location.watchHeadingAsync((h) => {
          if (cancelled) return;
          const now = Date.now();
          const diff = Math.abs(h.magHeading - lastHeadingRef.current);
          const angleDiff = diff > 180 ? 360 - diff : diff;
          if (angleDiff >= HEADING_THRESHOLD && (now - lastHeadingTimeRef.current) >= HEADING_UPDATE_INTERVAL) {
            lastHeadingRef.current = h.magHeading;
            lastHeadingTimeRef.current = now;
            setHeading(h.magHeading);
          }
        });
      } catch {
        // Heading not available on all devices or simulators
      }
    })();

    return () => {
      cancelled = true;
      locationSub.current?.remove();
      headingSub.current?.remove();
    };
  }, [permission?.granted]);

  const handleRequestPermission = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestPermission();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      Linking.openSettings();
    } catch {
      // Settings not available
    }
  }, []);

  const animatingRef = useRef(false);
  const minimizeTokenRef = useRef(0);

  const clearAnimating = useCallback(() => {
    animatingRef.current = false;
  }, []);

  const togglePanel = useCallback(() => {
    if (panelMinimized || animatingRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (panelExpanded) {
      panelHeight.value = withSpring(PANEL_MIN, SPRING_CONFIG);
      setPanelExpanded(false);
    } else {
      panelHeight.value = withSpring(PANEL_MAX, SPRING_CONFIG);
      setPanelExpanded(true);
    }
  }, [panelExpanded, panelMinimized, panelHeight]);

  const onMinimizeComplete = useCallback((token: number) => {
    if (token === minimizeTokenRef.current) {
      setPanelMinimized(true);
    }
    animatingRef.current = false;
  }, []);

  const minimizePanel = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    const token = ++minimizeTokenRef.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (panelExpanded) setPanelExpanded(false);
    panelHeight.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(onMinimizeComplete)(token);
      } else {
        runOnJS(clearAnimating)();
      }
    });
  }, [panelExpanded, onMinimizeComplete, clearAnimating, panelHeight]);

  const restorePanel = useCallback(() => {
    minimizeTokenRef.current++;
    animatingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPanelMinimized(false);
    panelHeight.value = withTiming(PANEL_MIN, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    }, () => {
      runOnJS(clearAnimating)();
    });
  }, [clearAnimating, panelHeight]);

  const pullTabPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 5,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -SWIPE_UP_THRESHOLD) {
            restorePanel();
          }
        },
      }),
    [restorePanel],
  );

  const assignZone = useCallback(async (zone: PatrolZone) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAssignedZone(zone);
    await AsyncStorage.setItem(ASSIGNED_ZONE_KEY, zone.id);
    panelHeight.value = withSpring(PANEL_MIN, SPRING_CONFIG);
    setPanelExpanded(false);
  }, [panelHeight]);

  const centerOnUser = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        600
      );
    }
  }, [location]);

  const headingLabel = useMemo(() => getHeadingLabel(heading), [heading]);
  const parkingZones = useMemo(() => {
    if (!streetPosition) return [];
    return getParkingZones(streetPosition.street, streetPosition.from, streetPosition.to);
  }, [streetPosition]);

  const routeOrderedRequests = useMemo(() => {
    if (!location || code21Requests.length === 0) return code21Requests;
    return optimiseCode21Route(location, code21Requests);
  }, [location, code21Requests]);
  const filteredVehicleMakes = useMemo(
    () => searchFilterOptions(vehicleMakeQuery, getVehicleMakes(), 6),
    [vehicleMakeQuery],
  );
  const filteredVehicleColours = useMemo(
    () => searchFilterOptions(vehicleColourQuery, getVehicleColours(), 6),
    [vehicleColourQuery],
  );

  const formattedDocument = useMemo(() => {
    const fields = [
      `Officer Number: ${officerNumber || "N/A"}`,
      `Service Request #: ${serviceRequestNumber || "N/A"}`,
      `Date: ${offenceDate || "N/A"}`,
      `Time: ${offenceTime || "N/A"}`,
      `Offence Type: ${code21Type || "N/A"}`,
      `Address: ${selectedAddress?.label ?? "N/A"}`,
      `Dispatch Notes: ${dispatchNotes || "N/A"}`,
      `Vehicle Make: ${vehicleMake || "N/A"}`,
      `Vehicle Colour: ${vehicleColour || "N/A"}`,
      `Vehicle Rego: ${vehicleRego || "N/A"}`,
      `Attendance Notes: ${attendanceNotes || "N/A"}`,
      `PIN #: ${pinValue || "N/A"}`,
    ];

    return fields.join("\n");
  }, [attendanceNotes, code21Type, dispatchNotes, offenceDate, offenceTime, officerNumber, pinValue, selectedAddress?.label, serviceRequestNumber, vehicleColour, vehicleMake, vehicleRego]);

  const submitCode21 = useCallback(async () => {
    if (!selectedAddress) return;

    const payload = {
      officerNumber: officerNumber || DEFAULT_OFFICER_NUMBER,
      serviceRequestNumber,
      addressLabel: selectedAddress.label,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
      requestTime: new Date(requestTime).toISOString(),
      offenceDate,
      offenceTime,
      offenceType: code21Type,
      code21Type,
      dispatchNotes,
      attendanceNotes,
      pin: pinValue,
      vehicleMake,
      vehicleColour,
      vehicleRego: vehicleRego.toUpperCase(),
      travelMode,
      description,
      formattedDocument,
    };

    try {
      const response = await fetch("/api/code21", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.ok && body.request) {
        setCode21Requests((prev) => [...prev, body.request]);
      }
    } catch {
      // keep UI responsive if API unavailable
    }

    setCode21ModalVisible(false);
    setDescription("");
    setDispatchNotes("");
    setAttendanceNotes("");
    setPinValue("");
    setServiceRequestNumber("");
    setVehicleMake("");
    setVehicleColour("");
    setVehicleRego("");
    setVehicleMakeQuery("");
    setVehicleColourQuery("");
  }, [attendanceNotes, code21Type, description, dispatchNotes, formattedDocument, offenceDate, offenceTime, officerNumber, pinValue, requestTime, selectedAddress, serviceRequestNumber, travelMode, vehicleColour, vehicleMake, vehicleRego]);

  const openCode21Modal = useCallback(() => {
    setRequestTime(new Date().toISOString().slice(0, 16));
    setOffenceDate(new Date().toISOString().slice(0, 10));
    setOffenceTime(new Date().toISOString().slice(11, 16));
    setCode21ModalVisible(true);
  }, []);

  const loadCode21Requests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ officerNumber: officerNumber || DEFAULT_OFFICER_NUMBER });
      const response = await fetch(`/api/code21?${params.toString()}`);
      const body = await response.json();
      if (response.ok && Array.isArray(body.requests)) {
        setCode21Requests(body.requests);
      }
    } catch {
      // ignore offline bootstrap errors
    }
  }, [officerNumber]);

  useEffect(() => {
    loadCode21Requests();
  }, [loadCode21Requests]);

  // ── Web fallback ──────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={[styles.centered, { paddingTop: 67, paddingBottom: 34 }]}>
        <MaterialCommunityIcons name="cellphone" size={56} color={Colors.dark.tint} />
        <Text style={styles.permTitle}>Mobile App Required</Text>
        <Text style={styles.permSubtitle}>
          Scan the QR code with Expo Go on iOS or Android to use Patrol Zones.
        </Text>
      </View>
    );
  }

  // ── Permission not yet determined (first launch) ──────────────────
  if (!permission) {
    return (
      <View style={[styles.permScreen, { paddingTop: insets.top + 32 }]}>
        <View style={styles.permContent}>
          <View style={styles.permIconRing}>
            <Ionicons name="location" size={40} color={Colors.dark.tint} />
          </View>
          <Text style={styles.permTitle}>Location Access</Text>
          <Text style={styles.permSubtitle}>
            Patrol Zones uses your live location to show your position on the
            Melbourne CBD map and automatically detect which patrol zone you are in.
          </Text>
          <ActivityIndicator
            size="small"
            color={Colors.dark.tint}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
    );
  }

  // ── Permission NOT granted — show request or settings ─────────────
  if (!permission.granted) {
    const canRetry = permission.canAskAgain;
    return (
      <View
        style={[
          styles.permScreen,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.permContent}>
          <View style={[styles.permIconRing, { borderColor: canRetry ? Colors.dark.tint : Colors.dark.warning }]}>
            <Ionicons
              name={canRetry ? "location-outline" : "location-sharp"}
              size={40}
              color={canRetry ? Colors.dark.tint : Colors.dark.warning}
            />
          </View>

          <Text style={styles.permTitle}>Location Required</Text>
          <Text style={styles.permSubtitle}>
            {canRetry
              ? "Patrol Zones needs access to your location to show your position on the patrol map and detect your zone automatically."
              : "Location access was denied. To use Patrol Zones, please enable location access in your device Settings for Expo Go."}
          </Text>

          {canRetry ? (
            <TouchableOpacity
              style={styles.permBtn}
              onPress={handleRequestPermission}
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={styles.permBtnText}>Allow Location Access</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: Colors.dark.warning }]}
              onPress={handleOpenSettings}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={styles.permBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.permHint}>
            {canRetry
              ? "Tap above to see the system permission prompt"
              : "Enable Location for Expo Go, then return to this app"}
          </Text>
        </View>
      </View>
    );
  }

  // ── Permission GRANTED — show map ─────────────────────────────────
  const isInAssigned =
    !!currentZone && !!assignedZone && currentZone.id === assignedZone.id;
  const isOutsideAssigned =
    !!assignedZone && !!currentZone && currentZone.id !== assignedZone.id;

  return (
    <View style={styles.root}>
      {/* ── Map ── */}
      <PatrolMap
        ref={mapRef}
        location={location}
        heading={heading}
        currentZoneId={currentZone?.id ?? null}
        assignedZoneId={assignedZone?.id ?? null}
        destinations={code21Requests.map((request) => ({
          id: request.id,
          latitude: request.latitude,
          longitude: request.longitude,
          title: request.addressLabel,
          subtitle: request.code21Type,
        }))}
        onDestinationPress={(destinationId) => {
          const request = code21Requests.find((entry) => entry.id === destinationId);
          if (request) {
            setSelectedAddress({
              label: request.addressLabel,
              latitude: request.latitude,
              longitude: request.longitude,
            });
            setOfficerNumber(request.officerNumber || DEFAULT_OFFICER_NUMBER);
            setServiceRequestNumber(request.serviceRequestNumber || "");
            setRequestTime(request.requestTime.slice(0, 16));
            setOffenceDate(request.offenceDate || request.requestTime.slice(0, 10));
            setOffenceTime(request.offenceTime || request.requestTime.slice(11, 16));
            setCode21Type(request.offenceType || request.code21Type);
            setDispatchNotes(request.dispatchNotes);
            setAttendanceNotes(request.attendanceNotes);
            setPinValue(request.pin);
            setVehicleMake(request.vehicleMake || "");
            setVehicleColour(request.vehicleColour || "");
            setVehicleRego(request.vehicleRego || "");
            setVehicleMakeQuery(request.vehicleMake || "");
            setVehicleColourQuery(request.vehicleColour || "");
            setDescription(request.description);
            setTravelMode(request.travelMode);
            setCode21ModalVisible(true);
          }
        }}
        mapType={MAP_TYPES[mapTypeIndex] as any}
        onMapReady={() => {}}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="shield-outline"
              size={16}
              color={Colors.dark.tint}
            />
            <Text style={styles.appTitle}>PATROL ZONES</Text>
          </View>
          <View style={styles.gpsChip}>
            <View
              style={[
                styles.gpsDot,
                { backgroundColor: location ? Colors.dark.success : Colors.dark.warning },
              ]}
            />
            <Text style={styles.gpsText}>
              {location
                ? `±${location.accuracy ? Math.round(location.accuracy) : "?"}m`
                : "Acquiring GPS..."}
            </Text>
          </View>
        </View>

        <View style={styles.zoneStatusRow}>
          <View style={styles.zoneChip}>
            <Text style={styles.zoneChipLabel}>ASSIGNED</Text>
            <Text
              style={[
                styles.zoneChipValue,
                { color: assignedZone?.color ?? Colors.dark.textMuted },
              ]}
              numberOfLines={1}
            >
              {assignedZone?.name ?? "Not Set"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
          <View style={styles.zoneChip}>
            <Text style={styles.zoneChipLabel}>CURRENT</Text>
            <Text
              style={[
                styles.zoneChipValue,
                { color: currentZone?.color ?? Colors.dark.textMuted },
              ]}
              numberOfLines={1}
            >
              {currentZone?.name ?? "Outside Zones"}
            </Text>
          </View>
        </View>

        {isOutsideAssigned && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={13} color={Colors.dark.warning} />
            <Text style={styles.alertText}>
              Outside assigned zone — now in {currentZone?.name}
            </Text>
          </View>
        )}
        {isInAssigned && (
          <View style={[styles.alertBanner, styles.alertSuccess]}>
            <Ionicons name="checkmark-circle" size={13} color={Colors.dark.success} />
            <Text style={[styles.alertText, { color: Colors.dark.success }]}>
              In assigned zone
            </Text>
          </View>
        )}

        {streetPosition && (
          <View style={styles.streetPositionCard}>
            <Ionicons name="location" size={14} color={Colors.dark.tint} style={styles.streetPositionIcon} />
            <View style={styles.streetPositionInfo}>
              <Text style={styles.streetPositionName}>{streetPosition.street.toUpperCase()}</Text>
              <Text style={styles.streetPositionSegment}>
                {streetPosition.from} → {streetPosition.to}
              </Text>
              {streetPosition.side !== '' && (
                <Text style={styles.streetPositionSide}>{streetPosition.side} side</Text>
              )}
              {parkingZones.length > 0 && (
                <Text style={styles.streetPositionZones}>
                  P {parkingZones.join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}

      </View>

      {/* ── Overlay buttons (single set, animated position with panel) ── */}
      <Animated.View style={[styles.overlayButtonsRow, overlayBtnStyle]}>
        <TouchableOpacity
          style={styles.mapTypeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMapTypeIndex((i) => (i + 1) % MAP_TYPES.length);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={MAP_TYPE_ICONS[mapTypeIndex]} size={20} color={Colors.dark.tint} />
          <Text style={styles.mapTypeLabel}>{MAP_TYPE_LABELS[mapTypeIndex]}</Text>
        </TouchableOpacity>

        <View style={styles.overlayButtonsRight}>
          {assignedZone && (
            <TouchableOpacity
              style={styles.zoneInfoBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setZoneInfoVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={20} color={Colors.dark.tint} />
            </TouchableOpacity>
          )}
          <View style={styles.quickActionsCol}>
            <TouchableOpacity
              style={styles.code21Btn}
              onPress={openCode21Modal}
              activeOpacity={0.8}
            >
              <Text style={styles.code21BtnText}>21</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={centerOnUser}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={22} color={Colors.dark.tint} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── Pull-tab bar (visible when panel is minimized) ── */}
      {panelMinimized && (
        <View
          style={[styles.pullTabBar, { paddingBottom: safeBottom }]}
          {...pullTabPanResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={restorePanel}
            activeOpacity={0.7}
            style={styles.pullTabTouchArea}
          >
            <View style={styles.pullTabHandle} />
            <View style={styles.pullTabLabelRow}>
              <Ionicons name="compass-outline" size={14} color={Colors.dark.tint} />
              <Text style={styles.pullTabLabel}>SHOW PANEL</Text>
              <Ionicons name="chevron-up" size={14} color={Colors.dark.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom panel ── */}
      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          { paddingBottom: panelMinimized ? 0 : safeBottom + 8 },
        ]}
        pointerEvents={panelMinimized ? "none" : "auto"}
      >
        <View style={styles.handleRow}>
          <TouchableOpacity
            style={styles.handleArea}
            onPress={togglePanel}
            activeOpacity={0.7}
          >
            <View style={styles.handle} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.minimizeBtn}
            onPress={minimizePanel}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-down" size={18} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.compassRow}>
          <Compass heading={heading} size={108} />

          <View style={styles.headingInfo}>
            <Text style={styles.headingDir}>{headingLabel.cardinal}</Text>
            <Text style={styles.headingStreet}>{headingLabel.street}</Text>
          </View>

          <View style={styles.panelRight}>
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={togglePanel}
              activeOpacity={0.8}
            >
              <Text style={styles.expandBtnLabel}>
                {panelExpanded ? "CLOSE" : "ASSIGN"}
              </Text>
              <Ionicons
                name={panelExpanded ? "chevron-down" : "chevron-up"}
                size={14}
                color={Colors.dark.tint}
              />
            </TouchableOpacity>

            {assignedZone && (
              <View
                style={[styles.assignedBadge, { borderColor: assignedZone.color }]}
              >
                <View
                  style={[
                    styles.assignedBadgeDot,
                    { backgroundColor: assignedZone.color },
                  ]}
                />
                <Text
                  style={[
                    styles.assignedBadgeText,
                    { color: assignedZone.color },
                  ]}
                  numberOfLines={2}
                >
                  {assignedZone.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {panelExpanded && (
          <View style={styles.zoneSelector}>
            <Text style={styles.zoneSelectorTitle}>SELECT ASSIGNED ZONE</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoneListContent}
            >
              {PATROL_ZONES.map((zone) => {
                const isSelected = assignedZone?.id === zone.id;
                const isCurrent = currentZone?.id === zone.id;
                return (
                  <Pressable
                    key={zone.id}
                    style={({ pressed }) => [
                      styles.zoneRow,
                      isSelected && {
                        backgroundColor: zone.color + "22",
                        borderColor: zone.color + "55",
                      },
                      pressed && { opacity: 0.72 },
                    ]}
                    onPress={() => assignZone(zone)}
                  >
                    <View
                      style={[styles.zoneBar, { backgroundColor: zone.color }]}
                    />
                    <View style={styles.zoneRowInfo}>
                      <Text
                        style={[
                          styles.zoneRowName,
                          isSelected && { color: zone.color },
                        ]}
                      >
                        {zone.name}
                      </Text>
                      <Text style={styles.zoneRowDesc}>{zone.description}</Text>
                    </View>
                    <View style={styles.zoneRowRight}>
                      {isCurrent && (
                        <View
                          style={[
                            styles.hereBadge,
                            {
                              backgroundColor: zone.color + "33",
                              borderColor: zone.color,
                            },
                          ]}
                        >
                          <Text style={[styles.hereBadgeText, { color: zone.color }]}>
                            HERE
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={zone.color} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      <Modal visible={code21ModalVisible} transparent animationType="fade" onRequestClose={() => setCode21ModalVisible(false)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBar} />
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>CODE21 REQUEST</Text>
                <Text style={styles.modalSubtitle}>Dispatch and attendance workflow</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCode21ModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
              <TextInput value={officerNumber} onChangeText={setOfficerNumber} style={styles.modalInput} placeholder="Officer number" placeholderTextColor={Colors.dark.textMuted} />
              <TextInput value={serviceRequestNumber} onChangeText={setServiceRequestNumber} style={styles.modalInput} placeholder="Service request #" placeholderTextColor={Colors.dark.textMuted} />
              <View style={styles.rowInputs}>
                <TextInput value={offenceDate} onChangeText={setOffenceDate} style={[styles.modalInput, styles.rowInput]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={Colors.dark.textMuted} />
                <TextInput value={offenceTime} onChangeText={setOffenceTime} style={[styles.modalInput, styles.rowInput]} placeholder="Time (HH:mm)" placeholderTextColor={Colors.dark.textMuted} />
              </View>
              <Text style={styles.modalFieldLabel}>Offence type</Text>
              <TextInput
                value={addressQuery}
                onChangeText={(text) => {
                  setAddressQuery(text);
                  setAddressSuggestions(searchAddressOptions(text));
                }}
                placeholder="Search code21 address"
                placeholderTextColor={Colors.dark.textMuted}
                style={styles.modalInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchResultsRow}>
                {addressSuggestions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.searchResultChip}
                    onPress={() => {
                      setSelectedAddress({ label: option.label, latitude: option.latitude, longitude: option.longitude });
                      setAddressQuery(option.label);
                    }}
                  >
                    <Text style={styles.searchResultText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalAddress}>{selectedAddress?.label ?? "No address selected"}</Text>
              <TextInput value={requestTime} onChangeText={setRequestTime} style={styles.modalInput} placeholder="Request time (YYYY-MM-DDTHH:mm)" placeholderTextColor={Colors.dark.textMuted} />
              <ScrollView style={styles.typeScrollView} nestedScrollEnabled>
                <View style={styles.typeRow}>
                  {getCode21Types().map((type) => (
                    <TouchableOpacity key={type} style={[styles.typeChip, code21Type === type && styles.typeChipActive]} onPress={() => setCode21Type(type)}>
                      <Text style={styles.typeChipText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput value={description} onChangeText={setDescription} style={styles.modalInput} placeholder="Code21 description" placeholderTextColor={Colors.dark.textMuted} />
              <TextInput value={dispatchNotes} onChangeText={setDispatchNotes} style={styles.modalInput} placeholder="Dispatch notes" placeholderTextColor={Colors.dark.textMuted} />
              <Text style={styles.modalFieldLabel}>Vehicle details</Text>
              <TextInput
                value={vehicleMakeQuery}
                onChangeText={(text) => {
                  setVehicleMakeQuery(text);
                  setVehicleMake(text);
                }}
                style={styles.modalInput}
                placeholder="Vehicle make"
                placeholderTextColor={Colors.dark.textMuted}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchResultsRow}>
                {filteredVehicleMakes.map((make) => (
                  <TouchableOpacity key={make} style={styles.searchResultChip} onPress={() => { setVehicleMake(make); setVehicleMakeQuery(make); }}>
                    <Text style={styles.searchResultText}>{make}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                value={vehicleColourQuery}
                onChangeText={(text) => {
                  setVehicleColourQuery(text);
                  setVehicleColour(text);
                }}
                style={styles.modalInput}
                placeholder="Vehicle colour"
                placeholderTextColor={Colors.dark.textMuted}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchResultsRow}>
                {filteredVehicleColours.map((colour) => (
                  <TouchableOpacity key={colour} style={styles.searchResultChip} onPress={() => { setVehicleColour(colour); setVehicleColourQuery(colour); }}>
                    <Text style={styles.searchResultText}>{colour}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput value={vehicleRego} onChangeText={setVehicleRego} autoCapitalize="characters" style={styles.modalInput} placeholder="Vehicle rego" placeholderTextColor={Colors.dark.textMuted} />
              <TextInput value={attendanceNotes} onChangeText={setAttendanceNotes} style={styles.modalInput} placeholder="Attendance notes" placeholderTextColor={Colors.dark.textMuted} />
              <TextInput value={pinValue} onChangeText={setPinValue} style={styles.modalInput} placeholder="PIN # (if issued)" placeholderTextColor={Colors.dark.textMuted} />
              <View style={styles.documentPreview}>
                <Text style={styles.modalFieldLabel}>Formatted document preview</Text>
                <Text style={styles.documentPreviewText}>{formattedDocument}</Text>
              </View>
              <View style={styles.travelRow}>
                <TouchableOpacity style={[styles.travelBtn, travelMode === "foot" && styles.travelBtnActive]} onPress={() => setTravelMode("foot")}><Text style={styles.travelBtnText}>On foot</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.travelBtn, travelMode === "vehicle" && styles.travelBtnActive]} onPress={() => setTravelMode("vehicle")}><Text style={styles.travelBtnText}>In vehicle</Text></TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCode21ModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={submitCode21}><Text style={styles.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>Optimised Route ({travelMode === "foot" ? "on foot" : "vehicle"})</Text>
        {routeOrderedRequests.slice(0, 4).map((request, index) => (
          <Text key={request.id} style={styles.routeItem}>{index + 1}. {request.addressLabel}</Text>
        ))}
      </View>

      {/* ── Zone Info Modal ── */}
      <ZoneInfoModal
        zone={assignedZone}
        visible={zoneInfoVisible}
        onClose={() => setZoneInfoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },

  // Permission screens
  permScreen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permContent: {
    alignItems: "center",
    gap: 16,
    maxWidth: 340,
    width: "100%",
  },
  permIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.dark.tint,
    backgroundColor: Colors.dark.tintDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  permTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 20,
    textAlign: "center",
  },
  permSubtitle: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 21,
  },
  permBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.tint,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  permBtnText: {
    fontFamily: "RobotoMono_700Bold",
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  permHint: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,22,40,0.90)",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 12,
    letterSpacing: 2.5,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.dark.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  gpsDot: { width: 7, height: 7, borderRadius: 3.5 },
  gpsText: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  zoneStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoneChip: { flex: 1, gap: 2 },
  zoneChipLabel: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 8,
    letterSpacing: 2,
  },
  zoneChipValue: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertSuccess: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  alertText: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.warning,
    fontSize: 11,
    flex: 1,
  },

  streetPositionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(14,165,233,0.08)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.20)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 8,
  },
  streetPositionIcon: {
    marginTop: 1,
  },
  streetPositionInfo: {
    flex: 1,
    gap: 2,
  },
  streetPositionName: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 13,
    letterSpacing: 1,
  },
  streetPositionSegment: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  streetPositionSide: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.tint,
    fontSize: 11,
  },
  streetPositionZones: {
    fontFamily: "RobotoMono_400Regular",
    color: '#FF7DAF',
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
  },

  overlayButtonsRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlayButtonsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickActionsCol: {
    alignItems: "center",
    gap: 8,
  },
  code21Btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  code21BtnText: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 16,
    letterSpacing: 0.8,
  },

  // Zone info button
  zoneInfoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Map type button
  mapTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  mapTypeLabel: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.text,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Locate button
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom panel
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,22,40,0.96)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  handleArea: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
  },
  minimizeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pullTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,22,40,0.96)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    zIndex: 20,
  },
  pullTabTouchArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  pullTabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
  },
  pullTabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pullTabLabel: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
  },
  compassRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 6,
  },
  headingInfo: { flex: 1, gap: 1 },
  headingDir: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 15,
    letterSpacing: 3,
  },
  headingStreet: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 1,
    marginBottom: 2,
  },
  panelRight: {
    alignItems: "flex-end",
    gap: 10,
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.dark.tint + "44",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expandBtnLabel: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  assignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 110,
  },
  assignedBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  assignedBadgeText: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  // Zone selector
  zoneSelector: {
    flex: 1,
    paddingHorizontal: 16,
  },
  zoneSelectorTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textMuted,
    fontSize: 8,
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  zoneListContent: {
    gap: 5,
    paddingBottom: 8,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    paddingRight: 12,
    minHeight: 50,
  },
  zoneBar: {
    width: 4,
    alignSelf: "stretch",
    marginRight: 12,
  },
  zoneRowInfo: { flex: 1, paddingVertical: 10, gap: 2 },
  zoneRowName: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  zoneRowDesc: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  zoneRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  hereBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hereBadgeText: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },

  searchCard: {
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.text,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  searchResultsRow: {
    gap: 8,
  },
  searchResultChip: {
    backgroundColor: Colors.dark.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchResultText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 18,
    width: "100%",
    maxWidth: 420,
    maxHeight: "84%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  modalHeaderBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.dark.tint,
    marginRight: 12,
  },
  modalHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 16,
    letterSpacing: 1.2,
  },
  modalSubtitle: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 12,
    gap: 8,
  },
  modalAddress: {
    color: Colors.dark.tint,
    fontSize: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.dark.text,
    fontSize: 12,
    backgroundColor: Colors.dark.surfaceAlt,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 8,
  },
  rowInput: {
    flex: 1,
  },
  modalFieldLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  documentPreview: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    padding: 10,
    gap: 6,
  },
  documentPreviewText: {
    color: Colors.dark.text,
    fontSize: 11,
    lineHeight: 16,
  },
  typeScrollView: {
    maxHeight: 160,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeChipActive: {
    backgroundColor: Colors.dark.tintDim,
    borderColor: Colors.dark.tint,
  },
  typeChipText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
  },
  travelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  travelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  travelBtnActive: {
    borderColor: Colors.dark.tint,
    backgroundColor: Colors.dark.tintDim,
  },
  travelBtnText: {
    color: Colors.dark.text,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: Colors.dark.textMuted,
  },
  modalSave: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  routeCard: {
    position: 'absolute',
    top: 220,
    right: 12,
    width: 180,
    backgroundColor: 'rgba(10,22,40,0.92)',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  routeTitle: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  routeItem: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
  },
});
