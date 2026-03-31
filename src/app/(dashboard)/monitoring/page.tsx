import React from 'react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MonitoringSparkline } from './MonitoringSparkline';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getHealthColor(score: number): string {
  if (score >= 70) return '#CCFF00';
  if (score >= 40) return '#EAB308';
  return '#EF4444';
}

function getHealthVariant(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 70) return 'low';      // green badge
  if (score >= 40) return 'medium';   // yellow badge
  return 'critical';                   // red badge
}

export default async function MonitoringPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch all active connections
  const { data: connections } = await supabase
    .from('instance_connections')
    .select('id, customer_name, instance_url, status, last_connected_at')
    .order('customer_name', { ascending: true });

  const connectionRows = connections ?? [];

  // For each connection, fetch latest assessment and recent trend data
  const connectionData = await Promise.all(
    connectionRows.map(async (conn: any) => {
      // Latest assessment
      const { data: latestAssessments } = await supabase
        .from('assessments')
        .select('id, health_score, created_at, status')
        .eq('instance_connection_id', conn.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1);

      const latest = latestAssessments?.[0] ?? null;

      // Last 10 assessments for sparkline
      const { data: recentAssessments } = await supabase
        .from('assessments')
        .select('health_score, created_at')
        .eq('instance_connection_id', conn.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: true })
        .limit(10);

      const sparklinePoints = (recentAssessments ?? []).map((a: any) => a.health_score ?? 0);

      // Count alerts: check if health dropped since previous
      let alertCount = 0;
      if (recentAssessments && recentAssessments.length >= 2) {
        const prev = recentAssessments[recentAssessments.length - 2];
        const curr = recentAssessments[recentAssessments.length - 1];
        if ((curr.health_score ?? 0) < (prev.health_score ?? 0) - 3) {
          alertCount = 1;
        }
      }

      return {
        connection: conn,
        latestScore: latest?.health_score ?? null,
        lastScanDate: latest?.created_at ?? null,
        latestAssessmentId: latest?.id ?? null,
        sparklinePoints,
        alertCount,
      };
    })
  );

  // Compute fleet average
  const scoredConnections = connectionData.filter((c) => c.latestScore !== null);
  const fleetAvg =
    scoredConnections.length > 0
      ? Math.round(
          scoredConnections.reduce((sum, c) => sum + (c.latestScore ?? 0), 0) /
            scoredConnections.length
        )
      : null;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">
            Continuous Monitoring
          </h1>
          <p className="text-medium-gray text-sm mt-1">
            Monitor health across all connected instances
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-dark-gray px-4 py-2 text-sm text-medium-gray cursor-not-allowed"
          title="Coming soon"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Schedule Scan
        </button>
      </div>

      {/* Fleet Health Summary */}
      <Card>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-medium-gray text-sm mb-1">Fleet Health Average</p>
            {fleetAvg !== null ? (
              <span
                className="font-heading text-4xl font-bold"
                style={{ color: getHealthColor(fleetAvg) }}
              >
                {fleetAvg}
              </span>
            ) : (
              <span className="text-medium-gray text-2xl">--</span>
            )}
          </div>
          <div className="border-l border-dark-gray pl-8">
            <p className="text-medium-gray text-sm mb-1">Active Connections</p>
            <span className="font-heading text-2xl font-bold text-white">
              {connectionRows.length}
            </span>
          </div>
          <div className="border-l border-dark-gray pl-8">
            <p className="text-medium-gray text-sm mb-1">With Assessments</p>
            <span className="font-heading text-2xl font-bold text-white">
              {scoredConnections.length}
            </span>
          </div>
          <div className="border-l border-dark-gray pl-8">
            <p className="text-medium-gray text-sm mb-1">Active Alerts</p>
            <span className="font-heading text-2xl font-bold text-red-400">
              {connectionData.reduce((sum, c) => sum + c.alertCount, 0)}
            </span>
          </div>
        </div>
      </Card>

      {/* Connections list */}
      {connectionRows.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <svg className="h-10 w-10 text-medium-gray" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <p className="text-medium-gray text-sm">
              No connections configured.{' '}
              <Link href="/connections" className="text-lime hover:text-lime/80">
                Add a connection
              </Link>{' '}
              to get started.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {connectionData.map((item) => {
            const { connection, latestScore, lastScanDate, latestAssessmentId, sparklinePoints, alertCount } = item;
            return (
              <Card key={connection.id} className="hover:border-dark-gray transition-colors">
                <div className="flex items-center gap-6">
                  {/* Connection info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-semibold text-white truncate">
                        {connection.customer_name}
                      </h3>
                      <Badge
                        variant={connection.status === 'active' ? 'low' : 'default'}
                      >
                        {connection.status}
                      </Badge>
                      {alertCount > 0 && (
                        <Badge variant="critical">
                          {alertCount} alert{alertCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-medium-gray text-xs mt-0.5 truncate">
                      {connection.instance_url}
                    </p>
                  </div>

                  {/* Health score */}
                  <div className="text-center w-16">
                    {latestScore !== null ? (
                      <div>
                        <span
                          className="font-heading text-2xl font-bold"
                          style={{ color: getHealthColor(latestScore) }}
                        >
                          {latestScore}
                        </span>
                        <p className="text-medium-gray text-xs">Health</p>
                      </div>
                    ) : (
                      <span className="text-medium-gray text-sm">No data</span>
                    )}
                  </div>

                  {/* Sparkline */}
                  <div className="w-24">
                    {sparklinePoints.length >= 2 ? (
                      <MonitoringSparkline points={sparklinePoints} />
                    ) : (
                      <span className="text-medium-gray text-xs">--</span>
                    )}
                  </div>

                  {/* Last scan */}
                  <div className="text-right w-28">
                    <p className="text-medium-gray text-xs">Last scan</p>
                    <p className="text-white text-sm">{formatDate(lastScanDate)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {latestAssessmentId && (
                      <Link
                        href={`/assessments/${latestAssessmentId}`}
                        className="text-sm text-lime hover:text-lime/80 transition-colors whitespace-nowrap"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
