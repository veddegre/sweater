import crypto from "node:crypto";
import { connection } from "next/server";
import { digestMaterial, readVoterCookie } from "@/lib/auth";
import { getDb, getSettings } from "@/lib/db";
import { deleteUpload, duplicateUpload, removeStoredUpload, savePhoto } from "@/lib/uploads";
import type {
  AdminEntry,
  AdminOverview,
  ContestSettings,
  EntryStatus,
  Fail,
  Ok,
  PastWinner,
  PublicContest,
  PublicEntry,
  SavedResult,
} from "@/lib/types";
import { describeDomains, emailOnDomain, normalizeDomainList, normalizeEmail, requireText } from "@/lib/validators";
import { isThemeId, themeCopy } from "@/lib/themes";

type EntryRow = {
  id: string;
  name: string;
  email: string | null;
  image_file: string;
  status: EntryStatus;
  created_at: string;
};

type VoteCount = { entry_id: string; n: number };
type BallotRow = { voter_id: string; created_at: string; name: string | null };
type ExistingVote = { voter_id: string; entry_id: string; name: string | null };

const STATUSES = new Set<EntryStatus>(["pending", "approved", "rejected"]);

function fail(status: number, error: string): Fail {
  return { ok: false, status, error };
}

function voteCounts(): Map<string, number> {
  const rows = getDb().prepare("SELECT entry_id, COUNT(*) AS n FROM votes GROUP BY entry_id").all() as VoteCount[];
  return new Map(rows.map((row) => [row.entry_id, Number(row.n)]));
}

function rankPlaces(counts: number[]): number[] {
  const order = [...counts].sort((a, b) => b - a);
  return counts.map((count) => order.indexOf(count) + 1);
}

function percents(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - floors[index], count: counts[index] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (left <= 0) break;
    floors[item.index] += 1;
    left -= 1;
  }
  return floors;
}

function settingsView(): ContestSettings {
  const settings = getSettings();
  return {
    title: settings.title,
    year: Number(settings.year),
    tagline: settings.tagline,
    theme: themeCopy(settings.theme).id,
    votingOpen: settings.voting_open === 1,
    submissionsOpen: settings.submissions_open === 1,
    allowedDomain: settings.allowed_domain,
  };
}

function approvedEntries(): EntryRow[] {
  return getDb()
    .prepare("SELECT * FROM entries WHERE status = 'approved'")
    .all() as EntryRow[];
}

export async function countPending(): Promise<number> {
  await connection();
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM entries WHERE status = 'pending'").get() as { n: number };
  return Number(row.n);
}

export async function getPublicContest(): Promise<PublicContest> {
  await connection();
  const cookie = await readVoterCookie();
  let viewer: PublicContest["viewer"] = null;
  if (cookie) {
    const vote = getDb().prepare("SELECT entry_id FROM votes WHERE voter_id = ?").get(cookie.voterId) as
      | { entry_id: string }
      | undefined;
    if (vote) viewer = { entryId: String(vote.entry_id) };
  }
  return buildPublicContest(viewer);
}

export function buildPublicContest(viewer: PublicContest["viewer"]): PublicContest {
  const settings = settingsView();
  const counts = voteCounts();
  const rows = approvedEntries();
  const tally = rows.map((row) => counts.get(row.id) ?? 0);
  const shares = percents(tally);
  const totalVotes = tally.reduce((sum, count) => sum + count, 0);
  const show = !settings.votingOpen;
  const places = show && totalVotes > 0 ? rankPlaces(tally) : tally.map(() => null);

  const entries: PublicEntry[] = rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    imageUrl: `/api/media/${row.image_file}`,
    votes: show ? tally[index] : null,
    percent: show ? shares[index] : null,
    place: places[index],
  }));

  entries.sort((a, b) => {
    if (show) return (a.place ?? 99) - (b.place ?? 99) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });

  return {
    ...settings,
    resultsVisible: show,
    totalVotes: show ? totalVotes : 0,
    entries,
    viewer,
    pastWinners: loadPastWinners(settings.year),
  };
}

function toAdminEntry(row: EntryRow, counts: Map<string, number>): AdminEntry {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    imageUrl: `/api/media/${row.image_file}`,
    status: row.status,
    votes: counts.get(row.id) ?? 0,
    place: null,
    createdAt: row.created_at,
  };
}

function withPlaces(entries: AdminEntry[]): AdminEntry[] {
  const total = entries.reduce((sum, entry) => sum + entry.votes, 0);
  if (total === 0) return entries;
  const places = rankPlaces(entries.map((entry) => entry.votes));
  return entries
    .map((entry, index) => ({ ...entry, place: places[index] }))
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || a.name.localeCompare(b.name));
}

type ResultRow = {
  year: number;
  place: number;
  name: string;
  votes: number;
  percent: number;
  image_file: string;
  saved_at: string;
};

