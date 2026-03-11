# Patrol Zones — Melbourne CBD

> **Build Type Update (2026):** This repository now contains a **clean-room Expo SDK 55 + EAS development-build target** under `my-app/`. The original root Expo/Replit app remains as legacy behavioral reference only and is not the intended runtime for new development.

## Current Intention
- Treat root app code as source-reference behavior only.
- Build and run the new mobile app from `my-app/` using Expo Router + EAS dev client.
- Keep backend concerns separated in `my-app/server/` with shared contracts in `my-app/shared/`.
- Avoid Replit-domain runtime coupling and Expo proxy host assumptions in all new work.

## New Clean-Room Build Targets (`my-app/`)

### Mobile
- Expo SDK 55 + Expo Router
- EAS development build workflow (`expo start --dev-client`)
- Environment-driven API config (`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_ENVIRONMENT`)

### Server
- Express 5 service in `my-app/server/`
- Independent scripts for lint/typecheck/test/check

### Primary Commands
```bash
cd my-app
npm run dev
npm run lint
npm run typecheck
npm run test
npm run doctor
```

```bash
cd my-app/server
npm run dev
npm run check
```

## Release Planning
See `docs/release-work-plan.md` for the deployment plan, platform recommendation, phased rollout, and second-pass readiness audit.

## Legacy Notes
The remaining sections below describe the original app behavior and domain context, which should be used for parity/reference during migration.

## Project Overview
A mobile-first React Native (Expo) app for Melbourne City Council patrol officers. Provides real-time GPS location on a Melbourne CBD patrol zone map, a live magnetic compass, and daily zone assignment management.

## Architecture

### Frontend (Expo + React Native)
- **Framework**: Expo SDK 54, Expo Router (file-based routing)
- **Maps**: react-native-maps@1.18.0 (pinned — required)
- **Location**: expo-location (GPS + heading watchdog)
- **Fonts**: @expo-google-fonts/roboto-mono
- **Animation**: react-native-reanimated
- **Storage**: @react-native-async-storage/async-storage
- **Icons**: @expo/vector-icons (Ionicons, MaterialCommunityIcons)

### Backend (Express + TypeScript)
- Serves landing page and Expo manifest
- Port 5000

## Key Files

| File | Purpose |
|------|---------|
| `app/index.tsx` | Main map screen — GPS, zones, compass, panel, zone info modal |
| `app/_layout.tsx` | Root layout with fonts, providers |
| `constants/zones.ts` | All 15 patrol zone polygon definitions + patrol streets + boundaries + heading labels |
| `constants/streets.ts` | Melbourne CBD street geometry — 18 streets defined as polylines through real OSM intersection coordinates; `getCurrentStreetPosition()` finds closest segment across all streets |
| `constants/streetNumbers.ts` | Authoritative street number block ranges (543 markers) from City of Melbourne data; `getStreetNumberMarkers()` generates positioned map markers |
| `constants/parkingZones.ts` | Parking zone lookup — 711 zones across 491 street segments (Batch 1-7 merged); `getParkingZones(street, from, to)` returns matching zone numbers |
| `constants/colors.ts` | Dark navy theme colors |
| `components/Compass.tsx` | Animated magnetic compass widget |
| `components/PatrolMap.tsx` | Native map with zone polygons (react-native-maps) |
| `components/PatrolMap.web.tsx` | Web stub (native maps not supported) |
| `components/ZoneInfoModal.tsx` | Modal overlay showing zone boundaries + patrol streets |

## Patrol Zones (15 total)

All zones use proper 4-point polygon coordinates derived from OpenStreetMap intersection data, matching Melbourne's ~30° rotated Hoddle Grid. Each zone is a quadrilateral with corners at actual street intersection coordinates (not axis-aligned rectangles):

| Zone | Boundaries |
|------|-----------|
| FLAGSTAFF | Spencer–William, Lonsdale–La Trobe |
| SPENCER | Spencer–William, Little Bourke–Collins |
| RIALTO | Spencer–William, Collins–Flinders |
| SUPREME | William–Queen, La Trobe–Lonsdale |
| TAVISTOCK | William–Queen, Lonsdale–Collins |
| TITLES | Queen–Elizabeth, La Trobe–Lonsdale |
| HARDWARE | Queen–Elizabeth, Lonsdale–Collins |
| BANKS | Queen–Elizabeth, Little Collins–Flinders |
| THE MAC | Elizabeth–Swanston, Franklin–La Trobe |
| LIBRARY | Elizabeth–Russell, La Trobe–Little Bourke |
| CHINA TOWN | Elizabeth–Russell, Little Bourke–Collins |
| CITY SQUARE | Elizabeth–Russell, Collins–Flinders |
| PRINCESS | Russell–Spring, Victoria–Bourke |
| HYATT | Russell–Exhibition, Bourke–Flinders |
| TWIN TOWERS | Exhibition–Spring, Bourke–Flinders |

