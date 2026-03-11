import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const execFileAsync = promisify(execFile);
type AnyRow = Record<string, unknown>;

type LegacySnapshot = {
  users: AnyRow[];
  sessions: AnyRow[];
  code21_requests: AnyRow[];
  officers: AnyRow[];
  dispatches: AnyRow[];
  parking_areas: AnyRow[];
  easypark_zones: AnyRow[];
  addresses: AnyRow[];
};

type TargetCollections = Record<string, AnyRow[]>;

type SourceConfig =
  | { source: "postgres"; connectionString: string }
  | { source: "sqlite"; sqlitePath: string };

function deterministicObjectId(namespace: string, legacyValue: string): string {
  return createHash("md5").update(`${namespace}:${legacyValue}`).digest("hex").slice(0, 24);
}

function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

function parseMaybeDate(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "number") {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && String(value).trim() !== "") {
    const date = new Date(asNumber > 10_000_000_000 ? asNumber : asNumber * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function ensureDate(value: unknown, fallback = new Date()): Date {
  return parseMaybeDate(value) ?? fallback;
}

function toPoint(longitude: unknown, latitude: unknown): { type: "Point"; coordinates: [number, number] } | undefined {
  const lon = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
  return { type: "Point", coordinates: [lon, lat] };
}

async function readPostgresSnapshot(connectionString: string): Promise<LegacySnapshot> {
  const client = new Client({ connectionString });
  await client.connect();

  const read = async (table: keyof LegacySnapshot): Promise<AnyRow[]> => {
    const { rows } = await client.query(`SELECT * FROM ${table}`);
    return rows;
  };

  try {
    return {
      users: await read("users"),
      sessions: await read("sessions"),
      code21_requests: await read("code21_requests"),
      officers: await read("officers"),
      dispatches: await read("dispatches"),
      parking_areas: await read("parking_areas"),
      easypark_zones: await read("easypark_zones"),
      addresses: await read("addresses"),
    };
  } finally {
    await client.end();
  }
}

async function readSqliteSnapshot(sqlitePath: string): Promise<LegacySnapshot> {
  const read = async (table: keyof LegacySnapshot): Promise<AnyRow[]> => {
    const { stdout } = await execFileAsync("sqlite3", ["-json", sqlitePath, `SELECT * FROM ${table};`]);
    if (!stdout?.trim()) return [];

    try {
      const parsed = JSON.parse(stdout);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    users: await read("users"),
    sessions: await read("sessions"),
    code21_requests: await read("code21_requests"),
    officers: await read("officers"),
    dispatches: await read("dispatches"),
    parking_areas: await read("parking_areas"),
    easypark_zones: await read("easypark_zones"),
    addresses: await read("addresses"),
  };
}

function buildCollections(snapshot: LegacySnapshot): TargetCollections {
  const now = new Date();
  const userIdByLegacyId = new Map<string, string>();

  const users = snapshot.users.map((row) => {
    const legacyId = String(row.id ?? row.user_id ?? row.username ?? row.email ?? randomUUID());
    const _id = deterministicObjectId("users", legacyId);
    userIdByLegacyId.set(legacyId, _id);

    return {
      _id,
      email: String(row.email ?? ""),
      email_normalized: normalizeEmail(row.email),
      username: row.username ? String(row.username) : undefined,
      officer_number: String(row.officer_number ?? ""),
      display_name: row.display_name ? String(row.display_name) : undefined,
      roles: Array.isArray(row.roles) ? row.roles : [String(row.role ?? "officer")],
      status: String(row.status ?? "active"),
      created_at: ensureDate(row.created_at, now),
      updated_at: ensureDate(row.updated_at, now),
      legacy_pk: legacyId,
    };
  });

  const auth_credentials = snapshot.users.map((row) => {
    const legacyId = String(row.id ?? row.user_id ?? row.username ?? row.email ?? "");
    return {
      _id: deterministicObjectId("auth_credentials", legacyId),
      user_id: userIdByLegacyId.get(legacyId),
      provider: "local",
      password_hash: row.password_hash ?? row.password ?? null,
      password_algo: "unknown",
      mfa: {
        enabled: false,
        totp_secret_encrypted: null,
      },
      failed_login_count: Number(row.failed_login_count ?? 0),
      last_login_at: parseMaybeDate(row.last_login_at),
      created_at: ensureDate(row.created_at, now),
      updated_at: ensureDate(row.updated_at, now),
    };
  });

  const auth_sessions = snapshot.sessions.map((row) => {
    const userLegacyId = String(row.user_id ?? "");
    const sessionToken = String(row.token ?? row.id ?? randomUUID());
    return {
      _id: deterministicObjectId("auth_sessions", sessionToken),
      user_id: userIdByLegacyId.get(userLegacyId),
      refresh_token_hash: String(row.token_hash ?? row.token ?? ""),
      created_at: ensureDate(row.created_at, now),
      expires_at: ensureDate(row.expires_at, now),
      revoked_at: parseMaybeDate(row.revoked_at),
      migration_warnings: userIdByLegacyId.has(userLegacyId) ? [] : ["missing_user_reference"],
    };
  });

  const officer_refs = snapshot.officers.map((row) => ({
    _id: deterministicObjectId("officer_refs", String(row.officer_number ?? "")),
    officer_number: String(row.officer_number ?? ""),
    display_name: row.display_name ? String(row.display_name) : undefined,
    rank: row.rank ? String(row.rank) : undefined,
    active: Boolean(row.active ?? true),
    user_id: row.user_id ? userIdByLegacyId.get(String(row.user_id)) : undefined,
    updated_at: ensureDate(row.updated_at, now),
  }));

  const dispatch_refs = snapshot.dispatches.map((row) => ({
    _id: deterministicObjectId("dispatch_refs", String(row.dispatch_number ?? row.id ?? "")),
    dispatch_number: String(row.dispatch_number ?? ""),
    source: row.source ? String(row.source) : undefined,
    status: row.status ? String(row.status) : undefined,
    received_at: parseMaybeDate(row.received_at),
    updated_at: ensureDate(row.updated_at, now),
  }));

  const code21_forms = snapshot.code21_requests.map((row) => {
    const requestCoordinates = toPoint(row.longitude, row.latitude);
    const officerNumber = String(row.officer_number ?? "");
    const dispatchNumber = String(row.service_request_number ?? row.dispatch_number ?? "");

    return {
      _id: deterministicObjectId("code21_forms", String(row.id ?? `${officerNumber}-${dispatchNumber}-${row.created_at ?? ""}`)),
      form_number: row.form_number ? String(row.form_number) : undefined,
      officer_number: officerNumber,
      dispatch_number: dispatchNumber,
      status: String(row.status ?? "in_progress"),
      request: {
        address_label: row.address_label ? String(row.address_label) : undefined,
        coordinates: requestCoordinates,
        request_time: parseMaybeDate(row.request_time),
        offence_type: row.offence_type ? String(row.offence_type) : undefined,
        code21_type: row.code21_type ? String(row.code21_type) : undefined,
        travel_mode: row.travel_mode ? String(row.travel_mode) : undefined,
        description: row.description ? String(row.description) : undefined,
      },
      vehicle: {
        make: row.vehicle_make ? String(row.vehicle_make) : undefined,
        model: row.vehicle_model ? String(row.vehicle_model) : undefined,
        colour: row.vehicle_colour ? String(row.vehicle_colour) : undefined,
        rego: row.vehicle_rego ? String(row.vehicle_rego) : undefined,
      },
      notes: {
        dispatch_notes: row.dispatch_notes ? String(row.dispatch_notes) : undefined,
        attendance_notes: row.attendance_notes ? String(row.attendance_notes) : undefined,
      },
      audit_snapshot: {
        officer: { officer_number: officerNumber },
        dispatch: { dispatch_number: dispatchNumber },
      },
      created_at: ensureDate(row.created_at, now),
      updated_at: ensureDate(row.updated_at ?? row.created_at, now),
      deleted_at: parseMaybeDate(row.deleted_at),
    };
  });

  const parking_areas = snapshot.parking_areas.map((row) => ({
    _id: deterministicObjectId("parking_areas", String(row.area_number ?? row.id ?? "")),
    area_number: String(row.area_number ?? ""),
    name: row.name ? String(row.name) : row.label ? String(row.label) : undefined,
    status: String(row.status ?? "active"),
    updated_at: ensureDate(row.updated_at, now),
  }));

  const easypark_zones = snapshot.easypark_zones.map((row) => ({
    _id: deterministicObjectId("easypark_zones", String(row.zone_code ?? row.id ?? "")),
    zone_code: String(row.zone_code ?? ""),
    zone_name: String(row.zone_name ?? ""),
    external_provider: "easypark",
    area_number: row.area_number ? String(row.area_number) : undefined,
    updated_at: ensureDate(row.updated_at, now),
  }));

  const addresses = snapshot.addresses.map((row) => ({
    _id: deterministicObjectId("addresses", String(row.address_key ?? row.id ?? row.full_address ?? "")),
    address_key: String(row.address_key ?? ""),
    full_address: String(row.full_address ?? ""),
    suburb: String(row.suburb ?? ""),
    postcode: String(row.postcode ?? ""),
    normalized: {
      street_name_lc: String(row.street_name ?? "").toLowerCase(),
      suburb_lc: String(row.suburb ?? "").toLowerCase(),
      full_lc: String(row.full_address ?? "").toLowerCase(),
    },
    coordinates: toPoint(row.longitude, row.latitude),
    updated_at: ensureDate(row.updated_at, now),
  }));

  return {
    users,
    auth_credentials,
    auth_sessions,
    officer_refs,
    dispatch_refs,
    code21_forms,
    parking_areas,
    easypark_zones,
    addresses,
  };
}

async function writeNdjson(outDir: string, collections: TargetCollections): Promise<void> {
  await mkdir(outDir, { recursive: true });

  await Promise.all(
    Object.entries(collections).map(async ([collectionName, docs]) => {
      const filePath = path.join(outDir, `${collectionName}.ndjson`);
      const lines = docs.map((doc) => JSON.stringify(doc)).join("\n");
      await writeFile(filePath, lines.length ? `${lines}\n` : "", "utf8");
    }),
  );
}

function parseArgs(argv: string[]): SourceConfig & { outDir: string; dryRun: boolean } {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith("--") && value && !value.startsWith("--")) {
      args.set(key, value);
      i += 1;
    }
  }

  const source = (args.get("--source") ?? "postgres") as "postgres" | "sqlite";
  const outDir = args.get("--out") ?? "scripts/mongodb/out";
  const dryRun = argv.includes("--dry-run");

  if (source === "postgres") {
    const connectionString = args.get("--connection-string") ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Postgres source requires --connection-string or DATABASE_URL");
    }

    return { source, connectionString, outDir, dryRun };
  }

  const sqlitePath = args.get("--sqlite-path");
  if (!sqlitePath) {
    throw new Error("SQLite source requires --sqlite-path");
  }

  return { source, sqlitePath, outDir, dryRun };
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const snapshot = config.source === "postgres"
    ? await readPostgresSnapshot(config.connectionString)
    : await readSqliteSnapshot(config.sqlitePath);

  const collections = buildCollections(snapshot);

  if (!config.dryRun) {
    await writeNdjson(config.outDir, collections);
  }

  const summary = Object.fromEntries(Object.entries(collections).map(([name, docs]) => [name, docs.length]));
  console.log(JSON.stringify({ source: config.source, dryRun: config.dryRun, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
