export type SupportedTwoslashLanguage = "ts" | "tsx";

export interface TwoslashHtml {
  dark?: string;
  light?: string;
}

const TWOSLASH_HINT_PATTERN = /(?:\^\?|\^\||@errors\b|@log\b|@warn\b|@annotate\b|@include\b)/m;
const TWOSLASH_LANGUAGE_ALIASES: Record<string, SupportedTwoslashLanguage> = {
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
};

export function hasTwoslashHints(code: string) {
  return TWOSLASH_HINT_PATTERN.test(code);
}

export function normalizeTwoslashLanguage(language?: string): SupportedTwoslashLanguage | null {
  const normalized = (language ?? "typescript").trim().toLowerCase();
  return TWOSLASH_LANGUAGE_ALIASES[normalized] ?? null;
}

export function normalizeTwoslashHtml(value: unknown): TwoslashHtml | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const dark = typeof record.dark === "string" && record.dark.length > 0 ? record.dark : undefined;
  const light =
    typeof record.light === "string" && record.light.length > 0 ? record.light : undefined;

  if (!dark && !light) {
    return undefined;
  }

  return { dark, light };
}

export function hasTwoslashHtml(value: TwoslashHtml | undefined) {
  return Boolean(value?.dark || value?.light);
}

export function resolveTwoslashHtmlForTheme(
  value: TwoslashHtml | undefined,
  theme: "dark" | "light",
) {
  if (!value) {
    return "";
  }

  return theme === "light" ? (value.light ?? value.dark ?? "") : (value.dark ?? value.light ?? "");
}
