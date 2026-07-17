import "@testing-library/jest-dom/vitest";
import "@/lib/i18n";

// jsdom doesn't implement matchMedia; uiSlice's initial-theme detection
// (and anything else checking prefers-color-scheme) needs this stubbed.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