## Features
- Live GPS position (updates every 2s / 3m distance)
- Real-time zone detection (point-in-polygon ray casting)
- Magnetic compass with Melbourne CBD street labels (La Trobe=N, Spring=E, Flinders=S, Spencer=W) — 4 cardinal directions only, no sub-directional points
- Map type toggle (iOS: Dark/Light/Satellite/Hybrid; Android: Standard/Satellite/Hybrid) with dark/light style switching
- Zone assignment (persisted via AsyncStorage)
- Zone info modal showing patrol streets, laneways, and boundary details
- Out-of-zone warnings
- Coordinate display with accuracy indicator
- Current street position display showing nearest street name, which block (between cross-streets), and which side (East/West for N-S streets, North/South for E-W streets) — uses perpendicular projection onto 17 Melbourne CBD street centerlines with 35m max detection radius
- Compass heading with Melbourne CBD grid-relative direction labels (Toward La Trobe/Spring/Flinders/Spencer)
- Parking zone numbers displayed for the current street segment (711 zones across 491 segments, amber-colored "P" prefix)
- Collapsible bottom panel — minimize button (chevron-down) hides the panel entirely to maximize map view; pull-tab with swipe-up gesture or tap restores it. Overlay buttons (map type, zone info, locate) animate position smoothly with panel state

## Zone Audit (Completed)
All 15 patrol zone `patrolStreets` definitions have been audited and corrected against Melbourne CBD geography and parking zone data. Key fixes applied:
- **SUPREME**: A'Beckett split at Wills Street (added William→Wills segment); La Trobe split at Wills; LL/Lonsdale corrected from "Elizabeth→Queen" to "Queen→William"; Queen A'Beckett→Franklin moved to TITLES; William Street added
- **TITLES**: A'Beckett split at Anthony Street; Franklin split at Anthony; Queen A'Beckett→Franklin added (from SUPREME); Little Lonsdale and Lonsdale segments added (Queen→Elizabeth)
- **TAVISTOCK**: All main streets corrected from "Elizabeth→Queen" to "Queen→William"; Elizabeth Street removed (belongs to CHINA TOWN); Collins added with Market Street split; Lonsdale added; William Street segments added; Market Street added
- **CHINA TOWN**: Elizabeth expanded from 1 to 3 segments (LB→Bourke, Bourke→LC, LC→Collins)
- **SPENCER**: Bourke, Little Collins, Little Bourke expanded with King→Spencer segments; Spencer Street added (3 segments); Godfrey Street added; King Collins→LC added
- **RIALTO**: Moved above-Collins streets (Bourke, LC, Spencer LC-Bourke, Godfrey) to SPENCER; added Flinders Lane, Flinders Street, King, William segments within Collins-Flinders territory
- **HARDWARE**: Lonsdale added (Queen→Elizabeth); Queen Lonsdale→LB added
- **HYATT**: Russell expanded from 1 to 3 segments (Flinders→FLane, FLane→Collins, Collins→LC); Exhibition removed (belongs to TWIN TOWERS)
- **TWIN TOWERS**: Exhibition Street added (4 segments: Flinders→FLane, FLane→Collins, Collins→LC, LC→Bourke)
- **CITY SQUARE**: Russell removed (boundary not included); W boundary label corrected from "Swanston" to "Elizabeth"

## Address Data (Corrected)
All 18 street address arrays have been corrected to match actual Melbourne CBD numbering, verified against real landmark addresses:
- **N-S streets** (Flinders=2, increasing northward): Swanston 100@Collins (Town Hall), 37@FLane (Nicholson Bldg), 328@StateLib; Elizabeth 82@Collins, 115@LCollins, 361@LaTrobe; Queen 100@Collins (ANZ Gothic Bank); William 100@LCollins (Australian Club); Russell 180@LBourke (Total House); Exhibition 186@LBourke
- **E-W streets** (Spring=2, increasing westward): Collins 394@Queen, 459@William, 555@King; Bourke 90@Exhibition, 250@Swanston, 350@Elizabeth (GPO); Lonsdale 300@Swanston (Melbourne Central)
- Address markers styled as Google Maps grey text (no badge), 22m offset from street centre with 8m perpendicular nudge to separate N-S and E-W markers at intersections; dark/light variants adapt to map type

