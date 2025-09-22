"use client";

import React, { useState, useEffect } from "react";
import { fetchWithSession } from "../../src/utils/fetchWithSession";

interface Contact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    createdate?: string;
  };
}

interface Company {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    website?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface Deal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
    createdate?: string;
  };
}

export function HubSpotDashboard() {
  const [activeTab, setActiveTab] = useState<"contacts" | "companies" | "deals">("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contacts
  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSession("/api/hubspot/contacts?limit=50");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      setContacts(data.results || []);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSession("/api/hubspot/companies?limit=50");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      setCompanies(data.results || []);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  // Fetch deals
  const fetchDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSession("/api/hubspot/deals?limit=50");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      setDeals(data.results || []);
    } catch (err) {
      console.error("Failed to fetch deals:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "contacts" && contacts.length === 0) {
      fetchContacts();
    } else if (activeTab === "companies" && companies.length === 0) {
      fetchCompanies();
    } else if (activeTab === "deals" && deals.length === 0) {
      fetchDeals();
    }
  }, [activeTab]);

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">HubSpot CRM Dashboard</h1>
        <p className="text-gray-600">Manage your contacts, companies, and deals</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`px-4 py-2 font-medium ${
            activeTab === "contacts"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Contacts ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab("companies")}
          className={`px-4 py-2 font-medium ${
            activeTab === "companies"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Companies ({companies.length})
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className={`px-4 py-2 font-medium ${
            activeTab === "deals"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Deals ({deals.length})
        </button>
      </div>

      {/* Refresh Button */}
      <div className="mb-4">
        <button
          onClick={() => {
            if (activeTab === "contacts") fetchContacts();
            else if (activeTab === "companies") fetchCompanies();
            else if (activeTab === "deals") fetchDeals();
          }}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          {error.includes("not configured") && (
            <div className="mt-2 text-sm">
              Please add your HubSpot API token to the .env.local file:
              <br />
              HUBSPOT_ACCESS_TOKEN=your_token_here
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading {activeTab}...
        </div>
      )}

      {/* Contacts Table */}
      {activeTab === "contacts" && !loading && contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border-b text-left">Name</th>
                <th className="px-4 py-2 border-b text-left">Email</th>
                <th className="px-4 py-2 border-b text-left">Company</th>
                <th className="px-4 py-2 border-b text-left">Phone</th>
                <th className="px-4 py-2 border-b text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    {contact.properties.firstname || ""} {contact.properties.lastname || ""}
                  </td>
                  <td className="px-4 py-2 border-b">{contact.properties.email || "-"}</td>
                  <td className="px-4 py-2 border-b">{contact.properties.company || "-"}</td>
                  <td className="px-4 py-2 border-b">{contact.properties.phone || "-"}</td>
                  <td className="px-4 py-2 border-b">
                    {formatDate(contact.properties.createdate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Companies Table */}
      {activeTab === "companies" && !loading && companies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border-b text-left">Company Name</th>
                <th className="px-4 py-2 border-b text-left">Industry</th>
                <th className="px-4 py-2 border-b text-left">Website</th>
                <th className="px-4 py-2 border-b text-left">Employees</th>
                <th className="px-4 py-2 border-b text-left">Annual Revenue</th>
                <th className="px-4 py-2 border-b text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{company.properties.name || "-"}</td>
                  <td className="px-4 py-2 border-b">{company.properties.industry || "-"}</td>
                  <td className="px-4 py-2 border-b">
                    {company.properties.website ? (
                      <a
                        href={company.properties.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.properties.domain || company.properties.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {company.properties.numberofemployees || "-"}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {formatCurrency(company.properties.annualrevenue)}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {[
                      company.properties.city,
                      company.properties.state,
                      company.properties.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deals Table */}
      {activeTab === "deals" && !loading && deals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border-b text-left">Deal Name</th>
                <th className="px-4 py-2 border-b text-left">Amount</th>
                <th className="px-4 py-2 border-b text-left">Stage</th>
                <th className="px-4 py-2 border-b text-left">Close Date</th>
                <th className="px-4 py-2 border-b text-left">Pipeline</th>
                <th className="px-4 py-2 border-b text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{deal.properties.dealname || "-"}</td>
                  <td className="px-4 py-2 border-b font-medium">
                    {formatCurrency(deal.properties.amount)}
                  </td>
                  <td className="px-4 py-2 border-b">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {deal.properties.dealstage || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b">{formatDate(deal.properties.closedate)}</td>
                  <td className="px-4 py-2 border-b">{deal.properties.pipeline || "-"}</td>
                  <td className="px-4 py-2 border-b">{formatDate(deal.properties.createdate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty States */}
      {activeTab === "contacts" && !loading && contacts.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No contacts found. Click refresh to load contacts.
        </div>
      )}
      {activeTab === "companies" && !loading && companies.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No companies found. Click refresh to load companies.
        </div>
      )}
      {activeTab === "deals" && !loading && deals.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No deals found. Click refresh to load deals.
        </div>
      )}
    </div>
  );
}