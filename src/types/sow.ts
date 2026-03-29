/**
 * Types for SOW generation, rate cards, and revenue projections.
 */

import type { Module } from './assessment';
import type { Finding } from './finding';

export type SowStatus = 'draft' | 'sent' | 'under_review' | 'accepted' | 'declined';

export type EngagementType = 'time_and_materials' | 'fixed_fee' | 'blended';

export interface RateCardRole {
  name: string;
  hourlyRate: number;
}

export interface RateCard {
  roles: RateCardRole[];
  defaultEngagementType: EngagementType;
  blendedRate?: number;
  marginTarget?: number;
}

export interface ModuleRevenueBreakdown {
  hoursLow: number;
  hoursHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

export interface RevenueProjection {
  totalHoursLow: number;
  totalHoursHigh: number;
  totalRevenueLow: number;
  totalRevenueHigh: number;
  byModule: Record<string, ModuleRevenueBreakdown>;
  quickWins: Array<{
    id: string;
    title: string;
    severity: string;
    effortTshirt: string;
    compositeScore: number;
    hoursLow: number;
    hoursHigh: number;
    revenueLow: number;
    revenueHigh: number;
  }>;
}

export interface GeneratedSow {
  id: string;
  orgId: string;
  assessmentId: string;
  status: SowStatus;
  engagementType: EngagementType;
  totalHoursLow?: number | null;
  totalHoursHigh?: number | null;
  totalRevenueLow?: number | null;
  totalRevenueHigh?: number | null;
  includedFindingIds: string[];
  documentUrl?: string | null;
  createdAt: string;
}

export interface SowScope {
  scopeTemplate: string;
  assumptions: string;
  deliverables: string[];
  exclusions: string;
}

export interface SowMilestone {
  name: string;
  description: string;
  estimatedWeek: number;
  deliverables: string[];
}

export interface SowConfig {
  engagementType: EngagementType;
  selectedFindingIds: string[];
  rateCard: RateCard;
  milestones: SowMilestone[];
  customScope?: string;
  customAssumptions?: string;
  customExclusions?: string;
  timeline?: {
    startDate: string;
    estimatedEndDate: string;
  };
}

export interface SowDocument {
  title: string;
  customerName: string;
  preparedBy: string;
  date: string;
  engagementType: EngagementType;
  scope: SowScope[];
  milestones: SowMilestone[];
  pricing: {
    rateCard: RateCard;
    totalHoursLow: number;
    totalHoursHigh: number;
    totalRevenueLow: number;
    totalRevenueHigh: number;
    byModule: Record<string, ModuleRevenueBreakdown>;
  };
  findings: Finding[];
  brandConfig?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    legalText?: string;
  };
}
