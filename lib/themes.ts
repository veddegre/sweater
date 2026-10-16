export const THEME_IDS = ["holiday", "spirit", "campus"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeCopy = {
  id: ThemeId;
  label: string;
  blurb: string;
  enter: string;
  photo: string;
  emptyOpen: string;
  emptyClosed: string;
  vote: string;
  submitLede: string;
  alt: (name: string) => string;
};

const HOLIDAY: ThemeCopy = {
  id: "holiday",
  label: "Holiday",
  blurb: "Fair isle bands, snow, and the red sweater.",
  enter: "Enter your apparel",
  photo: "Photo of the person and their holiday apparel",
  emptyOpen:
    "Nothing is posted yet. Submit holiday apparel, or add it from the desk. Voting stays closed until an admin opens it.",
  emptyClosed: "Nothing is posted yet.",
  vote: "You get one vote. Choose the apparel you want to win.",
  submitLede: "Send a photo of the person in their holiday apparel. An admin posts it after a quick look.",
  alt: (name) => `${name}'s holiday apparel`,
};

const SPIRIT: ThemeCopy = {
  id: "spirit",
  label: "Spirit week",
  blurb: "Blue, black, and white pennants. No snow.",
  enter: "Enter your look",
  photo: "Photo of the person and their spirit wear",
  emptyOpen:
    "Nothing is posted yet. Submit spirit wear, or add it from the desk. Voting stays closed until an admin opens it.",
  emptyClosed: "Nothing is posted yet.",
  vote: "You get one vote. Choose the look you want to win.",
  submitLede: "Send a photo of the person in their spirit wear. An admin posts it after a quick look.",
  alt: (name) => `${name}'s spirit wear`,
};

const CAMPUS: ThemeCopy = {
  id: "campus",
  label: "Campus",
  blurb: "GVSU colors only, for any other event.",
  enter: "Enter",
  photo: "Photo of the person",
  emptyOpen:
    "Nothing is posted yet. Submit one, or add it from the desk. Voting stays closed until an admin opens it.",
  emptyClosed: "Nothing is posted yet.",
  vote: "You get one vote. Choose the one you want to win.",
  submitLede: "Send a photo. An admin posts it after a quick look.",
  alt: (name) => name,
};

const THEMES: Record<ThemeId, ThemeCopy> = {
  holiday: HOLIDAY,
  spirit: SPIRIT,
  campus: CAMPUS,
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function themeCopy(value: unknown): ThemeCopy {
  return isThemeId(value) ? THEMES[value] : HOLIDAY;
}

export function themeChoices(): ThemeCopy[] {
  return THEME_IDS.map((id) => THEMES[id]);
}
