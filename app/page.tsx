'use client';

import { useState } from 'react';
import axios, { isAxiosError } from 'axios';

// --- Backend URL ---
// Will use the env variable NEXT_PUBLIC_API_URL if defined (e.g. in Vercel),
// otherwise defaults to your local backend.
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

  // --- Generate Names ---
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

      console.log("Full API Response:", response);

      // Handle response formats safely
      if (response.data && Array.isArray(response.data.names)) {
        setNames(response.data.names);
      } else if (Array.isArray(response.data)) {
        setNames(response.data);
      } else {
        console.error("Unexpected API response format:", response.data);
        setError("Unexpected API response format. Check console.");
      }
    } catch (err) {
      console.error("API Request Failed:", err);

      if (isAxiosError(err)) {
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          "An unknown server error occurred.";
        setError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Check Domain ---
  const handleDomainCheck = async (name: string) => {
    setDomainStatus((prev) => ({
      ...prev,
      [name]: { loading: true },
    }));

    try {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/gi, '');
      const response = await axios.get(`${API_BASE_URL}/check-domain`, {
        params: { domain: cleanName },
      });

      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false, available: response.data.available },
      }));
    } catch (err) {
      console.error("Domain check failed:", err);

      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false },
      }));

      if (isAxiosError(err)) {
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          "Could not check domain.";
        alert(`Domain check error: ${errMsg}`);
      } else if (err instanceof Error) {
        alert(`Domain check error: ${err.message}`);
      } else {
        alert("Domain check failed. Please try again.");
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-700">
          BizBrand.ai 🚀
        </h1>
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
            disabled={isLoading || !description.trim()}
          >
            {isLoading ? 'Generating Names...' : 'Generate Names'}
          </button>
        </form>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {names.length > 0 && (
          <div className="space-y-4">
            {names.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition"
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
        )}
      </div>
    </main>
  );
}
