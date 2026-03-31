'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// State machine for the upload flow
// ---------------------------------------------------------------------------

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'uploading'; file: File; progress: number }
  | { status: 'scanning'; file: File }
  | { status: 'complete'; assessmentId: string }
  | { status: 'error'; message: string };

type IngestionMode = 'upload' | 'connect' | null;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewAssessmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<IngestionMode>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');

  // -- File selection helpers ------------------------------------------------

  const handleFileAccepted = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setUploadState({ status: 'error', message: 'Only .json files are accepted.' });
      return;
    }
    setUploadState({ status: 'selected', file });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileAccepted(file);
    },
    [handleFileAccepted],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileAccepted(file);
    },
    [handleFileAccepted],
  );

  // -- Submit handler --------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (uploadState.status !== 'selected') return;
    if (!customerName.trim()) {
      setUploadState({ status: 'error', message: 'Customer name is required.' });
      return;
    }

    const { file } = uploadState;

    try {
      setUploadState({ status: 'uploading', file, progress: 0 });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerName', customerName.trim());
      if (instanceUrl.trim()) {
        formData.append('instanceUrl', instanceUrl.trim());
      }

      setUploadState({ status: 'uploading', file, progress: 50 });

      const res = await fetch('/api/export/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadState({ status: 'scanning', file });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setUploadState({ status: 'complete', assessmentId: data.assessmentId });

      // Redirect to the assessment detail page
      router.push(`/assessments/${data.assessmentId}`);
    } catch (err) {
      setUploadState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      });
    }
  }, [uploadState, customerName, instanceUrl, router]);

  // -- Reset handler ---------------------------------------------------------

  const handleReset = useCallback(() => {
    setUploadState({ status: 'idle' });
    setCustomerName('');
    setInstanceUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // -- Render ----------------------------------------------------------------

  return (
    <main className="min-h-screen bg-obsidian px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <h1 className="font-heading text-4xl font-bold text-white mb-2">
          New Assessment
        </h1>
        <p className="text-medium-gray mb-10">
          Choose how you want to ingest ServiceNow configuration data.
        </p>

        {/* Mode selection cards */}
        {mode === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Upload Export */}
            <button
              onClick={() => setMode('upload')}
              className="group rounded-2xl border border-dark-gray bg-dark-gray/50 p-8 text-left
                         transition hover:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gray text-lime">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                Upload Export
              </h2>
              <p className="text-sm text-medium-gray">
                Upload a sanitized JSON export file from your ServiceNow instance.
              </p>
            </button>

            {/* Connect Instance */}
            <button
              onClick={() => router.push('/connections/new')}
              className="group rounded-2xl border border-dark-gray bg-dark-gray/50 p-8 text-left
                         transition hover:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gray text-lime">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                Connect Instance
              </h2>
              <p className="text-sm text-medium-gray">
                Connect directly to a ServiceNow instance via OAuth or basic auth.
              </p>
            </button>
          </div>
        )}

        {/* Upload flow */}
        {mode === 'upload' && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => {
                setMode(null);
                handleReset();
              }}
              className="text-sm text-medium-gray hover:text-white transition"
            >
              &larr; Back to options
            </button>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center
                         rounded-2xl border-2 border-dashed p-12 transition
                         ${
                           dragOver
                             ? 'border-lime bg-lime/5'
                             : 'border-medium-gray bg-dark-gray/30 hover:border-lime/50'
                         }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="hidden"
              />

              {uploadState.status === 'idle' || uploadState.status === 'error' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-10 w-10 text-medium-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-heading text-white mb-1">
                    Drop your export JSON here
                  </p>
                  <p className="text-sm text-medium-gray">
                    or click to browse
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white font-mono text-sm">
                    {(uploadState as { file: File }).file?.name ?? 'File selected'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="ml-2 text-medium-gray hover:text-white transition text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Customer details */}
            <div className="rounded-2xl border border-dark-gray bg-dark-gray/50 p-6 space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-heading text-white mb-1">
                  Customer Name <span className="text-lime">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-lg border border-dark-gray bg-obsidian px-4 py-2.5 text-white
                             placeholder:text-medium-gray focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>

              <div>
                <label htmlFor="instanceUrl" className="block text-sm font-heading text-white mb-1">
                  Instance URL <span className="text-medium-gray text-xs">(optional)</span>
                </label>
                <input
                  id="instanceUrl"
                  type="text"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  placeholder="https://customer.service-now.com"
                  className="w-full rounded-lg border border-dark-gray bg-obsidian px-4 py-2.5 text-white
                             placeholder:text-medium-gray focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                />
              </div>
            </div>

            {/* Error message */}
            {uploadState.status === 'error' && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {uploadState.message}
              </div>
            )}

            {/* Progress indicator */}
            {(uploadState.status === 'uploading' || uploadState.status === 'scanning') && (
              <div className="rounded-xl border border-dark-gray bg-dark-gray/50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 animate-spin text-lime"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-heading text-white">
                      {uploadState.status === 'uploading' ? 'Uploading export file...' : 'Running scan analysis...'}
                    </p>
                    <p className="text-xs text-medium-gray">
                      {uploadState.status === 'uploading'
                        ? 'Sending file to the server'
                        : 'Evaluating rules and computing health scores'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={
                uploadState.status !== 'selected' ||
                !customerName.trim()
              }
              className="w-full rounded-xl bg-lime px-6 py-3 font-heading font-semibold text-obsidian
                         transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Run Assessment
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
