'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionTestResult } from '@/components/connections/ConnectionTestResult';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionType = 'basic' | 'oauth' | 'export' | null;

type Step = 'type' | 'details' | 'result';

interface TestResult {
  success: boolean;
  version?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Input field styling constants
// ---------------------------------------------------------------------------

const inputClasses =
  'w-full rounded-lg border border-medium-gray/30 bg-obsidian px-4 py-2.5 text-white placeholder:text-medium-gray focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime';

const labelClasses = 'block text-sm font-heading text-white mb-1';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewConnectionPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Test + save state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // -- Handlers --------------------------------------------------------------

  function handleSelectType(type: ConnectionType) {
    setConnectionType(type);
    setStep('details');
  }

  function handleBack() {
    if (step === 'details') {
      setStep('type');
      setConnectionType(null);
      resetFields();
    } else if (step === 'result') {
      setStep('details');
      setTestResult(null);
    }
  }

  function resetFields() {
    setCustomerName('');
    setInstanceUrl('');
    setUsername('');
    setPassword('');
    setClientId('');
    setClientSecret('');
    setTestResult(null);
    setSaveError(null);
  }

  async function handleTestConnection() {
    if (!instanceUrl.trim()) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceUrl: instanceUrl.trim(),
          auth: {
            type: 'basic',
            username,
            password,
          },
        }),
      });

      const data = await res.json();
      setTestResult(data);
      setStep('result');
    } catch {
      setTestResult({
        success: false,
        error: 'Failed to reach the test endpoint. Check your network connection.',
      });
      setStep('result');
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSaveConnection() {
    setSaving(true);
    setSaveError(null);

    try {
      const credentials =
        connectionType === 'basic'
          ? { username, password }
          : connectionType === 'oauth'
            ? { clientId, clientSecret }
            : undefined;

      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          instanceUrl: instanceUrl.trim() || undefined,
          connectionType,
          credentials,
          servicenowVersion: testResult?.version ?? undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to save (${res.status})`);
      }

      router.push('/connections');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }

  // -- Render ----------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl py-6">
      {/* Header */}
      <h1 className="font-heading text-3xl font-bold text-white mb-2">
        Add Connection
      </h1>
      <p className="text-medium-gray mb-8">
        Connect a ServiceNow instance to run live assessments.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['type', 'details', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step === s
                  ? 'bg-lime text-obsidian'
                  : i < ['type', 'details', 'result'].indexOf(step)
                    ? 'bg-lime/20 text-lime'
                    : 'bg-dark-gray text-medium-gray'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-heading ${
                step === s ? 'text-white' : 'text-medium-gray'
              }`}
            >
              {s === 'type' ? 'Type' : s === 'details' ? 'Details' : 'Confirm'}
            </span>
            {i < 2 && (
              <div className="mx-2 h-px w-8 bg-dark-gray" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Connection Type */}
      {step === 'type' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Basic Auth */}
          <button
            onClick={() => handleSelectType('basic')}
            className="group rounded-2xl border border-dark-gray bg-dark-gray/50 p-6 text-left transition hover:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gray text-lime">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h2 className="font-heading text-lg font-semibold text-white mb-1">
              Basic Auth
            </h2>
            <p className="text-sm text-medium-gray">
              Username + password. Simplest setup for testing and development.
            </p>
          </button>

          {/* OAuth 2.0 */}
          <button
            onClick={() => handleSelectType('oauth')}
            className="group rounded-2xl border border-dark-gray bg-dark-gray/50 p-6 text-left transition hover:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gray text-lime">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 className="font-heading text-lg font-semibold text-white mb-1">
              OAuth 2.0
            </h2>
            <p className="text-sm text-medium-gray">
              Redirect-based authentication. Recommended for production use.
            </p>
          </button>

          {/* Export Only */}
          <button
            onClick={() => handleSelectType('export')}
            className="group rounded-2xl border border-dark-gray bg-dark-gray/50 p-6 text-left transition hover:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gray text-lime">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h2 className="font-heading text-lg font-semibold text-white mb-1">
              Export Only
            </h2>
            <p className="text-sm text-medium-gray">
              No live connection. Upload JSON exports manually for each assessment.
            </p>
          </button>
        </div>
      )}

      {/* Step 2: Connection Details */}
      {step === 'details' && (
        <div className="space-y-6">
          <button
            onClick={handleBack}
            className="text-sm text-medium-gray hover:text-white transition"
          >
            &larr; Back to connection type
          </button>

          <div className="rounded-2xl border border-dark-gray bg-dark-gray/50 p-6 space-y-4">
            {/* Customer Name — always shown */}
            <div>
              <label htmlFor="customerName" className={labelClasses}>
                Customer Name <span className="text-lime">*</span>
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Corp"
                className={inputClasses}
              />
            </div>

            {/* Instance URL */}
            <div>
              <label htmlFor="instanceUrl" className={labelClasses}>
                Instance URL{' '}
                {connectionType === 'export' ? (
                  <span className="text-medium-gray text-xs">(optional)</span>
                ) : (
                  <span className="text-lime">*</span>
                )}
              </label>
              <input
                id="instanceUrl"
                type="text"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder="https://customer.service-now.com"
                className={inputClasses}
              />
            </div>

            {/* Basic Auth fields */}
            {connectionType === 'basic' && (
              <>
                <div>
                  <label htmlFor="username" className={labelClasses}>
                    Username <span className="text-lime">*</span>
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="password" className={labelClasses}>
                    Password <span className="text-lime">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={inputClasses}
                  />
                </div>
              </>
            )}

            {/* OAuth fields */}
            {connectionType === 'oauth' && (
              <>
                <div>
                  <label htmlFor="clientId" className={labelClasses}>
                    Client ID <span className="text-lime">*</span>
                  </label>
                  <input
                    id="clientId"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="OAuth Client ID"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="clientSecret" className={labelClasses}>
                    Client Secret <span className="text-lime">*</span>
                  </label>
                  <input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="OAuth Client Secret"
                    className={inputClasses}
                  />
                </div>
              </>
            )}
          </div>

          {/* Test loading state */}
          {testLoading && (
            <ConnectionTestResult loading success={false} />
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {connectionType === 'basic' && (
              <button
                onClick={handleTestConnection}
                disabled={
                  testLoading ||
                  !customerName.trim() ||
                  !instanceUrl.trim() ||
                  !username.trim() ||
                  !password.trim()
                }
                className="flex-1 rounded-xl bg-lime px-6 py-3 font-heading font-semibold text-obsidian transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Test Connection
              </button>
            )}

            {connectionType === 'oauth' && (
              <button
                onClick={() => {
                  // TODO: Implement OAuth redirect flow
                  alert(
                    'OAuth flow will redirect to your ServiceNow instance. This feature is not yet implemented.',
                  );
                }}
                disabled={
                  !customerName.trim() ||
                  !instanceUrl.trim() ||
                  !clientId.trim() ||
                  !clientSecret.trim()
                }
                className="flex-1 rounded-xl bg-lime px-6 py-3 font-heading font-semibold text-obsidian transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Authorize
              </button>
            )}

            {connectionType === 'export' && (
              <button
                onClick={handleSaveConnection}
                disabled={saving || !customerName.trim()}
                className="flex-1 rounded-xl bg-lime px-6 py-3 font-heading font-semibold text-obsidian transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Connection'}
              </button>
            )}
          </div>

          {connectionType === 'oauth' && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
              OAuth flow will redirect to your ServiceNow instance for
              authorization. You will be redirected back after granting access.
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Connection Test Result */}
      {step === 'result' && testResult && (
        <div className="space-y-6">
          <button
            onClick={handleBack}
            className="text-sm text-medium-gray hover:text-white transition"
          >
            &larr; Back to details
          </button>

          <ConnectionTestResult
            success={testResult.success}
            version={testResult.version}
            error={testResult.error}
          />

          {testResult.success ? (
            <>
              <button
                onClick={handleSaveConnection}
                disabled={saving}
                className="w-full rounded-xl bg-lime px-6 py-3 font-heading font-semibold text-obsidian transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Connection'}
              </button>
              {saveError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {saveError}
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                setTestResult(null);
                setStep('details');
              }}
              className="w-full rounded-xl border border-medium-gray/30 bg-dark-gray px-6 py-3 font-heading font-semibold text-white transition hover:border-lime"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
