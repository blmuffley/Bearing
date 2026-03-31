'use client';

import React from 'react';

interface ConnectionTestResultProps {
  success: boolean;
  version?: string;
  error?: string;
  loading?: boolean;
}

export function ConnectionTestResult({
  success,
  version,
  error,
  loading,
}: ConnectionTestResultProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dark-gray bg-dark-gray/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 animate-spin text-lime"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div>
            <p className="font-heading text-sm font-semibold text-white">
              Testing connection...
            </p>
            <p className="text-xs text-medium-gray">
              Attempting to reach your ServiceNow instance
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <svg
            className="h-6 w-6 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-heading text-sm font-semibold text-green-400">
            Connected successfully
          </p>
        </div>
        {version && (
          <div className="ml-9 text-sm text-medium-gray">
            Instance version:{' '}
            <span className="font-mono text-white">{version}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-5">
      <div className="flex items-center gap-3 mb-3">
        <svg
          className="h-6 w-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="font-heading text-sm font-semibold text-red-400">
          Connection failed
        </p>
      </div>
      {error && (
        <p className="ml-9 text-sm text-red-300 mb-3">{error}</p>
      )}
      <div className="ml-9 space-y-1">
        <p className="text-xs font-heading text-medium-gray">
          Troubleshooting tips:
        </p>
        <ul className="text-xs text-medium-gray list-disc list-inside space-y-0.5">
          <li>Verify the instance URL is correct and accessible</li>
          <li>Check that your credentials have API access</li>
          <li>Ensure the instance is not in maintenance mode</li>
          <li>Confirm your IP is allowlisted if IP restrictions are enabled</li>
        </ul>
      </div>
    </div>
  );
}
