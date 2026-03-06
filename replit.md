# Patrol Zones — Melbourne CBD

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

## GitHub Codespaces
The project includes a fully automated Codespaces setup in `.devcontainer/`:
- **devcontainer.json** — Node 22 + Python 3.12, port forwarding (5000, 8081), VS Code extensions
- **setup.sh** — Runs automatically on container creation: `npm ci`, patch-package, Python deps, env file
- **start.sh** — Launches both servers with proper Codespaces URL detection

Usage in Codespaces:
1. Open the repo in GitHub Codespaces — setup runs automatically
2. Run `bash .devcontainer/start.sh` to start both servers
3. Or start individually: `bash .devcontainer/start.sh backend` / `bash .devcontainer/start.sh frontend`

## GitHub Repository
- Repo: https://github.com/TechCorp25/patrol-zones-melbourne
