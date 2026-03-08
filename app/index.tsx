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
  Alert,
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
const API_BASE_URL = IS_WEB ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;
const HEADING_THRESHOLD = 2;
const HEADING_UPDATE_INTERVAL = 150;
const SPRING_CONFIG = { damping: 20, stiffness: 180, overshootClamping: true };

function getLocalDateString(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function getLocalTimeString(): string {
  const now = new Date();
  return [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join(':');
}

function formatRouteDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatRouteDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
}

function haversineDistanceMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateNavDuration(distanceMetres: number, mode: "foot" | "vehicle"): number {
  return distanceMetres / (mode === "foot" ? 1.39 : 8.33);
}

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
  const [lastSelectedAddress, setLastSelectedAddress] = useState<{ label: string; latitude: number; longitude: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressDropdownVisible, setAddressDropdownVisible] = useState(false);
  const [documentViewRequest, setDocumentViewRequest] = useState<Code21Request | null>(null);
  const [documentViewVisible, setDocumentViewVisible] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [code21Requests, setCode21Requests] = useState<Code21Request[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<0 | 1 | 2>(0);
  const [completedTimestamps, setCompletedTimestamps] = useState<Record<string, number>>({});
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveResults, setArchiveResults] = useState<Code21Request[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [routePolyline, setRoutePolyline] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distanceMetres: number;
    durationSeconds: number;
    legs: { distanceMetres: number; durationSeconds: number }[];
  } | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [activeNavRequest, setActiveNavRequest] = useState<Code21Request | null>(null);
  const [navArrived, setNavArrived] = useState(false);
  const [navDistanceMetres, setNavDistanceMetres] = useState<number | null>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [officerNumber, setOfficerNumber] = useState(DEFAULT_OFFICER_NUMBER);
  const [serviceRequestNumber, setServiceRequestNumber] = useState("");
  const [offenceDate, setOffenceDate] = useState(getLocalDateString);
  const [offenceTime, setOffenceTime] = useState(getLocalTimeString);
  const [code21Type, setCode21Type] = useState<Code21Type | "">("");
  const [offenceTypeQuery, setOffenceTypeQuery] = useState("");
  const [description, setDescription] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinIssued, setPinIssued] = useState(false);
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

  const inProgressRequests = useMemo(
    () => code21Requests.filter((r) => r.status === "in_progress"),
    [code21Requests],
  );

  const visibleCode21Requests = useMemo(() => {
    const todayStr = new Date().toDateString();
    const active = code21Requests.filter((r) => r.status === "in_progress");
    const completedToday = code21Requests.filter(
      (r) =>
        r.status === "complete" &&
        completedTimestamps[r.id] !== undefined &&
        new Date(completedTimestamps[r.id]).toDateString() === todayStr,
    );
    return [...active, ...completedToday];
  }, [code21Requests, completedTimestamps]);

  const routeOrderedRequests = useMemo(() => {
    if (!location || inProgressRequests.length === 0) return inProgressRequests;
    return optimiseCode21Route(location, inProgressRequests);
  }, [location, inProgressRequests]);
  const filteredVehicleMakes = useMemo(
    () => searchFilterOptions(vehicleMakeQuery, getVehicleMakes(), 3),
    [vehicleMakeQuery],
  );
  const filteredVehicleColours = useMemo(
    () => searchFilterOptions(vehicleColourQuery, getVehicleColours(), 3),
    [vehicleColourQuery],
  );
  const filteredOffenceTypes = useMemo((): Code21Type[] => {
    if (!offenceTypeQuery.trim()) return [];
    return searchFilterOptions(offenceTypeQuery, getCode21Types(), 3) as Code21Type[];
  }, [offenceTypeQuery]);
  const addressSuggestionsComputed = useMemo(() => {
    const results = searchAddressOptions(addressQuery, 5);
    if (!lastSelectedAddress) return results;
    const alreadyIncluded = results.some((r) => r.label === lastSelectedAddress.label);
    if (alreadyIncluded) return results;
    if (
      !addressQuery.trim() ||
      lastSelectedAddress.label.toLowerCase().includes(addressQuery.trim().toLowerCase())
    ) {
      return [
        {
          id: `prev-${lastSelectedAddress.label}`,
          label: lastSelectedAddress.label,
          latitude: lastSelectedAddress.latitude,
          longitude: lastSelectedAddress.longitude,
        },
        ...results.slice(0, 4),
      ];
    }
    return results;
  }, [addressQuery, lastSelectedAddress]);
  const isoRequestTime = useMemo(() => {
    try {
      const dt = new Date(`${offenceDate}T${offenceTime}:00`);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    } catch { /* ignore */ }
    return new Date().toISOString();
  }, [offenceDate, offenceTime]);

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
      ...(pinIssued ? [`PIN #: ${pinValue || "N/A"}`] : []),
    ];

    return fields.join("\n");
  }, [attendanceNotes, code21Type, dispatchNotes, offenceDate, offenceTime, officerNumber, pinIssued, pinValue, selectedAddress?.label, serviceRequestNumber, vehicleColour, vehicleMake, vehicleRego]);

  const modalContentWidth = useMemo(
    () => Math.min(Dimensions.get("window").width - 40, 420),
    [],
  );

  const scrollToTab = useCallback(
    (tab: 0 | 1 | 2) => {
      tabScrollRef.current?.scrollTo({ x: tab * modalContentWidth, animated: true });
      setActiveModalTab(tab);
    },
    [modalContentWidth],
  );

  const markCode21Complete = useCallback(async (id: string) => {
    setCode21Requests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "complete" as const } : r)),
    );
    setCompletedTimestamps((prev) => ({ ...prev, [id]: Date.now() }));
    try {
      await fetch(`${API_BASE_URL}/api/code21/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "complete" }),
      });
    } catch {
      // Local state already updated; server will be consistent on next load
    }
  }, []);

  const searchArchive = useCallback(async () => {
    if (!archiveQuery.trim()) {
      setArchiveResults([]);
      return;
    }
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams({ q: archiveQuery.trim() });
      const response = await fetch(`${API_BASE_URL}/api/code21/archive?${params.toString()}`);
      if (response.ok) {
        const data = await response.json() as { requests: Code21Request[] };
        setArchiveResults(data.requests);
      }
    } catch {
      // Fail silently
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveQuery]);

  const fetchOptimisedRoute = useCallback(async (
    orderedRequests: Code21Request[],
    mode: "foot" | "vehicle",
    currentLocation: { latitude: number; longitude: number } | null,
  ) => {
    if (orderedRequests.length === 0) {
      setRoutePolyline([]);
      setRouteInfo(null);
      return;
    }
    const waypoints: { lat: number; lng: number }[] = [];
    if (currentLocation) {
      waypoints.push({ lat: currentLocation.latitude, lng: currentLocation.longitude });
    }
    waypoints.push(...orderedRequests.map((r) => ({ lat: r.latitude, lng: r.longitude })));
    if (waypoints.length < 2) return;

    setIsFetchingRoute(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints, mode }),
      });
      if (response.ok) {
        const data = await response.json() as {
          polyline: { latitude: number; longitude: number }[];
          distanceMetres: number;
          durationSeconds: number;
          legs: { distanceMetres: number; durationSeconds: number }[];
        };
        setRoutePolyline(data.polyline);
        setRouteInfo({ distanceMetres: data.distanceMetres, durationSeconds: data.durationSeconds, legs: data.legs });
      }
    } catch {
      // Fail silently; map shows without polyline
    } finally {
      setIsFetchingRoute(false);
    }
  }, []);

  const stopNavigation = useCallback(() => {
    setActiveNavRequest(null);
    setNavArrived(false);
    setNavDistanceMetres(null);
  }, []);

  const startNavigation = useCallback((request: Code21Request) => {
    setActiveNavRequest(request);
    setNavArrived(false);
    setNavDistanceMetres(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  useEffect(() => {
    if (!activeNavRequest || !location) return;
    const dist = haversineDistanceMetres(
      location.latitude, location.longitude,
      activeNavRequest.latitude, activeNavRequest.longitude,
    );
    setNavDistanceMetres(dist);
    if (dist < 30 && !navArrived) {
      setNavArrived(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [location, activeNavRequest, navArrived]);

  useEffect(() => {
    if (!activeNavRequest || !location) return;
    const minLat = Math.min(location.latitude, activeNavRequest.latitude);
    const maxLat = Math.max(location.latitude, activeNavRequest.latitude);
    const minLng = Math.min(location.longitude, activeNavRequest.longitude);
    const maxLng = Math.max(location.longitude, activeNavRequest.longitude);
    const latDelta = Math.max((maxLat - minLat) * 1.8, 0.003);
    const lngDelta = Math.max((maxLng - minLng) * 1.8, 0.003);
    mapRef.current?.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    }, 700);
  }, [activeNavRequest, location]);

  const submitCode21 = useCallback(async () => {
    if (!selectedAddress) {
      Alert.alert("Address required", "Please search and select an address before saving.");
      return;
    }
    const resolvedOffenceType: Code21Type = (code21Type as Code21Type) || "621 - Stopped in no parking";

    const payload = {
      officerNumber: officerNumber || DEFAULT_OFFICER_NUMBER,
      serviceRequestNumber,
      addressLabel: selectedAddress.label,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
      requestTime: isoRequestTime,
      offenceDate,
      offenceTime,
      offenceType: resolvedOffenceType,
      code21Type: resolvedOffenceType,
      dispatchNotes,
      attendanceNotes,
      pin: pinIssued ? pinValue : "",
      vehicleMake,
      vehicleColour,
      vehicleRego: vehicleRego.toUpperCase(),
      travelMode,
      description,
      formattedDocument,
    };

    const resetForm = () => {
      setCode21ModalVisible(false);
      setEditingRequestId(null);
      setDescription("");
      setDispatchNotes("");
      setAttendanceNotes("");
      setPinValue("");
      setPinIssued(false);
      setServiceRequestNumber("");
      setVehicleMake("");
      setVehicleColour("");
      setVehicleRego("");
      setVehicleMakeQuery("");
      setVehicleColourQuery("");
      setOffenceTypeQuery("");
      setAddressQuery("");
      setAddressDropdownVisible(false);
      setCode21Type("");
      setSelectedAddress(null);
    };

    if (editingRequestId !== null) {
      // Editing an existing request — update the local entry in place, no new server record
      const existing = code21Requests.find((r) => r.id === editingRequestId);
      const updatedEntry: Code21Request = {
        ...payload,
        id: editingRequestId,
        status: existing?.status ?? "in_progress",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      setCode21Requests((prev) =>
        prev.map((r) => (r.id === editingRequestId ? updatedEntry : r))
      );
      resetForm();
      return;
    }

    // New request — optimistic update so marker appears on map immediately
    const tempId = `local-${Date.now()}`;
    const localEntry: Code21Request = {
      ...payload,
      id: tempId,
      status: "in_progress",
      createdAt: new Date().toISOString(),
    };
    setCode21Requests((prev) => [...prev, localEntry]);
    resetForm();

    // Persist to server in background — swap temp entry with server record on success
    try {
      const response = await fetch(`${API_BASE_URL}/api/code21`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.ok && body.request) {
        const serverEntry: Code21Request = {
          ...body.request,
          latitude: Number(body.request.latitude),
          longitude: Number(body.request.longitude),
        };
        setCode21Requests((prev) => prev.map((r) => (r.id === tempId ? serverEntry : r)));
      }
    } catch {
      // Local entry remains on map for the session; will sync on next load if server recovers
    }
  }, [attendanceNotes, code21Requests, code21Type, description, dispatchNotes, editingRequestId, formattedDocument, isoRequestTime, offenceDate, offenceTime, officerNumber, pinIssued, pinValue, selectedAddress, serviceRequestNumber, travelMode, vehicleColour, vehicleMake, vehicleRego]);

  const openCode21Modal = useCallback((initialTab: 0 | 1 = 0) => {
    setEditingRequestId(null);
    setActiveModalTab(initialTab);
    setOffenceDate(getLocalDateString());
    setOffenceTime(getLocalTimeString());
    setPinValue("");
    setPinIssued(false);
    setOffenceTypeQuery("");
    setAddressQuery("");
    setAddressDropdownVisible(false);
    setCode21Type("");
    setSelectedAddress(null);
    setCode21ModalVisible(true);
  }, []);

  const loadCode21Requests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ officerNumber: officerNumber || DEFAULT_OFFICER_NUMBER });
      const response = await fetch(`${API_BASE_URL}/api/code21?${params.toString()}`);
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

  useEffect(() => {
    if (!code21ModalVisible) return;
    const timeout = setTimeout(() => {
      tabScrollRef.current?.scrollTo({ x: activeModalTab * modalContentWidth, animated: false });
    }, 50);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code21ModalVisible]);

  useEffect(() => {
    const interval = setInterval(() => {
      const todayStr = new Date().toDateString();
      setCompletedTimestamps((prev) => {
        const filtered: Record<string, number> = {};
        for (const [id, ts] of Object.entries(prev)) {
          if (new Date(ts).toDateString() === todayStr) {
            filtered[id] = ts;
          }
        }
        if (Object.keys(filtered).length === Object.keys(prev).length) return prev;
        return filtered;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (routeOrderedRequests.length === 0) {
      setRoutePolyline([]);
      setRouteInfo(null);
      return;
    }
    const timeout = setTimeout(() => {
      void fetchOptimisedRoute(routeOrderedRequests, travelMode, location);
    }, 800);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOrderedRequests, travelMode]);

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
            const addr = {
              label: request.addressLabel,
              latitude: request.latitude,
              longitude: request.longitude,
            };
            setSelectedAddress(addr);
            setLastSelectedAddress(addr);
            setAddressQuery(request.addressLabel);
            setAddressDropdownVisible(false);
            setOfficerNumber(request.officerNumber || DEFAULT_OFFICER_NUMBER);
            setServiceRequestNumber(request.serviceRequestNumber || "");
            setOffenceDate(request.offenceDate || request.requestTime.slice(0, 10));
            setOffenceTime(request.offenceTime || request.requestTime.slice(11, 16));
            setCode21Type(request.offenceType || request.code21Type);
            setDispatchNotes(request.dispatchNotes);
            setAttendanceNotes(request.attendanceNotes);
            setPinValue(request.pin);
            setPinIssued(!!request.pin);
            setVehicleMake(request.vehicleMake || "");
            setVehicleColour(request.vehicleColour || "");
            setVehicleRego(request.vehicleRego || "");
            setVehicleMakeQuery(request.vehicleMake || "");
            setVehicleColourQuery(request.vehicleColour || "");
            setOffenceTypeQuery("");
            setDescription(request.description);
            setTravelMode(request.travelMode);
            setEditingRequestId(request.id);
            setActiveModalTab(0);
            setCode21ModalVisible(true);
          }
        }}
        onDestinationLongPress={(destinationId) => {
          const request = code21Requests.find((entry) => entry.id === destinationId);
          if (request) {
            setDocumentViewRequest(request);
            setDocumentViewVisible(true);
          }
        }}
        previewPin={selectedAddress && code21ModalVisible ? selectedAddress : null}
        mapType={MAP_TYPES[mapTypeIndex] as any}
        onMapReady={() => {}}
        routePolyline={routePolyline}
        routeMode={travelMode}
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

        <View style={styles.quickActionsCol}>
          <TouchableOpacity
            style={styles.code21Btn}
            onPress={() => openCode21Modal()}
            activeOpacity={0.8}
          >
            <Text style={styles.code21BtnText}>21</Text>
          </TouchableOpacity>
          <View style={styles.locateRow}>
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

      <Modal visible={code21ModalVisible} transparent animationType="fade" onRequestClose={() => { setCode21ModalVisible(false); setEditingRequestId(null); }} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* ── Header ── */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBar} />
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>CODE21 REQUEST</Text>
                <Text style={styles.modalSubtitle}>Dispatch and attendance workflow</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setCode21ModalVisible(false); setEditingRequestId(null); }} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* ── Tab Bar ── */}
            <View style={styles.modalTabBar}>
              <TouchableOpacity
                style={[styles.modalTab, activeModalTab === 0 && styles.modalTabActive]}
                onPress={() => scrollToTab(0)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalTabText, activeModalTab === 0 && styles.modalTabTextActive]}>
                  {editingRequestId ? "EDIT REQUEST" : "NEW REQUEST"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeModalTab === 1 && styles.modalTabActive]}
                onPress={() => scrollToTab(1)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalTabText, activeModalTab === 1 && styles.modalTabTextActive]}>
                  {`IN PROGRESS${inProgressRequests.length > 0 ? ` (${inProgressRequests.length})` : ""}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeModalTab === 2 && styles.modalTabActive]}
                onPress={() => scrollToTab(2)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalTabText, activeModalTab === 2 && styles.modalTabTextActive]}>
                  ARCHIVE
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Swipeable Content ── */}
            <ScrollView
              ref={tabScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              style={styles.modalSwipeable}
              contentContainerStyle={styles.modalSwipeableContent}
              onMomentumScrollEnd={(e) => {
                const page = Math.round(e.nativeEvent.contentOffset.x / modalContentWidth);
                setActiveModalTab((page <= 0 ? 0 : page >= 2 ? 2 : page) as 0 | 1 | 2);
              }}
            >
              {/* ── Tab 0: New / Edit Form ── */}
              <View style={[styles.modalTabPage, { width: modalContentWidth }]}>
                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {/* Row 1: Officer # | Service request # */}
                  <View style={styles.rowInputs}>
                    <TextInput value={officerNumber} onChangeText={setOfficerNumber} style={[styles.modalInput, styles.rowInput]} placeholder="Officer #" placeholderTextColor={Colors.dark.textMuted} />
                    <TextInput value={serviceRequestNumber} onChangeText={setServiceRequestNumber} style={[styles.modalInput, styles.rowInput]} placeholder="Service request #" placeholderTextColor={Colors.dark.textMuted} />
                  </View>

                  {/* Row 2: Date | Time */}
                  <View style={styles.rowInputs}>
                    <TextInput value={offenceDate} onChangeText={setOffenceDate} style={[styles.modalInput, styles.rowInput]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={Colors.dark.textMuted} />
                    <TextInput value={offenceTime} onChangeText={setOffenceTime} style={[styles.modalInput, styles.rowInput]} placeholder="Time (HH:mm)" placeholderTextColor={Colors.dark.textMuted} />
                  </View>

                  {/* Row 3: Address search */}
                  <View>
                    <TextInput
                      value={addressQuery}
                      onChangeText={(text) => { setAddressQuery(text); setAddressDropdownVisible(true); }}
                      onFocus={() => setAddressDropdownVisible(true)}
                      placeholder={selectedAddress ? selectedAddress.label : "Search address..."}
                      placeholderTextColor={selectedAddress ? Colors.dark.tint : Colors.dark.textMuted}
                      style={styles.modalInput}
                    />
                    {addressDropdownVisible && addressSuggestionsComputed.length > 0 && (
                      <View style={styles.acDropdown}>
                        {addressSuggestionsComputed.map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={styles.acItem}
                            onPress={() => {
                              const addr = { label: option.label, latitude: option.latitude, longitude: option.longitude };
                              setSelectedAddress(addr);
                              setLastSelectedAddress(addr);
                              setAddressQuery(option.label);
                              setAddressDropdownVisible(false);
                              mapRef.current?.animateToRegion({
                                latitude: option.latitude,
                                longitude: option.longitude,
                                latitudeDelta: 0.002,
                                longitudeDelta: 0.002,
                              }, 600);
                            }}
                          >
                            <Ionicons name="location-outline" size={12} color={Colors.dark.tint} style={{ marginRight: 6 }} />
                            <Text style={styles.acItemText} numberOfLines={1}>{option.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Offence type */}
                  <Text style={styles.modalFieldLabel}>Offence type</Text>
                  <View>
                    <TextInput
                      value={offenceTypeQuery}
                      onChangeText={setOffenceTypeQuery}
                      placeholder={code21Type || "Select offence"}
                      placeholderTextColor={code21Type ? Colors.dark.tint : Colors.dark.textMuted}
                      style={styles.modalInput}
                    />
                    {filteredOffenceTypes.length > 0 && (
                      <View style={styles.acDropdown}>
                        {filteredOffenceTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={styles.acItem}
                            onPress={() => { setCode21Type(type); setOffenceTypeQuery(""); }}
                          >
                            <Text style={styles.acItemText}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Dispatch notes */}
                  <TextInput value={dispatchNotes} onChangeText={setDispatchNotes} style={styles.modalInput} placeholder="Dispatch notes" placeholderTextColor={Colors.dark.textMuted} />

                  {/* Vehicle make */}
                  <View>
                    <TextInput
                      value={vehicleMakeQuery}
                      onChangeText={(text) => { setVehicleMakeQuery(text); setVehicleMake(text); }}
                      style={styles.modalInput}
                      placeholder={vehicleMake || "Vehicle make"}
                      placeholderTextColor={vehicleMake ? Colors.dark.tint : Colors.dark.textMuted}
                    />
                    {vehicleMakeQuery.length > 0 && filteredVehicleMakes.length > 0 && (
                      <View style={styles.acDropdown}>
                        {filteredVehicleMakes.map((make) => (
                          <TouchableOpacity
                            key={make}
                            style={styles.acItem}
                            onPress={() => { setVehicleMake(make); setVehicleMakeQuery(""); }}
                          >
                            <Text style={styles.acItemText}>{make}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Vehicle rego | Vehicle colour */}
                  <View style={styles.rowInputs}>
                    <TextInput
                      value={vehicleRego}
                      onChangeText={setVehicleRego}
                      autoCapitalize="characters"
                      style={[styles.modalInput, styles.rowInput]}
                      placeholder="Rego"
                      placeholderTextColor={Colors.dark.textMuted}
                    />
                    <View style={styles.rowInput}>
                      <TextInput
                        value={vehicleColourQuery}
                        onChangeText={(text) => { setVehicleColourQuery(text); setVehicleColour(text); }}
                        style={styles.modalInput}
                        placeholder={vehicleColour || "Colour"}
                        placeholderTextColor={vehicleColour ? Colors.dark.tint : Colors.dark.textMuted}
                      />
                      {vehicleColourQuery.length > 0 && filteredVehicleColours.length > 0 && (
                        <View style={styles.acDropdown}>
                          {filteredVehicleColours.map((colour) => (
                            <TouchableOpacity
                              key={colour}
                              style={styles.acItem}
                              onPress={() => { setVehicleColour(colour); setVehicleColourQuery(""); }}
                            >
                              <Text style={styles.acItemText}>{colour}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Attendance notes */}
                  <TextInput value={attendanceNotes} onChangeText={setAttendanceNotes} style={styles.modalInput} placeholder="Attendance notes" placeholderTextColor={Colors.dark.textMuted} />

                  {/* PIN toggle */}
                  <TouchableOpacity
                    style={[styles.pinToggle, pinIssued && styles.pinToggleActive]}
                    onPress={() => { const next = !pinIssued; setPinIssued(next); if (!next) setPinValue(""); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={pinIssued ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={pinIssued ? Colors.dark.tint : Colors.dark.textMuted}
                    />
                    <Text style={[styles.pinToggleText, pinIssued && styles.pinToggleTextActive]}>PIN issued</Text>
                  </TouchableOpacity>
                  {pinIssued && (
                    <TextInput value={pinValue} onChangeText={setPinValue} style={styles.modalInput} placeholder="PIN #" placeholderTextColor={Colors.dark.textMuted} keyboardType="number-pad" />
                  )}

                  {/* Document preview */}
                  <View style={styles.documentPreview}>
                    <Text style={styles.modalFieldLabel}>Document preview</Text>
                    <Text style={styles.documentPreviewText}>{formattedDocument}</Text>
                  </View>

                  {/* Travel mode */}
                  <View style={styles.travelRow}>
                    <TouchableOpacity style={[styles.travelBtn, travelMode === "foot" && styles.travelBtnActive]} onPress={() => setTravelMode("foot")}><Text style={styles.travelBtnText}>On foot</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.travelBtn, travelMode === "vehicle" && styles.travelBtnActive]} onPress={() => setTravelMode("vehicle")}><Text style={styles.travelBtnText}>In vehicle</Text></TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { setCode21ModalVisible(false); setEditingRequestId(null); }}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.modalSave} onPress={submitCode21}><Text style={styles.modalSaveText}>Save</Text></TouchableOpacity>
                </View>
              </View>

              {/* ── Tab 1: In Progress List ── */}
              <View style={[styles.modalTabPage, { width: modalContentWidth }]}>
                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.inProgressList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {visibleCode21Requests.length === 0 ? (
                    <View style={styles.inProgressEmpty}>
                      <Ionicons name="checkmark-circle-outline" size={44} color={Colors.dark.textMuted} />
                      <Text style={styles.inProgressEmptyText}>No active Code 21 requests</Text>
                      <Text style={styles.inProgressEmptyHint}>Saved requests will appear here until marked complete</Text>
                    </View>
                  ) : (
                    visibleCode21Requests.map((req) => {
                      const isDone = req.status === "complete";
                      return (
                        <View key={req.id} style={[styles.inProgressItem, isDone && styles.inProgressItemDone]}>
                          <View style={[styles.inProgressBar, isDone && styles.inProgressBarDone]} />
                          <View style={styles.inProgressInfo}>
                            <Text style={[styles.inProgressAddress, isDone && styles.inProgressTextDone]} numberOfLines={1}>{req.addressLabel}</Text>
                            <Text style={[styles.inProgressType, isDone && styles.inProgressTextDone]} numberOfLines={1}>{req.offenceType || req.code21Type}</Text>
                            <Text style={[styles.inProgressMeta, isDone && styles.inProgressTextDone]}>{req.offenceDate}{"  "}{req.offenceTime}</Text>
                          </View>
                          <View style={styles.inProgressActions}>
                            {!isDone && (
                              <TouchableOpacity
                                style={styles.inProgressEditBtn}
                                activeOpacity={0.7}
                                onPress={() => {
                                  const addr = { label: req.addressLabel, latitude: req.latitude, longitude: req.longitude };
                                  setSelectedAddress(addr);
                                  setLastSelectedAddress(addr);
                                  setAddressQuery(req.addressLabel);
                                  setAddressDropdownVisible(false);
                                  setOfficerNumber(req.officerNumber || DEFAULT_OFFICER_NUMBER);
                                  setServiceRequestNumber(req.serviceRequestNumber || "");
                                  setOffenceDate(req.offenceDate || req.requestTime.slice(0, 10));
                                  setOffenceTime(req.offenceTime || req.requestTime.slice(11, 16));
                                  setCode21Type(req.offenceType || req.code21Type);
                                  setDispatchNotes(req.dispatchNotes);
                                  setAttendanceNotes(req.attendanceNotes);
                                  setPinValue(req.pin);
                                  setPinIssued(!!req.pin);
                                  setVehicleMake(req.vehicleMake || "");
                                  setVehicleColour(req.vehicleColour || "");
                                  setVehicleRego(req.vehicleRego || "");
                                  setVehicleMakeQuery(req.vehicleMake || "");
                                  setVehicleColourQuery(req.vehicleColour || "");
                                  setOffenceTypeQuery("");
                                  setDescription(req.description);
                                  setTravelMode(req.travelMode);
                                  setEditingRequestId(req.id);
                                  scrollToTab(0);
                                }}
                              >
                                <Ionicons name="create-outline" size={19} color={Colors.dark.textSecondary} />
                              </TouchableOpacity>
                            )}
                            {isDone ? (
                              <View style={styles.inProgressCompleteBtn}>
                                <Ionicons name="checkmark-circle" size={22} color={Colors.dark.textMuted} />
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.inProgressCompleteBtn}
                                activeOpacity={0.7}
                                onPress={() => markCode21Complete(req.id)}
                              >
                                <Ionicons name="checkmark-circle-outline" size={22} color={Colors.dark.tint} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* ── Tab 2: Archive Search ── */}
              <View style={[styles.modalTabPage, { width: modalContentWidth }]}>
                <View style={styles.archiveSearchRow}>
                  <TextInput
                    style={styles.archiveInput}
                    placeholder="Search by SR# or Officer#"
                    placeholderTextColor={Colors.dark.textMuted}
                    value={archiveQuery}
                    onChangeText={setArchiveQuery}
                    onSubmitEditing={searchArchive}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={styles.archiveSearchBtn} onPress={searchArchive} activeOpacity={0.8}>
                    {archiveLoading
                      ? <ActivityIndicator size="small" color={Colors.dark.tint} />
                      : <Ionicons name="search" size={18} color={Colors.dark.tint} />
                    }
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.inProgressList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {!archiveLoading && archiveQuery.trim() !== "" && archiveResults.length === 0 ? (
                    <View style={styles.inProgressEmpty}>
                      <Ionicons name="archive-outline" size={44} color={Colors.dark.textMuted} />
                      <Text style={styles.inProgressEmptyText}>No records found</Text>
                      <Text style={styles.inProgressEmptyHint}>Try a different SR# or Officer#</Text>
                    </View>
                  ) : (
                    archiveResults.map((req) => (
                      <View key={req.id} style={[styles.inProgressItem, req.status === "complete" && styles.inProgressItemDone]}>
                        <View style={[styles.inProgressBar, req.status === "complete" && styles.inProgressBarDone]} />
                        <View style={styles.inProgressInfo}>
                          <Text style={[styles.inProgressAddress, req.status === "complete" && styles.inProgressTextDone]} numberOfLines={1}>{req.addressLabel}</Text>
                          <Text style={[styles.inProgressType, req.status === "complete" && styles.inProgressTextDone]} numberOfLines={1}>{req.offenceType || req.code21Type}</Text>
                          <View style={styles.archiveMeta}>
                            {req.serviceRequestNumber ? <Text style={styles.archiveMetaChip}>SR# {req.serviceRequestNumber}</Text> : null}
                            <Text style={styles.archiveMetaChip}>Officer {req.officerNumber}</Text>
                            <Text style={styles.inProgressMeta}>{req.offenceDate}</Text>
                          </View>
                        </View>
                        <View style={styles.inProgressActions}>
                          <View style={styles.inProgressCompleteBtn}>
                            <Ionicons
                              name={req.status === "complete" ? "checkmark-circle" : "time-outline"}
                              size={20}
                              color={req.status === "complete" ? Colors.dark.textMuted : Colors.dark.warning}
                            />
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>

      {routeOrderedRequests.length > 0 && (
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <Ionicons
              name={travelMode === "foot" ? "walk-outline" : "car-outline"}
              size={13}
              color={travelMode === "foot" ? Colors.dark.success : Colors.dark.tint}
            />
            <Text style={styles.routeTitle}>
              {travelMode === "foot" ? "ON FOOT" : "VEHICLE"}
            </Text>
            {isFetchingRoute
              ? <ActivityIndicator size="small" color={Colors.dark.tint} style={styles.routeSpinner} />
              : <Ionicons name="checkmark-circle" size={13} color={Colors.dark.success} style={styles.routeSpinner} />
            }
          </View>
          {routeInfo && (
            <Text style={styles.routeSummary}>
              {formatRouteDistance(routeInfo.distanceMetres)}{"  ·  ~"}{formatRouteDuration(routeInfo.durationSeconds)}
            </Text>
          )}
          <View style={styles.routeDivider} />
          {routeOrderedRequests.slice(0, 5).map((request, index) => {
            const isNavigating = activeNavRequest?.id === request.id;
            return (
              <View key={request.id} style={[styles.routeStopRow, isNavigating && styles.routeStopRowActive]}>
                <View style={[styles.routeStopBadge, isNavigating && styles.routeStopBadgeActive]}>
                  <Text style={styles.routeStopNum}>{index + 1}</Text>
                </View>
                <Text style={[styles.routeItem, isNavigating && styles.routeItemActive]} numberOfLines={1}>
                  {request.addressLabel}
                </Text>
                <TouchableOpacity
                  style={styles.routeNavBtn}
                  onPress={() => isNavigating ? stopNavigation() : startNavigation(request)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={isNavigating ? "close-circle" : "navigate"}
                    size={14}
                    color={isNavigating ? Colors.dark.danger : Colors.dark.tint}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Document View Modal (long-press on marker) ── */}
      <Modal visible={documentViewVisible} transparent animationType="fade" onRequestClose={() => setDocumentViewVisible(false)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBar} />
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>CODE21 DOCUMENT</Text>
                <Text style={styles.modalSubtitle}>{documentViewRequest?.addressLabel ?? ""}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDocumentViewVisible(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
              <View style={styles.documentPreview}>
                <Text style={styles.documentPreviewText}>{documentViewRequest?.formattedDocument ?? ""}</Text>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSave} onPress={() => setDocumentViewVisible(false)}>
                <Text style={styles.modalSaveText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Zone Info Modal ── */}
      <ZoneInfoModal
        zone={assignedZone}
        visible={zoneInfoVisible}
        onClose={() => setZoneInfoVisible(false)}
      />

      {/* ── In-app Navigation HUD ── */}
      {activeNavRequest && (
        <View style={[styles.navHud, { top: insets.top + 56 }]}>
          {navArrived ? (
            <View style={styles.navHudInner}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.success} />
              <View style={styles.navHudCenter}>
                <Text style={styles.navHudLabel}>ARRIVED</Text>
                <Text style={styles.navHudAddress} numberOfLines={1}>
                  {activeNavRequest.addressLabel}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.navHudMarkBtn}
                onPress={async () => {
                  await markCode21Complete(activeNavRequest.id);
                  stopNavigation();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.navHudMarkBtnText}>MARK DONE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navHudEndBtn}
                onPress={stopNavigation}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.navHudInner}>
              <Ionicons
                name={travelMode === "foot" ? "walk" : "car"}
                size={20}
                color={travelMode === "foot" ? Colors.dark.success : Colors.dark.tint}
              />
              <View style={styles.navHudCenter}>
                <Text style={styles.navHudAddress} numberOfLines={1}>
                  {activeNavRequest.addressLabel}
                </Text>
                <Text style={styles.navHudMeta}>
                  {navDistanceMetres !== null
                    ? `${formatRouteDistance(navDistanceMetres)}  ·  ~${formatRouteDuration(estimateNavDuration(navDistanceMetres, travelMode))}`
                    : "Calculating…"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.navHudEndBtn}
                onPress={stopNavigation}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={22} color={Colors.dark.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  quickActionsCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  locateRow: {
    flexDirection: "row",
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
    flex: 1,
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
  pinToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: Colors.dark.surfaceAlt,
  },
  pinToggleActive: {
    borderColor: Colors.dark.tint + "66",
    backgroundColor: Colors.dark.tintDim,
  },
  pinToggleText: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  pinToggleTextActive: {
    color: Colors.dark.tint,
  },
  acDropdown: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: Colors.dark.surface,
    overflow: 'hidden',
    marginTop: -1,
    marginBottom: 2,
  },
  acItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  acItemText: {
    fontFamily: 'RobotoMono_400Regular',
    color: Colors.dark.text,
    fontSize: 11,
    flex: 1,
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
  modalTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  modalTabActive: {
    borderBottomColor: Colors.dark.tint,
  },
  modalTabText: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  modalTabTextActive: {
    color: Colors.dark.tint,
  },
  modalSwipeable: {
    flex: 1,
  },
  modalSwipeableContent: {
    height: "100%",
  },
  modalTabPage: {
    flex: 1,
    flexDirection: "column",
  },
  inProgressList: {
    padding: 10,
    gap: 8,
    flexGrow: 1,
  },
  inProgressItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    minHeight: 64,
  },
  inProgressBar: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: Colors.dark.warning,
  },
  inProgressInfo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  inProgressAddress: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  inProgressType: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  inProgressMeta: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 10,
  },
  inProgressActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    gap: 2,
  },
  inProgressEditBtn: {
    padding: 8,
  },
  inProgressCompleteBtn: {
    padding: 8,
  },
  inProgressEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  inProgressEmptyText: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  inProgressEmptyHint: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  inProgressItemDone: {
    opacity: 0.6,
  },
  inProgressBarDone: {
    backgroundColor: Colors.dark.textMuted,
  },
  inProgressTextDone: {
    textDecorationLine: "line-through",
    color: Colors.dark.textMuted,
  },
  archiveSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  archiveInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surfaceAlt,
    paddingHorizontal: 10,
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.text,
    fontSize: 12,
  },
  archiveSearchBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surfaceAlt,
  },
  archiveMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  archiveMetaChip: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
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
    width: 230,
    backgroundColor: 'rgba(10,22,40,0.94)',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeTitle: {
    flex: 1,
    color: Colors.dark.text,
    fontFamily: 'RobotoMono_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  routeSpinner: {
    marginLeft: 'auto' as any,
  },
  routeSummary: {
    color: Colors.dark.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  routeDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 2,
  },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeStopBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.dark.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStopNum: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 11,
  },
  routeItem: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 9,
    letterSpacing: 0.2,
  },
  routeNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStopRowActive: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  routeStopBadgeActive: {
    backgroundColor: Colors.dark.tint,
  },
  routeItemActive: {
    color: Colors.dark.tint,
    fontFamily: 'RobotoMono_700Bold',
  },
  navHud: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(8,18,34,0.97)',
    borderWidth: 1,
    borderColor: Colors.dark.tint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99,
  },
  navHudInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navHudCenter: {
    flex: 1,
    gap: 2,
  },
  navHudLabel: {
    fontFamily: 'RobotoMono_700Bold',
    color: Colors.dark.success,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  navHudAddress: {
    fontFamily: 'RobotoMono_700Bold',
    color: Colors.dark.text,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  navHudMeta: {
    fontFamily: 'RobotoMono_400Regular',
    color: Colors.dark.textSecondary,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  navHudEndBtn: {
    padding: 2,
  },
  navHudMarkBtn: {
    backgroundColor: Colors.dark.success,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  navHudMarkBtnText: {
    fontFamily: 'RobotoMono_700Bold',
    color: '#fff',
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
