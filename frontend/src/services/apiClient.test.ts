import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it } from "vitest";

import { getApiErrorMessage, tokenStorage } from "./apiClient";

function makeAxiosError(data: unknown, status = 400): AxiosError {
  return new AxiosError("Request failed", "400", undefined, undefined, {
    data,
    status,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("tokenStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips access and refresh tokens", () => {
    tokenStorage.set("access-1", "refresh-1");

    expect(tokenStorage.getAccess()).toBe("access-1");
    expect(tokenStorage.getRefresh()).toBe("refresh-1");
  });

  it("updates only the access token", () => {
    tokenStorage.set("access-1", "refresh-1");
    tokenStorage.setAccess("access-2");

    expect(tokenStorage.getAccess()).toBe("access-2");
    expect(tokenStorage.getRefresh()).toBe("refresh-1");
  });

  it("clears both tokens", () => {
    tokenStorage.set("access-1", "refresh-1");
    tokenStorage.clear();

    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
  });
});

describe("getApiErrorMessage", () => {
  it("extracts a string detail from the common/exceptions.py envelope", () => {
    const error = makeAxiosError({
      success: false,
      error: { code: "ValidationError", detail: "Invalid email or password.", fields: null },
    });

    expect(getApiErrorMessage(error)).toBe("Invalid email or password.");
  });

  it("falls back to the first field error when detail isn't a string", () => {
    const error = makeAxiosError({
      success: false,
      error: {
        code: "ValidationError",
        detail: { password_confirm: ["Passwords do not match."] },
        fields: { password_confirm: ["Passwords do not match."] },
      },
    });

    expect(getApiErrorMessage(error)).toBe("Passwords do not match.");
  });

  it("explains an unreachable server instead of using the fallback", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");

    expect(getApiErrorMessage(error, "Registration failed.")).toMatch(/can't reach the server/i);
  });

  it("uses the fallback for a non-axios error", () => {
    expect(getApiErrorMessage(new Error("boom"), "Something went wrong.")).toBe("Something went wrong.");
  });

  it("uses the default fallback when none is given", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });
});
