export const indexManifest = {
  users: [
    { key: { email_normalized: 1 }, options: { unique: true, name: "uq_users_email_norm" } },
    { key: { officer_number: 1 }, options: { unique: true, name: "uq_users_officer_number" } },
  ],
  auth_credentials: [
    { key: { user_id: 1, provider: 1 }, options: { unique: true, name: "uq_auth_user_provider" } },
  ],
  auth_sessions: [
    { key: { user_id: 1, expires_at: -1 }, options: { name: "ix_sessions_user_expires" } },
    { key: { expires_at: 1 }, options: { expireAfterSeconds: 0, name: "ttl_sessions_expiry" } },
  ],
  code21_forms: [
    { key: { officer_number: 1, created_at: -1 }, options: { name: "ix_code21_officer_created" } },
    { key: { dispatch_number: 1, created_at: -1 }, options: { name: "ix_code21_dispatch_created" } },
    { key: { status: 1, created_at: -1 }, options: { name: "ix_code21_status_created" } },
    { key: { created_at: -1 }, options: { name: "ix_code21_created" } },
    {
      key: { form_number: 1 },
      options: {
        unique: true,
        partialFilterExpression: { form_number: { $exists: true } },
        name: "uq_code21_form_number",
      },
    },
  ],
  parking_areas: [
    { key: { area_number: 1 }, options: { unique: true, name: "uq_parking_area_number" } },
  ],
  easypark_zones: [
    { key: { zone_code: 1 }, options: { unique: true, name: "uq_easypark_zone_code" } },
    { key: { geometry: "2dsphere" }, options: { name: "geo_easypark_geometry" } },
  ],
  addresses: [
    { key: { address_key: 1 }, options: { unique: true, name: "uq_address_key" } },
    { key: { "normalized.full_lc": 1 }, options: { name: "ix_addr_full_lc" } },
    {
      key: { "normalized.suburb_lc": 1, postcode: 1, street_number: 1 },
      options: { name: "ix_addr_suburb_postcode_number" },
    },
    { key: { coordinates: "2dsphere" }, options: { name: "geo_addr_coordinates" } },
  ],
};

export async function applyIndexes(db) {
  for (const [collectionName, indexes] of Object.entries(indexManifest)) {
    const collection = db.collection(collectionName);
    for (const index of indexes) {
      // eslint-disable-next-line no-await-in-loop
      await collection.createIndex(index.key, index.options);
    }
  }
}
