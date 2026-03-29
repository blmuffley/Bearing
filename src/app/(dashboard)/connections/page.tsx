import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';

const statusVariant: Record<string, 'low' | 'info' | 'medium' | 'critical' | 'default'> = {
  active: 'low',
  pending: 'info',
  error: 'critical',
  disconnected: 'default',
};

const connectionTypeVariant: Record<string, 'info' | 'medium' | 'default'> = {
  oauth: 'info',
  basic: 'medium',
  export: 'default',
};

export default async function ConnectionsPage() {
  const supabase = await createServerSupabaseClient();

  // Query connections with assessment count
  const { data: connections } = await supabase
    .from('instance_connections')
    .select(`
      id,
      customer_name,
      instance_url,
      connection_type,
      status,
      last_connected_at,
      created_at,
      assessments:assessments(count)
    `)
    .order('created_at', { ascending: false });

  const hasConnections = connections && connections.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Instance Connections
        </h1>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
          // TODO: Wire up to a modal or /connections/new route
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Connection
        </button>
      </div>

      {/* Connection cards or empty state */}
      {hasConnections ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((connection) => {
            const assessmentCount =
              connection.assessments?.[0]?.count ?? 0;
            const lastConnected = connection.last_connected_at
              ? new Date(connection.last_connected_at).toLocaleDateString()
              : 'Never';

            return (
              <div
                key={connection.id}
                className="bg-dark-gray rounded-xl p-6 hover:ring-1 hover:ring-lime/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-white">
                    {connection.customer_name}
                  </h2>
                  <Badge variant={statusVariant[connection.status] ?? 'default'}>
                    {connection.status}
                  </Badge>
                </div>

                <p className="text-sm text-medium-gray truncate mb-4">
                  {connection.instance_url}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={connectionTypeVariant[connection.connection_type] ?? 'default'}>
                    {connection.connection_type}
                  </Badge>
                </div>

                <div className="border-t border-obsidian pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-medium-gray">Last connected</span>
                    <span className="text-white">{lastConnected}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-medium-gray">Assessments</span>
                    <span className="text-white">{assessmentCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24">
          <svg
            className="h-16 w-16 text-medium-gray mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          <p className="text-medium-gray text-lg">
            No connections yet. Upload an export to get started.
          </p>
        </div>
      )}
    </div>
  );
}
