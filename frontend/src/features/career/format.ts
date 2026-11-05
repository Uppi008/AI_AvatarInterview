export function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Reads text aloud with the browser's built-in voice; returns false if unsupported. */
export function speak(text: string, language = "en"): boolean {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = { en: "en-IN", hi: "hi-IN", te: "te-IN" }[language] ?? "en-IN";
  window.speechSynthesis.speak(utterance);
  return true;
}
