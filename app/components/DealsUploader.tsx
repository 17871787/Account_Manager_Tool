'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface Deal {
  id?: string;
  name: string;
  stage?: string;
  amount?: number;
  closeDate?: string;
  owner?: string;
  company?: string;
  status?: string;
  [key: string]: any;
}

export default function DealsUploader() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [dragActive, setDragActive] = useState(false);

  // Fetch existing deals on component mount
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hubspot/upload');
      const data = await response.json();
      if (data.success) {
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      setUploadMessage({ type: 'error', text: 'Please upload a valid Excel (.xlsx, .xls) or CSV file' });
      return;
    }

    setIsUploading(true);
    setUploadMessage({ type: null, text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/hubspot/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadMessage({
          type: 'success',
          text: `Successfully imported ${data.dealsCount} deals! Total: ${data.totalDeals} deals`
        });
        fetchDeals(); // Refresh the deals list
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage({ type: 'error', text: 'Failed to upload file' });
    } finally {
      setIsUploading(false);
    }
  };

  const clearDeals = async () => {
    if (!confirm('Are you sure you want to clear all imported deals?')) return;

    try {
      const response = await fetch('/api/hubspot/upload', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeals([]);
        setUploadMessage({ type: 'success', text: 'All deals have been cleared' });
      }
    } catch (error) {
      console.error('Error clearing deals:', error);
      setUploadMessage({ type: 'error', text: 'Failed to clear deals' });
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Deal Name', 'Stage', 'Amount', 'Close Date', 'Owner', 'Company', 'Status'],
      ['Example Deal 1', 'Qualified', '50000', '2025-03-31', 'John Doe', 'Acme Corp', 'Open'],
      ['Example Deal 2', 'Proposal', '75000', '2025-04-15', 'Jane Smith', 'Tech Co', 'Open'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hubspot_deals_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const totalValue = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">HubSpot Deals Import</h2>
        <p className="text-gray-600">Upload your HubSpot deals from Excel or CSV file</p>
      </div>

      {/* Upload Area */}
      <div
        className={`mb-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop your Excel or CSV file here, or click to browse
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:bg-gray-400"
        >
          {isUploading ? (
            <>
              <RefreshCw className="animate-spin mr-2 h-4 w-4" />
              Uploading...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Select File
            </>
          )}
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </button>
        <button
          onClick={fetchDeals}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {deals.length > 0 && (
          <button
            onClick={clearDeals}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Upload Message */}
      {uploadMessage.type && (
        <div
          className={`mb-6 p-4 rounded-md flex items-start ${
            uploadMessage.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {uploadMessage.type === 'success' ? (
            <CheckCircle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <span>{uploadMessage.text}</span>
        </div>
      )}

      {/* Summary Stats */}
      {deals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Total Deals</div>
            <div className="text-2xl font-bold text-blue-900">{deals.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Total Value</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalValue)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-600 text-sm font-medium">Average Deal Size</div>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(deals.length > 0 ? totalValue / deals.length : 0)}
            </div>
          </div>
        </div>
      )}

      {/* Deals Table */}
      {deals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deal Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Close Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.map((deal, index) => (
                <tr key={deal.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {deal.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {deal.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {deal.stage || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(deal.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(deal.closeDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {deal.owner || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        deal.status === 'Open' || deal.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : deal.status === 'Won' || deal.status === 'won'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {deal.status || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && deals.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-500">No deals imported yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload an Excel or CSV file to get started</p>
        </div>
      )}
    </div>
  );
}