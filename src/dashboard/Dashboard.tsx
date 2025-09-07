import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  clientId?: string;
  userId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ clientId, userId }) => {
  const [profitabilityData, setProfitabilityData] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [clientId, selectedProject]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch profitability trend
      if (clientId) {
        const trendResponse = await fetch(`/api/profitability/trend/${clientId}`);
        const trendData = await trendResponse.json();
        setProfitabilityData(trendData);
      }

      // Fetch pending exceptions
      const exceptionsResponse = await fetch(`/api/exceptions/pending${clientId ? `?clientId=${clientId}` : ''}`);
      const exceptionsData = await exceptionsResponse.json();
      setExceptions(exceptionsData);

      // Fetch budget vs burn if project selected
      if (selectedProject) {
        const budgetResponse = await fetch(`/api/budget/${selectedProject}`);
        const budgetData = await budgetResponse.json();
        setBudgetData(budgetData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExceptionReview = async (exceptionId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/exceptions/${exceptionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId }),
      });

      if (response.ok) {
        // Refresh exceptions list
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to review exception:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">AM Copilot Dashboard</h1>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Current Margin"
          value={profitabilityData[0]?.marginPercentage?.toFixed(1) + '%' || 'N/A'}
          trend={profitabilityData[0]?.margin > profitabilityData[1]?.margin ? 'up' : 'down'}
        />
        <MetricCard
          title="Pending Exceptions"
          value={exceptions.length.toString()}
          trend={exceptions.filter(e => e.severity === 'high').length > 0 ? 'alert' : 'normal'}
        />
        <MetricCard
          title="Budget Utilization"
          value={budgetData?.hoursUtilization?.toFixed(1) + '%' || 'N/A'}
          trend={budgetData?.status || 'on-track'}
        />
        <MetricCard
          title="Monthly Revenue"
          value={'£' + (profitabilityData[0]?.recognisedRevenue?.toLocaleString() || 'N/A')}
          trend="normal"
        />
      </div>

      {/* Profitability Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Profitability Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={profitabilityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="margin" stroke="#10b981" name="Margin (£)" />
            <Line type="monotone" dataKey="marginPercentage" stroke="#3b82f6" name="Margin %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Budget vs Burn */}
      {budgetData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Budget vs Burn</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Hours Used</div>
              <div className="text-2xl font-bold">
                {budgetData.actualHours.toFixed(1)} / {budgetData.budgetHours.toFixed(0)}
              </div>
              <ProgressBar percentage={budgetData.hoursUtilization} />
            </div>
            <div>
              <div className="text-sm text-gray-600">Cost Incurred</div>
              <div className="text-2xl font-bold">
                £{budgetData.actualCost.toLocaleString()} / £{budgetData.budget.toLocaleString()}
              </div>
              <ProgressBar percentage={budgetData.costUtilization} />
            </div>
          </div>
          <div className="mt-4 text-sm">
            <span className={`px-2 py-1 rounded ${
              budgetData.status === 'on-track' ? 'bg-green-100 text-green-800' :
              budgetData.status === 'at-risk' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {budgetData.status.toUpperCase()}
            </span>
            <span className="ml-2 text-gray-600">
              Forecast to completion: {budgetData.forecastToCompletion.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Exceptions Queue */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Exceptions Queue ({exceptions.length})
        </h2>
        <div className="space-y-3">
          {exceptions.slice(0, 5).map((exception) => (
            <ExceptionCard
              key={exception.id}
              exception={exception}
              onReview={handleExceptionReview}
            />
          ))}
          {exceptions.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No pending exceptions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; trend: string }> = ({ title, value, trend }) => {
  const trendColor = trend === 'up' ? 'text-green-600' : 
                     trend === 'down' ? 'text-red-600' : 
                     trend === 'alert' ? 'text-yellow-600' : 'text-gray-600';
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-2xl font-bold ${trendColor}`}>{value}</div>
    </div>
  );
};

const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const color = percentage > 100 ? 'bg-red-500' : 
                percentage > 90 ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div 
        className={`${color} h-2 rounded-full`} 
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

const ExceptionCard: React.FC<{ 
  exception: any; 
  onReview: (id: string, action: 'approve' | 'reject') => void 
}> = ({ exception, onReview }) => {
  const severityColor = exception.severity === 'high' ? 'bg-red-100 text-red-800' :
                        exception.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800';

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-1 rounded text-xs ${severityColor}`}>
              {exception.severity.toUpperCase()}
            </span>
            <span className="text-sm text-gray-600">{exception.type}</span>
          </div>
          <div className="text-sm font-medium">{exception.description}</div>
          <div className="text-xs text-gray-500 mt-1">
            {exception.client_name} - {exception.project_name}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Suggested: {exception.suggested_action}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onReview(exception.id, 'approve')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Approve
          </button>
          <button
            onClick={() => onReview(exception.id, 'reject')}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;