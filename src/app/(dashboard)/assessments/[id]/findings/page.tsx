import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FindingsTable } from '@/components/dashboard/FindingsTable';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FindingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch the assessment to get the customer name for breadcrumbs
  const { data: assessment, error: assessError } = await supabase
    .from('assessments')
    .select('id, instance_connections(customer_name)')
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

  const findingRows = (findings ?? []).map((f: any) => ({
    id: f.id,
    title: f.title,
    module: f.module,
    severity: f.severity,
    effortTshirt: f.effort_tshirt,
    compositeScore: Number(f.composite_score),
    affectedCount: f.affected_count,
    remediationDescription: f.remediation_description,
  }));

  const customerName =
    (assessment.instance_connections as any)?.customer_name ?? 'Assessment';

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm text-medium-gray">
        <Link
          href="/assessments"
          className="hover:text-white transition-colors"
        >
          Assessments
        </Link>
        <span>/</span>
        <Link
          href={`/assessments/${id}`}
          className="hover:text-white transition-colors"
        >
          {customerName}
        </Link>
        <span>/</span>
        <span className="text-white">Findings</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-white">
          All Findings
        </h1>
        <span className="text-medium-gray text-sm">
          {findingRows.length} finding{findingRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Findings table */}
      <FindingsTable findings={findingRows} />
    </div>
  );
}