function loadPastWinners(currentYear: number): PastWinner[] {
  const rows = getDb()
    .prepare(
      `SELECT year, name, votes, image_file FROM results
       WHERE place = 1 AND year != ?
       ORDER BY year DESC, name ASC`,
    )
    .all(currentYear) as ResultRow[];
  return rows.map((row) => ({
    year: Number(row.year),
    name: row.name,
    votes: Number(row.votes),
    imageUrl: row.image_file ? `/api/media/${row.image_file}` : "",
  }));
}

function loadHistory(): SavedResult[] {
  const rows = getDb()
    .prepare("SELECT year, place, name, votes, percent, image_file, saved_at FROM results ORDER BY year DESC, place ASC, name ASC")
    .all() as ResultRow[];
  const years = new Map<number, SavedResult>();
  for (const row of rows) {
    const year = Number(row.year);
    let bucket = years.get(year);
    if (!bucket) {
      bucket = { year, savedAt: row.saved_at, entries: [] };
      years.set(year, bucket);
    }
    bucket.entries.push({
      place: Number(row.place),
      name: row.name,
      votes: Number(row.votes),
      percent: Number(row.percent),
      imageUrl: row.image_file ? `/api/media/${row.image_file}` : "",
    });
  }
  return [...years.values()];
}

function saveYearResults(year: number): void {
  const rows = approvedEntries();
  const counts = voteCounts();
  const tally = rows.map((row) => counts.get(row.id) ?? 0);
  const total = tally.reduce((sum, count) => sum + count, 0);
  if (rows.length === 0 || total === 0) return;
  const shares = percents(tally);
  const places = rankPlaces(tally);
  const savedAt = new Date().toISOString();
  const copies = rows.map((row) => duplicateUpload(row.image_file) ?? "");
  const db = getDb();
  const previous = db.prepare("SELECT image_file FROM results WHERE year = ?").all(year) as { image_file: string }[];
  const insert = db.prepare(
    `INSERT INTO results (id, year, place, name, votes, percent, image_file, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM results WHERE year = ?").run(year);
    rows.forEach((row, index) => {
      insert.run(crypto.randomUUID(), year, places[index], row.name, tally[index], shares[index], copies[index], savedAt);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    for (const file of copies) {
      if (file) removeStoredUpload(file);
    }
    throw error;
  }
  const kept = new Set(copies);
  for (const row of previous) {
    if (row.image_file && !kept.has(row.image_file)) removeStoredUpload(row.image_file);
  }
}

function ensureClosedSnapshot(): void {
  const settings = getSettings();
  if (settings.voting_open === 1) return;
  const existing = getDb().prepare("SELECT 1 AS n FROM results WHERE year = ? LIMIT 1").get(settings.year);
  if (existing) return;
  saveYearResults(Number(settings.year));
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function currentResultsCsv(): { filename: string; body: string } {
  const settings = settingsView();
  const rows = approvedEntries();
  const counts = voteCounts();
  const tally = rows.map((row) => counts.get(row.id) ?? 0);
  const total = tally.reduce((sum, count) => sum + count, 0);
  const shares = percents(tally);
  const places = total > 0 ? rankPlaces(tally) : tally.map(() => 0);
  const ordered = rows
    .map((row, index) => ({
      place: places[index],
      name: row.name,
      votes: tally[index],
      percent: total > 0 ? shares[index] : 0,
    }))
    .sort((a, b) => (a.place || 99) - (b.place || 99) || a.name.localeCompare(b.name));
  const lines = ["Year,Place,Name,Votes,Percent"];
  for (const row of ordered) {
    lines.push([settings.year, row.place || "", csvCell(row.name), row.votes, row.percent].join(","));
  }
  return { filename: `apparel-${settings.year}.csv`, body: `${lines.join("\n")}\n` };
}

export function archivedResultsCsv(year: number): { filename: string; body: string } | null {
  if (!Number.isInteger(year)) return null;
  const rows = getDb()
    .prepare("SELECT place, name, votes, percent FROM results WHERE year = ? ORDER BY place ASC, name ASC")
    .all(year) as { place: number; name: string; votes: number; percent: number }[];
  if (rows.length === 0) return null;
  const lines = ["Year,Place,Name,Votes,Percent"];
  for (const row of rows) {
    lines.push([year, Number(row.place), csvCell(row.name), Number(row.votes), Number(row.percent)].join(","));
  }
  return { filename: `apparel-${year}.csv`, body: `${lines.join("\n")}\n` };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await connection();
  ensureClosedSnapshot();
  const db = getDb();
  const counts = voteCounts();
  const rows = db.prepare("SELECT * FROM entries ORDER BY created_at DESC").all() as EntryRow[];
  const entries = rows.map((row) => toAdminEntry(row, counts));
  const ballots = db
    .prepare(
      `SELECT votes.voter_id, votes.created_at, entries.name
       FROM votes
       LEFT JOIN entries ON entries.id = votes.entry_id
       ORDER BY votes.created_at DESC`,
    )
    .all() as BallotRow[];
  const countingVotes = entries
    .filter((entry) => entry.status === "approved")
    .reduce((sum, entry) => sum + entry.votes, 0);

  return {
    settings: settingsView(),
    countingVotes,
    spentVotes: ballots.length,
    pending: entries.filter((entry) => entry.status === "pending"),
    approved: withPlaces(entries.filter((entry) => entry.status === "approved")),
    rejected: entries.filter((entry) => entry.status === "rejected"),
    ballots: ballots.map((ballot) => ({
      voterId: ballot.voter_id,
      entryName: ballot.name ?? "Removed entry",
      createdAt: ballot.created_at,
    })),
    history: loadHistory(),
  };
}

function findEntry(id: string): EntryRow | undefined {
  return getDb().prepare("SELECT * FROM entries WHERE id = ?").get(id) as EntryRow | undefined;
}

function domainError(email: string, domains: string): Fail | null {
  if (emailOnDomain(email, domains)) return null;
  return fail(400, `Use a ${describeDomains(domains)} email address.`);
}

export async function createEntry(form: FormData, source: "public" | "admin"): Promise<Fail | Ok> {
  const settings = settingsView();
  if (source === "public" && !settings.submissionsOpen) {
    return fail(403, "Submissions are closed.");
  }
  if (source === "public" && String(form.get("company") ?? "").trim()) {
    return { ok: true };
  }
  if (source === "public" && form.get("permission") !== "yes") {
    return fail(400, "Confirm you have permission to publish this photo.");
  }

  const name = requireText(form.get("name"), 80);
  if (!name) return fail(400, "Enter the person's name.");
  const emailValue = form.get("email");
  const email = typeof emailValue === "string" && emailValue.trim() ? normalizeEmail(emailValue) : null;
  if (source === "public" && !email) return fail(400, "Enter a valid email address.");
  if (typeof emailValue === "string" && emailValue.trim() && !email) {
    return fail(400, "Enter a valid email address.");
  }
  if (email && source === "public") {
    const blocked = domainError(email, settings.allowedDomain);
    if (blocked) return blocked;
    const existing = getDb()
      .prepare("SELECT id FROM entries WHERE email = ? AND status IN ('pending', 'approved')")
      .get(email);
    if (existing) return fail(409, "That email already has an entry waiting or posted.");
  }

  const photo = form.get("photo");
  if (!(photo instanceof File)) return fail(400, "Choose a photo of the apparel.");
  const saved = await savePhoto(photo);
  if ("error" in saved) return fail(400, saved.error);

  getDb()
    .prepare(
      `INSERT INTO entries (id, name, email, department, caption, image_file, status, created_at)
       VALUES (?, ?, ?, '', '', ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      name,
      email,
      saved.filename,
      source === "admin" ? "approved" : "pending",
      new Date().toISOString(),
    );

  return { ok: true };
}

export function updateEntry(id: string, input: { name?: unknown; status?: unknown }): Fail | Ok {
  const entry = findEntry(id);
  if (!entry) return fail(404, "That entry is gone.");
  const name = requireText(input.name, 80);
  if (!name) return fail(400, "Enter the person's name.");
  const status = input.status;
  if (typeof status !== "string" || !STATUSES.has(status as EntryStatus)) {
    return fail(400, "Choose a valid status.");
  }
  getDb().prepare("UPDATE entries SET name = ?, status = ? WHERE id = ?").run(name, status, id);
  return { ok: true };
}

export async function replaceEntryPhoto(id: string, file: File): Promise<Fail | Ok> {
  const entry = findEntry(id);
  if (!entry) return fail(404, "That entry is gone.");
  const saved = await savePhoto(file);
  if ("error" in saved) return fail(400, saved.error);
  getDb().prepare("UPDATE entries SET image_file = ? WHERE id = ?").run(saved.filename, id);
  await deleteUpload(entry.image_file);
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<Fail | Ok> {
  const entry = findEntry(id);
  if (!entry) return fail(404, "That entry is gone.");
  const db = getDb();
  db.prepare("DELETE FROM entries WHERE id = ?").run(id);
  await deleteUpload(entry.image_file);
  return { ok: true };
}

export function updateSettings(input: ContestSettings): Fail | Ok {
  const title = requireText(input.title, 80);
  if (!title) return fail(400, "Give the competition a title.");
  const tagline = requireText(input.tagline, 180);
  if (!tagline) return fail(400, "Add a short tagline.");
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return fail(400, "Enter a year between 2000 and 2100.");
  }
  const allowedDomain = normalizeDomainList(input.allowedDomain);
  if (allowedDomain === null) {
    return fail(400, "Use domains like gvsu.edu, mail.gvsu.edu, or leave it blank to allow any email.");
  }
  if (!isThemeId(input.theme)) return fail(400, "Choose a theme.");
  const previous = getSettings();
  getDb()
    .prepare(
      `UPDATE settings
       SET title = ?, year = ?, tagline = ?, voting_open = ?, submissions_open = ?, allowed_domain = ?, theme = ?
       WHERE id = 1`,
    )
    .run(title, year, tagline, input.votingOpen ? 1 : 0, input.submissionsOpen ? 1 : 0, allowedDomain, input.theme);
  if (previous.voting_open === 1 && !input.votingOpen) saveYearResults(year);
  return { ok: true };
}

export async function resetContest(scope: "votes" | "all"): Promise<Fail | Ok> {
  const db = getDb();
  const files =
    scope === "all"
      ? (db.prepare("SELECT image_file FROM entries").all() as { image_file: string }[])
      : [];
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM votes");
    if (scope === "all") db.exec("DELETE FROM entries");
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* transaction already closed */
    }
    throw error;
  }
  await Promise.all(files.map((file) => deleteUpload(file.image_file)));
  return { ok: true };
}

