import { getAllAddressOptions } from "@/constants/streetNumbers";

export interface AddressOption {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

const ADDRESS_OPTIONS: AddressOption[] = getAllAddressOptions().map((opt) => ({
  id: opt.id,
  label: opt.label,
  latitude: opt.lat,
  longitude: opt.lng,
}));

const CODE21_TYPES = [
  "621 - Stopped in no parking",
  "623 - Stopped on painted island",
  "624 - Stopped near tram stop sign",
  "626 - Parked across driveway",
  "627 - Stopped near safety zone",
  "701 - Overstayed time limit",
  "702 - Meter expired / failed to pay",
  "704 - Stopped in bicycle parking area",
  "705 - Stopped in motorcycle parking area",
  "706 - Parked contrary to parking area requirements",
  "711 - Parked outside bay",
  "715 - Stopped on pedestrian crossing",
  "716 - Stopped before pedestrian crossing",
  "717 - Stopped after pedestrian crossing",
  "718 - Stopped before bicycle crossing",
  "719 - Stopped after bicycle crossing",
  "720 - Stopped in loading zone",
  "721 - Overstayed loading zone",
  "722 - Overstayed loading zone sign time",
  "723 - Stopped in truck zone",
  "726 - Stopped in taxi zone",
  "727 - Stopped in bus zone",
  "728 - Stopped in permit zone",
  "729 - Double parked",
  "730 - Stopped near fire hydrant",
  "735 - Stopped after bus stop sign",
  "736 - Stopped on bicycle path",
  "737 - Stopped on footpath",
  "742 - Stopped near traffic lights intersection",
  "758 - Stopped at yellow line",
] as const;

export type Code21Type = (typeof CODE21_TYPES)[number];

const VEHICLE_MAKES = [
  "Toyota",
  "Ford",
  "Hyundai",
  "Kia",
  "Mazda",
  "Mitsubishi",
  "Nissan",
  "Subaru",
  "Volkswagen",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Honda",
  "Lexus",
  "Holden",
] as const;

const VEHICLE_COLOURS = [
  "White",
  "Black",
  "Silver",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
] as const;

export interface Code21Request {
  id: string;
  officerNumber: string;
  serviceRequestNumber: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  offenceDate: string;
  offenceTime: string;
  requestTime: string;
  offenceType: Code21Type;
  code21Type: Code21Type;
  dispatchNotes: string;
  attendanceNotes: string;
  pin: string;
  vehicleMake: string;
  vehicleColour: string;
  vehicleRego: string;
  travelMode: "foot" | "vehicle";
  description: string;
  formattedDocument: string;
  status: "in_progress" | "complete";
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

export function getVehicleMakes(): readonly string[] {
  return VEHICLE_MAKES;
}

export function getVehicleColours(): readonly string[] {
  return VEHICLE_COLOURS;
}

export function searchFilterOptions(query: string, options: readonly string[], limit = 8): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options.slice(0, limit);
  }

  return options.filter((option) => option.toLowerCase().includes(normalized)).slice(0, limit);
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
