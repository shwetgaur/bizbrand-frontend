// app/page.tsx
'use client';

import { useState } from 'react';
import axios, { isAxiosError } from 'axios'; // <-- Import isAxiosError

// IMPORTANT: Set this in your Vercel environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type DomainStatus = {
  [key: string]: {
    loading: boolean;
    available?: boolean;
  };
};

export default function Home() {
  const [description, setDescription] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setNames([]);
    setDomainStatus({});

    try {
      const response = await axios.post(`${API_BASE_URL}/generate-name`, {
        description: description,
      });

      // Log what the API *actually* sent back
      console.log("Full API Response:", response);

      // Check if the response data and the 'names' property exist and is an array
      if (response.data && Array.isArray(response.data.names)) {
        setNames(response.data.names);
      } else {
        console.error("API returned unexpected data:", response.data);
        setError('API returned invalid data. Check console for details.');
      }

    } catch (err) { // <-- 'err' is of type 'unknown'
      
      console.error("API Request Failed:", err);

      // ---- START OF TYPESCRIPT FIX ----
      
      // Check if this is an Axios error and if it has our backend's error format
      if (isAxiosError(err) && err.response?.data?.error) {
        // This is a specific error from our backend (e.g., "Model is loading...")
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        // This is a generic network error
        setError(err.message);
      } else {
        // This is an unknown error
        setError('An unknown error occurred. Please try again.');
      }
      // ---- END OF TYPESCRIPT FIX ----

    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainCheck = async (name: string) => {
    // Set loading state for this specific name
    setDomainStatus((prev) => ({
      ...prev,
      [name]: { loading: true },
    }));

    try {
      const response = await axios.get(`${API_BASE_URL}/check-domain`, {
        params: { domain: name.toLowerCase().replace(/[^a-z0-9]/gi, '') },
      });
      
      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false, available: response.data.available },
      }));

    } catch (err) {
      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false },
      }));
      
      if (isAxiosError(err) && err.response?.data?.error) {
        alert(`Failed to check domain: ${err.response.data.error}`);
      } else {
        alert(`Failed to check domain for ${name}`);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">BizBrand.ai</h1>
        <p className="text-center text-gray-600 mb-8">
          AI-powered brand identity creation. Start with your business idea.
        </p>

        <form onSubmit={handleNameGeneration} className="mb-12">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'An eco-friendly subscription box for coffee lovers...'"
            className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg mt-4 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Names'}
          </button>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {names.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
            >
              <span className="text-lg font-medium">{name}</span>
              <button
                onClick={() => handleDomainCheck(name)}
                className="text-sm bg-gray-100 p-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                disabled={domainStatus[name]?.loading}
              >
                {domainStatus[name]?.loading
                  ? 'Checking...'
                  : domainStatus[name]?.available === true
                  ? '✅ Available (.com)'
                  : domainStatus[name]?.available === false
                  ? '❌ Taken'
                  : 'Check Availability'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}