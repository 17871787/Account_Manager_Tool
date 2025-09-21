"use client";

import React, { useState, useEffect } from "react";

interface TimeEntry {
  id: number;
  spent_date: string;
  hours: number;
  notes: string;
  client?: {
    name: string;
  };
  project?: {
    name: string;
  };
  task?: {
    name: string;
  };
}

interface TimeEntriesResponse {
  time_entries: TimeEntry[];
  total_pages: number;
  total_entries: number;
  per_page: number;
  page: number;
}

export function TimeEntriesTable() {
  // Pre-fill with current month dates for easier testing
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [from, setFrom] = useState(firstDay.toISOString().split('T')[0]);
  const [to, setTo] = useState(lastDay.toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TimeEntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = async () => {
    if (!from || !to) {
      setError("Please select both from and to dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/harvest/time-entries?from=${from}&to=${to}&page=${page}`;

      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Harvest proxy error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch time entries");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchTimeEntries();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Harvest Time Entries</h2>
      
      {/* Date Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label htmlFor="from" className="block text-sm font-medium mb-1">
            From Date
          </label>
          <input
            type="date"
            id="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-sm font-medium mb-1">
            To Date
          </label>
          <input
            type="date"
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchTimeEntries}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Fetch Entries"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Results Table */}
      {data && data.time_entries.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border-b text-left">Date</th>
                  <th className="px-4 py-2 border-b text-left">Client</th>
                  <th className="px-4 py-2 border-b text-left">Project</th>
                  <th className="px-4 py-2 border-b text-left">Task</th>
                  <th className="px-4 py-2 border-b text-right">Hours</th>
                  <th className="px-4 py-2 border-b text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.time_entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{entry.spent_date}</td>
                    <td className="px-4 py-2 border-b">{entry.client?.name || "-"}</td>
                    <td className="px-4 py-2 border-b">{entry.project?.name || "-"}</td>
                    <td className="px-4 py-2 border-b">{entry.task?.name || "-"}</td>
                    <td className="px-4 py-2 border-b text-right">{entry.hours.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b">{entry.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing page {data.page} of {data.total_pages} ({data.total_entries} total entries)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage(page - 1);
                  setTimeout(fetchTimeEntries, 0);
                }}
                disabled={page <= 1 || loading}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  setPage(page + 1);
                  setTimeout(fetchTimeEntries, 0);
                }}
                disabled={page >= data.total_pages || loading}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* No Data Message */}
      {data && data.time_entries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No time entries found for the selected date range.
        </div>
      )}
      
      {/* Loading Message */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading time entries...
        </div>
      )}
    </div>
  );
}
