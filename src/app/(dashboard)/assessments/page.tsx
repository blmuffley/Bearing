import React from 'react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { Badge } from '@/components/ui/Badge';

const statusVariant: Record<string, 'low' | 'info' | 'medium' | 'default'> = {
  complete: 'low',
  scoring: 'info',
  scanning: 'medium',
  queued: 'default',
  error: 'critical' as any,
};

export default async function AssessmentsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, health_score, status, created_at, instance_connections(customer_name)')
    .order('created_at', { ascending: false });

  const rows = assessments ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Assessments
        </h1>
        <Link
          href="/assessments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
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
          New Assessment
        </Link>
      </div>

      {/* Assessment cards */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-medium-gray text-lg mb-4">No assessments yet.</p>
          <Link
            href="/assessments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
          >
            Upload your first export
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((assessment: any) => {
            const customerName =
              (assessment.instance_connections as any)?.customer_name ??
              'Unknown';
            const date = new Date(assessment.created_at).toLocaleDateString(
              'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' },
            );

            return (
              <Link
                key={assessment.id}
                href={`/assessments/${assessment.id}`}
                className="block bg-dark-gray rounded-xl p-6 hover:ring-1 hover:ring-lime/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-white">
                      {customerName}
                    </h2>
                    <p className="text-sm text-medium-gray mt-1">{date}</p>
                  </div>
                  <Badge
                    variant={statusVariant[assessment.status] ?? 'default'}
                  >
                    {assessment.status}
                  </Badge>
                </div>
                <div className="flex justify-center pt-2">
                  <HealthGauge
                    score={assessment.health_score ?? 0}
                    label="Health Score"
                    size="sm"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