## Granular Street Number Markers (Integrated)
- `constants/streetNumbers.ts` — 886 representative street numbers selected from 7k+ addresses (City of Melbourne Open Data), ~3-4 per block per side spaced ~30 numbers apart
- `selectRepresentativeNumbers()` picks first, last, and evenly-spaced intermediate numbers from each block side (max 5 per side)
- All 886 markers pre-computed at module level and rendered as a stable set (no viewport churn) to prevent iOS crashes
- Two-tier zoom: zone polygons at `latitudeDelta < 0.012`, street numbers at `latitudeDelta < 0.004` (simple boolean toggle)
- High-contrast text: white (#FFFFFF) bold with dark shadow on dark maps, dark (#1A1A2E) bold with light shadow on light maps; 13px bold
- `tracksViewChanges={false}` for all markers — static bitmaps, no per-frame re-rendering
- Data sourced from `scripts/out/melbourne_cbd_street_blocks.json`

## Street Block Data Generation
The `scripts/generate_melbourne_cbd_street_blocks.py` script fetches authoritative data from City of Melbourne Open Data:
- **Road Segments** (`road-segment` dataset): Polygon corridors with `streetname`, `streetfrom`, `streetto` — converted to centerlines via polygon edge midpoint extraction for side-of-street inference
- **Street Addresses** (`street-addresses` dataset): Streamed via `/exports/jsonl` endpoint with `in_bbox()` spatial filter to avoid 10k offset cap
- Outputs: `scripts/out/melbourne_cbd_street_blocks.json` — 198 streets, ~14k street numbers, organized by block (between-streets) and side (north/south or east/west)
- Run: `python scripts/generate_melbourne_cbd_street_blocks.py --outdir scripts/out --single`
- Dependencies: requests, shapely, rtree, pyproj, tqdm, orjson (+ libspatialindex system dep)

## Running the App
- Start Backend: `npm run server:dev` (port 5000)
- Start Frontend: `npm run expo:dev` (port 8081)
- Scan QR from Replit's URL bar to test on device via Expo Go

## Google Places + Route Optimization Integration (JavaScript Backend)

If TypeScript is not available for your API service, use **Node.js + Express (plain JavaScript)** and integrate Google APIs server-side.

### Recommended API stack

1. **Google Places API (New) for address autocomplete + place details**
   - Client calls your backend endpoint (for example `/api/places/autocomplete?text=...`).
   - Backend calls Google Places using a server key and returns only fields needed by the app.

2. **Google Routes API for route planning and waypoint optimization**
   - Use `computeRoutes` with `optimizeWaypointOrder: true` when officers have multiple stops.
   - Return route polyline, distance, duration, and optimized waypoint order to the app.

3. **Keep all keys on the server**
   - Do not call Google Places/Routes directly from Expo with raw API keys.
   - Store credentials in environment variables and rotate regularly.

### Environment variables (backend)

```bash
GOOGLE_MAPS_API_KEY=your_server_key
GOOGLE_PLACES_BASE_URL=https://places.googleapis.com
GOOGLE_ROUTES_BASE_URL=https://routes.googleapis.com
```

### Express (JavaScript) endpoint example: Places autocomplete

```js
app.get('/api/places/autocomplete', async (req, res) => {
  const text = String(req.query.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const response = await fetch(
    `${process.env.GOOGLE_PLACES_BASE_URL}/v1/places:autocomplete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      },
      body: JSON.stringify({
        input: text,
        languageCode: 'en',
        locationBias: {
          rectangle: {
            low: { latitude: -37.82873974117791, longitude: 144.91809861502747 },
            high: { latitude: -37.78052835130693, longitude: 144.99066183541663 },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    return res.status(response.status).json({ error: 'places autocomplete failed' });
  }

  const data = await response.json();
  const suggestions = (data.suggestions || []).map((s, i) => ({
    id: s.placePrediction?.placeId || `s-${i}`,
    label: s.placePrediction?.text?.text || '',
    placeId: s.placePrediction?.placeId || null,
  }));

  return res.json({ suggestions });
});
```

### Express (JavaScript) endpoint example: route optimization

```js
app.post('/api/routes/optimize', async (req, res) => {
  const { origin, destination, intermediates = [] } = req.body || {};

  const response = await fetch(
    `${process.env.GOOGLE_ROUTES_BASE_URL}/directions/v2:computeRoutes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        intermediates: intermediates.map((p) => ({ location: { latLng: p } })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        optimizeWaypointOrder: true,
      }),
    }
  );

  if (!response.ok) {
    return res.status(response.status).json({ error: 'route optimization failed' });
  }

  const data = await response.json();
  return res.json(data);
});
```

### Expo client call pattern

```js
fetch(`/api/places/autocomplete?text=${encodeURIComponent('240 coll')}`)
  .then((r) => r.json())
  .then((data) => console.log(data.suggestions))
  .catch((err) => console.error(err));
```

Use debounce (250-400ms) in the search input, and add loading + empty + error states.

## AI Assistant Workflow Artifacts

For AI-assisted repository health reviews, use:
- `docs/symphony-repo-assessment-prompt.md`
- `docs/symphony-assessment-report.md`

These are workflow artifacts only and are not wired into application runtime.

## Developer Tooling Baseline
- Use current Expo/React Native-compatible VS Code tooling with support for Expo web debugging, EAS commands, and modern Metro verification behavior.
- Validate Node.js major version compatibility with Expo SDK 54 before starting local packager tasks.

## Security Operations

- Secret rotation workflow: see `SECURITY_SECRETS.md`.