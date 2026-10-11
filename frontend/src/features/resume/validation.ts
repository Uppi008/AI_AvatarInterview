export const MAX_RESUME_MB = 10;
export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".docx"];

/** Returns an error message, or null if the file is acceptable. Mirrors the backend's checks. */
export function validateResumeFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_RESUME_EXTENSIONS.includes(ext)) return "Only PDF or DOCX files are supported.";
  if (file.size > MAX_RESUME_MB * 1024 * 1024) return `That file is too large (max ${MAX_RESUME_MB}MB).`;
  return null;
}
