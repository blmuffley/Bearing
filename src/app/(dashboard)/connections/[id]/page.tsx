import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const statusVariant: Record<string, 'low' | 'info' | 'medium' | 'critical' | 'default'> = {
  active: 'low',
  pending: 'info',
  error: 'critical',
  disconnected: 'default',
};

const connectionTypeLabel: Record<string, string> = {
  basic: 'Basic Auth',
  oauth: 'OAuth 2.0',
  export: 'Export Only',
};

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch connection
  const { data: connection, error } = await supabase
    .from('instance_connections')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !connection) {
    notFound();
  }

  // Fetch assessments for this connection
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, scan_type, status, health_score, started_at, completed_at')
    .eq('instance_connection_id', id)
    .order('created_at', { ascending: false });

  const lastConnected = connection.last_connected_at
    ? new Date(connection.last_connected_at).toLocaleString()
    : 'Never';

  const createdAt = new Date(connection.created_at).toLocaleDateString();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/connections"
          className="text-sm text-medium-gray hover:text-white transition"
        >
          &larr; Back to Connections
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-heading text-3xl font-bold text-white">
              {connection.customer_name}
            </h1>
            <Badge variant={statusVariant[connection.status] ?? 'default'}>
              {connection.status}
            </Badge>
          </div>
          <p className="text-medium-gray">{connection.instance_url}</p>
        </div>
        <div className="flex items-center gap-3">
          {connection.connection_type !== 'export' && (
            <ScanButton connectionId={id} />
          )}
          <button
            className="rounded-lg border border-medium-gray/30 bg-dark-gray px-4 py-2 text-sm font-medium text-white hover:border-lime transition disabled:opacity-40 disabled:cursor-not-allowed"
            disabled
          >
            Edit
          </button>
          <button
            className="rounded-lg border border-red-500/30 bg-dark-gray px-4 py-2 text-sm font-medium text-red-400 hover:border-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            disabled
          >
            Delete
          </button>
        </div>
      </div>

      {/* Connection details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-gray rounded-xl p-5">
          <p className="text-xs text-medium-gray mb-1 font-heading">Connection Type</p>
          <p className="text-white font-semibold">
            {connectionTypeLabel[connection.connection_type] ?? connection.connection_type}
          </p>
        </div>
        <div className="bg-dark-gray rounded-xl p-5">
          <p className="text-xs text-medium-gray mb-1 font-heading">Version</p>
          <p className="text-white font-mono">
            {connection.servicenow_version ?? 'Unknown'}
          </p>
        </div>
        <div className="bg-dark-gray rounded-xl p-5">
          <p className="text-xs text-medium-gray mb-1 font-heading">Last Connected</p>
          <p className="text-white">{lastConnected}</p>
        </div>
        <div className="bg-dark-gray rounded-xl p-5">
          <p className="text-xs text-medium-gray mb-1 font-heading">Created</p>
          <p className="text-white">{createdAt}</p>
        </div>
      </div>

      {/* Assessments list */}
      <div className="bg-dark-gray rounded-xl p-6">
        <h2 className="font-heading text-lg font-semibold text-white mb-4">
          Assessments
        </h2>

        {assessments && assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/assessments/${assessment.id}`}
                className="flex items-center justify-between rounded-lg bg-obsidian p-4 hover:ring-1 hover:ring-lime/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-heading text-white">
                      {assessment.scan_type === 'full_api'
                        ? 'Live API Scan'
                        : assessment.scan_type === 'export_ingest'
                          ? 'Export Upload'
                          : assessment.scan_type}
                    </p>
                    <p className="text-xs text-medium-gray">
                      {assessment.started_at
                        ? new Date(assessment.started_at).toLocaleString()
                        : 'Not started'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {assessment.health_score !== null && (
                    <span
                      className={`font-mono font-semibold ${
                        assessment.health_score >= 70
                          ? 'text-green-400'
                          : assessment.health_score >= 40
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {assessment.health_score}
                    </span>
                  )}
                  <Badge
                    variant={
                      assessment.status === 'complete'
                        ? 'low'
                        : assessment.status === 'error'
                          ? 'critical'
                          : 'info'
                    }
                  >
                    {assessment.status}
                  </Badge>
                  <svg
                    className="h-4 w-4 text-medium-gray"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="h-10 w-10 text-medium-gray mb-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            </svg>
            <p className="text-medium-gray text-sm">
              No assessments have been run against this connection yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client component for scan trigger button
// ---------------------------------------------------------------------------

function ScanButton({ connectionId }: { connectionId: string }) {
  return <ScanButtonClient connectionId={connectionId} />;
}

// Using a separate 'use client' wrapper to keep the page as a server component
import { ScanButtonClient } from './ScanButtonClient';
