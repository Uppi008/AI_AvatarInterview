import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { notificationsApi } from "@/features/engagement/api";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

import { NotificationBell } from "./NotificationBell";

vi.mock("@/features/engagement/api", () => ({
  notificationsApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const note = (id: string, read: boolean) => ({
  id,
  kind: "report_ready" as const,
  title: `Report ${id}`,
  body: "",
  link: "",
  read_at: read ? "2026-11-25T10:00:00Z" : null,
  created_at: new Date().toISOString(),
});

describe("NotificationBell", () => {
  it("shows the unread count and marks everything read", async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({
      data: { count: 2, results: [note("a", false), note("b", true)], unread_count: 1 },
    } as never);
    vi.mocked(notificationsApi.markAllRead).mockResolvedValue({ data: { updated: 1 } } as never);
    const user = userEvent.setup();

    renderWithProviders(<NotificationBell />);

    const bell = await screen.findByRole("button", { name: /1 unread/i });
    await user.click(bell);
    expect(screen.getByText("Report a")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark all read/i }));

    expect(notificationsApi.markAllRead).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: /^notifications$/i })).toBeInTheDocument());
  });
});
