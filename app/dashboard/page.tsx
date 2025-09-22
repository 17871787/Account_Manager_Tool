'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  timestamp: string;
  hubspot?: {
    name: string;
    data: any[];
  };
  finance?: {
    name: string;
    data: any[];
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profitability, setProfitability] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        calculateProfitability(result);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitability = (dashboardData: DashboardData) => {
    if (!dashboardData.hubspot || !dashboardData.finance) return;

    // Simple profitability calculation
    // Merge data from both sources by client name
    const clientMap = new Map();

    // Process HubSpot data (revenue)
    dashboardData.hubspot.data.forEach(row => {
      const clientName = row['Company name'] || row['Client'] || row['Account'];
      if (clientName) {
        clientMap.set(clientName, {
          client: clientName,
          revenue: parseFloat(row['Deal amount'] || row['Revenue'] || 0),
          costs: 0,
          profit: 0,
          margin: 0
        });
      }
    });

    // Process Finance data (costs)
    dashboardData.finance.data.forEach(row => {
      const clientName = row['Client name'] || row['Client'] || row['Account'];
      const costs = parseFloat(row['Costs'] || row['Expected costs'] || 0);

      if (clientName) {
        if (clientMap.has(clientName)) {
          const client = clientMap.get(clientName);
          client.costs = costs;
          client.profit = client.revenue - costs;
          client.margin = client.revenue > 0
            ? ((client.profit / client.revenue) * 100).toFixed(1)
            : 0;
        } else {
          clientMap.set(clientName, {
            client: clientName,
            revenue: 0,
            costs: costs,
            profit: -costs,
            margin: 0
          });
        }
      }
    });

    setProfitability(Array.from(clientMap.values()));
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Loading dashboard...</h1>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>No Data Available</h1>
        <p>Please <a href="/upload">upload your CSV files</a> first.</p>
      </div>
    );
  }

  const totalRevenue = profitability.reduce((sum, row) => sum + row.revenue, 0);
  const totalCosts = profitability.reduce((sum, row) => sum + row.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Profitability Dashboard</h1>

      <div style={{ marginBottom: '2rem' }}>
        <small>Last updated: {new Date(data.timestamp).toLocaleString()}</small>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, color: '#0369a1' }}>Total Revenue</h3>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>
            ${totalRevenue.toLocaleString()}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, color: '#d97706' }}>Total Costs</h3>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>
            ${totalCosts.toLocaleString()}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: totalProfit >= 0 ? '#d1fae5' : '#fee2e2', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, color: totalProfit >= 0 ? '#065f46' : '#991b1b' }}>Total Profit</h3>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>
            ${totalProfit.toLocaleString()}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, color: '#3730a3' }}>Overall Margin</h3>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>
            {overallMargin}%
          </p>
        </div>
      </div>

      {/* Data Table */}
      <h2>Client Profitability</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Client</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Revenue</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Costs</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Profit</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {profitability
              .sort((a, b) => b.profit - a.profit)
              .map((row, index) => (
                <tr key={index}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    {row.client}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    ${row.revenue.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    ${row.costs.toLocaleString()}
                  </td>
                  <td style={{
                    padding: '0.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    color: row.profit >= 0 ? 'green' : 'red',
                    fontWeight: 'bold'
                  }}>
                    ${row.profit.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    {row.margin}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a href="/upload" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          ← Upload new data
        </a>
      </div>
    </div>
  );
}