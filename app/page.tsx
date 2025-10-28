// app/page.tsx
'use client'; // This is required for components with hooks like useState

import { useState } from 'react';
import axios from 'axios';

// IMPORTANT: Set this in your Vercel environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Define a type for the domain availability state
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
      setNames(response.data.names);
    } catch (err) {
      setError('Failed to generate names. Please try again.');
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
      
      // Update state with the result
      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false, available: response.data.available },
      }));

    } catch (err) {
      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false },
      }));
      alert(`Failed to check domain for ${name}`);
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

        {error && <p className="text-red-500 text-center">{error}</p>}

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