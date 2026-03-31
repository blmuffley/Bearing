import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SowBuilder } from '@/components/sow/SowBuilder';
import type { SowFinding } from '@/components/sow/SowBuilder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SowPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch assessment with instance connection for customer name
  const { data: assessment, error: assessError } = await supabase
    .from('assessments')
    .select('*, instance_connections(customer_name)')
    .eq('id', id)
    .single();

  if (assessError || !assessment) {
    notFound();
  }

  // Fetch all findings for this assessment
  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('assessment_id', id)
    .order('composite_score', { ascending: false });

  const findingRows = findings ?? [];

  // Map DB rows to the shape expected by SowBuilder
  const sowFindings: SowFinding[] = findingRows.map((f: any) => ({
    id: f.id,
    title: f.title,
    module: f.module,
    severity: f.severity,
    effortTshirt: f.effort_tshirt,
    effortHoursLow: f.effort_hours_low,
    effortHoursHigh: f.effort_hours_high,
    affectedCount: f.affected_count,
    compositeScore: Number(f.composite_score),
    remediationDescription: f.remediation_description,
  }));

  const customerName =
    (assessment.instance_connections as any)?.customer_name ?? 'Customer';

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Link
          href={`/assessments/${id}`}
          className="text-medium-gray text-sm hover:text-white transition-colors mb-1 inline-block"
        >
          &larr; Back to Assessment
        </Link>
        <h1 className="font-heading text-3xl font-bold text-white">
          Build Statement of Work
        </h1>
        <p className="text-medium-gray text-sm mt-1">
          {customerName} &mdash; {sowFindings.length} findings available
        </p>
      </div>

      <SowBuilder
        assessmentId={id}
        findings={sowFindings}
        customerName={customerName}
      />
    </div>
  );
}
