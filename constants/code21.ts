import { getAllAddressOptions } from "@/constants/streetNumbers";
import { CODE21_TYPES, type Code21Type } from "./offenceTypes";
export type { Code21Type };
export { CODE21_TYPES };

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

function squaredDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = a.latitude - b.latitude;
  const dLng = a.longitude - b.longitude;
  return (dLat * dLat) + (dLng * dLng);
}

function routeCostFrom(
  origin: { latitude: number; longitude: number },
  route: Code21Request[],
): number {
  if (route.length === 0) return 0;

  let total = squaredDistance(origin, route[0]);
  for (let index = 1; index < route.length; index += 1) {
    total += squaredDistance(route[index - 1], route[index]);
  }

  return total;
}

function optimiseWithTwoOpt(
  origin: { latitude: number; longitude: number },
  route: Code21Request[],
): Code21Request[] {
  const candidate = [...route];
  const stopCount = candidate.length;

  if (stopCount < 4) return candidate;

  let bestCost = routeCostFrom(origin, candidate);
  let improved = true;
  let passes = 0;
  const maxPasses = Math.min(8, stopCount);

  while (improved && passes < maxPasses) {
    improved = false;
    passes += 1;

    for (let i = 0; i < stopCount - 2; i += 1) {
      for (let k = i + 1; k < stopCount - 1; k += 1) {
        const reordered = [
          ...candidate.slice(0, i),
          ...candidate.slice(i, k + 1).reverse(),
          ...candidate.slice(k + 1),
        ];

        const nextCost = routeCostFrom(origin, reordered);
        if (nextCost + Number.EPSILON < bestCost) {
          candidate.splice(0, candidate.length, ...reordered);
          bestCost = nextCost;
          improved = true;
        }
      }
    }
  }

  return candidate;
}

export function optimiseCode21Route(
  currentLocation: { latitude: number; longitude: number },
  requests: Code21Request[],
): Code21Request[] {
  if (requests.length < 2) return [...requests];

  const pending = [...requests];
  const greedyOrder: Code21Request[] = [];
  let cursor = { ...currentLocation };

  while (pending.length > 0) {
    let nextIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    pending.forEach((request, index) => {
      const distance = squaredDistance(request, cursor);
      if (distance < bestDistance) {
        bestDistance = distance;
        nextIndex = index;
      }
    });

    const [next] = pending.splice(nextIndex, 1);
    greedyOrder.push(next);
    cursor = { latitude: next.latitude, longitude: next.longitude };
  }

  return optimiseWithTwoOpt(currentLocation, greedyOrder);
}