function signalText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f]/g, "").slice(0, max);
}

function fingerprintMaterial(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const canvas = signalText(src.canvas, 80_000);
  const userAgent = signalText(src.userAgent, 300);
  const screenSize = signalText(src.screen, 40);
  const timezone = signalText(src.timezone, 80);
  if (canvas.length < 32 || !userAgent || !screenSize || !timezone) return null;
  const hardware = Number(src.hardwareConcurrency);
  const memory = Number(src.deviceMemory);
  return [
    userAgent,
    signalText(src.language, 40),
    signalText(src.languages, 180),
    signalText(src.platform, 80),
    Number.isFinite(hardware) ? String(hardware) : "0",
    Number.isFinite(memory) ? String(memory) : "0",
    screenSize,
    timezone,
    signalText(src.webgl, 180),
    canvas,
  ].join("\n");
}

function findExistingVote(voterId: string | null, clientId: string, fingerprint: string): ExistingVote | undefined {
  return getDb()
    .prepare(
      `SELECT votes.voter_id, votes.entry_id, entries.name
       FROM votes
       LEFT JOIN entries ON entries.id = votes.entry_id
       WHERE votes.voter_id = ? OR votes.client_id = ? OR votes.fingerprint = ?`,
    )
    .get(voterId ?? "", clientId, fingerprint) as ExistingVote | undefined;
}

