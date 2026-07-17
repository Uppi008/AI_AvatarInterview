import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";

import { authApi } from "../authApi";
import { RegisterForm } from "./RegisterForm";

vi.mock("../authApi");

describe("RegisterForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects mismatched passwords without calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "DifferentPass123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("rejects a short password without calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("shows a confirmation message instead of the form after successful registration", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      data: { detail: "ok", user: {} },
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });
});
