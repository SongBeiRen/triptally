import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "triptally.db");

/**
 * The schema is bootstrapped with raw `CREATE TABLE IF NOT EXISTS` statements so a
 * fresh clone runs with `npm run dev` alone — no migration step. The statements
 * mirror src/lib/db/schema.ts (drizzle-kit is still available via `npm run db:push`).
 */
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_token TEXT NOT NULL,
  budget TEXT,
  vibes TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  deadline INTEGER,
  anonymize INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS date_options (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS date_votes (
  option_id TEXT NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  PRIMARY KEY (option_id, participant_id)
);
CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  blurb TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS destination_votes (
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  PRIMARY KEY (destination_id, participant_id)
);
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  added_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS place_votes (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY (place_id, participant_id)
);
CREATE TABLE IF NOT EXISTS itineraries (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  generated_by TEXT NOT NULL,
  destination TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

function createConnection() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  // busy_timeout first: the build evaluates route modules in parallel workers,
  // so concurrent connections must wait for each other instead of failing.
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP_SQL);
  return sqlite;
}

// Keep one connection across dev hot reloads (turbopack re-evaluates modules).
type SqliteDatabase = Database.Database;
const globalForDb = globalThis as unknown as { __ttSqlite?: SqliteDatabase };

export const sqlite = globalForDb.__ttSqlite ?? createConnection();
if (!globalForDb.__ttSqlite) globalForDb.__ttSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
