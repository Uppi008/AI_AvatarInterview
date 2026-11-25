/**
 * Categorical chart colours, assigned in this fixed order (never cycled).
 * Validated for colour-vision deficiency in both themes (dataviz
 * validate_palette.js; dark against slate-950). In light mode slots 3-4 are
 * below 3:1 against the surface, so every chart using them must also show
 * visible labels (legend chips with values, or a table) -- never colour alone.
 */
export const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
export const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500"] as const;

export function seriesColors(theme: "light" | "dark") {
  return theme === "dark" ? SERIES_DARK : SERIES_LIGHT;
}
