import path from "node:path";

export const dataDir = path.join(process.cwd(), "data");
export const uploadDir = path.join(dataDir, "uploads");
export const dbPath = path.join(dataDir, "contest.db");
