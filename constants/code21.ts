import { getAllStreetNumberMarkers } from "@/constants/streetNumbers";

export interface AddressOption {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

const ADDRESS_OPTIONS: AddressOption[] = getAllStreetNumberMarkers().map((marker) => ({
  id: `${marker.label}-${marker.lat.toFixed(6)}-${marker.lng.toFixed(6)}`,
  label: marker.label,
  latitude: marker.lat,
  longitude: marker.lng,
}));

const CODE21_TYPES = [
  "Welfare Check",
  "Disorder",
  "Theft",
  "Trespass",
  "Traffic Incident",
  "Other",
] as const;

export type Code21Type = (typeof CODE21_TYPES)[number];

export interface Code21Request {
  id: string;
  officerNumber: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  requestTime: string;
  code21Type: Code21Type;
  dispatchNotes: string;
  attendanceNotes: string;
  pin: string;
  travelMode: "foot" | "vehicle";
  description: string;
  createdAt: string;
}

export function searchAddressOptions(query: string, limit = 8): AddressOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return ADDRESS_OPTIONS.slice(0, limit);

  return ADDRESS_OPTIONS.filter((option) => option.label.toLowerCase().includes(normalized)).slice(0, limit);
}

export function getCode21Types(): readonly Code21Type[] {
  return CODE21_TYPES;
}

export function optimiseCode21Route(
  currentLocation: { latitude: number; longitude: number },
  requests: Code21Request[],
): Code21Request[] {
  const pending = [...requests];
  const ordered: Code21Request[] = [];
  let cursor = { ...currentLocation };

  while (pending.length > 0) {
    let nextIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    pending.forEach((request, index) => {
      const distance = Math.hypot(request.latitude - cursor.latitude, request.longitude - cursor.longitude);
      if (distance < bestDistance) {
        bestDistance = distance;
        nextIndex = index;
      }
    });

    const [next] = pending.splice(nextIndex, 1);
    ordered.push(next);
    cursor = { latitude: next.latitude, longitude: next.longitude };
  }

  return ordered;
}
