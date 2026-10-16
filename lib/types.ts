import type { ThemeId } from "@/lib/themes";

export type EntryStatus = "pending" | "approved" | "rejected";

export type PublicEntry = {
  id: string;
  name: string;
  imageUrl: string;
  votes: number | null;
  percent: number | null;
  place: number | null;
};

export type PastWinner = {
  year: number;
  name: string;
  imageUrl: string;
  votes: number;
};

export type PublicContest = {
  title: string;
  year: number;
  tagline: string;
  theme: ThemeId;
  votingOpen: boolean;
  submissionsOpen: boolean;
  resultsVisible: boolean;
  allowedDomain: string;
  totalVotes: number;
  entries: PublicEntry[];
  viewer: { entryId: string } | null;
  pastWinners: PastWinner[];
};

export type ContestSettings = {
  title: string;
  year: number;
  tagline: string;
  theme: ThemeId;
  votingOpen: boolean;
  submissionsOpen: boolean;
  allowedDomain: string;
};

export type AdminEntry = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  status: EntryStatus;
  votes: number;
  place: number | null;
  createdAt: string;
};

export type SavedResult = {
  year: number;
  savedAt: string;
  entries: { place: number; name: string; votes: number; percent: number; imageUrl: string }[];
};

export type AdminOverview = {
  settings: ContestSettings;
  countingVotes: number;
  spentVotes: number;
  pending: AdminEntry[];
  approved: AdminEntry[];
  rejected: AdminEntry[];
  ballots: { voterId: string; entryName: string; createdAt: string }[];
  history: SavedResult[];
};

export type Fail = { ok: false; error: string; status: number };
export type Ok<T extends object = object> = { ok: true } & T;
