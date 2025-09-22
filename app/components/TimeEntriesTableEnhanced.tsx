"use client";

import React, { useState, useEffect } from "react";
import { fetchWithSession } from "../../src/utils/fetchWithSession";

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

export function TimeEntriesTableEnhanced() {
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchTimeEntries = async () => {
    if (!from || !to) {
      setError("Please select both from and to dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/harvest/time-entries?from=${from}&to=${to}&page=${page}`;

      const response = await fetchWithSession(url, { cache: "no-store" });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Harvest proxy error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
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

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTimeEntries();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, from, to, page]);

  // Format hours to include daily total
  const calculateDailyTotals = () => {
    if (!data || data.time_entries.length === 0) return {};

    const dailyTotals: { [date: string]: number } = {};
    data.time_entries.forEach(entry => {
      dailyTotals[entry.spent_date] = (dailyTotals[entry.spent_date] || 0) + entry.hours;
    });
    return dailyTotals;
  };

  const dailyTotals = calculateDailyTotals();
  const grandTotal = data ? data.time_entries.reduce((sum, entry) => sum + entry.hours, 0) : 0;

  // Quick date range setters
  const setToday = () => {
    const date = new Date().toISOString().split('T')[0];
    setFrom(date);
    setTo(date);
    setPage(1);
  };

  const setThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(now);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setFrom(startOfWeek.toISOString().split('T')[0]);
    setTo(endOfWeek.toISOString().split('T')[0]);
    setPage(1);
  };

  const setThisMonth = () => {
    setFrom(firstDay.toISOString().split('T')[0]);
    setTo(lastDay.toISOString().split('T')[0]);
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Harvest Time Entries</h2>
        {lastRefresh && (
          <span className="text-sm text-gray-500">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Quick Date Range Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={setToday}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Today
        </button>
        <button
          onClick={setThisWeek}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          This Week
        </button>
        <button
          onClick={setThisMonth}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          This Month
        </button>
      </div>

      {/* Date Filters and Controls */}
      <div className="flex gap-4 mb-6 flex-wrap items-end">
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
        <div className="flex items-end gap-2">
          <button
            onClick={fetchTimeEntries}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-md ${
              autoRefresh
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Auto-Refresh: {autoRefresh ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Auto-refresh interval selector */}
      {autoRefresh && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <label className="text-sm font-medium text-green-800 mr-2">
            Refresh every:
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={600000}>10 minutes</option>
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {data && data.time_entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Hours</div>
            <div className="text-2xl font-bold text-blue-900">{grandTotal.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Entries</div>
            <div className="text-2xl font-bold text-green-900">{data.total_entries}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Days Tracked</div>
            <div className="text-2xl font-bold text-purple-900">{Object.keys(dailyTotals).length}</div>
          </div>
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
                {data.time_entries.map((entry, index) => {
                  const isLastOfDate = index === data.time_entries.length - 1 ||
                    data.time_entries[index + 1].spent_date !== entry.spent_date;

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b">{entry.spent_date}</td>
                        <td className="px-4 py-2 border-b">{entry.client?.name || "-"}</td>
                        <td className="px-4 py-2 border-b">{entry.project?.name || "-"}</td>
                        <td className="px-4 py-2 border-b">{entry.task?.name || "-"}</td>
                        <td className="px-4 py-2 border-b text-right">{entry.hours.toFixed(2)}</td>
                        <td className="px-4 py-2 border-b text-xs">{entry.notes || "-"}</td>
                      </tr>
                      {isLastOfDate && dailyTotals[entry.spent_date] > entry.hours && (
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-2 border-b text-sm" colSpan={4}>
                            Daily Total for {entry.spent_date}
                          </td>
                          <td className="px-4 py-2 border-b text-right">
                            {dailyTotals[entry.spent_date].toFixed(2)}
                          </td>
                          <td className="px-4 py-2 border-b"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Grand Total Row */}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-4 py-2" colSpan={4}>
                    Grand Total
                  </td>
                  <td className="px-4 py-2 text-right">
                    {grandTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2"></td>
                </tr>
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