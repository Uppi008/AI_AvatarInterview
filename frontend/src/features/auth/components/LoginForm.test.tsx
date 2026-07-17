import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

import { authApi } from "../authApi";
import { LoginForm } from "./LoginForm";

vi.mock("../authApi");

describe("LoginForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows validation errors instead of submitting when fields are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("rejects a malformed email without calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "somepassword");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("submits valid credentials and shows the server's error on failure", async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      isAxiosError: true,
      response: { data: { success: false, error: { code: "AuthenticationFailed", detail: "Invalid email or password.", fields: null } } },
    });
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "demo@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ email: "demo@example.com", password: "wrongpassword" }));
    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });
});
