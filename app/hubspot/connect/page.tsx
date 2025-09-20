"use client";

import { useState } from "react";

export default function HubSpotConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Redirect to OAuth authorization endpoint
    window.location.href = "/api/hubspot/oauth/authorize";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* HubSpot Logo */}
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-orange-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978A2.2 2.2 0 0017.233.908a2.196 2.196 0 00-1.97 1.237h-3.848c-.322 0-.621.096-.871.26L8.22.082a.64.64 0 00-.908 0 .644.644 0 000 .91l2.324 2.325a1.54 1.54 0 00-.26.87v3.85A3.036 3.036 0 007.178 10.24a3.035 3.035 0 002.199 2.92 3.045 3.045 0 001.199-.125 5.052 5.052 0 00.023.372c0 .041 0 .082.003.123a5.088 5.088 0 102.523-4.41 3.034 3.034 0 001.872-2.785 3.036 3.036 0 00-2.198-2.919v-3.85c0-.041.014-.079.02-.12l3.849.001a2.196 2.196 0 001.268 1.979 2.2 2.2 0 002.198-2.198 2.2 2.2 0 00-2.198-2.198 2.196 2.196 0 00-1.97 1.267v2.844a3.04 3.04 0 00-1.969 1.928 3.04 3.04 0 00-1.969-1.928v-2.844a2.196 2.196 0 00-1.268-1.979 2.2 2.2 0 00-2.198 2.198 2.2 2.2 0 002.198 2.198A2.196 2.196 0 008.22 7.93v3.849c0 .04.014.078.02.118A3.038 3.038 0 016.036 14.68a3.036 3.036 0 003.036 3.037 3.038 3.038 0 002.784-1.872 5.088 5.088 0 108.133-4.088 5.052 5.052 0 00-.372-.023c-.041 0-.082 0-.123-.003a3.045 3.045 0 00.125-1.199 3.036 3.036 0 00-2.92-2.199 3.038 3.038 0 00-2.203 2.198 3.04 3.04 0 00-1.928 1.969 3.04 3.04 0 00-1.928-1.969z"/>
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Connect Your HubSpot Account
          </h1>

          <p className="text-gray-600 mb-8">
            Connect your HubSpot CRM to manage contacts, companies, and deals directly from your Account Manager Tool.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400"
            >
              {isConnecting ? "Connecting..." : "Connect with HubSpot"}
            </button>

            <div className="text-sm text-gray-500">
              By connecting, you'll grant this app access to:
              <ul className="mt-2 text-left space-y-1">
                <li>• Read and write contacts</li>
                <li>• Read and write companies</li>
                <li>• Read and write deals</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Need OAuth Credentials?</h3>
            <ol className="text-sm text-blue-700 text-left space-y-1">
              <li>1. Go to <a href="https://developers.hubspot.com/" target="_blank" rel="noopener noreferrer" className="underline">developers.hubspot.com</a></li>
              <li>2. Create a new app</li>
              <li>3. Copy Client ID and Secret</li>
              <li>4. Add to your .env.local file</li>
            </ol>
          </div>

          <div className="mt-6 text-xs text-gray-400">
            <p>Or use API Key method:</p>
            <a href="/hubspot" className="text-blue-500 hover:underline">
              Skip OAuth and use API Key →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}