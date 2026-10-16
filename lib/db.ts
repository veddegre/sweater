import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dataDir, dbPath, uploadDir } from "@/lib/paths";

type SettingsRow = {
  title: string;
  year: number;
  tagline: string;
  voting_open: number;
  submissions_open: number;
  results_visible: number;
  allowed_domain: string;
  theme: string;
};

const globalForDb = globalThis as unknown as { sweaterDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.sweaterDb) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(uploadDir, { recursive: true });
    const database = new DatabaseSync(dbPath, { timeout: 5000 });
    database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        title TEXT NOT NULL,
        year INTEGER NOT NULL,
        tagline TEXT NOT NULL,
        voting_open INTEGER NOT NULL DEFAULT 0,
        submissions_open INTEGER NOT NULL DEFAULT 1,
        results_visible INTEGER NOT NULL DEFAULT 1,
        allowed_domain TEXT NOT NULL DEFAULT 'gvsu.edu, mail.gvsu.edu',
        theme TEXT NOT NULL DEFAULT 'holiday'
      );

      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        department TEXT NOT NULL DEFAULT '',
        caption TEXT NOT NULL DEFAULT '',
        image_file TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS entries_email ON entries(email);

      -- A ballot stays after its entry is removed, so that browser cannot vote again.
      CREATE TABLE IF NOT EXISTS votes (
        voter_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        fingerprint TEXT NOT NULL UNIQUE,
        entry_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS votes_entry ON votes(entry_id);

      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        place INTEGER NOT NULL,
        name TEXT NOT NULL,
        votes INTEGER NOT NULL,
        percent INTEGER NOT NULL,
        image_file TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS results_year ON results(year, place);
    `);
    migrate(database);

    const existing = database.prepare("SELECT id FROM settings WHERE id = 1").get();
    if (!existing) {
      database
        .prepare(
          `INSERT INTO settings
            (id, title, year, tagline, voting_open, submissions_open, results_visible, allowed_domain)
           VALUES (1, ?, ?, ?, 0, 1, 1, 'gvsu.edu, mail.gvsu.edu')`,
        )
        .run(
          "Holiday Apparel Competition",
          new Date().getFullYear(),
          "One vote for your favorite holiday apparel.",
        );
    }

    globalForDb.sweaterDb = database;
  }

  migrate(globalForDb.sweaterDb);
  return globalForDb.sweaterDb;
}

function migrate(database: DatabaseSync): void {
  const columns = database.prepare("PRAGMA table_info(votes)").all() as { name: string }[];
  const names = new Set(columns.map((column) => String(column.name)));
  const current = database.prepare("SELECT title, tagline, allowed_domain FROM settings WHERE id = 1").get() as
    | { title: string; tagline: string; allowed_domain: string }
    | undefined;
  if (current?.allowed_domain === "gvsu.edu") {
    database.prepare("UPDATE settings SET allowed_domain = ? WHERE id = 1").run("gvsu.edu, mail.gvsu.edu");
  }
  if (current?.title === "Holiday Sweater Contest") {
    database.prepare("UPDATE settings SET title = ? WHERE id = 1").run("Holiday Apparel Competition");
  }
  if (current?.tagline === "One vote for the finest holiday knit in Information Technology.") {
    database.prepare("UPDATE settings SET tagline = ? WHERE id = 1").run("One vote for your favorite holiday apparel.");
  }

  const settingsColumns = database.prepare("PRAGMA table_info(settings)").all() as { name: string }[];
  if (!settingsColumns.some((column) => column.name === "theme")) {
    database.exec("ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'holiday'");
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      place INTEGER NOT NULL,
      name TEXT NOT NULL,
      votes INTEGER NOT NULL,
      percent INTEGER NOT NULL,
      image_file TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS results_year ON results(year, place);
  `);

  if (names.has("fingerprint") && !names.has("email")) return;
  database.exec(`
    DROP TABLE IF EXISTS votes;
    DROP TABLE IF EXISTS otps;
    DROP TABLE IF EXISTS mailbox;
    CREATE TABLE votes (
      voter_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL UNIQUE,
      entry_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS votes_entry ON votes(entry_id);
  `);
}

export function getSettings(): SettingsRow {
  const row = getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow | undefined;
  if (!row) {
    throw new Error("Contest settings are missing.");
  }
  return row;
}