export function castVote(
  entryIdInput: unknown,
  clientIdInput: unknown,
  signals: unknown,
  cookieVoterId: string | null,
): Fail | Ok<{ voterId: string; entryId: string; entryName: string; already: boolean }> {
  const settings = settingsView();
  if (!settings.votingOpen) return fail(403, "Voting is closed.");
  if (typeof entryIdInput !== "string") return fail(400, "Choose the apparel you want to vote for.");
  const clientId = typeof clientIdInput === "string" ? clientIdInput.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clientId)) {
    return fail(400, "We couldn't record that vote. Refresh and try again.");
  }
  const material = fingerprintMaterial(signals);
  if (!material) return fail(400, "We couldn't record that vote. Refresh and try again.");
  const fingerprint = digestMaterial(material);

  const prior = findExistingVote(cookieVoterId, clientId, fingerprint);
  if (prior) {
    return {
      ok: true,
      already: true,
      voterId: prior.voter_id,
      entryId: prior.entry_id,
      entryName: prior.name ?? "a removed entry",
    };
  }

  const entry = findEntry(entryIdInput);
  if (!entry || entry.status !== "approved") return fail(404, "That apparel isn't in the competition.");

  const voterId = crypto.randomUUID();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const raced = findExistingVote(cookieVoterId, clientId, fingerprint);
    if (raced) {
      db.exec("COMMIT");
      return {
        ok: true,
        already: true,
        voterId: raced.voter_id,
        entryId: raced.entry_id,
        entryName: raced.name ?? "a removed entry",
      };
    }
    db.prepare(
      "INSERT INTO votes (voter_id, client_id, fingerprint, entry_id, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(voterId, clientId, fingerprint, entry.id, new Date().toISOString());
    db.exec("COMMIT");
    return { ok: true, already: false, voterId, entryId: entry.id, entryName: entry.name };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* transaction already closed */
    }
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("constraint")) {
      const existing = findExistingVote(cookieVoterId, clientId, fingerprint);
      if (existing) {
        return {
          ok: true,
          already: true,
          voterId: existing.voter_id,
          entryId: existing.entry_id,
          entryName: existing.name ?? "a removed entry",
        };
      }
      return fail(409, "You already voted.");
    }
    throw error;
  }
}
