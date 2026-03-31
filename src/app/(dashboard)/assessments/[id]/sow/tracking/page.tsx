import React from 'react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SowTrackingList } from './SowTrackingList';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SowTrackingPage({ params }: PageProps) {
  const { id: assessmentId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the user's org_id
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    redirect('/login');
  }

  // Fetch SOWs for this assessment
  const { data: sows } = await supabase
    .from('generated_sows')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  // Fetch the assessment for breadcrumb context
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, instance_connections(customer_name)')
    .eq('id', assessmentId)
    .eq('org_id', profile.org_id)
    .single();

  const customerName =
    (assessment?.instance_connections as { customer_name?: string } | null)
      ?.customer_name ?? 'Assessment';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-medium-gray">
        <Link href="/assessments" className="hover:text-white transition-colors">
          Assessments
        </Link>
        <span>/</span>
        <Link
          href={`/assessments/${assessmentId}`}
          className="hover:text-white transition-colors"
        >
          {customerName}
        </Link>
        <span>/</span>
        <span className="text-white">SOW Tracking</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            SOW Tracking
          </h1>
          <p className="text-sm text-medium-gray mt-1">
            Track generated statements of work for this assessment
          </p>
        </div>
        <Link
          href={`/assessments/${assessmentId}/sow`}
          className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
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
          Build New SOW
        </Link>
      </div>

      {/* SOW List */}
      {!sows || sows.length === 0 ? (
        <div className="bg-dark-gray rounded-xl p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-medium-gray mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-medium-gray text-sm">
            No SOWs generated yet. Build one from the assessment findings.
          </p>
          <Link
            href={`/assessments/${assessmentId}/sow`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-obsidian hover:bg-lime/90 transition-colors"
          >
            Build SOW
          </Link>
        </div>
      ) : (
        <SowTrackingList sows={sows} assessmentId={assessmentId} />
      )}
    </div>
  );
}
