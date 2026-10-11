import { describe, expect, it } from "vitest";

import { validateResumeFile } from "./validation";

function makeFile(name: string, sizeBytes: number) {
  const file = new File(["x"], name);
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("validateResumeFile", () => {
  it("accepts PDF and DOCX regardless of extension case", () => {
    expect(validateResumeFile(makeFile("cv.pdf", 1024))).toBeNull();
    expect(validateResumeFile(makeFile("CV.DOCX", 1024))).toBeNull();
  });

  it("rejects other file types", () => {
    expect(validateResumeFile(makeFile("cv.png", 1024))).toMatch(/PDF or DOCX/);
    expect(validateResumeFile(makeFile("resume", 1024))).toMatch(/PDF or DOCX/);
  });

  it("rejects files over 10MB", () => {
    expect(validateResumeFile(makeFile("cv.pdf", 10 * 1024 * 1024 + 1))).toMatch(/too large/);
  });
});
