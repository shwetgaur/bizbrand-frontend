'use client';

import { useState } from 'react';
import axios, { isAxiosError } from 'axios';

// --- Backend URLs ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const LOGO_API_URL = 'https://34d371eb18e0.ngrok-free.app/generate-logo/';

// --- Type Definitions ---
type DomainStatus = {
  [key: string]: {
    loading: boolean;
    available?: boolean;
  };
};

type LogoState = {
  [key: string]: {
    loading: boolean;
    urls: string[];
    error?: string | null;
    retries?: number;
  };
};

export default function Home() {
  const [description, setDescription] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>({});
  const [logoState, setLogoState] = useState<LogoState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to sleep between retries
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // --- Generate Names (Vercel backend) ---
  const handleNameGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setNames([]);
    setDomainStatus({});
    setLogoState({});

    try {
      const response = await axios.post(`${API_BASE_URL}/generate-name`, {
        description,
      });

      if (response.data && Array.isArray(response.data.names)) {
        setNames(response.data.names);
      } else if (Array.isArray(response.data)) {
        setNames(response.data);
      } else {
        setError('Unexpected API response format. Check console.');
        console.error('Unexpected response:', response.data);
      }
    } catch (err) {
      console.error('API Request Failed:', err);
      if (isAxiosError(err)) {
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          'Server did not respond.';
        setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Check Domain (Vercel backend) ---
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
      console.error('Domain check failed:', err);
      setDomainStatus((prev) => ({
        ...prev,
        [name]: { loading: false },
      }));

      let errMsg = 'Could not check domain.';
      if (isAxiosError(err)) {
        errMsg =
          err.response?.data?.error ||
          err.message ||
          'Domain check error occurred.';
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      alert(`Domain check error: ${errMsg}`);
    }
  };

  // --- Generate Logos (direct to ngrok FastAPI, with retries) ---
  const handleLogoGeneration = async (name: string, attempt = 1) => {
    setLogoState((prev) => ({
      ...prev,
      [name]: { loading: true, urls: [], error: null, retries: attempt },
    }));

    try {
      const form = new FormData();
      form.append('company_name', name);
      form.append('context_prompt', description);

      const response = await axios.post(LOGO_API_URL, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 min per attempt
      });

      // Success
      if (response.data && Array.isArray(response.data.image_urls)) {
        setLogoState((prev) => ({
          ...prev,
          [name]: { loading: false, urls: response.data.image_urls },
        }));
      } else {
        throw new Error('Invalid response format from logo generator.');
      }
    } catch (err) {
      console.error(`Logo generation failed (attempt ${attempt}):`, err);
      let errorMsg = 'Failed to generate logos.';
      if (isAxiosError(err)) {
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          errorMsg = `Timeout after attempt ${attempt}. Retrying...`;
        } else if (err.response?.status === 0) {
          errorMsg = 'Network error: backend not reachable.';
        } else {
          errorMsg = err.response?.data?.error || err.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      // Retry up to 3 times with exponential backoff
      if (attempt < 3) {
        setLogoState((prev) => ({
          ...prev,
          [name]: { loading: true, urls: [], error: errorMsg, retries: attempt },
        }));
        await sleep(3000 * attempt);
        return handleLogoGeneration(name, attempt + 1);
      }

      // Final failure
      setLogoState((prev) => ({
        ...prev,
        [name]: { loading: false, urls: [], error: `Logo generation failed after ${attempt} attempts.` },
      }));
    }
  };

  // --- Render UI ---
  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-24 bg-gray-50">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-700">
          BIZBRAND.AI
        </h1>
        <p className="text-center text-gray-600 mb-8">
          AI-powered brand identity creation. Start with your business idea.
        </p>

        {/* --- NAME GENERATION FORM --- */}
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
            className="w-full bg-blue-600 text-white p-3 rounded-lg mt-4 font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            disabled={isLoading || !description.trim()}
          >
            {isLoading ? 'Generating Names...' : 'Generate Names'}
          </button>
        </form>

        {/* --- MAIN ERROR DISPLAY --- */}
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* --- RESULTS AREA --- */}
        {names.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Your Results</h2>
            {names.map((name) => (
              <div
                key={name}
                className="bg-white border rounded-lg shadow-sm p-5 space-y-4 transition"
              >
                {/* --- Name & Buttons --- */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
                    {name}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDomainCheck(name)}
                      className="text-sm bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 transition"
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
                    <button
                      onClick={() => handleLogoGeneration(name)}
                      className="text-sm bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition"
                      disabled={isLoading || logoState[name]?.loading}
                    >
                      {logoState[name]?.loading
                        ? `Generating${logoState[name]?.retries ? ` (Try ${logoState[name]?.retries})` : ''}...`
                        : 'Generate Logos'}
                    </button>
                  </div>
                </div>

                {/* --- LOGO RESULTS AREA --- */}
                {logoState[name] && (
                  <div className="pt-4 border-t border-gray-200">
                    {logoState[name].loading && (
                      <p className="text-sm text-gray-500 animate-pulse">
                        Generating logos... please wait. (May retry if slow)
                      </p>
                    )}
                    {logoState[name].error && (
                      <div className="text-sm text-red-600" role="alert">
                        <strong>Logo Error:</strong> {logoState[name].error}
                      </div>
                    )}
                    {logoState[name].urls.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {logoState[name].urls.map((url, index) => (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={index}
                          >
                            <img
                              src={url}
                              alt={`${name} logo ${index + 1}`}
                              className="rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
