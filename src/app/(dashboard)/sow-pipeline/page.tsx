import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SowStatusPipeline } from '@/components/sow/SowStatusPipeline';
import { Card } from '@/components/ui/Card';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SowPipelinePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    redirect('/login');
  }

  // Fetch all SOWs with assessment + customer info
  const { data: rawSows } = await supabase
    .from('generated_sows')
    .select('*, assessments(id, instance_connections(customer_name))')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  const sows = (rawSows ?? []).map((sow) => {
    const assessment = sow.assessments as {
      id: string;
      instance_connections: { customer_name: string } | null;
    } | null;
    return {
      id: sow.id as string,
      status: sow.status as string,
      customerName:
        assessment?.instance_connections?.customer_name ?? 'Unknown',
      engagementType: sow.engagement_type as string,
      totalRevenueLow: (sow.total_revenue_low as number) ?? 0,
      totalRevenueHigh: (sow.total_revenue_high as number) ?? 0,
      createdAt: sow.created_at as string,
    };
  });

  // Compute summary stats
  const totalSows = sows.length;
  const totalPipelineValue = sows.reduce(
    (sum, s) => sum + s.totalRevenueHigh,
    0
  );
  const acceptedSows = sows.filter((s) => s.status === 'accepted');
  const acceptedValue = acceptedSows.reduce(
    (sum, s) => sum + s.totalRevenueHigh,
    0
  );
  const decidedCount = sows.filter(
    (s) => s.status === 'accepted' || s.status === 'declined'
  ).length;
  const winRate =
    decidedCount > 0
      ? Math.round((acceptedSows.length / decidedCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          SOW Pipeline
        </h1>
        <p className="text-sm text-medium-gray mt-1">
          Track all statements of work across assessments
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-medium-gray uppercase tracking-wider mb-1">
            Total SOWs
          </p>
          <p className="font-heading text-2xl font-bold text-white">
            {totalSows}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-medium-gray uppercase tracking-wider mb-1">
            Pipeline Value
          </p>
          <p className="font-heading text-2xl font-bold text-lime">
            {formatCurrency(totalPipelineValue)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-medium-gray uppercase tracking-wider mb-1">
            Accepted Value
          </p>
          <p className="font-heading text-2xl font-bold text-lime">
            {formatCurrency(acceptedValue)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-medium-gray uppercase tracking-wider mb-1">
            Win Rate
          </p>
          <p className="font-heading text-2xl font-bold text-white">
            {winRate}%
          </p>
        </Card>
      </div>

      {/* Pipeline View */}
      {sows.length === 0 ? (
        <div className="bg-dark-gray rounded-xl p-12 text-center">
          <p className="text-medium-gray text-sm">
            No SOWs in the pipeline yet. Generate one from an assessment.
          </p>
        </div>
      ) : (
        <SowStatusPipeline sows={sows} />
      )}
    </div>
  );
}
