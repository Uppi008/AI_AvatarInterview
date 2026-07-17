import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViolationBanner } from "./ViolationBanner";

describe("ViolationBanner", () => {
  it("renders nothing when there's no event type", () => {
    const { container } = render(
      <ViolationBanner eventType={null} violationCount={0} maxViolations={4} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("maps a known event type to its user-facing message", () => {
    render(<ViolationBanner eventType="no_face" violationCount={1} maxViolations={4} />);

    expect(screen.getByText("Face not detected. Please stay visible on camera.")).toBeInTheDocument();
    expect(screen.getByText("Violation 1/4")).toBeInTheDocument();
  });

  it("falls back to a generic message for an unmapped event type", () => {
    render(<ViolationBanner eventType="something_new" violationCount={2} maxViolations={4} />);

    expect(screen.getByText("Proctoring alert.")).toBeInTheDocument();
  });
});
