import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

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

  it("logs the new account in immediately after successful registration", async () => {
    // Verification email delivery isn't guaranteed (some hosts block
    // outbound SMTP entirely) and the backend doesn't gate login on it, so
    // registration chains straight into a login call instead of stranding
    // the user on a "check your email" screen.
    vi.mocked(authApi.register).mockResolvedValue({
      data: { detail: "ok", user: {} },
    } as never);
    vi.mocked(authApi.login).mockResolvedValue({
      data: { access: "access-token", refresh: "refresh-token", user: { id: "1", email: "jane@example.com" } },
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ email: "jane@example.com", password: "StrongPass123" })
    );
  });
});
