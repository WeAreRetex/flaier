/**
 * Resolves an ArchitectureNode `icon` prop to an image URL.
 *
 * Accepted forms:
 * - Iconify icon name (`prefix:name`, e.g. "logos:aws-lambda",
 *   "simple-icons:cloudflare") — served by the public Iconify API, which
 *   hosts 200k+ open-source icons including brand/product logos.
 * - Absolute or root-relative image URL (`https://…`, `//…`, `/assets/…`).
 * - Data URI (`data:image/…`).
 *
 * Returns `undefined` when the value matches none of these, so callers can
 * fall back to the kind initials badge.
 */
export function resolveIconUrl(icon: string): string | undefined {
  const trimmed = icon.trim();
  if (trimmed === "") return undefined;

  if (
    /^https?:\/\//.test(trimmed) ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }

  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(trimmed);
  if (!match) return undefined;

  // Monochrome sets (simple-icons, mdi, …) draw with currentColor, which an
  // <img> cannot inherit — the color param swaps it for a neutral slate that
  // reads in both themes. Full-color sets (logos, devicon, …) ignore it.
  return `https://api.iconify.design/${match[1]}/${match[2]}.svg?color=%2394a3b8`;
}
