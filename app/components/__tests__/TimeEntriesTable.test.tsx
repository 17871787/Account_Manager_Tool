import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { TimeEntriesTable } from "../TimeEntriesTable";

describe("TimeEntriesTable pagination", () => {
  const baseEntry = {
    id: 1,
    spent_date: "2024-01-01",
    hours: 1,
    notes: "Test",
    client: { name: "Client" },
    project: { name: "Project" },
    task: { name: "Task" },
  };

  const createResponse = (page: number) => ({
    time_entries: [baseEntry],
    total_pages: 3,
    total_entries: 3,
    per_page: 1,
    page,
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("requests the correct pages when navigating with pagination", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse(1),
        text: async () => JSON.stringify(createResponse(1)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse(2),
        text: async () => JSON.stringify(createResponse(2)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse(1),
        text: async () => JSON.stringify(createResponse(1)),
      });

    global.fetch = mockFetch as unknown as typeof fetch;

    render(<TimeEntriesTable />);

    await waitFor(() =>
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("page=1"),
        expect.objectContaining({ cache: "no-store" })
      )
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /next/i })).toBeEnabled()
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("page=2"),
        expect.objectContaining({ cache: "no-store" })
      )
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled()
    );

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("page=1"),
        expect.objectContaining({ cache: "no-store" })
      )
    );
  });
});
