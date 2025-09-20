import DealsUploader from '@/app/components/DealsUploader';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HubSpotUploadPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/hubspot"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to HubSpot Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Import HubSpot Data</h1>
          <p className="text-gray-600 mt-2">
            Upload your HubSpot deals data from Excel or CSV files. This is a workaround for API access limitations.
          </p>
        </div>

        <DealsUploader />

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Export Deals from HubSpot</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Log into your HubSpot account</li>
            <li>Navigate to Sales → Deals</li>
            <li>Select the deals you want to export (or select all)</li>
            <li>Click the "Export" button in the top toolbar</li>
            <li>Choose Excel or CSV format</li>
            <li>Download the file and upload it here</li>
          </ol>
          <p className="mt-4 text-sm text-blue-700">
            The uploader will automatically map common HubSpot field names. You can also download our template for the expected format.
          </p>
        </div>
      </div>
    </main>
  );
}